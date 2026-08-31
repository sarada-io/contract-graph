/**
 * Find documents under the plans tree that nothing still points at.
 *
 * The claim Contract Graph makes is that its working documents are consumed and discarded — a
 * stack that shrinks as the graph is built, not a wiki that accretes. Nothing enforced that. A
 * phase folder left behind by a half-finished archive move, a plan predating adoption, a report
 * whose findings all landed somewhere else: each is invisible, and an empty directory is invisible
 * even to `git status`.
 *
 * Reachability answers it the way the rest of the framework answers everything: the roadmap links
 * its phases, a preparation record links its Step briefs, and anything you cannot reach from a
 * root is residue. That is the same traversal a contract graph already asks an agent to perform,
 * applied to the transient tree instead of the permanent one.
 */

import fs from "node:fs";
import path from "node:path";

import { productHasHarvestedRules } from "./model.js";
import { loadContractGraph } from "./contracts.js";
import { profilePath } from "./profiles.js";

/** Markdown inline links and reference definitions. Bare paths in prose are deliberately ignored. */
const LINK = /\[[^\]]*\]\(<?([^)>\s]+)[^)]*\)|^\[[^\]]+\]:\s*(\S+)/gm;

/** Always claimed: the log is permanent by design, the README is optional prose about the tree. */
const NAMED_ROOTS = new Set(["decision-log.md", "README.md"]);

/** Drained or ignored already — not this command's business. */
const EXEMPT_DIRS = new Set(["archive", "auto-run"]);

/** Warmup's outputs, which are legitimately unreferenced while warmup is still running. */
const WARMUP_FILES = new Set([
  "warmup-findings.md",
  "warmup-report.md",
  "warmup-corrective-set.md",
  "warmup-reseed-delta.md",
]);
const RESEED_DELTA = "warmup-reseed-delta.md";

/**
 * Has warmup finished?
 *
 * The same measurement `cg verify` uses to decide whether the resume log is still needed. Before
 * it is true, warmup's files are live working state and reporting them would be noise; after, they
 * are exactly the litter this command exists to name.
 */
export function warmupComplete(repoRoot) {
  let graph;
  try {
    graph = loadContractGraph(repoRoot);
  } catch {
    return false;
  }
  if (graph.failures.length || graph.records.filter((record) => record.contract.unit !== ".").length === 0) {
    return false;
  }

  try {
    return productHasHarvestedRules(repoRoot);
  } catch {
    return false;
  }
}

const isMarkdown = (file) => file.toLowerCase().endsWith(".md");

/** Every file and directory under the plans tree, minus the exempt subtrees. */
function walk(root) {
  const files = [];
  const dirs = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXEMPT_DIRS.has(entry.name)) continue;
        dirs.push(full);
        visit(full);
        continue;
      }
      files.push(full);
    }
  };
  if (fs.existsSync(root)) visit(root);
  return { files, dirs };
}

/** Link targets inside the plans tree, resolved against the file that names them. */
function linksFrom(file, plansRoot) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const out = [];
  LINK.lastIndex = 0;
  for (const match of text.matchAll(LINK)) {
    const target = match[1] ?? match[2];
    if (!target || /^[a-z]+:/i.test(target) || target.startsWith("#")) continue;
    const resolved = path.resolve(path.dirname(file), target.split("#")[0]);
    if (resolved.startsWith(plansRoot + path.sep)) out.push(resolved);
  }
  return out;
}

export function residue(repoRoot, { docs } = {}) {
  const docsRoot = docs ?? readDocsRoot(repoRoot);
  const plansRoot = path.join(repoRoot, docsRoot, "plans");
  const { files, dirs } = walk(plansRoot);
  const rel = (f) => path.relative(repoRoot, f).split(path.sep).join("/");

  const finished = warmupComplete(repoRoot);
  const roots = files.filter((file) => {
    const name = path.basename(file);
    const depth = path.relative(plansRoot, file).split(path.sep).length - 1;

    // A roadmap is a root because nothing links *to* it — it is where a reader starts. It is a
    // root one level down as well, because that is the shape the framework asks for: one folder
    // per programme, holding its roadmap and its phases, so closing a programme is one move
    // rather than a roadmap plus N phase directories chased separately.
    if (/roadmap/i.test(name) && depth <= 1) return true;

    if (depth !== 0) return false;
    if (NAMED_ROOTS.has(name)) return true;
    if (name === RESEED_DELTA) return true;
    return WARMUP_FILES.has(name) && !finished;
  });

  const reachable = new Set(roots);
  const queue = [...roots];
  while (queue.length) {
    const file = queue.pop();
    if (!isMarkdown(file)) continue;
    for (const target of linksFrom(file, plansRoot)) {
      const hits = fs.existsSync(target) && fs.statSync(target).isDirectory()
        ? files.filter((f) => f.startsWith(target + path.sep))
        : [target];
      for (const hit of hits) {
        if (!fs.existsSync(hit) || reachable.has(hit)) continue;
        reachable.add(hit);
        queue.push(hit);
      }
    }
  }

  const unreachable = files
    .filter((file) => !reachable.has(file))
    .map((file) => ({
      path: rel(file),
      why:
        WARMUP_FILES.has(path.basename(file)) && finished && path.basename(file) !== RESEED_DELTA
          ? "warmup finished; its working files have no reader left"
          : "not reachable by a link from any root",
    }));

  const empty = dirs
    .filter((dir) => !fs.readdirSync(dir).length)
    .map((dir) => ({ path: rel(dir), why: "empty directory — git does not track it, so nothing else reports it" }));

  return {
    docs: docsRoot,
    roots: roots.map(rel).sort(),
    claimed: reachable.size,
    residue: [...unreachable, ...empty].sort((a, b) => a.path.localeCompare(b.path)),
  };
}

function readDocsRoot(repoRoot) {
  const record = profilePath(repoRoot);
  if (!fs.existsSync(record)) return "docs";
  try {
    return JSON.parse(fs.readFileSync(record, "utf8")).docs ?? "docs";
  } catch {
    return "docs";
  }
}
