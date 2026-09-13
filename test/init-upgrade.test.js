import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { init } from "../src/scripts/init.js";
import { sync } from "../src/scripts/sync.js";
import { verify } from "../src/scripts/verify.js";
import { parseContractYaml } from "../src/scripts/contracts.js";
import { planInitCatalogs, applyInitCatalogs } from "../src/scripts/init-catalogs.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const paths = {
  architecture: ".agents/cg/principles/architecture.yaml",
  engineering: ".agents/cg/guidelines/engineering.yaml",
  product: ".agents/cg/guidelines/product.yaml",
};
const read = (dir, file) => fs.readFileSync(path.join(dir, file), "utf8");
const write = (dir, file, text) => fs.writeFileSync(path.join(dir, file), text);
const reasons = { "P01-01": "The payment provider receives integer minor units." };
function snapshot(dir) {
  const result = {};
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(dir, relative), { withFileTypes: true })) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) walk(file);
      else result[file] = fs.readFileSync(path.join(dir, file)).toString("base64");
    }
  }
  walk("");
  return result;
}
function fixture(t, { emptyProduct = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-init-upgrade-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  init(dir, { profiles: ["agents"] });
  sync(dir);
  for (const [family, file] of Object.entries(paths)) {
    // Same legacy schema host and field shape observed in gamome-core; no product code copied.
    const text = read(root, `test/fixtures/principles-legacy/${family}.yaml`)
      .replace("https://contractgraph.dev/schema/", "https://sarada.io/contract-graph/schema/");
    write(dir, file, text);
  }
  if (emptyProduct) write(dir, paths.product, '$schema: https://sarada.io/contract-graph/schema/product-v1.schema.json\nproductVersion: "1.0"\nprinciples: []\n');
  else {
    const enforcement = JSON.parse(JSON.stringify(parseContractYaml(read(dir, ".agents/cg/enforcement.yaml"))));
    enforcement.entries = [{ rules: ["P01-01"], detector: "npm test" }];
    write(dir, ".agents/cg/enforcement.yaml", JSON.stringify(enforcement));
  }
  write(dir, ".agents/skills/cg-plan/SKILL.md", "Old installed skill\n");
  return dir;
}

test("init refreshes A/E and skills, converts legacy P, and preserves owned context and backups", t => {
  const dir = fixture(t);
  const owned = [".agents/cg/contract.yaml", "src/.agents/cg/contract.yaml", ".agents/cg/enforcement.yaml", ".agents/cg/workflow.md", ".agents/cg/phases.json"];
  const originals = Object.fromEntries([...Object.values(paths), ...owned].map(file => [file, read(dir, file)]));
  const before = snapshot(dir);
  const preview = init(dir, { dryRun: true, reasons });
  assert.equal(preview.catalogUpdates.length, 3);
  assert.deepEqual(snapshot(dir), before);
  const result = init(dir, { reasons });
  for (const family of ["architecture", "engineering"]) {
    assert.equal(read(dir, paths[family]), read(root, `src/cg/${family === "architecture" ? "principles" : "guidelines"}/${family}.yaml`));
  }
  const product = parseContractYaml(read(dir, paths.product));
  assert.equal(product.$schema, "https://contractgraph.dev/schema/principles-v1.schema.json");
  assert.equal(product.family, "product");
  assert.equal(product.principles[0].entries[0].id, "P01-01");
  assert.equal(product.principles[0].entries[0].reason, reasons["P01-01"]);
  assert.match(read(dir, paths.product), /# Repository pricing contract/);
  for (const file of owned) assert.equal(read(dir, file), originals[file]);
  for (const item of result.catalogUpdates) assert.equal(read(dir, item.backup), originals[path.relative(dir, item.file).split(path.sep).join("/")]);
  const manifest = JSON.parse(read(dir, ".agents/cg/manifest.json"));
  assert.equal(manifest.files[paths.product].adopted, true, "migrated product rules are still repository-authored");
  assert.notEqual(read(dir, ".agents/skills/cg-plan/SKILL.md"), "Old installed skill\n");
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  assert.deepEqual(init(dir).replaced, []);
});

test("missing or invalid product rationale blocks all init writes, including skill refresh", t => {
  const dir = fixture(t);
  const before = snapshot(dir);
  for (const dryRun of [true, false]) {
    assert.throws(() => init(dir, { dryRun }), /P01-01[\s\S]*cg init --reasons/);
    assert.deepEqual(snapshot(dir), before);
    assert.throws(() => init(dir, { dryRun, reasons: { ...reasons, unused: "Not a rule" } }), /unused/);
    assert.deepEqual(snapshot(dir), before);
  }
});

test("empty legacy product migrates with no extra user input", t => {
  const dir = fixture(t, { emptyProduct: true });
  init(dir);
  assert.deepEqual(parseContractYaml(read(dir, paths.product)).principles, []);
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
});

test("init CLI previews without writes and upgrades with reasons in one command", t => {
  const dir = fixture(t);
  const reasonsFile = path.join(dir, "reasons.json");
  fs.writeFileSync(reasonsFile, JSON.stringify(reasons));
  const before = snapshot(dir);
  const run = args => spawnSync(process.execPath, [path.join(root, "bin/cg.js"), "init", dir, "--docs", "docs", "--reasons", reasonsFile, ...args], { encoding: "utf8" });
  const preview = run(["--check"]);
  assert.equal(preview.status, 1);
  assert.match(preview.stdout, /migrate product format/);
  assert.match(preview.stdout, /backup:/);
  assert.deepEqual(snapshot(dir), before);
  const refused = run([]);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /confirmation/);
  assert.deepEqual(snapshot(dir), before);
  const applied = run(["--yes"]);
  assert.equal(applied.status, 0, applied.stdout + applied.stderr);
  assert.match(applied.stdout, /upgrade backup:/);
});

test("catalog replacement failure rolls back earlier replacements before skills change", t => {
  const dir = fixture(t);
  const before = Object.fromEntries(Object.values(paths).map(file => [file, read(dir, file)]));
  const originalRename = fs.renameSync;
  t.mock.method(fs, "renameSync", (source, destination) => {
    if (destination === path.join(dir, paths.engineering)) throw new Error("controlled rename failure");
    return originalRename(source, destination);
  });
  assert.throws(() => init(dir, { reasons }), /controlled rename failure/);
  for (const [file, text] of Object.entries(before)) assert.equal(read(dir, file), text);
  assert.equal(read(dir, ".agents/skills/cg-plan/SKILL.md"), "Old installed skill\n");
});

test("backup collisions and concurrent edits are preserved and stop the update", t => {
  const dir = fixture(t);
  const defaults = ["architecture", "engineering"].map(family => ({ relative: paths[family], text: `new ${family}\n` }));
  const plan = planInitCatalogs(dir, defaults, reasons);
  const backup = path.join(dir, plan[0].backup);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, "existing different backup\n");
  const before = snapshot(dir);
  assert.throws(() => planInitCatalogs(dir, defaults, reasons), /existing backup differs/);
  assert.deepEqual(snapshot(dir), before);
  fs.rmSync(backup);
  write(dir, paths.architecture, "concurrent owner edit\n");
  assert.throws(() => applyInitCatalogs(dir, plan), /changed since preview/);
  assert.equal(read(dir, paths.architecture), "concurrent owner edit\n");
});

test("init --check against a missing directory does not create it", t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cg-init-preview-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const dir = path.join(parent, "not-created");
  init(dir, { dryRun: true });
  assert.equal(fs.existsSync(dir), false);
});

test("init updates historical contract/enforcement schema scalars without changing authored content", t => {
  const dir = fixture(t, { emptyProduct: true });
  const files = [".agents/cg/contract.yaml", "src/.agents/cg/contract.yaml", ".agents/cg/enforcement.yaml"];
  const before = new Map();
  for (const file of files) {
    const text = read(dir, file).replace("https://contractgraph.dev/schema/", "https://sarada.io/contract-graph/schema/");
    write(dir, file, text);
    before.set(file, text);
  }
  const result = init(dir);
  for (const file of files) {
    const expected = before.get(file).replace(/https:\/\/sarada\.io\/contract-graph\/schema\/([a-z0-9-]+\.schema\.json)/, '"https://contractgraph.dev/schema/$1"');
    assert.equal(read(dir, file), expected);
    const item = result.catalogUpdates.find(item => item.file === path.join(dir, file));
    assert.equal(read(dir, item.backup), before.get(file));
  }
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
});
