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
