import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import {
  BUILD_DIRECTORY,
  build,
} from "../src/scripts/build.js";
import {
  ENGINEERING_SCHEMA_ID,
  PRODUCT_SCHEMA_ID,
  loadEngineeringCatalog,
  loadProductCatalog,
} from "../src/scripts/model.js";

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

test("cg build copies architecture and product YAML catalogs", () => {
  const dir = fixture();
  const output = execFileSync(process.execPath, [CLI, "build", dir], { encoding: "utf8" });
  assert.match(output, /file\(s\) from 1 compiler/);
  assert.equal(readJson(dir, "package.json").devDependencies, undefined, "schema test tooling must not become package metadata");

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

test("compiled catalogs carry an exact source hash and a verified output manifest", () => {
  const dir = fixture();
  build(dir);
  const manifest = readJson(dir, "manifest.json");
  for (const [relative, entry] of Object.entries(manifest.files)) {
    const output = fs.readFileSync(path.join(dir, BUILD_DIRECTORY, relative));
    assert.equal(entry.sha256, hash(output), `${relative} output hash`);
    assert.equal(entry.mode, (fs.statSync(path.join(dir, BUILD_DIRECTORY, relative)).mode & 0o777).toString(8).padStart(3, "0"));
  }
  for (const relative of manifest.compilers.find((entry) => entry.id === "principles").outputs) {
    const catalog = JSON.parse(fs.readFileSync(path.join(dir, BUILD_DIRECTORY, relative), "utf8"));
    const source = fs.readFileSync(path.join(dir, catalog.source));
    assert.equal(catalog.sourceSha256, hash(source), `${relative} source hash`);
  }
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

test("an extracted tarball resolves shared exports and migrates a repository without source-tree fallbacks", (t) => {
  const dir = fixture();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  build(dir);
  const packed = JSON.parse(execFileSync("npm", ["pack", path.join(dir, BUILD_DIRECTORY), "--pack-destination", dir, "--ignore-scripts", "--json"], { encoding: "utf8" }))[0];
  const consumer = path.join(dir, "consumer");
  const packageRoot = path.join(consumer, "node_modules/contract-graph");
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(consumer, "package.json"), '{"name":"independent-adopter","private":true}');
  execFileSync("tar", ["-xzf", path.join(dir, packed.filename), "--strip-components=1", "-C", packageRoot]);
  // Supply the already-installed runtime dependency without network or development dependencies.
  fs.cpSync(path.join(REPO, "node_modules/yaml"), path.join(consumer, "node_modules/yaml"), { recursive: true });
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
  const run = (...args) => spawnSync(process.execPath, [path.join(packageRoot, "script/cli.js"), ...args], { cwd: consumer, encoding: "utf8" });
  const success = (...args) => {
    const result = run(...args);
    assert.equal(result.status, 0, `${args.join(" ")}: ${result.stderr}`);
    return result.stdout;
  };
  success("init", repo, "--yes", "--docs", "docs");
  success("verify", repo);
  const files = ["principles/architecture.yaml", "guidelines/engineering.yaml", "guidelines/product.yaml"];
  const legacy = path.join(REPO, "test/fixtures/principles-legacy");
  const preservedFiles = ["contract.yaml", "enforcement.yaml", "workflow.md", "phases.json"];
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
  assert.match(earlyInit.stderr, /migrate-principles/);
  for (const [file, text] of before) assert.equal(fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8"), text);
  const reasons = path.join(legacy, "reasons.json");
  const preview = JSON.parse(success("migrate-principles", repo, "--reasons", reasons, "--json"));
  assert.equal(preview.changed.length, 3);
  assert.deepEqual(preview.written, []);
  for (const [file, text] of before) assert.equal(fs.readFileSync(path.join(repo, ".agents/cg", file), "utf8"), text);
  const applied = JSON.parse(success("migrate-principles", repo, "--reasons", reasons, "--write", "--json"));
  assert.equal(applied.written.length, 3);
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
  for (const item of preview.changed) assert.equal(fs.readFileSync(path.join(repo, item.file), "utf8"), item.text);
});
