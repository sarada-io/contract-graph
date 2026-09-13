import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { init } from "../src/scripts/init.js";
import { sync } from "../src/scripts/sync.js";
import { verify } from "../src/scripts/verify.js";
import { loadPrinciplesCatalog, loadBindingPrinciples } from "../src/scripts/model.js";
import { parseContractYaml, stringifyContractYaml, loadContractGraph, contractContext, findContract } from "../src/scripts/contracts.js";
import { migratePrinciples } from "../src/scripts/migrate-principles.js";
import { validateBindingCatalog } from "../src/scripts/binding.js";
import { validateGuidelineCatalog } from "../src/scripts/catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  architecture: ".agents/cg/principles/architecture.yaml",
  engineering: ".agents/cg/guidelines/engineering.yaml",
  product: ".agents/cg/guidelines/product.yaml",
};
const read = (dir, relative) => fs.readFileSync(path.join(dir, relative), "utf8");
const write = (dir, relative, text) => fs.writeFileSync(path.join(dir, relative), text);
const schema = JSON.parse(read(root, "src/cg/schema/principles.schema.json"));
const validateSchema = new Ajv2020({ strict: true }).compile(schema);

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-principles-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  init(dir);
  sync(dir);
  return dir;
}

function legacyFixture(t) {
  const dir = fixture(t);
  const legacyRoot = path.join(root, "test/fixtures/principles-legacy");
  for (const [family, file] of Object.entries(files)) {
    write(dir, file, read(legacyRoot, `${family}.yaml`));
  }
  const reasons = JSON.parse(read(legacyRoot, "reasons.json"));
  return { dir, reasons };
}

test("one schema validates all shipped families and agrees with runtime on authority and text", (t) => {
  const dir = fixture(t);
  for (const [family, relative] of Object.entries(files)) {
    const original = parseContractYaml(read(dir, relative));
    assert.equal(validateSchema(original), true, JSON.stringify(validateSchema.errors));
    assert.equal(loadPrinciplesCatalog(path.join(dir, relative), { family }).family, family);
    const mutations = [
      (value) => { value.binding = family === "engineering" ? "global" : "advisory"; },
      (value) => { value.family = "unknown"; },
      (value) => { value.principlesVersion = "2.0"; },
      (value) => { value.unrecognised = "ignored?"; },
    ];
    if (family !== "architecture") mutations.push((value) => { value.hierarchy = {}; });
    if (family === "architecture") {
      mutations.push((value) => { value.principles[0].id = ["A01"]; });
      mutations.push((value) => { value.principles[0].id = "["; });
      mutations.push((value) => { value.principles[0].enforcedBy[0].id = ["A01-E-01"]; });
      mutations.push((value) => { value.principles[0].reason = "   "; });
      mutations.push((value) => { delete value.principles[0].enforcedBy; });
    }
    if (family === "engineering") {
      mutations.push((value) => { value.principles[0].entries[0].statement = "   "; });
      mutations.push((value) => { value.principles[0].entries[0].enforcedBy = []; });
    }
    for (const mutate of mutations) {
      const value = structuredClone(original);
      mutate(value);
      assert.equal(validateSchema(value), false, `${family}: schema accepted ${JSON.stringify(value)}`);
      write(dir, relative, stringifyContractYaml(value));
      assert.throws(() => loadPrinciplesCatalog(path.join(dir, relative), { family }));
    }
    write(dir, relative, stringifyContractYaml(original));
  }
});

test("schema validity does not bypass registered detectors or grouped ID ownership", (t) => {
  const dir = fixture(t);
  const arch = parseContractYaml(read(dir, files.architecture));
  arch.principles[0].enforcedBy[0].implementation = "cg.verify.unregistered";
  assert.equal(validateSchema(arch), true);
  write(dir, files.architecture, stringifyContractYaml(arch));
  assert.throws(() => loadPrinciplesCatalog(path.join(dir, files.architecture)), /expected cg.verify.contract-node-format/);
  const eng = parseContractYaml(read(dir, files.engineering));
  eng.principles[0].entries[0].id = "E99-01";
  assert.equal(validateSchema(eng), true);
  write(dir, files.engineering, stringifyContractYaml(eng));
  assert.throws(() => loadPrinciplesCatalog(path.join(dir, files.engineering)), /does not belong under/);
});

test("adopters may retire every engineering entry without a compliance exception", (t) => {
  const dir = fixture(t);
  const eng = parseContractYaml(read(dir, files.engineering));
  eng.principles = [];
  eng.categories = [];
  assert.equal(validateSchema(eng), true);
  write(dir, files.engineering, stringifyContractYaml(eng));
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
});

test("default E loading does not grant binding authority", (t) => {
  const dir = fixture(t);
  const file = ".agents/cg/phases.json";
  const phases = JSON.parse(read(dir, file));
  for (const entry of Object.values(phases.phases)) {
    assert.deepEqual(entry.always, ["A", "P", "E"]);
    assert.deepEqual(entry.conditional, []);
  }
  write(dir, file, JSON.stringify(phases));
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  const contractFile = ".agents/cg/contract.yaml";
  const contract = parseContractYaml(read(dir, contractFile));
  contract.rules = ["E01-01"];
  write(dir, contractFile, stringifyContractYaml(contract));
  assert.ok(verify(dir).failures.some((failure) => /rules/.test(failure)));
});

test("re-init preserves an adopter's conditional E loading policy", (t) => {
  const dir = fixture(t);
  const file = ".agents/cg/phases.json";
  const phases = JSON.parse(read(dir, file));
  for (const phase of Object.values(phases.phases)) {
    phase.always = ["A", "P"];
    phase.conditional = ["E"];
  }
  const policy = JSON.stringify(phases, null, 2) + "\n";
  write(dir, file, policy);
  init(dir);
  sync(dir);
  assert.equal(read(dir, file), policy);
  assert.deepEqual(verify(dir).failures, []);
});

test("migration refuses A/P cost without dropping content or writing other catalogs", (t) => {
  for (const family of ["architecture", "product"]) {
    const { dir, reasons } = legacyFixture(t);
    const value = parseContractYaml(read(dir, files[family]));
    const entry = family === "architecture" ? value.rules[0] : value.principles[0].entries[0];
    entry.cost = "An authored trade-off that must survive rejection.";
    write(dir, files[family], stringifyContractYaml(value));
    const originals = Object.fromEntries(Object.values(files).map(file => [file, read(dir, file)]));
    for (const writeMode of [false, true]) {
      const result = migratePrinciples(dir, { reasons, write: writeMode });
      assert.ok(result.failures.some(f => /cost/.test(f)), JSON.stringify(result));
      assert.deepEqual(result.written, []);
      assert.deepEqual(result.backups, []);
      for (const [file, text] of Object.entries(originals)) assert.equal(read(dir, file), text);
    }
  }
});

test("migration preview reports missing rationale and never writes partial conversions", (t) => {
  const { dir } = legacyFixture(t);
  const originals = Object.fromEntries(Object.values(files).map((file) => [file, read(dir, file)]));
  for (const writeMode of [false, true]) {
    const result = migratePrinciples(dir, { write: writeMode });
    assert.equal(result.changed.length, 3);
    assert.equal(result.missingReasons.length, 17);
    assert.ok(result.missingReasons.some((entry) => entry.id === "P01-01"));
    assert.ok(result.failures.length);
    assert.deepEqual(result.written, []);
    assert.deepEqual(result.backups, []);
    for (const [file, text] of Object.entries(originals)) assert.equal(read(dir, file), text);
  }
});

test("migration preserves comments, amendments, IDs, references and re-init ownership", (t) => {
  const { dir, reasons } = legacyFixture(t);
  // Bind the legacy product ID before conversion; the references must remain byte-identical.
  const contractFile = ".agents/cg/contract.yaml";
  const contract = parseContractYaml(read(dir, contractFile));
  contract.rules = ["P01-01"];
  write(dir, contractFile, stringifyContractYaml(contract));
  const enforcementFile = ".agents/cg/enforcement.yaml";
  const enforcement = parseContractYaml(read(dir, enforcementFile));
  enforcement.entries = [{ rules: ["P01-01"], detector: "npm test -- billing minor units" }];
  write(dir, enforcementFile, stringifyContractYaml(enforcement));
  const untouched = [contractFile, enforcementFile, ".agents/cg/workflow.md", ".agents/cg/phases.json"];
  const originals = Object.fromEntries([...Object.values(files), ...untouched].map((file) => [file, read(dir, file)]));
  const preview = migratePrinciples(dir, { reasons });
  assert.deepEqual(preview.failures, []);
  for (const item of preview.changed) assert.equal(validateSchema(parseContractYaml(item.text)), true, JSON.stringify(validateSchema.errors));
  const applied = migratePrinciples(dir, { reasons, write: true });
  assert.deepEqual(applied.failures, []);
  assert.equal(applied.written.length, 3);
  for (const item of preview.changed) {
    assert.equal(read(dir, item.file), item.text);
    assert.equal(read(dir, `${item.file}.pre-principles-v1.bak`), originals[item.file]);
  }
  assert.match(read(dir, files.architecture), /# owner amendment/);
  assert.match(read(dir, files.architecture), /# Our protocol comment survives migration/);
  assert.match(read(dir, files.product), /# Repository pricing contract/);
  assert.match(read(dir, files.product), /statement: >-/); // Folded scalar style survives.
  assert.equal(loadPrinciplesCatalog(path.join(dir, files.product)).principles[0].entries[0].statement, "Every price is quoted in minor units. # literal prose");
  assert.deepEqual(migratePrinciples(dir, { write: true }).changed, []);
  init(dir);
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  for (const file of untouched) assert.equal(read(dir, file), originals[file]);
  assert.equal(read(dir, files.product), preview.changed.find(item => item.file === files.product).text);
  for (const family of ["architecture", "engineering"]) {
    assert.equal(read(dir, files[family]), read(root, `src/cg/${family === "architecture" ? "principles" : "guidelines"}/${family}.yaml`));
  }
});

test("migration rejects unknown fields, malformed YAML and wrong versions before any write", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const original = read(dir, files.product);
  for (const bad of [
    `${original}\nmisspelled: do not discard me\n`,
    `${original}\nproductVersion: "1.0"\n`,
    original.replace('productVersion: "1.0"', 'productVersion: "9.0"'),
    `${original}\nfamily: engineering\n`,
  ]) {
    write(dir, files.product, bad);
    const before = read(dir, files.architecture);
    const result = migratePrinciples(dir, { reasons, write: true });
    assert.ok(result.failures.length);
    assert.deepEqual(result.written, []);
    assert.deepEqual(result.backups, []);
    assert.equal(read(dir, files.architecture), before);
  }
});

test("migration refuses unused rationale and existing backups", (t) => {
  const { dir, reasons } = legacyFixture(t);
  assert.match(migratePrinciples(dir, { reasons: { ...reasons, "P99-99": "Typo" }, write: true }).failures.join("\n"), /unused/);
  write(dir, `${files.engineering}.pre-principles-v1.bak`, "existing backup");
  const result = migratePrinciples(dir, { reasons, write: true });
  assert.match(result.failures.join("\n"), /backup already exists/);
  assert.deepEqual(result.written, []);
  assert.equal(read(dir, `${files.engineering}.pre-principles-v1.bak`), "existing backup");
});

test("migration CLI previews, applies with supplied reasons, and is idempotent", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const reasonsFile = path.join(dir, "rationale.json");
  fs.writeFileSync(reasonsFile, JSON.stringify(reasons));
  const run = (...args) => spawnSync(process.execPath, [path.join(root, "bin/cg.js"), "migrate-principles", dir, ...args], { encoding: "utf8" });
  const missing = run("--json");
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).missingReasons.length, 17);
  const preview = run("--reasons", reasonsFile, "--json");
  assert.equal(preview.status, 0, preview.stderr);
  assert.deepEqual(JSON.parse(preview.stdout).written, []);
  const apply = run("--reasons", reasonsFile, "--write", "--json");
  assert.equal(apply.status, 0, apply.stderr);
  assert.equal(JSON.parse(apply.stdout).written.length, 3);
  const repeat = run("--write", "--json");
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.deepEqual(JSON.parse(repeat.stdout).changed, []);
});

test("every catalog field rejects schema-invalid types, missing keys, and unknown keys at runtime", (t) => {
  const dir = fixture(t);
  let checked = 0;
  for (const [family, relative] of Object.entries(files)) {
    const original = parseContractYaml(read(dir, relative));
    // P ships empty: populate it so product leaf validation cannot escape this audit.
    if (family === "product") original.principles = [{ id: "P01", title: "Billing", entries: [
      { id: "P01-01", statement: "Use minor units.", reason: "The product bills in minor units." },
    ] }];
    const validate = value => family === "architecture" ? validateBindingCatalog(value) : validateGuidelineCatalog(value, family);
    const paths = [];
    function walk(value, keys = []) {
      paths.push([keys, value]);
      if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) walk(child, [...keys, key]);
      }
    }
    walk(original);
    function check(keys, replacement, remove = false) {
      let value = structuredClone(original);
      if (!keys.length) value = replacement;
      else {
        let target = value;
        for (const key of keys.slice(0, -1)) target = target[key];
        if (remove) delete target[keys.at(-1)];
        else target[keys.at(-1)] = replacement;
      }
      const label = `${family}:${keys.join(".")} ${remove ? "deleted" : JSON.stringify(replacement)}`;
      let failures;
      assert.doesNotThrow(() => { failures = validate(value); }, label);
      if (!validateSchema(value)) {
        assert.ok(failures.length, `runtime accepted schema-invalid ${label}`);
        checked++;
      } else if (failures.length) {
        // Category membership is cross-reference verification, not document shape.
        assert.ok(failures.every(f => /one category declared/.test(f)), `unexpected disagreement: ${label}: ${failures}`);
      }
    }
    for (const [keys, value] of paths) {
      for (const bad of [null, false, 0, "", " ", [], {}]) check(keys, bad);
      if (Array.isArray(value)) {
        check(keys, [value.join(",")]);
        check(keys, value.map(item => [item]));
      } else if (value && typeof value === "object") {
        check(keys, { ...value, unexpectedField: "must not disappear" });
        for (const key of Object.keys(value)) check([...keys, key], undefined, true);
      }
    }
  }
  t.diagnostic(`${checked} schema-invalid catalog mutations rejected by runtime validation`);
});

test("only advisory engineering entries accept optional cost", (t) => {
  const { dir, reasons } = legacyFixture(t);
  assert.deepEqual(migratePrinciples(dir, { reasons, write: true }).failures, []);
  for (const family of ["architecture", "engineering", "product"]) {
    const value = parseContractYaml(read(dir, files[family]));
    const entry = family === "architecture" ? value.principles[0] : value.principles[0].entries[0];
    entry.cost = "The chosen boundary requires explicit coordination.";
    assert.equal(validateSchema(value), family === "engineering");
    write(dir, files[family], stringifyContractYaml(value));
    if (family === "engineering") assert.deepEqual(loadPrinciplesCatalog(path.join(dir, files[family])), value);
    else assert.throws(() => loadPrinciplesCatalog(path.join(dir, files[family])), /cost/);
  }
});

test("migration preserves every authored value across frozen legacy inputs", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const before = Object.fromEntries(Object.entries(files).map(([family, file]) => [family, parseContractYaml(read(dir, file))]));
  assert.deepEqual(migratePrinciples(dir, { reasons, write: true }).failures, []);
  for (const [family, file] of Object.entries(files)) {
    const after = loadPrinciplesCatalog(path.join(dir, file));
    const legacy = before[family];
    const oldLeaves = family === "architecture" ? legacy.rules : legacy.principles.flatMap(group => group.entries);
    const newLeaves = family === "architecture" ? after.principles : after.principles.flatMap(group => group.entries);
    assert.deepEqual(newLeaves.map(entry => entry.id), oldLeaves.map(entry => entry.id));
    for (const [index, oldEntry] of oldLeaves.entries()) {
      const { [family === "product" ? "text" : "rule"]: statement, ...rest } = oldEntry;
      assert.deepEqual(newLeaves[index], { ...rest, statement, reason: rest.reason ?? reasons[oldEntry.id] });
    }
    for (const key of ["scope", "promise", "promotion", "hierarchy", "graph", "categories"]) {
      assert.deepEqual(after[key], legacy[key], `${family}.${key}`);
    }
    if (family !== "architecture") assert.deepEqual(after.principles.map(({ entries, ...group }) => group), legacy.principles.map(({ entries, ...group }) => group));
  }
});

test("an already-converted invalid catalog blocks migration of the remaining legacy files", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const value = parseContractYaml(read(root, "src/cg/guidelines/engineering.yaml"));
  value.binding = "global";
  write(dir, files.engineering, stringifyContractYaml(value));
  const before = read(dir, files.architecture);
  const result = migratePrinciples(dir, { reasons, write: true });
  assert.match(result.failures.join("\n"), /binding: expected advisory/);
  assert.deepEqual(result.written, []);
  assert.deepEqual(result.backups, []);
  assert.equal(read(dir, files.architecture), before);
});

test("migration handles mixed versions without rewriting already-converted catalogs", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const current = read(root, "src/cg/guidelines/engineering.yaml");
  write(dir, files.engineering, current);
  const result = migratePrinciples(dir, { reasons, write: true });
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.unchanged, [files.engineering]);
  assert.equal(result.written.length, 2);
  assert.equal(read(dir, files.engineering), current);
  assert.equal(fs.existsSync(path.join(dir, `${files.engineering}.pre-principles-v1.bak`)), false);
});

test("missing catalogs and symlinked destinations fail migration without any write", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const file = path.join(dir, files.product);
  const saved = `${file}.saved`;
  fs.renameSync(file, saved);
  assert.deepEqual(migratePrinciples(dir, { reasons, write: true }).written, []);
  fs.symlinkSync(saved, file);
  const original = fs.readFileSync(saved, "utf8");
  const result = migratePrinciples(dir, { reasons, write: true });
  assert.match(result.failures.join("\n"), /symbolic link/);
  assert.deepEqual(result.backups, []);
  assert.equal(fs.readFileSync(saved, "utf8"), original);
});

test("a failed second file replacement restores earlier files and retains original backups", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const before = Object.fromEntries(Object.values(files).map(file => [file, read(dir, file)]));
  const rename = fs.renameSync;
  let calls = 0;
  let result;
  try {
    fs.renameSync = (...args) => { if (++calls === 2) throw new Error("injected second rename failure"); return rename(...args); };
    result = migratePrinciples(dir, { reasons, write: true });
  } finally { fs.renameSync = rename; }
  assert.equal(calls, 2);
  assert.match(result.failures.join("\n"), /injected second rename failure/);
  assert.deepEqual(result.written, []);
  for (const [file, text] of Object.entries(before)) {
    assert.equal(read(dir, file), text);
    assert.equal(read(dir, `${file}.pre-principles-v1.bak`), text);
    assert.ok(!fs.readdirSync(path.dirname(path.join(dir, file))).some(name => name.startsWith(".cg-principles-")));
  }
});

test("a rollback write failure is reported with recoverable originals instead of throwing", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const original = read(dir, files.architecture);
  const rename = fs.renameSync, writeFile = fs.writeFileSync;
  let renames = 0, rollbackAttempted = false;
  let result;
  try {
    fs.renameSync = (...args) => { if (++renames === 2) throw new Error("injected commit failure"); return rename(...args); };
    fs.writeFileSync = (file, ...args) => {
      if (renames === 2 && file === path.join(dir, files.architecture)) {
        rollbackAttempted = true;
        throw new Error("injected restore failure");
      }
      return writeFile(file, ...args);
    };
    assert.doesNotThrow(() => { result = migratePrinciples(dir, { reasons, write: true }); });
  } finally { fs.renameSync = rename; fs.writeFileSync = writeFile; }
  assert.equal(rollbackAttempted, true);
  assert.match(result.failures.join("\n"), /injected restore failure/);
  assert.deepEqual(result.recoveryRequired, [files.architecture]);
  assert.deepEqual(result.written, [files.architecture]);
  assert.equal(read(dir, `${files.architecture}.pre-principles-v1.bak`), original);
});

test("a backup creation failure cannot partially convert any catalog", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const before = Object.fromEntries(Object.values(files).map(file => [file, read(dir, file)]));
  const writeFile = fs.writeFileSync;
  let injected = false, result;
  try {
    fs.writeFileSync = (file, ...args) => {
      if (file === path.join(dir, `${files.engineering}.pre-principles-v1.bak`)) {
        injected = true;
        throw new Error("injected backup failure");
      }
      return writeFile(file, ...args);
    };
    result = migratePrinciples(dir, { reasons, write: true });
  } finally { fs.writeFileSync = writeFile; }
  assert.equal(injected, true);
  assert.match(result.failures.join("\n"), /injected backup failure/);
  assert.deepEqual(result.written, []);
  assert.deepEqual(result.recoveryRequired, []);
  assert.deepEqual(result.backups, [`${files.architecture}.pre-principles-v1.bak`]);
  for (const [file, text] of Object.entries(before)) assert.equal(read(dir, file), text);
});

test("concurrent edits to already-converted catalogs prevent committing other migrations", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const current = read(root, "src/cg/guidelines/engineering.yaml");
  write(dir, files.engineering, current);
  const original = read(dir, files.architecture);
  const writeFile = fs.writeFileSync;
  let injected = false, result;
  const concurrent = `${current}\n# Another agent's edit\n`;
  try {
    fs.writeFileSync = (file, ...args) => {
      if (!injected && file === path.join(dir, `${files.architecture}.pre-principles-v1.bak`)) {
        injected = true;
        writeFile(path.join(dir, files.engineering), concurrent);
      }
      return writeFile(file, ...args);
    };
    result = migratePrinciples(dir, { reasons, write: true });
  } finally { fs.writeFileSync = writeFile; }
  assert.equal(injected, true);
  assert.match(result.failures.join("\n"), /changed during migration/);
  assert.deepEqual(result.written, []);
  assert.equal(read(dir, files.architecture), original);
  assert.equal(read(dir, files.engineering), concurrent);
});

test("rollback preserves a concurrent edit and reports the file for manual recovery", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const rename = fs.renameSync;
  let calls = 0, result;
  const concurrent = "# Concurrent owner edit, preserve me\n";
  try {
    fs.renameSync = (...args) => {
      if (++calls === 2) {
        write(dir, files.architecture, concurrent);
        throw new Error("injected replacement failure");
      }
      return rename(...args);
    };
    result = migratePrinciples(dir, { reasons, write: true });
  } finally { fs.renameSync = rename; }
  assert.equal(calls, 2);
  assert.equal(read(dir, files.architecture), concurrent);
  assert.deepEqual(result.recoveryRequired, [files.architecture]);
  assert.match(result.failures.join("\n"), /concurrent edit preserved/);
});

test("migrated A stays global, P stays scoped, and enforcement gaps still block verification", (t) => {
  const { dir, reasons } = legacyFixture(t);
  assert.deepEqual(migratePrinciples(dir, { reasons, write: true }).failures, []);
  const modulePath = "src/.agents/cg/contract.yaml";
  const module = parseContractYaml(read(dir, modulePath));
  module.rules = ["P01-01"];
  write(dir, modulePath, stringifyContractYaml(module));
  const repository = parseContractYaml(read(dir, ".agents/cg/contract.yaml"));
  const sibling = structuredClone(module);
  sibling.id = sibling.name = sibling.unit = "billing";
  sibling.responsibilities.owns = ["Account billing reconciliation"];
  sibling.rules = [];
  repository.relations.children.push({ contract: "billing/.agents/cg/contract.yaml", uses: "Reconcile billing" });
  fs.mkdirSync(path.join(dir, "billing/.agents/cg"), { recursive: true });
  write(dir, "billing/.agents/cg/contract.yaml", stringifyContractYaml(sibling));
  write(dir, ".agents/cg/contract.yaml", stringifyContractYaml(repository));
  const enforcementFile = ".agents/cg/enforcement.yaml";
  const enforcement = parseContractYaml(read(dir, enforcementFile));
  enforcement.entries = [{ rules: ["P01-01"], detector: "billing-minor-units fixture" }];
  write(dir, enforcementFile, stringifyContractYaml(enforcement));
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  const graph = loadContractGraph(dir, { throwOnError: true });
  const rules = loadBindingPrinciples(dir);
  for (const id of ["repository", "src", "billing"]) {
    const context = contractContext(graph, findContract(graph, id), rules);
    assert.equal(context.rules.filter(rule => /^A/.test(rule.id)).length, 16, `${id}: A remains ambient`);
    assert.equal(context.rules.some(rule => rule.id === "P01-01"), id === "src", `${id}: P does not leak to siblings or parents`);
    assert.equal(context.rules.some(rule => /^E/.test(rule.id)), false);
  }
  enforcement.entries = [];
  write(dir, enforcementFile, stringifyContractYaml(enforcement));
  assert.match(verify(dir).failures.join("\n"), /P01-01.*exactly one enforcement-map row/);
  enforcement.entries = [{ rules: ["P99-99"], detector: "nonexistent rule" }];
  write(dir, enforcementFile, stringifyContractYaml(enforcement));
  assert.match(verify(dir).failures.join("\n"), /unknown principle ID `P99-99`/);
  for (const id of ["A01", "E01-01"]) {
    enforcement.entries = [{ rules: [id], detector: "invalid family" }];
    write(dir, enforcementFile, stringifyContractYaml(enforcement));
    assert.match(verify(dir).failures.join("\n"), /expected Pnn-nn/);
  }
});

test("malformed rationale input and ambiguous CLI options cannot write catalogs", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const before = Object.fromEntries(Object.values(files).map(file => [file, read(dir, file)]));
  for (const invalid of [null, [], "rationale", { A03: null }, { A03: "   " }]) {
    assert.throws(() => migratePrinciples(dir, { write: true, reasons: invalid }), /mapping principle IDs/);
  }
  const reasonFile = path.join(dir, "reasons.json");
  fs.writeFileSync(reasonFile, JSON.stringify(reasons));
  for (const args of [
    ["--reasons"], ["--check", "--write"], ["--write=false"], ["extra-repository"],
  ]) {
    const result = spawnSync(process.execPath, [path.join(root, "bin/cg.js"), "migrate-principles", dir, ...args], { encoding: "utf8" });
    assert.notEqual(result.status, 0, JSON.stringify(args));
  }
  fs.writeFileSync(reasonFile, "{malformed JSON");
  const result = spawnSync(process.execPath, [path.join(root, "bin/cg.js"), "migrate-principles", dir, "--reasons", reasonFile, "--write"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  for (const [file, text] of Object.entries(before)) assert.equal(read(dir, file), text);
});

test("an existing product rationale is preserved and cannot be overwritten by supplied reasons", (t) => {
  const { dir, reasons } = legacyFixture(t);
  const ownerReason = "The product owner chose integer values for this payment integration.";
  write(dir, files.product, `${read(dir, files.product)}        reason: ${ownerReason}\n`);
  const conflict = migratePrinciples(dir, { reasons, write: true });
  assert.match(conflict.failures.join("\n"), /reason P01-01 is unused/);
  assert.deepEqual(conflict.written, []);
  delete reasons["P01-01"];
  assert.deepEqual(migratePrinciples(dir, { reasons, write: true }).failures, []);
  assert.equal(loadPrinciplesCatalog(path.join(dir, files.product)).principles[0].entries[0].reason, ownerReason);
});
