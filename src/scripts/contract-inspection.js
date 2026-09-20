/** Read-only evidence reports. Contract YAML remains the sole authored graph. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { builtinModules } from "node:module";
import { BINDING_FILENAME, loadBindingCatalog } from "./binding.js";
import { CONTRACT_FILENAME, CONTRACT_SCHEMA_ID, CONTRACT_VERSION, discoverContractFiles, findContract, loadContract, loadContractGraph } from "./contracts.js";
import { adapters, selectAdapter } from "./inspection/index.js";

const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const posix = value => value.split(path.sep).join("/");
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const inside = (parent, child) => child === parent || child.startsWith(`${parent}/`);
const SKIP = new Set([".git", ".agents", ".claude", ".github", "node_modules", "vendor", "dist", "build", "target", "out", "coverage", "tmp", ".venv", "venv", "__pycache__", "test", "tests", "spec", "specs", "__tests__", "fixtures", "integration_test"]);
const SOURCE = /\.(?:js|mjs|jsx|cjs|ts|mts|tsx|cts|vue|svelte|java|kt|kts|go|rs|py|pyi|rb|php|cs|fs|fsx|vb|c|h|cpp|swift|dart)$/i;
const BUILTINS = new Set(builtinModules.map(n => n.replace(/^node:/, "")));
export const INSPECTION_LIMITS = Object.freeze({ files: 10000, fileBytes: 1024 * 1024, totalBytes: 32 * 1024 * 1024, depth: 64 });

function presence(file) {
  try { const s = fs.lstatSync(file); return s.isFile() ? "file" : s.isDirectory() ? "directory" : "other"; }
  catch (error) { return error.code === "ENOENT" ? "missing" : "unreadable"; }
}

function confined(root, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || relative.includes("\\")) throw new Error("expected a repository-relative path");
  if (relative.split("/").includes("..")) throw new Error("path escapes repository or contains traversal");
  const absolute = path.resolve(root, relative);
  const rel = posix(path.relative(root, absolute));
  if (rel === ".." || rel.startsWith("../")) throw new Error("path escapes repository");
  let current = root;
  for (const part of rel.split("/").filter(Boolean)) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error("symlinks are not followed"); }
    catch (error) { if (error.code === "ENOENT") break; throw error; }
  }
  return absolute;
}

function cgVersion() {
  for (const url of [new URL("../package.json", import.meta.url), new URL("../../package.json", import.meta.url)]) {
    if (fs.existsSync(url)) return JSON.parse(fs.readFileSync(url, "utf8")).version;
  }
  throw new Error("CG package metadata missing");
}

/** Every input fingerprint can be rechecked before consuming a saved report. */
export function inspectionSnapshotChanges(root, snapshot) {
  const changes = [];
  for (const input of snapshot.inputs) {
    try {
      const file = confined(root, input.path);
      const digest = input.kind === "presence" ? hash(presence(file)) : input.kind === "directory"
        ? hash(JSON.stringify(fs.readdirSync(file, { withFileTypes: true }).map(e => [e.name, e.isSymbolicLink() ? "link" : e.isDirectory() ? "directory" : "file"]).sort((a, b) => sort(a[0], b[0]))))
        : hash(fs.readFileSync(file));
      if (digest !== input.sha256) changes.push(input.path);
    } catch { changes.push(input.path); }
  }
  return changes.sort(sort);
}

export function inspectContract(repoRoot, { id, unit, entries = [] } = {}) {
  if (!!id === (unit !== undefined)) throw new Error("inspect requires exactly one of --id or --unit");
  const root = fs.realpathSync(repoRoot);
  const inputs = new Map();
  let bytes = 0;
  const diagnostics = [];
  const files = [];
  const facts = [];
  const graphDiagnostics = [];
  const recordInput = (relative, content, kind = "file") => {
    const key = `${kind}:${relative}`;
    const sha256 = hash(content);
    if (inputs.has(key) && inputs.get(key).sha256 !== sha256) diagnostics.push({ code: "unstable-input", path: relative, message: "Input changed while reading; rerun before review." });
    else inputs.set(key, { path: relative, kind, sha256 });
    return sha256;
  };
  const read = relative => {
    const file = confined(root, relative);
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error("not a regular file");
    if (stat.size > INSPECTION_LIMITS.fileBytes || bytes + stat.size > INSPECTION_LIMITS.totalBytes) throw new Error("analysis byte limit reached");
    const content = fs.readFileSync(file);
    bytes += content.length;
    recordInput(relative, content);
    return content.toString("utf8");
  };
  const add = (file, data) => {
    const value = { ...data, path: file, origin: data.origin ?? "extracted", sha256: inputs.get(`file:${file}`)?.sha256 ?? null };
    value.id = hash(JSON.stringify(value)).slice(0, 24);
    facts.push(value);
    return value;
  };
  let graph = null;
  try {
    read(BINDING_FILENAME);
    // Preflight files used by the existing graph loader; never follow an authored symlink.
    for (const file of discoverContractFiles(root).contracts) read(posix(path.relative(root, file)));
    const binding = loadBindingCatalog(confined(root, BINDING_FILENAME), { repoRoot: root });
    graph = loadContractGraph(root, { hierarchy: binding.hierarchy.transitions });
    graphDiagnostics.push(...graph.failures);
  } catch (error) { graphDiagnostics.push(String(error.message).replaceAll(root, ".")); }
  const trustedGraph = graph && !graphDiagnostics.length ? graph : null;
  let selected = null;
  if (id) {
    if (!trustedGraph) throw new Error(`cannot select --id from an invalid graph: ${graphDiagnostics.join("; ")}; use --unit for source inspection`);
    selected = findContract(trustedGraph, id);
    if (!selected) throw new Error(`contract not found: ${id}`);
    unit = selected.contract.unit;
  }
  const unitRoot = confined(root, unit);
  if (!fs.statSync(unitRoot).isDirectory()) throw new Error("selected unit must be a directory");
  unit = posix(path.relative(root, unitRoot)) || ".";
  const relativeToRepo = value => posix(path.relative(root, path.resolve(unitRoot, value)));
  const contractPath = unit === "." ? CONTRACT_FILENAME : `${unit}/${CONTRACT_FILENAME}`;
  let authored = selected?.contract ?? null;
  if (!authored && fs.existsSync(path.join(root, contractPath))) {
    try { read(contractPath); authored = loadContract(confined(root, contractPath), { repoRoot: root }); }
    catch (error) { graphDiagnostics.push(String(error.message).replaceAll(root, ".")); }
  }
  const descendants = trustedGraph ? trustedGraph.records.filter(r => r.contract.unit !== unit && (unit === "." || inside(unit, r.contract.unit))) : [];
  const followUp = [];
  const candidates = new Map();
  const addCandidate = (relative, evidence, selectedEntry = false) => {
    const existing = candidates.get(relative) ?? { path: relative, evidence: [], selected: false };
    existing.evidence.push(evidence);
    existing.selected ||= selectedEntry;
    candidates.set(relative, existing);
  };
  for (const entry of entries) {
    if (path.isAbsolute(entry) || entry.split(/[\\/]/).includes("..")) throw new Error("--entry must be confined to the selected unit");
    const rel = relativeToRepo(entry);
    const file = confined(root, rel);
    if (!fs.statSync(file).isFile()) throw new Error("--entry must select a regular file");
    const f = add(rel, { category: "entry", entryKind: "explicit-selection", origin: "proposed", target: rel, selected: true });
    addCandidate(rel, f.id, true);
  }
  if (authored) for (const surface of authored.surface) {
    const rel = relativeToRepo(surface.path);
    const f = add(contractPath, { category: "entry", entryKind: "authored-surface", surfaceId: surface.id, target: rel });
    addCandidate(rel, f.id);
  }
  const manifest = relativeToRepo("package.json");
  let packageType = null;
  if (fs.existsSync(path.join(root, manifest))) {
    try {
      const pkg = JSON.parse(read(manifest));
      packageType = pkg.type ?? null;
      const walkEntry = (value, pointer, entryKind, qualified = false) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          for (const key of Object.keys(value).sort(sort)) walkEntry(value[key], `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`, entryKind, qualified || (entryKind === "exports" && !key.startsWith(".")));
          return;
        }
        const f = add(manifest, { category: "entry", entryKind, pointer, declaration: value, qualified, target: typeof value === "string" && !value.includes("*") ? relativeToRepo(value) : null, legacy: entryKind === "main" && Object.hasOwn(pkg, "exports") });
        if (typeof value === "string" && !value.includes("*")) {
          if (path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) diagnostics.push({ code: "unsafe-entry", path: manifest, pointer, message: "Entry declaration escapes its package; no candidate created." });
          else if (!entries.length) addCandidate(relativeToRepo(value), f.id);
        } else diagnostics.push({ code: "unsupported-entry-shape", path: manifest, pointer, message: "Pattern, array, exclusion or non-string entry is recorded without expansion." });
      };
      for (const key of ["bin", "main", "types", "typings", "exports"]) if (Object.hasOwn(pkg, key)) walkEntry(pkg[key], `/${key}`, key);
    } catch (error) { diagnostics.push({ code: "manifest-error", path: manifest, message: String(error.message).replaceAll(root, ".") }); }
  }
  let visited = 0;
  let limited = false;
  const sourcePaths = new Set();
  const list = (directory, depth) => {
    const rel = posix(path.relative(root, directory)) || ".";
    if (depth > INSPECTION_LIMITS.depth) { limited = true; files.push({ path: rel, state: "excluded", reason: "depth-limit" }); return; }
    let children;
    try {
      children = fs.readdirSync(confined(root, rel), { withFileTypes: true }).sort((a, b) => sort(a.name, b.name));
      recordInput(rel, JSON.stringify(children.map(e => [e.name, e.isSymbolicLink() ? "link" : e.isDirectory() ? "directory" : "file"])), "directory");
    } catch { diagnostics.push({ code: "unreadable-directory", path: rel, message: "Directory could not be read." }); return; }
    if (depth > 0 && children.some(e => e.isFile() && (["package.json", "go.mod", "pyproject.toml", "pom.xml", "build.gradle", "build.gradle.kts", "pubspec.yaml"].includes(e.name) || /\.(?:cs|fs|vb)proj$/i.test(e.name)))) {
      followUp.push({ unit: rel, contract: null, reason: "nested-package-select-separately" });
      return;
    }
    for (const child of children) {
      if (++visited > INSPECTION_LIMITS.files) { limited = true; return; }
      const target = path.join(directory, child.name);
      const relative = posix(path.relative(root, target));
      if (child.isSymbolicLink()) { files.push({ path: relative, state: "excluded", reason: "symlink" }); continue; }
      if (child.isDirectory()) {
        const owned = descendants.find(r => r.contract.unit === relative);
        if (owned) { followUp.push({ unit: relative, contract: owned.relative, reason: "declared-descendant" }); continue; }
        if (SKIP.has(child.name) || child.name.startsWith(".")) { files.push({ path: relative, state: "excluded", reason: "analysis-policy" }); continue; }
        list(target, depth + 1);
      } else if (child.isFile() && SOURCE.test(child.name)) sourcePaths.add(relative);
    }
  };
  list(unitRoot, 0);
  if (limited) diagnostics.push({ code: "scan-limit", path: unit, message: "Inventory limit reached; coverage is partial." });
  for (const candidate of candidates.values()) {
    if (descendants.some(r => inside(r.contract.unit, candidate.path))) {
      diagnostics.push({ code: "descendant-entry", path: candidate.path, message: "Entry belongs to a declared descendant; inspect that contract separately." });
    } else sourcePaths.add(candidate.path);
  }
  const analyses = new Map();
  for (const relative of [...sourcePaths].sort(sort)) {
    const selectedAdapter = selectAdapter(relative);
    if (!selectedAdapter) {
      files.push({ path: relative, state: "unsupported", reason: "no-implementation-adapter" });
      continue;
    }
    try {
      const text = read(relative);
      const result = selectedAdapter.inspect(text);
      if (selectedAdapter.language === "javascript-typescript" && /\.(?:js|jsx)$/i.test(relative) && packageType === "commonjs") {
        result.diagnostics.push({ code: "unsupported-commonjs-package", message: "Package declares CommonJS; ESM syntax is evidence only." });
        if (result.coverage !== "failed") result.coverage = "partial";
      }
      analyses.set(relative, result);
      files.push({ path: relative, language: selectedAdapter.language, adapter: selectedAdapter.id, state: result.coverage, reason: result.coverage === "failed" ? "parse-error" : null });
      for (const d of result.diagnostics) diagnostics.push({ ...d, path: relative });
      const observation = add(relative, { category: "analysis", language: selectedAdapter.language, adapter: selectedAdapter.id, coverage: result.coverage, observation: result.coverage === "complete-for-supported-syntax" && !result.facts.some(f => f.category === "export") ? (selectedAdapter.language === "javascript-typescript" ? "observed-empty-esm-exports" : "observed-empty-public-declarations") : "source-inspected" });
      // A candidate is a review location, never an architectural surface or a graph node.
      if (!entries.length && !authored && selectedAdapter.language !== "javascript-typescript" && result.facts.some(f => f.category === "export" || f.category === "entry")) addCandidate(relative, observation.id);
      for (const f of result.facts) {
        let resolution;
        if (f.category === "dependency" || f.specifier !== undefined) {
          const specifier = f.specifier;
          resolution = { state: "unresolved", reason: "resolution-outside-supported-subset" };
          if (selectedAdapter.language !== "javascript-typescript") resolution = { state: "unresolved", reason: "language-build-resolution-not-performed" };
          else if (typeof specifier === "string") {
            if (BUILTINS.has(specifier.replace(/^node:/, ""))) resolution = { state: "builtin", target: specifier };
            else if (!specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.startsWith("#") && !specifier.includes(":")) resolution = { state: "external", target: specifier };
            else if (specifier.startsWith(".") && path.extname(specifier)) {
              const target = posix(path.relative(root, path.resolve(root, path.dirname(relative), specifier)));
              try {
                recordInput(target, presence(confined(root, target)), "presence");
                if (fs.statSync(confined(root, target)).isFile()) {
                  // Track the containing directory so disappearance invalidates saved evidence, without reading another boundary.
                  const parent = path.dirname(target);
                  const children = fs.readdirSync(confined(root, parent), { withFileTypes: true }).map(e => [e.name, e.isSymbolicLink() ? "link" : e.isDirectory() ? "directory" : "file"]).sort((a, b) => sort(a[0], b[0]));
                  recordInput(parent, JSON.stringify(children), "directory");
                  const owner = trustedGraph?.records.filter(r => r.contract.unit === "." || inside(r.contract.unit, target)).sort((a, b) => b.contract.unit.length - a.contract.unit.length)[0];
                  resolution = { state: "exact-file", target, declaredOwner: owner?.relative ?? null, semantics: "filesystem-only" };
                }
              } catch { /* unresolved is explicit */ }
            }
          }
        }
        add(relative, { ...f, language: selectedAdapter.language, adapter: selectedAdapter.id, ...(resolution ? { resolution } : {}) });
        if (resolution?.state === "unresolved") diagnostics.push({ code: "unresolved-reference", path: relative, range: f.range, message: "Reference target is outside the adapter's resolution subset or unavailable." });
      }
    } catch (error) {
      files.push({ path: relative, state: "failed", reason: "read-error" });
      diagnostics.push({ code: "read-error", path: relative, message: String(error.message).replaceAll(root, ".") });
    }
  }
  // Explicit declarations outside entry candidates are evidence, not implicit architectural surfaces.
  const fields = {};
  for (const key of ["id", "name", "kind", "summary", "purpose", "responsibilities.owns", "responsibilities.allows", "responsibilities.forbids", "invariants", "relations.parent", "relations.composition", "relations.children", "relations.dependencies", "rules", "verification", "routes", "agent.readFirst", "agent.beforeChange", "assumptions", "exceptions", "extensions"]) {
    const value = key.split(".").reduce((v, k) => v?.[k], authored);
    fields[key] = { state: value === undefined ? "requires-judgment" : "preserve-authored", value: value ?? null, origin: value === undefined ? "proposed" : "authored" };
  }
  fields.$schema = { state: "supported-candidate", value: CONTRACT_SCHEMA_ID, origin: "proposed", basis: "installed-contract-format" };
  fields.contractVersion = { state: "supported-candidate", value: CONTRACT_VERSION, origin: "proposed", basis: "installed-contract-format" };
  fields.unit = { state: "supported-candidate", value: unit, origin: "proposed", basis: "explicit-selection" };
  fields.surface = { state: authored ? "preserve-authored" : "requires-judgment", value: authored?.surface ?? null, origin: authored ? "authored" : "proposed" };
  const proposals = [];
  const discrepancies = [];
  for (const c of [...candidates.values()].sort((a, b) => sort(a.path, b.path))) {
    const exports = facts.filter(f => f.path === c.path && f.category === "export");
    const analysis = analyses.get(c.path);
    const names = [...new Set(exports.map(f => f.name))].sort(sort);
    const complete = analysis?.coverage === "complete-for-supported-syntax";
    const existing = authored?.surface.filter(s => relativeToRepo(s.path) === c.path) ?? [];
    let exists = false;
    try {
      recordInput(c.path, presence(confined(root, c.path)), "presence");
      exists = fs.statSync(confined(root, c.path)).isFile();
    } catch { /* report below */ }
    const field = (value, evidence, reason) => ({ state: value === null ? "unresolved" : "supported-candidate", value, origin: "proposed", evidence, ...(reason ? { reason } : {}) });
    proposals.push({ candidateKey: c.path, surfaceIds: existing.map(s => s.id), authored: existing, fields: {
      path: field(exists ? posix(path.relative(unitRoot, path.join(root, c.path))) : null, c.evidence, exists ? undefined : "Entry file is missing, unsafe, or not a regular file."),
      symbols: field(complete ? names : null, facts.filter(f => f.path === c.path && ["analysis", "export"].includes(f.category)).map(f => f.id), complete ? (names.length ? "Declared syntax names; architectural selection requires review." : "observed-empty: no public declarations in the supported syntax subset.") : "Export availability/completeness is not established; retain positive facts and authored symbols."),
      ...Object.fromEntries(["id", "kind", "summary", "contract.accepts", "contract.returns", "contract.fails", "contract.guarantees"].map(key => [key, { state: "requires-judgment", value: null, origin: "proposed" }])),
    } });
    if (!exists) discrepancies.push({ code: "entry-unavailable", path: c.path, evidence: c.evidence });
    for (const s of existing) {
      for (const name of s.symbols) if (!names.includes(name)) discrepancies.push({ code: "declared-symbol-not-observed", surfaceId: s.id, symbol: name, path: c.path, coverage: analysis?.coverage ?? "unsupported", action: "Investigate implementation or authorised promise change; do not remove automatically." });
      for (const name of names) if (!s.symbols.includes(name)) discrepancies.push({ code: "additional-explicit-export", surfaceId: s.id, symbol: name, path: c.path, action: "Review whether this export belongs to the architectural surface." });
    }
  }
  const snapshot = { inputs: [...inputs.values()].sort((a, b) => sort(`${a.path}:${a.kind}`, `${b.path}:${b.kind}`)), contractSha256: inputs.get(`file:${contractPath}`)?.sha256 ?? null };
  snapshot.digest = hash(JSON.stringify(snapshot.inputs));
  const changes = inspectionSnapshotChanges(root, snapshot);
  for (const changed of changes) diagnostics.push({ code: "unstable-input", path: changed, message: "Input changed while reading; rerun before review." });
  const partial = diagnostics.length > 0 || files.some(f => ["failed", "unsupported", "partial"].includes(f.state) || f.reason === "symlink");
  const report = {
    reportVersion: "1", cgVersion: cgVersion(), adapters, unit, contract: authored ? contractPath : null,
    policy: { limits: INSPECTION_LIMITS, sourceFilenamePattern: SOURCE.source, excludedDirectoryNames: [...SKIP].sort(sort), otherFiles: "not inventoried unless selected or declared as entries", resolution: "exact-relative-files-only", symlinks: "never-follow", semantics: "syntax-observations-not-runtime-or-architectural-proof" },
    snapshot, stable: !diagnostics.some(d => d.code === "unstable-input"),
    coverage: { state: partial ? "partial" : "complete-for-supported-syntax", scope: "inventoried files under the selected unit, excluding listed trees and separate boundaries", files: files.sort((a, b) => sort(a.path, b.path)) },
    graphDiagnostics, followUp, facts, proposals, fields, discrepancies, diagnostics,
    decisions: ["Select architectural surfaces from evidenced candidates; not every export is a public promise.", "Establish meaning, ownership and behavioral promises from accepted intent and bounded code reading.", "Interpret implementation dependencies before changing contract relations; imports are not architectural edges.", "Resolve unknown fields before authoring; a report or schema pass does not establish implementation correspondence."],
  };
  validateInspectionReport(report);
  return report;
}

/** Internal report protocol: intentionally separate from the authoritative contract schema. */
export function validateInspectionReport(report) {
  if (report.reportVersion !== "1" || !report.unit || !Array.isArray(report.facts) || !Array.isArray(report.proposals)) throw new Error("invalid inspection report");
  const ids = new Set(report.facts.map(f => f.id));
  for (const proposal of report.proposals) for (const field of Object.values(proposal.fields)) {
    if (["unresolved", "requires-judgment", "unsupported"].includes(field.state) && field.value !== null) throw new Error("unknown report values must be null");
    if (field.evidence?.some(id => !ids.has(id))) throw new Error("proposal evidence does not resolve");
  }
}

export function renderInspection(report) {
  // JSON blocks preserve exact paths, strings and evidence without Markdown injection or lossy tables.
  const block = value => `\n\`\`\`json\n${JSON.stringify(value, null, 2).replaceAll("`", "\\u0060")}\n\`\`\`\n`;
  const inline = value => `\`${JSON.stringify(value).replaceAll("`", "\\u0060").replaceAll("|", "\\u007c").replaceAll("<", "\\u003c")}\``;
  const details = (label, value) => `<details>\n<summary>${label}</summary>\n${block(value)}\n</details>\n`;
  const rows = report.proposals.map(p => {
    const symbols = p.fields.symbols.value;
    const summary = symbols === null ? "Unresolved (see positive facts)" : symbols.length ? `${inline(symbols.slice(0, 10))}${symbols.length > 10 ? ` (${symbols.length} total)` : ""}` : "Observed empty declaration set";
    return `| ${inline(p.candidateKey)} | ${p.fields.path.state} | ${summary} |`;
  });
  return `# Contract inspection\n\nUnit: ${inline(report.unit)}. Coverage: **${report.coverage.state}**. Snapshot stable: **${report.stable}**.\n\nReview report only. Imports are not architectural edges; unknown is not empty. No contract was written.\n\n${report.facts.length} observations; ${report.diagnostics.length} extraction diagnostics; ${report.graphDiagnostics.length} graph diagnostics; ${report.discrepancies.length} discrepancies.\n\n## Entry candidates\n\n| Entry | Path | Declared symbols (review required) |\n|---|---|---|\n${rows.join("\n") || "| None identified | Unresolved | Select an entry or inspect manually |"}\n\n## Decisions\n\n${report.decisions.map(d => `- ${d}`).join("\n")}\n\n${details("Field proposals and preserved authored values", { proposals: report.proposals, fields: report.fields })}\n${details("Source evidence", report.facts)}\n${details("Coverage, limitations and follow-up boundaries", { coverage: report.coverage, diagnostics: report.diagnostics, graphDiagnostics: report.graphDiagnostics, discrepancies: report.discrepancies, followUp: report.followUp })}\n${details("Snapshot and analysis policy", { reportVersion: report.reportVersion, cgVersion: report.cgVersion, adapters: report.adapters, policy: report.policy, snapshot: report.snapshot })}`;
}
