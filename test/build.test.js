/**
 * @file Check reproducible package assembly, drift detection and extracted-package behavior.
 * @see ../src/runtime/distribution/.agent/contract.md
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { runtimeIdentity } from "../src/runtime/distribution/runtime.js";

import {
  BUILD_DIRECTORY,
  build,
} from "../src/runtime/distribution/build.js";
import {
  ENGINEERING_SCHEMA_ID,
  PRODUCT_SCHEMA_ID,
  loadEngineeringCatalog,
  loadProductCatalog,
} from "../src/runtime/verification/model.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(TEST_DIR, "..");
const CLI = path.join(REPO, "bin", "cg.js");
const PACKAGE_DIRECTORIES = ["bin", "docs", "src"];
const PACKAGE_FILES = ["LICENSE", "README.md", "package.json"];

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-build-"));
  for (const relative of PACKAGE_DIRECTORIES) {
    fs.cpSync(path.join(REPO, relative), path.join(dir, relative), { recursive: true });
  }
  for (const relative of PACKAGE_FILES) fs.copyFileSync(path.join(REPO, relative), path.join(dir, relative));
  return dir;
}

const readJson = (root, relative) =>
  JSON.parse(fs.readFileSync(path.join(root, BUILD_DIRECTORY, relative), "utf8"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

test("maintainer context is excluded from package bytes and runtime identity at every depth", t => {
  const dir = fixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  build(dir);
  const before = fs.readFileSync(path.join(dir, BUILD_DIRECTORY, "manifest.json"), "utf8");
  const identity = runtimeIdentity(dir).buildId;
  for (const relative of [
    "src/runtime/graph/.agent/notes.md",
    "src/skills/.agent/notes.md",
    "src/skills/cg-warmup/references/.agent/notes.md",
    "src/install/templates/module/.agent/notes.md",
    "src/diagnostics/.agent/notes.md",
  ]) {
    const file = path.join(dir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "Maintainer-only context\n");
  }
  assert.equal(runtimeIdentity(dir).buildId, identity);
  build(dir);
  assert.equal(fs.readFileSync(path.join(dir, BUILD_DIRECTORY, "manifest.json"), "utf8"), before);
  const manifest = readJson(dir, "manifest.json");
  assert.ok(!Object.keys(manifest.files).some(file => file.split("/").includes(".agent")));
  assert.equal(runtimeIdentity(path.join(dir, BUILD_DIRECTORY)).buildId, identity);
  assert.ok(manifest.files["agent/skills/cg-warmup/SKILL.md"]);
});

test("cg build copies architecture and product YAML catalogs", () => {
  const dir = fixture();
  const output = execFileSync(process.execPath, [CLI, "build", dir], { encoding: "utf8" });
  assert.match(output, /file\(s\) from 1 compiler/);
  assert.equal(readJson(dir, "package.json").devDependencies, undefined, "schema test tooling must not become package metadata");
  assert.deepEqual(readJson(dir, "package.json").scripts, { postinstall: "node script/distribution/windows-launcher.js" });
  assert.ok(fs.existsSync(path.join(dir, BUILD_DIRECTORY, "script/distribution/windows-launcher.js")));

  assert.equal(fs.existsSync(path.join(dir, BUILD_DIRECTORY, "agent/cg/project-context.md")), true);
  assert.equal(fs.existsSync(path.join(dir, BUILD_DIRECTORY, "agent/templates/docs/project-intent.md")), false);
  const architectureFile = path.join(dir, BUILD_DIRECTORY, "agent/cg/principles/architecture.yaml");
  assert.ok(fs.existsSync(architectureFile));
  assert.equal(
    fs.readFileSync(path.join(dir, BUILD_DIRECTORY, "agent/cg/contract-graph-agent.md"), "utf8"),
    fs.readFileSync(path.join(dir, "src/cg/contract-graph-agent.md"), "utf8"),
    "the reviewable agent prompt must ship byte-for-byte",
  );
  const engineeringFile = path.join(dir, BUILD_DIRECTORY, "agent/cg/guidelines/engineering.yaml");
  assert.ok(fs.existsSync(engineeringFile));
  assert.ok(!fs.existsSync(path.join(dir, BUILD_DIRECTORY, "agent", "cg", "guidelines", "engineering.json")));
  const engineering = loadEngineeringCatalog(engineeringFile, { repoRoot: dir });
  assert.equal(engineering.$schema, ENGINEERING_SCHEMA_ID);
  assert.deepEqual(engineering.families, ["E"]);
  assert.deepEqual(engineering.categories, [
    "Structural Best Practices",
    "Broader Engineering Considerations",
  ]);
  assert.equal(engineering.principles[0].id, "E01");
  assert.equal(engineering.principles[0].category, "Structural Best Practices");
  assert.equal(engineering.principles[0].rules[0].id, "E01-01");
  assert.equal(engineering.principles[0].rules[0].modality, "best-practice");
  for (const relative of ["principles/architecture.yaml", "guidelines/engineering.yaml", "guidelines/product.yaml"]) {
    assert.equal(
      fs.readFileSync(path.join(dir, BUILD_DIRECTORY, "agent/cg", relative), "utf8"),
      fs.readFileSync(path.join(dir, "src/cg", relative), "utf8"),
      `${relative} must ship byte-for-byte`,
    );
  }
  assert.equal(
    engineering.principles.find((principle) => principle.id === "E01").category,
    "Structural Best Practices",
    "surface consumption remains a structural best practice",
  );
  assert.equal(
    engineering.principles.find((principle) => principle.id === "E06").category,
    "Broader Engineering Considerations",
  );
  const prefer = engineering.principles.find((principle) => principle.id === "E12").rules[0];
  assert.equal(prefer.modality, "best-practice");
  assert.ok(prefer.rule);
  assert.ok(prefer.reason);
  assert.ok(prefer.cost);
  assert.ok(!fs.existsSync(path.join(dir, BUILD_DIRECTORY, "agent/cg/principles/governance.json")));
  assert.ok(!fs.existsSync(path.join(dir, BUILD_DIRECTORY, "agent/cg/principles/decisions.json")));

  const productFile = path.join(dir, BUILD_DIRECTORY, "agent/cg/guidelines/product.yaml");
  assert.ok(fs.existsSync(productFile));
  assert.ok(!fs.existsSync(path.join(dir, BUILD_DIRECTORY, "agent", "cg", "principles", "product.json")));
  const product = loadProductCatalog(productFile, { repoRoot: dir });
  assert.equal(product.$schema, PRODUCT_SCHEMA_ID);
  assert.deepEqual(product.principles, []);
});

test("authored assets carry exact hashes and retain the published manifest shape", () => {
  const dir = fixture();
  build(dir);
  const manifest = readJson(dir, "manifest.json");
  for (const [relative, entry] of Object.entries(manifest.files)) {
    const output = fs.readFileSync(path.join(dir, BUILD_DIRECTORY, relative));
    assert.equal(entry.sha256, hash(output), `${relative} output hash`);
    if (process.platform !== "win32") assert.equal(entry.mode, (fs.statSync(path.join(dir, BUILD_DIRECTORY, relative)).mode & 0o777).toString(8).padStart(3, "0"));
  }
  assert.deepEqual(manifest.compilers, [{ id: "principles", outputs: [] }], "authored catalogs have no compiled projections");
  assert.ok(manifest.files["script/cli.js"], "the manifest covers runtime package files too");
  assert.ok(manifest.files["agent/cg/schema/contract.schema.json"]);
});

test("a repeated build is byte-for-byte stable and removes stale generated files", () => {
  const dir = fixture();
  build(dir);
  const architecture = fs.readFileSync(
    path.join(dir, BUILD_DIRECTORY, "agent", "cg", "principles", "architecture.yaml"),
    "utf8",
  );
  fs.writeFileSync(path.join(dir, BUILD_DIRECTORY, "stale.json"), "{}\n");
  const archive = path.join(dir, "dist", "tar", "previous.tgz");
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  fs.writeFileSync(archive, "retained release bytes");

  const second = build(dir);
  assert.deepEqual(second.changed, []);
  assert.deepEqual(second.removed, ["stale.json"]);
  assert.equal(
    fs.readFileSync(path.join(dir, BUILD_DIRECTORY, "agent", "cg", "principles", "architecture.yaml"), "utf8"),
    architecture,
  );
  assert.ok(!fs.existsSync(path.join(dir, BUILD_DIRECTORY, "stale.json")));
  assert.equal(fs.readFileSync(archive, "utf8"), "retained release bytes", "rebuilding must preserve sibling release archives");
});

test("cg build --check detects drift without rewriting compiled output", () => {
  const dir = fixture();
  build(dir);
  const output = path.join(dir, BUILD_DIRECTORY, "agent", "cg", "principles", "architecture.yaml");
  const before = fs.readFileSync(output, "utf8");
  fs.appendFileSync(path.join(dir, "src", "cg", "principles", "architecture.yaml"), "\n");

  const result = spawnSync(process.execPath, [CLI, "build", dir, "--check"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /build\/ differs from its package sources/);
  assert.match(result.stderr, /stale or missing agent\/cg\/principles\/architecture\.yaml/);
  assert.equal(fs.readFileSync(output, "utf8"), before, "check mode must not rewrite output");
});

test("the product catalog rejects a non-P rule", () => {
  const dir = fixture();
  fs.writeFileSync(
    path.join(dir, "src", "cg", "guidelines", "product.yaml"),
    `$schema: https://contractgraph.dev/schema/principles-v1.schema.json
principlesVersion: "1.0"
family: product
binding: scoped
principles:
  - id: P01
    title: Wrong family
    entries:
      - id: E01-01
        statement: Prefer the smaller option.
        reason: Wrong family ids are refused.
`,
  );
  assert.throws(() => build(dir), /E01-01/);
});

test("the package still ships engineering defaults even though adopters may retire them", (t) => {
  const dir = fixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, "src/cg/guidelines/engineering.yaml"), `$schema: https://contractgraph.dev/schema/principles-v1.schema.json
principlesVersion: "1.0"
family: engineering
binding: advisory
categories: []
principles: []
`);
  assert.throws(() => build(dir), /package must ship a populated engineering catalog/);
});

test("the architecture catalog rejects an empty cost", () => {
  const dir = fixture();
  const file = path.join(dir, "src", "cg", "guidelines", "engineering.yaml");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(/\n(\s+)cost: .+\n/, "\n$1cost: \"\"\n"),
  );
  assert.throws(() => build(dir), /cost: expected a non-empty string/);
});

test("the architecture catalog rejects a rule without a reason", () => {
  const dir = fixture();
  const file = path.join(dir, "src", "cg", "guidelines", "engineering.yaml");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(/\n(\s+)reason: .+\n/, "\n"),
  );
  assert.throws(() => build(dir), /reason: expected a non-empty string|missing `reason`/);
});

test("the product catalog rejects a leftover Markdown source", () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, "src", "cg", "guidelines", "product.md"), "# Leftover\n");
  assert.throws(() => build(dir), /product\.md/);
});

test("the architecture catalog rejects a leftover Markdown source", () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, "src", "cg", "guidelines", "engineering.md"), "# Leftover\n");
  assert.throws(() => build(dir), /engineering\.md/);
});

test("the build rejects an unregistered Markdown principle source", () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, "src", "cg", "guidelines", "misc.md"), "# Misc\n");
  assert.throws(() => build(dir), /misc\.md/);
});

test("the build rejects a structural binding without registered enforcement", () => {
  const dir = fixture();
  const file = path.join(dir, "src", "cg", "principles", "architecture.yaml");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace("cg.verify.binding-enforcement", "cg.verify.ghost"),
  );
  assert.throws(() => build(dir), /implementation: expected cg\.verify\.binding-enforcement/);
});

test("the build refuses reintroduced legacy schemas and requires the shared schema", (t) => {
  const dir = fixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ["architecture", "engineering", "product"]) {
    const file = path.join(dir, `src/cg/schema/${name}.schema.json`);
    fs.writeFileSync(file, "{}");
    assert.throws(() => build(dir), new RegExp(`${name}\\.schema\\.json`));
    fs.rmSync(file);
  }
  fs.rmSync(path.join(dir, "src/cg/schema/principles.schema.json"));
  assert.throws(() => build(dir), /missing catalog source: src\/cg\/schema\/principles.schema.json/);
});

test("an extracted tarball resolves shared exports and migrates a repository without source-tree fallbacks", async (t) => {
  const dir = fixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  build(dir);
  const packed = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath, "pack", path.join(dir, BUILD_DIRECTORY), "--pack-destination", dir, "--ignore-scripts", "--json"], { encoding: "utf8" }))[0];
  const consumer = path.join(dir, "consumer");
  const packageRoot = path.join(consumer, "node_modules/contract-graph");
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(consumer, "package.json"), '{"name":"independent-adopter","private":true}');
  execFileSync("tar", ["-xzf", path.join(dir, packed.filename), "--strip-components=1", "-C", packageRoot]);
  // Supply the already-installed runtime dependency without network or development dependencies.
  fs.cpSync(path.join(REPO, "node_modules/yaml"), path.join(consumer, "node_modules/yaml"), { recursive: true });
  // Block ancestor dependency fallback and prove ordinary commands never load the parser.
  const parserRoot = path.join(consumer, "node_modules/typescript");
  fs.mkdirSync(parserRoot);
  fs.writeFileSync(path.join(parserRoot, "package.json"), '{"type":"module","exports":"./unavailable.js"}');
  fs.writeFileSync(path.join(parserRoot, "unavailable.js"), 'export default {}; throw new Error("fixture parser unavailable");');
  fs.rmSync(path.join(dir, "src"), { recursive: true });
  fs.rmSync(path.join(dir, BUILD_DIRECTORY), { recursive: true });
  const require = createRequire(path.join(consumer, "consumer.cjs"));
  for (const name of ["principles", "architecture", "engineering", "product"]) {
    let resolved;
    assert.doesNotThrow(() => { resolved = require.resolve(`contract-graph/${name}-schema`); }, `${name} schema export must resolve in the extracted package`);
    assert.equal(resolved, fs.realpathSync(path.join(packageRoot, "agent/cg/schema/principles.schema.json")));
  }
  assert.equal(require.resolve("contract-graph/schema"), fs.realpathSync(path.join(packageRoot, "agent/cg/schema/contract.schema.json")));
  assert.deepEqual(fs.readdirSync(path.join(packageRoot, "agent/cg/schema")).sort(), ["contract.schema.json", "enforcement.schema.json", "principles.schema.json"]);
  assert.equal(fs.existsSync(path.join(packageRoot, "src")), false);
  assert.equal(fs.existsSync(path.join(consumer, "node_modules/ajv")), false);
  const repo = path.join(consumer, "adopter");
  const engine = await import(pathToFileURL(require.resolve("contract-graph")).href);
  const contracts = await import(pathToFileURL(require.resolve("contract-graph/contracts")).href);
  assert.equal(engine.loadContractGraph, contracts.loadContractGraph);
  assert.equal(typeof engine.loadContractGraph, "function");
  const packagedRuntime = await import(pathToFileURL(path.join(packageRoot, "script/distribution/runtime.js")).href);
  assert.equal(packagedRuntime.runtimeIdentity().buildId, runtimeIdentity().buildId);
  const run = (...args) => spawnSync(process.execPath, [path.join(packageRoot, "script/cli.js"), ...args], { cwd: consumer, encoding: "utf8" });
  const success = (...args) => {
    const result = run(...args);
    assert.equal(result.status, 0, `${args.join(" ")}: ${result.stderr}`);
    return result.stdout;
  };
  fs.mkdirSync(repo);
  const assessment = JSON.parse(success("analyse", repo, "--json"));
  assert.deepEqual(fs.readdirSync(repo), []);
  for (const resource of Object.values(assessment.resources)) {
    assert.ok(resource.startsWith(packageRoot + path.sep));
    assert.ok(fs.statSync(resource).isFile());
  }
  assert.equal(fs.existsSync(assessment.report), false);
  success("init", repo, "--yes", "--docs", "docs");
  assert.equal(fs.existsSync(path.join(repo, ".agents/skills/cg-analyse")), false);

  success("verify", repo);
  // Ordinary commands do not load the optional inspection path/parser.
  const withoutParser = run("contract", "inspect", repo, "--unit", ".", "--json");
  assert.notEqual(withoutParser.status, 0, "inspection must not borrow a parser from an adopter or source checkout");
  assert.match(withoutParser.stderr, /fixture parser unavailable/);
  fs.rmSync(parserRoot, { recursive: true });
  fs.cpSync(path.join(REPO, "node_modules/typescript"), path.join(consumer, "node_modules/typescript"), { recursive: true });
  for (const dependency of ["web-tree-sitter", "tree-sitter-wasms"]) fs.cpSync(path.join(REPO, "node_modules", dependency), path.join(consumer, "node_modules", dependency), { recursive: true });
  fs.writeFileSync(path.join(repo, "entry.mjs"), "export const packagedExport = 1;\n");
  const inspected = JSON.parse(success("contract", "inspect", repo, "--unit", ".", "--entry", "entry.mjs", "--json"));
  assert.ok(inspected.facts.some(fact => fact.category === "export" && fact.name === "packagedExport"));
  assert.equal(inspected.adapters.find(adapter => adapter.id === "javascript-typescript-esm").parserVersion, "5.9.3");
  const languageEntries = {
    "api.dart": "void run() {}",
    "Api.java": "public class Api { public void run() {} }",
    "Api.kt": "class Api {\n fun run() {}\n}\n",
    "api.py": "def run(): pass\n",
    "api.go": "package api\nfunc Run() {}\n",
    "Api.cs": "public class Api { public void Run() {} }",
  };
  for (const [file, source] of Object.entries(languageEntries)) {
    fs.writeFileSync(path.join(repo, file), source);
    const report = JSON.parse(success("contract", "inspect", repo, "--unit", ".", "--entry", file, "--json"));
    assert.ok(report.facts.some(fact => fact.category === "export" && /run$/i.test(fact.name)), file);
  }
  assert.ok(fs.existsSync(path.join(packageRoot, "script/inspection/THIRD_PARTY_NOTICES.txt")));
  const files = ["principles/architecture.yaml", "guidelines/engineering.yaml", "guidelines/product.yaml"];
  const legacy = path.join(REPO, "test/fixtures/principles-legacy");
  const preservedFiles = ["project-context.md", "contract.yaml", "enforcement.yaml", "workflow.md", "phases.json"];
  const preserved = new Map(preservedFiles.map(file => [file, fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8")]));
  // Give the frozen product fixture its existing P enforcement mapping.
  const mapFile = path.join(repo, ".agents/cg/enforcement.yaml");
  const map = preserved.get("enforcement.yaml").replace("entries: []", 'entries:\n  - rules: [P01-01]\n    detector: "billing-minor-units fixture"');
  fs.writeFileSync(mapFile, map);
  preserved.set("enforcement.yaml", map);
  for (const file of files) fs.copyFileSync(path.join(legacy, path.basename(file)), path.join(repo, ".agents/cg", file));
  const before = new Map(files.map(file => [file, fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8")]));
  const earlyInit = run("init", repo, "--yes", "--docs", "docs");
  assert.notEqual(earlyInit.status, 0);
  assert.match(earlyInit.stdout, /cg-warmup/);
  assert.equal(fs.readFileSync(path.join(repo, ".agents/cg/guidelines/product.yaml"), "utf8"), before.get("guidelines/product.yaml"));
  for (const file of files.filter(file => !file.endsWith("product.yaml"))) {
    assert.notEqual(fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8"), before.get(file));
    // Restore the legacy fixture to exercise the standalone preview independently.
    fs.writeFileSync(path.join(repo, ".agents/cg", file), before.get(file));
  }
  const reasons = path.join(legacy, "reasons.json");
  const preview = JSON.parse(success("migrate-principles", repo, "--reasons", reasons, "--json"));
  assert.equal(preview.changed.length, 3);
  assert.deepEqual(preview.written, []);
  for (const [file, text] of before) assert.equal(fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8"), text);
  const productReasons = path.join(consumer, "init-reasons.json");
  fs.writeFileSync(productReasons, JSON.stringify({ "P01-01": JSON.parse(fs.readFileSync(reasons, "utf8"))["P01-01"] }));
  const applied = success("init", repo, "--yes", "--docs", "docs", "--reasons", productReasons);
  assert.match(applied, /migrate product format/);
  assert.match(applied, /upgrade backup:/);
  for (const name of ["architecture", "engineering", "product"]) {
    fs.writeFileSync(path.join(repo, `.agents/cg/schema/${name}.schema.json`), "invalid legacy schema; must never be read");
  }
  success("init", repo, "--yes", "--docs", "docs");
  success("verify", repo);
  for (const name of ["architecture", "engineering", "product"]) fs.rmSync(path.join(repo, `.agents/cg/schema/${name}.schema.json`));
  success("verify", repo);
  success("sync", repo, "--check");
  assert.equal(JSON.parse(success("migrate-principles", repo, "--write", "--json")).changed.length, 0);
  for (const [file, text] of preserved) assert.equal(fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8"), text);
  const productPreview = preview.changed.find(item => item.file.endsWith("/product.yaml"));
  assert.equal(fs.readFileSync(path.join(repo, productPreview.file), "utf8"), productPreview.text);
  for (const file of files.slice(0, 2)) {
    assert.equal(fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8"), fs.readFileSync(path.join(packageRoot, "agent/cg", file), "utf8"));
  }
});
