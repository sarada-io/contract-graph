import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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

const REPO = path.resolve(import.meta.dirname, "..");
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

  const architectureFile = path.join(dir, BUILD_DIRECTORY, "agent/cg/principles/architecture.yaml");
  assert.ok(fs.existsSync(architectureFile));
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
  assert.match(engineering.principles[0].rules[0].rule, /Callers use only the paths/);
  assert.match(engineering.principles[0].rules[0].reason, /undeclared caller is a bypass/);
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

  const second = build(dir);
  assert.deepEqual(second.changed, []);
  assert.deepEqual(second.removed, ["stale.json"]);
  assert.equal(
    fs.readFileSync(path.join(dir, BUILD_DIRECTORY, "agent", "cg", "principles", "architecture.yaml"), "utf8"),
    architecture,
  );
  assert.ok(!fs.existsSync(path.join(dir, BUILD_DIRECTORY, "stale.json")));
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
    `$schema: https://sarada.io/contract-graph/schema/product-v1.schema.json
productVersion: "1.0"
principles:
  - id: P01
    title: Wrong family
    entries:
      - id: E01-01
        text: Prefer the smaller option.
`,
  );
  assert.throws(() => build(dir), /E01-01/);
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
