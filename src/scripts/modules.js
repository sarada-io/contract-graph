/**
 * Discover the module roots a repository actually has.
 *
 * A directory is not a module; a unit the build treats as a unit is. So this reads build
 * manifests rather than guessing from directory shape, and it is deliberately a heuristic
 * with a stated basis: every result carries the file that produced it, so a wrong answer is
 * arguable rather than mysterious.
 *
 * Nothing here fails a build. Detection drives an advisory and the `cg modules` report,
 * because a heuristic that hard-fails a build is a heuristic everyone learns to bypass.
 */

import fs from "node:fs";
import path from "node:path";

/** Build manifests that mark a directory as a unit, and what to call the ecosystem. */
const MANIFESTS = Object.freeze({
  "go.mod": "go",
  "package.json": "node",
  "pyproject.toml": "python",
  "Cargo.toml": "rust",
  "build.gradle": "jvm",
  "build.gradle.kts": "jvm",
  "pom.xml": "jvm",
  "composer.json": "php",
  "Gemfile": "ruby",
});

/** Never descend into these — vendored, generated, or tool-owned. */
const SKIP = new Set([
  ".git",
  ".agents",
  ".claude",
  ".github",
  "node_modules",
  "vendor",
  "target",
  "build",
  "dist",
  "out",
  "bin",
  "obj",
  ".venv",
  "venv",
  "__pycache__",
  ".gradle",
  ".idea",
  ".vscode",
  "coverage",
  "tmp",
]);

const MAX_DEPTH = 4;

/**
 * Module roots, sorted by path, each with the manifest that identified it.
 *
 * A repository root carrying its own manifest is reported even when nested modules exist:
 * in Go that root *is* a module and governs everything no nested `go.mod` claims. Dropping
 * it would hide the largest unit in the repository, which is the opposite of the point.
 */
export function detectModuleRoots(repoRoot) {
  const found = [];

  const walk = (dir, depth) => {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ecosystem = MANIFESTS[entry.name];
      if (!ecosystem) continue;
      const key = path.relative(repoRoot, dir).split(path.sep).join("/");
      found.push({ path: key === "" ? "." : key, manifest: entry.name, ecosystem, depth });
      break;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
      walk(path.join(dir, entry.name), depth + 1);
    }
  };

  walk(repoRoot, 0);

  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Compare detected roots with what `map/inheritance.json` actually governs.
 *
 * A root is covered when the map names it or names an ancestor of it — a contract on
 * `services/` governs `services/billing/` through inheritance, and reporting that as a gap
 * would train people to ignore the report.
 */
export function moduleCoverage(repoRoot, folders) {
  const mapped = Object.keys(folders ?? {});
  const covers = (root) =>
    mapped.some((key) => root === key || root.startsWith(`${key}/`));

  const detected = detectModuleRoots(repoRoot);
  // A manifest at the repository root is the container once anything inside is mapped —
  // flagging it then would be noise. With nothing mapped at all it is the loudest possible
  // signal that warmup has not run, so it stays in the list.
  const rootIsContainer = mapped.length > 0;
  return {
    detected,
    mapped,
    unmapped: detected.filter((m) => !covers(m.path) && !(m.path === "." && rootIsContainer)),
  };
}

/** Directories that hold tests or fixtures rather than the boundaries a contract describes. */
const NOT_A_BOUNDARY = new Set(["test", "tests", "spec", "specs", "__tests__", "it", "e2e", "fixtures"]);

/**
 * Implementation files, in any language the manifest table above can detect.
 *
 * Build-script extensions are deliberately absent — `.kts`, `.gradle`, `.sbt`. A `build.gradle.kts`
 * beside a module's source made the module root itself look code-bearing, which collapsed the
 * shared prefix to nothing and reported every module as having exactly one sub-boundary. Excluding
 * by extension rather than by filename matters: `build.ts` and `settings.js` are ordinary source.
 */
const SOURCE_FILE =
  /\.(java|kt|scala|go|rs|py|rb|php|cs|fs|swift|m|mm|c|h|cc|cpp|hpp|ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/i;

/**
 * Count the sub-boundaries a module actually contains.
 *
 * `cg modules` reads build manifests, and no manifest declares a package — so the level of the
 * graph that matters most for routing is exactly the level detection is blind to. Measured: a
 * ten-module repository whose hand-written contracts had eleven package-level children, where
 * one adoption run wrote nineteen sub-module contracts and another declared every module a leaf.
 *
 * The heuristic: descend past the single-child chain every language puts in front of its source
 * (`src/main/java/com/acme/thing`), then count the code-bearing directories at the point where it
 * first branches. A flat module branches nowhere and returns 0, which is what a real leaf looks
 * like. Test trees are excluded — they mirror the production shape and would double every count.
 */
export function subBoundaryNames(repoRoot, modulePath) {
  const root = path.join(repoRoot, modulePath);
  const codeDirs = [];

  const walk = (dir, segments) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const hasCode = entries.some(
      (e) => e.isFile() && SOURCE_FILE.test(e.name) && !(e.name in MANIFESTS),
    );
    if (hasCode) codeDirs.push(segments);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP.has(entry.name) || NOT_A_BOUNDARY.has(entry.name)) continue;
      walk(path.join(dir, entry.name), [...segments, entry.name]);
    }
  };
  walk(root, []);
  if (codeDirs.length < 2) return [];

  // The branch point is where the shared prefix of every code directory ends.
  let shared = 0;
  for (;;) {
    const head = codeDirs[0][shared];
    if (head === undefined || !codeDirs.every((s) => s[shared] === head)) break;
    shared += 1;
  }
  return [...new Set(codeDirs.filter((s) => s.length > shared).map((s) => s[shared]))];
}

/** How many separate boundaries a module's source branches into. */
export function subBoundaryCount(repoRoot, modulePath) {
  return subBoundaryNames(repoRoot, modulePath).length;
}
