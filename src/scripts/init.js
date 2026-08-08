/**
 * Scaffold Contract Graph governance into a target repository.
 *
 * Applies the explicit source-to-repository mapping plus the selected fork-loaded principle
 * files. Framework core is replaced on every run; the repository's own context under
 * `.agents/cg/` is copied only when absent — see `SCAFFOLD_MAPPING`. Install and re-install
 * are the same verb, which is how a repository picks up a new release.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_DOCS_ROOT,
  DOCS_TREES,
  inheritancePath,
  manifestPath,
  phasesPath,
} from "./model.js";
import {
  loadProfileSelection,
  normalizeProfiles,
  profilePath,
  resolveProfiles,
} from "./profiles.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SOURCE_ROOT = path.join(HERE, "..");

/** The version stamped into every manifest entry, read from the installed package. */
export const PACKAGE_VERSION = JSON.parse(
  fs.readFileSync(path.join(SOURCE_ROOT, "..", "package.json"), "utf8"),
).version;

/**
 * Directory-level source mapping. `profiles` is configuration and is never scaffolded.
 *
 * `install` says who owns a file, and it is the whole difference between reinstalling and
 * destroying someone's work:
 *
 * - `replace` — framework core. The package is the only author, so `cg init` overwrites it on
 *   every run. That is what makes install and re-install the same command: a repository picks
 *   up new skills by running the one verb it already knows.
 * - `preserve` — the repository's own context, copied only when absent. `.agents/cg/` is the
 *   contract graph this repository built: its root contract, routing and inheritance maps,
 *   harvested principle families. `cg-warmup` writes that, over hours, from real code. No
 *   release has a version of it to offer, so no run of `cg init` may overwrite it. The document
 *   trees and the starter module are preserved for the same reason.
 */
export const SCAFFOLD_MAPPING = Object.freeze([
  {
    source: "principles",
    target: ".agents/cg/principles",
    mode: "always",
    select: "top-level-markdown",
    install: "preserve",
  },
  { source: "governance", target: ".agents/cg", mode: "always", select: "tree", install: "preserve" },
  { source: "skills", target: ".agents/skills", mode: "always", select: "tree", install: "replace" },
  { source: "scaffold/hooks", target: ".agents/hooks", mode: "always", select: "tree", install: "replace" },
  // Shipped so the file exists on a first install; its *content* belongs to `cg sync`, which
  // regenerates it unconditionally. Marking it `replace` would make every clean re-run report a
  // pending change to a file the next command rewrites anyway.
  { source: "scaffold/rules", target: ".agents/rules", mode: "always", select: "tree", install: "preserve" },
  // `starter` rather than `always`: the module tree is an example contract for a repository
  // that has no modules yet. Writing it into a brownfield repo invents a module that does not
  // exist — see `shouldScaffoldModule`.
  { source: "scaffold/module", target: "src", mode: "starter", select: "tree", install: "preserve" },
  // The three document trees the skills already write to. `docsRoot` marks a target whose
  // first segment is replaced by the repository's chosen docs root, so a repo that already
  // owns `docs/` can put them somewhere else without the mapping growing a special case.
  { source: "scaffold/docs/plans", target: "docs/plans", mode: "always", select: "tree", docsRoot: true, install: "preserve" },
  { source: "scaffold/docs/design", target: "docs/design", mode: "always", select: "tree", docsRoot: true, install: "preserve" },
  { source: "scaffold/docs/guides", target: "docs/guides", mode: "always", select: "tree", docsRoot: true, install: "preserve" },
  { source: "scaffold/profiles", target: null, mode: "never", select: "tree", install: "preserve" },
]);

/**
 * Apply one file according to its rule's `install` policy.
 *
 * A `replace` file that is already byte-identical is reported as `skipped`, not `replaced`.
 * The distinction is what lets `cg init` tell you it is about to change something before it
 * does — a re-run that would rewrite nothing has nothing to warn about.
 */
function copyFile(source, target, rule, out, dryRun) {
  const exists = fs.existsSync(target);
  if (exists && rule.install !== "replace") {
    out.skipped.push(target);
    return;
  }
  if (exists && fs.readFileSync(source).equals(fs.readFileSync(target))) {
    out.skipped.push(target);
    return;
  }
  (exists ? out.replaced : out.written).push(target);
  if (dryRun) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

/** Rewrite a `docsRoot` rule's leading segment with the repository's chosen root. */
export function resolveTarget(rule, docsRoot = DEFAULT_DOCS_ROOT) {
  if (!rule.docsRoot) return rule.target;
  const [, ...rest] = rule.target.split("/");
  return [docsRoot, ...rest].join("/");
}

function applyMappingRule(rule, repoRoot, out, docsRoot, dryRun) {
  if (rule.mode === "never") return;
  for (const { source, target } of enumerateRule(rule, repoRoot, docsRoot)) {
    copyFile(source, target, rule, out, dryRun);
  }
}

/** Walk one source tree, yielding every {source, target, rule} file pair it would install. */
function* walkTree(from, to, rule) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      yield* walkTree(source, target, rule);
      continue;
    }
    yield { source, target, rule };
  }
}



/** Every {source, target} pair one mapping rule installs, in a stable order. */
function* enumerateRule(rule, repoRoot, docsRoot) {
  const source = path.join(SOURCE_ROOT, rule.source);
  const target = path.join(repoRoot, resolveTarget(rule, docsRoot));

  if (rule.select === "tree") {
    yield* walkTree(source, target, rule);
    return;
  }
  if (rule.select === "top-level-markdown") {
    for (const filename of fs.readdirSync(source).filter((name) => name.endsWith(".md")).sort()) {
      yield { source: path.join(source, filename), target: path.join(target, filename), rule };
    }
    return;
  }
  throw new Error(`unknown scaffold mapping selector: ${rule.select}`);
}

/**
 * The complete set of files this version ships into a repository.
 *
 * One enumeration, so anything that needs to know what a release contains — the installer, the
 * manifest, a future migration — cannot disagree with the others about it.
 */
export function scaffoldFiles(repoRoot, { docsRoot = DEFAULT_DOCS_ROOT, brownfield = false } = {}) {
  const pairs = [];
  for (const rule of SCAFFOLD_MAPPING.filter(
    (entry) => entry.mode === "always" || (entry.mode === "starter" && !brownfield),
  )) {
    pairs.push(...enumerateRule(rule, repoRoot, docsRoot));
  }
  return pairs;
}

const sha256 = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/**
 * Record what this version scaffolded, and the hash each file had on the way in.
 *
 * No command reads this yet. It cannot be captured retroactively: telling a file you edited
 * from one still exactly as shipped needs a baseline recorded when the file arrived. A release
 * that omits it forces its users through a manual migration later, so the record ships whether
 * or not a verb consumes it.
 *
 * Files already present are recorded with `adopted: true` — their contents predate this
 * install, so their hash is evidence of what is there, not of what was shipped.
 */
function writeManifest(repoRoot, version, out, docsRoot) {
  const file = manifestPath(repoRoot);
  const files = {};
  const record = (target, adopted) => {
    if (target === file) return;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return;
    const key = path.relative(repoRoot, target).split(path.sep).join("/");
    files[key] = { version, sha256: sha256(target), ...(adopted ? { adopted: true } : {}) };
  };

  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).files ?? {} : {};
  for (const target of out.skipped) record(target, true);
  for (const target of out.written) record(target, false);

  // An existing entry wins for everything except a file this run replaced. The baseline must
  // stay the hash captured when a preserved file first arrived — refreshing it would adopt the
  // repository's edits as "pristine" and destroy the evidence that it changed anything. A
  // replaced file has no such history to protect: this run wrote it, so this run's hash is the
  // truthful record, and keeping the old one would leave the manifest describing a file that
  // is no longer on disk.
  const merged = { ...files, ...previous };
  for (const target of out.replaced) {
    record(target, false);
    const key = path.relative(repoRoot, target).split(path.sep).join("/");
    if (files[key]) merged[key] = files[key];
  }
  const desired = `${JSON.stringify(
    { version, docs: docsRoot, files: Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]])) },
    null,
    2,
  )}\n`;
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === desired) {
    out.skipped.push(file);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, desired, "utf8");
  out.written.push(file);
}

/**
 * Make sure the root `.gitignore` ignores the auto-run ledger.
 *
 * Appended rather than scaffolded: `.gitignore` belongs to the repository, and a file that
 * already carries its own rules must not be replaced by ours. The pattern has no slash, so one
 * root-level line covers the ledger wherever a run writes it.
 *
 * Idempotent by inspection — the line is added only when no existing rule already names it.
 */
export function ensureLedgerIgnored(repoRoot, out, dryRun) {
  const file = path.join(repoRoot, ".gitignore");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (current.split("\n").some((line) => line.trim() === LEDGER_IGNORE)) return;

  const block =
    `${current && !current.endsWith("\n") ? "\n" : ""}` +
    "\n# Contract Graph: cg-auto-run's resume ledger is live state for one run, never history.\n" +
    `${LEDGER_IGNORE}\n`;
  (current ? out.replaced : out.written).push(file);
  if (dryRun) return;
  fs.writeFileSync(file, current + block, "utf8");
}

const LEDGER_IGNORE = ".auto-run.md";

/** Repository entries that do not make a repository "existing" for the purposes below. */
const IGNORED_AT_ROOT = new Set([".git", ".gitignore", ".github", "LICENSE", "README.md"]);

/**
 * The starter module tree is scaffolded only where it means something.
 *
 * It is a worked example: one module with a contract, pointers, and an inherited block, for
 * a repository that has no modules yet. A brownfield repository already has its modules
 * somewhere else — a Go tree with `api/` and `core/` gains nothing from an invented `src/`
 * describing a module that does not exist, and `cg verify` would then pass while governing
 * none of the real ones.
 */
export function shouldScaffoldModule(repoRoot, target) {
  if (fs.existsSync(path.join(repoRoot, target))) return true;
  if (!fs.existsSync(repoRoot)) return true;
  return !fs.readdirSync(repoRoot).some((name) => !IGNORED_AT_ROOT.has(name));
}

/**
 * A brownfield scaffold has no starter module, so it must not ship a map entry for one.
 *
 * The bundled `inheritance.json` maps `src` as a worked example. Left in place after the
 * starter tree is skipped, it points at a contract that does not exist and `cg sync` fails
 * on the very first run — the map is emptied instead, for `cg-warmup` to fill with the
 * repository's real modules.
 */
function clearStarterInheritance(repoRoot, brownfield, written) {
  const file = inheritancePath(repoRoot);
  if (!brownfield || !written.includes(file)) return;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  parsed.folders = {};
  fs.writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}



export function init(repoRoot, { profiles, docs, dryRun = false } = {}) {
  const out = { written: [], replaced: [], skipped: [] };
  const { written, skipped } = out;

  const previous = loadProfileSelection(repoRoot, { allowMissing: true });
  const selectedProfiles = normalizeProfiles(profiles ?? previous?.profiles ?? ["all"]);
  resolveProfiles(selectedProfiles);
  // A repository never silently changes its docs root: once recorded, the record wins
  // unless this run passes an explicit one.
  const docsRoot = docs ?? previous?.docs ?? DEFAULT_DOCS_ROOT;
  if (docsRoot.split(/[\\/]/).length !== 1 || !docsRoot || docsRoot.startsWith(".")) {
    throw new Error(`invalid docs root \`${docsRoot}\`: expected a single directory name`);
  }

  const brownfield = !shouldScaffoldModule(
    repoRoot,
    SCAFFOLD_MAPPING.find((entry) => entry.mode === "starter").target,
  );

  fs.mkdirSync(repoRoot, { recursive: true });
  for (const rule of SCAFFOLD_MAPPING.filter(
    (entry) => entry.mode === "always" || (entry.mode === "starter" && !brownfield),
  )) {
    applyMappingRule(rule, repoRoot, out, docsRoot, dryRun);
  }


  // The bundled phase map names every set Contract Graph ships. A repository only installs
  // some, and the phase map may only name what exists — so narrow it to the selection on the
  // way in. Installing a pack later fails verification until a phase claims it, which is the
  // prompt to decide where it belongs rather than a chore.
  ensureLedgerIgnored(repoRoot, out, dryRun);

  if (dryRun) {
    return { ...out, profiles: selectedProfiles, docs: docsRoot, brownfield };
  }

  clearStarterInheritance(repoRoot, brownfield, written);

  writeManifest(repoRoot, PACKAGE_VERSION, out, docsRoot);

  const record = profilePath(repoRoot);
  const desired = `${JSON.stringify({ profiles: selectedProfiles, docs: docsRoot }, null, 2)}\n`;
  const current = fs.existsSync(record) ? fs.readFileSync(record, "utf8") : null;
  if (current === desired) {
    skipped.push(record);
  } else {
    fs.mkdirSync(path.dirname(record), { recursive: true });
    fs.writeFileSync(record, desired, "utf8");
    written.push(record);
  }

  return { ...out, profiles: selectedProfiles, docs: docsRoot, brownfield };
}
