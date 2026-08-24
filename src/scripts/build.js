/**
 * Deterministic package compiler.
 *
 * Architecture and product catalogs are authored YAML like enforcement.yaml: `cg build`
 * validates them and copies them into the package target. That directory is the complete
 * package target: it can be verified without asking npm which additional files it will
 * gather from elsewhere.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { loadBindingCatalog } from "./binding.js";
import {
  PRINCIPLE_FILES,
  loadEngineeringCatalog,
  loadEnforcementCatalog,
  loadProductCatalog,
} from "./model.js";

export const COMPILED_VERSION = "1.0";
export const BUILD_DIRECTORY = "build";
export const PACKAGE_DATA_DIRECTORY = "agent/cg/guidelines";

const PACKAGE_TREE_MAPPINGS = Object.freeze([
  ["src/cg/principles", "agent/cg/principles"],
  ["src/cg/guidelines", "agent/cg/guidelines"],
  ["src/cg/schema", "agent/cg/schema"],
  ["src/skills", "agent/skills"],
  ["src/install/hooks", "agent/hooks"],
  ["src/install/profiles", "agent/profiles"],
  ["src/install/templates/module", "agent/templates/module"],
  ["src/install/templates/docs", "agent/templates/docs"],
  ["src/scripts", "script"],
]);
const PACKAGE_FILE_MAPPINGS = Object.freeze([
  ["LICENSE", "LICENSE"],
  ["README.md", "README.md"],
  ["src/cg/contract-graph-agent.md", "agent/cg/contract-graph-agent.md"],
  ["src/cg/contract.yaml", "agent/cg/contract.yaml"],
  ["src/cg/workflow.md", "agent/cg/workflow.md"],
  ["src/cg/phases.json", "agent/cg/phases.json"],
  ["src/cg/enforcement.yaml", "agent/cg/enforcement.yaml"],
]);
const PACKAGE_EXCLUDES = new Set(["src/scripts/dev.js"]);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const posix = (value) => value.split(path.sep).join("/");

export class BuildError extends Error {}

/** Reject unexpected catalog sources and require every registered catalog file to exist. */
export function compilePrincipleAssets(repoRoot) {
  const checks = [
    [path.join(repoRoot, "src", "cg", "guidelines"), new Set(Object.keys(PRINCIPLE_FILES))],
    [path.join(repoRoot, "src", "cg", "principles"), new Set(["architecture.yaml"])],
  ];
  for (const [sourceRoot, expected] of checks) {
    const relative = posix(path.relative(repoRoot, sourceRoot));
    if (!fs.existsSync(sourceRoot)) throw new BuildError(`missing catalog source directory: ${relative}`);
    const unexpected = fs.readdirSync(sourceRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:md|ya?ml)$/.test(entry.name) && !expected.has(entry.name))
      .map((entry) => entry.name)
      .sort();
    if (unexpected.length) {
      throw new BuildError(`catalog source(s) have no compiler definition: ${unexpected.join(", ")}`);
    }
    for (const filename of [...expected].sort()) {
      const file = path.join(sourceRoot, filename);
      if (!fs.existsSync(file)) throw new BuildError(`missing catalog source: ${posix(path.relative(repoRoot, file))}`);
    }
  }
  return new Map();
}

// Each compiler owns a disjoint subtree. Future deterministic compilers are added here so one
// build command remains the only package build entry point.
const COMPILERS = Object.freeze([
  { id: "principles", compile: compilePrincipleAssets },
]);

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files.push(file);
    }
  };
  walk(root);
  return files.sort();
}

function packageSourceAssets(repoRoot) {
  const assets = new Map();
  const add = (file, target) => {
    const sourceRelative = posix(path.relative(repoRoot, file));
    if (PACKAGE_EXCLUDES.has(sourceRelative)) return;
    const stat = fs.statSync(file);
    assets.set(target, {
      content: fs.readFileSync(file),
      mode: stat.mode & 0o777,
    });
  };
  const walk = (dir, targetRoot) => {
    if (!fs.existsSync(dir)) throw new BuildError(`missing package source: ${posix(path.relative(repoRoot, dir))}`);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const target = `${targetRoot}/${entry.name}`;
      if (entry.isDirectory()) walk(file, target);
      else if (entry.isFile()) add(file, target);
      else throw new BuildError(`package source must not contain links or special files: ${posix(path.relative(repoRoot, file))}`);
    }
  };
  for (const [source, target] of PACKAGE_TREE_MAPPINGS) walk(path.join(repoRoot, source), target);
  for (const [source, target] of PACKAGE_FILE_MAPPINGS) {
    const file = path.join(repoRoot, source);
    if (!fs.existsSync(file)) throw new BuildError(`missing package source: ${source}`);
    add(file, target);
  }

  const sourcePackage = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const packaged = {
    ...sourcePackage,
    bin: { cg: "script/cli.js" },
    exports: {
      ".": "./script/contracts.js",
      "./contracts": "./script/contracts.js",
      "./schema": "./agent/cg/schema/contract.schema.json",
      "./architecture-schema": "./agent/cg/schema/architecture.schema.json",
      "./engineering-schema": "./agent/cg/schema/engineering.schema.json",
      "./product-schema": "./agent/cg/schema/product.schema.json",
      "./architecture-rules": "./agent/cg/principles/architecture.yaml",
      "./guidelines/*": "./agent/cg/guidelines/*.yaml",
    },
  };
  delete packaged.files;
  delete packaged.scripts;
  assets.set("package.json", {
    content: Buffer.from(`${JSON.stringify(packaged, null, 2)}\n`),
    mode: 0o644,
  });
  return assets;
}

/** Compile every package-owned source into one reproducible output directory. */
export function build(repoRoot, { write = true } = {}) {
  const root = path.resolve(repoRoot);
  const outputRoot = path.resolve(root, BUILD_DIRECTORY);
  if (path.relative(root, outputRoot) !== BUILD_DIRECTORY) {
    throw new BuildError(`refusing to build outside \`${BUILD_DIRECTORY}\``);
  }

  // Binding, enforcement, architecture, and product YAML ship as authored data rather than
  // compiled projections, but all must pass catalog validation before any package target is assembled.
  loadBindingCatalog(path.join(root, "src", "cg", "principles", "architecture.yaml"), { repoRoot: root });
  loadEnforcementCatalog(path.join(root, "src", "cg", "enforcement.yaml"), { repoRoot: root });
  loadEngineeringCatalog(path.join(root, "src", "cg", "guidelines", "engineering.yaml"), { repoRoot: root });
  loadProductCatalog(path.join(root, "src", "cg", "guidelines", "product.yaml"), { repoRoot: root });

  const assets = packageSourceAssets(root);
  const compilerEntries = [];
  for (const compiler of COMPILERS) {
    const outputs = compiler.compile(root);
    const names = [];
    for (const [relative, content] of outputs) {
      if (
        typeof relative !== "string" ||
        path.isAbsolute(relative) ||
        relative.split(/[\\/]/).some((part) => !part || part === "." || part === "..")
      ) {
        throw new BuildError(`compiler \`${compiler.id}\` produced unsafe path \`${relative}\``);
      }
      if (typeof content !== "string") {
        throw new BuildError(`compiler \`${compiler.id}\` produced non-text output for \`${relative}\``);
      }
      if (assets.has(relative)) throw new BuildError(`two package producers own \`${relative}\``);
      assets.set(relative, { content: Buffer.from(content), mode: 0o644 });
      names.push(relative);
    }
    compilerEntries.push({ id: compiler.id, outputs: names.sort() });
  }

  const fileHashes = Object.fromEntries(
    [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([relative, asset]) => [
      relative,
      { sha256: sha256(asset.content), mode: asset.mode.toString(8).padStart(3, "0") },
    ]),
  );
  assets.set("manifest.json", {
    content: Buffer.from(`${JSON.stringify({
      compiledVersion: COMPILED_VERSION,
      compilers: compilerEntries,
      files: fileHashes,
    }, null, 2)}\n`),
    mode: 0o644,
  });

  const previous = new Map(
    listFiles(outputRoot).map((file) => [
      posix(path.relative(outputRoot, file)),
      { content: fs.readFileSync(file), mode: fs.statSync(file).mode & 0o777 },
    ]),
  );
  const changed = [...assets]
    .filter(([relative, asset]) => {
      const prior = previous.get(relative);
      return !prior || prior.mode !== asset.mode || !prior.content.equals(asset.content);
    })
    .map(([relative]) => relative)
    .sort();
  const removed = [...previous.keys()].filter((relative) => !assets.has(relative)).sort();

  // Compilation happens fully in memory before this generated directory is replaced. The exact
  // target is asserted above; no authored source can be removed by this operation.
  if (write) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
    for (const [relative, asset] of assets) {
      const file = path.join(outputRoot, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, asset.content);
      fs.chmodSync(file, asset.mode);
    }
  }

  return {
    root: outputRoot,
    compilers: compilerEntries.map((entry) => entry.id),
    files: [...assets.keys()].sort(),
    changed,
    removed,
  };
}
