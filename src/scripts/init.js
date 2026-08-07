/**
 * Scaffold Contract Graph governance into a target repository.
 *
 * Applies the explicit source-to-repository mapping plus the selected fork-loaded principle files. Never
 * overwrites an existing file — an install that silently replaces your constitution is an
 * install nobody can trust. Existing files are reported as skipped.
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

/** Directory-level source mapping. `profiles` is configuration and is never scaffolded. */
export const SCAFFOLD_MAPPING = Object.freeze([
  {
    source: "principles",
    target: ".agents/cg/principles",
    mode: "always",
    select: "top-level-markdown",
  },
  { source: "governance", target: ".agents/cg", mode: "always", select: "tree" },
  { source: "skills", target: ".agents/skills", mode: "always", select: "tree" },
  { source: "scaffold/rules", target: ".agents/rules", mode: "always", select: "tree" },
  // `starter` rather than `always`: the module tree is an example contract for a repository
  // that has no modules yet. Writing it into a brownfield repo invents a module that does not
  // exist — see `shouldScaffoldModule`.
  { source: "scaffold/module", target: "src", mode: "starter", select: "tree" },
  // The three document trees the skills already write to. `docsRoot` marks a target whose
  // first segment is replaced by the repository's chosen docs root, so a repo that already
  // owns `docs/` can put them somewhere else without the mapping growing a special case.
  { source: "scaffold/docs/plans", target: "docs/plans", mode: "always", select: "tree", docsRoot: true },
  { source: "scaffold/docs/design", target: "docs/design", mode: "always", select: "tree", docsRoot: true },
  { source: "scaffold/docs/guides", target: "docs/guides", mode: "always", select: "tree", docsRoot: true },
  { source: "scaffold/profiles", target: null, mode: "never", select: "tree" },
]);

function copyFile(source, target, written, skipped) {
  if (fs.existsSync(target)) {
    skipped.push(target);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  written.push(target);
}

function copyTree(from, to, written, skipped) {
  // Record every outcome so the CLI can distinguish newly installed files from files that
  // already belonged to the target repository.
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(target, { recursive: true });
      copyTree(source, target, written, skipped);
      continue;
    }
    copyFile(source, target, written, skipped);
  }
}

/** Rewrite a `docsRoot` rule's leading segment with the repository's chosen root. */
export function resolveTarget(rule, docsRoot = DEFAULT_DOCS_ROOT) {
  if (!rule.docsRoot) return rule.target;
  const [, ...rest] = rule.target.split("/");
  return [docsRoot, ...rest].join("/");
}

function applyMappingRule(rule, repoRoot, written, skipped, docsRoot) {
  if (rule.mode === "never") return;
  const source = path.join(SOURCE_ROOT, rule.source);
  const target = path.join(repoRoot, resolveTarget(rule, docsRoot));

  if (rule.select === "tree") {
    copyTree(source, target, written, skipped);
    return;
  }
  if (rule.select === "top-level-markdown") {
    for (const filename of fs.readdirSync(source).filter((name) => name.endsWith(".md")).sort()) {
      copyFile(path.join(source, filename), path.join(target, filename), written, skipped);
    }
    return;
  }
  throw new Error(`unknown scaffold mapping selector: ${rule.select}`);
}

const sha256 = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/**
 * Record what this version scaffolded, and the hash each file had on the way in.
 *
 * `cg upgrade` is not built yet, but it cannot be built retroactively: distinguishing a
 * file you edited from one still exactly as shipped needs a baseline captured at scaffold
 * time. A release that omits the record forces its users through a manual migration a
 * second time, so the record ships now and the verb follows.
 *
 * Files already present are recorded with `adopted: true` — their contents predate this
 * install, so their hash is evidence of what is there, not of what was shipped.
 */
function writeManifest(repoRoot, version, written, skipped, docsRoot) {
  const file = manifestPath(repoRoot);
  const files = {};
  const record = (target, adopted) => {
    if (target === file) return;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return;
    const key = path.relative(repoRoot, target).split(path.sep).join("/");
    files[key] = { version, sha256: sha256(target), ...(adopted ? { adopted: true } : {}) };
  };

  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).files ?? {} : {};
  for (const target of skipped) record(target, true);
  for (const target of written) record(target, false);

  // An existing entry always wins. The baseline must stay the hash captured when the file
  // first arrived — refreshing it on a later run would silently adopt the user's edits as
  // "pristine" and destroy the only evidence `cg upgrade` has that they changed anything.
  const merged = { ...files, ...previous };
  const desired = `${JSON.stringify(
    { version, docs: docsRoot, files: Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]])) },
    null,
    2,
  )}\n`;
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === desired) {
    skipped.push(file);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, desired, "utf8");
  written.push(file);
}

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



export function init(repoRoot, { profiles, docs } = {}) {
  const written = [];
  const skipped = [];

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
    applyMappingRule(rule, repoRoot, written, skipped, docsRoot);
  }


  // The bundled phase map names every set Contract Graph ships. A repository only installs
  // some, and the phase map may only name what exists — so narrow it to the selection on the
  // way in. Installing a pack later fails verification until a phase claims it, which is the
  // prompt to decide where it belongs rather than a chore.
  clearStarterInheritance(repoRoot, brownfield, written);

  writeManifest(repoRoot, PACKAGE_VERSION, written, skipped, docsRoot);

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

  return { written, skipped, profiles: selectedProfiles, docs: docsRoot, brownfield };
}
