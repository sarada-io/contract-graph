import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { inspectContract, inspectionSnapshotChanges, renderInspection, INSPECTION_LIMITS } from "../src/scripts/contract-inspection.js";
import { inspectSource } from "../src/scripts/inspection/javascript.js";
import { init } from "../src/scripts/init.js";
import { loadContract, stringifyContractYaml, loadContractGraph } from "../src/scripts/contracts.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO, "bin/cg.js");
function fixture(t, initialized = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-inspection-"));
  if (initialized) init(dir, {});
  fs.cpSync(path.join(REPO, "test/fixtures/contract-inspection/esm"), dir, { recursive: true });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const run = (dir, ...args) => spawnSync(process.execPath, [CLI, "contract", "inspect", dir, ...args], { encoding: "utf8" });
const symbols = report => report.proposals.find(p => p.candidateKey === "index.ts").fields.symbols;
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
function inventory(dir) {
  const result = {};
  const walk = relative => {
    for (const e of fs.readdirSync(path.join(dir, relative), { withFileTypes: true })) {
      const rel = path.join(relative, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.isFile()) result[rel] = sha(fs.readFileSync(path.join(dir, rel)));
    }
  };
  walk(""); return result;
}

test("AST extraction observes exact exports and dependency kinds without executing source", t => {
  const dir = fixture(t);
  const before = inventory(dir);
  const report = inspectContract(dir, { unit: "." });
  assert.deepEqual(symbols(report).value, ["Account", "Amount", "Request", "charge", "count", "default", "first", "publicKey", "renamed", "rest", "third"]);
  assert.equal(report.facts.some(f => f.name === "imaginary" || f.specifier === "not-real" || f.name === "internal"), false);
  const deps = report.facts.filter(f => f.category === "dependency" && f.path === "index.ts");
  assert.deepEqual(deps.map(f => f.mode), ["type", "mixed", "runtime", "runtime", "runtime", "runtime"]);
  assert.equal(deps[0].range.start.line, 12);
  assert.equal(deps[0].resolution.state, "exact-file");
  assert.equal(deps[3].resolution.state, "builtin");
  assert.equal(deps[4].resolution.state, "external");
  assert.equal(deps[5].dependencyKind, "dynamic");
  assert.ok(report.proposals.some(p => p.candidateKey === "bin/start.mjs"));
  assert.deepEqual(inventory(dir), before);
  assert.deepEqual(inspectContract(dir, { unit: "." }), report);
  assert.ok(report.facts.filter(f => f.category === "export").every(f => f.sha256 && f.range));
  assert.equal(report.fields["relations.dependencies"].value, null);
  assert.equal(report.fields["purpose"].state, "requires-judgment");
});

test("re-exports and unresolved bindings retain positives without claiming export closure", t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "index.ts"), "export { value as alias } from './types.ts';\nexport * from './cycle.ts';\nexport { absent };\n");
  fs.writeFileSync(path.join(dir, "cycle.ts"), "export * from './index.ts';\n");
  const report = inspectContract(dir, { unit: "." });
  assert.equal(symbols(report).value, null);
  assert.ok(report.facts.some(f => f.name === "alias" && f.specifier === "./types.ts"));
  assert.ok(report.diagnostics.some(d => d.code === "wildcard-export"));
  assert.ok(report.diagnostics.some(d => d.code === "unresolved-export-binding"));
  assert.equal(inspectSource("test.ts", "export default missing;").coverage, "partial");
  assert.equal(inspectSource("test.ts", "export const x = 1; export { x };").coverage, "partial");
});

test("unknown, failed, unsupported and observed empty remain distinguishable", t => {
  const dir = fixture(t);
  for (const [source, expected] of [["const privateValue = 1;", []], ["export const = ;", null], ["module.exports = {};", null], ["void import(name);", null]]) {
    fs.writeFileSync(path.join(dir, "index.ts"), source);
    const report = inspectContract(dir, { unit: "." });
    assert.deepEqual(symbols(report).value, expected);
    if (expected) assert.ok(report.facts.some(f => f.observation === "observed-empty-esm-exports"));
  }
  fs.writeFileSync(path.join(dir, "component.vue"), "<script>export default {}</script>");
  fs.writeFileSync(path.join(dir, "types.d.ts"), "export declare const x: string;");
  const report = inspectContract(dir, { unit: ".", entries: ["types.d.ts"] });
  assert.equal(report.proposals.find(p => p.candidateKey === "types.d.ts").fields.symbols.value, null);
  assert.ok(report.coverage.files.some(f => f.path === "component.vue" && f.state === "unsupported"));
  assert.equal(report.coverage.state, "partial");
});

test("conditional and generated entries stay qualified; CommonJS and alias resolution are explicit", t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "commonjs", main: "./legacy.js", exports: { ".": { import: "./index.ts", require: "./missing.cjs" }, "./*": "./dist/*.js", "./private": null } }));
  fs.writeFileSync(path.join(dir, "legacy.js"), "const x = 1;");
  fs.writeFileSync(path.join(dir, "index.ts"), "import x from '#alias'; import y from './types'; import z from './missing.js'; export const okay = 1;");
  const r = inspectContract(dir, { unit: "." });
  assert.ok(r.facts.some(f => f.pointer === "/exports/./import" && f.qualified));
  assert.ok(r.facts.some(f => f.entryKind === "main" && f.legacy));
  assert.ok(r.diagnostics.some(d => d.code === "unsupported-entry-shape"));
  assert.ok(r.diagnostics.some(d => d.code === "unsupported-commonjs-package"));
  assert.equal(r.facts.filter(f => f.category === "dependency").every(f => f.resolution.state === "unresolved"), true);
  assert.equal(r.proposals.find(p => p.candidateKey === "missing.cjs").fields.path.value, null);
});

test("authored contracts remain byte-identical; discrepancies never delete promises", t => {
  const dir = fixture(t, true);
  const file = path.join(dir, "src/.agents/cg/contract.yaml");
  const c = loadContract(file, { repoRoot: dir });
  fs.writeFileSync(path.join(dir, "src/index.mjs"), "export const actual = 1;");
  c.surface[0].path = "index.mjs";
  c.surface[0].symbols = ["promised"];
  c.surface[0].contract.guarantees = ["Keep the accepted promise."];
  fs.writeFileSync(file, `# authored comment\n${stringifyContractYaml(c)}`);
  const before = inventory(dir);
  const r = inspectContract(dir, { id: "src" });
  assert.equal(r.discrepancies.filter(d => d.code === "declared-symbol-not-observed").length, 1);
  assert.ok(r.discrepancies.some(d => d.code === "additional-explicit-export"));
  assert.equal(r.proposals[0].authored[0].contract.guarantees[0], "Keep the accepted promise.");
  assert.deepEqual(inventory(dir), before);
  assert.deepEqual(loadContractGraph(dir).failures, []);
  assert.ok(r.snapshot.contractSha256);
  fs.appendFileSync(path.join(dir, "src/index.mjs"), "\nexport const second = 2;");
  assert.ok(inspectionSnapshotChanges(dir, r.snapshot).includes("src/index.mjs"));
  assert.notEqual(inspectContract(dir, { id: "src" }).snapshot.digest, r.snapshot.digest);
});

test("nested units are follow-ups, and invalid graphs disable owner lookup", t => {
  const dir = fixture(t, true);
  const report = inspectContract(dir, { id: "repository" });
  assert.ok(report.followUp.some(f => f.unit === "src" && f.reason === "declared-descendant"));
  assert.ok(!report.coverage.files.some(f => f.path.startsWith("src/")));
  fs.mkdirSync(path.join(dir, "nested"));
  fs.writeFileSync(path.join(dir, "nested/package.json"), "{}");
  fs.writeFileSync(path.join(dir, "nested/private.ts"), "export const hidden = 1;");
  fs.writeFileSync(path.join(dir, ".agents/cg/contract.yaml"), "invalid: true");
  const r = inspectContract(dir, { unit: "." });
  assert.ok(r.graphDiagnostics.length);
  assert.ok(r.followUp.some(f => f.unit === "nested"));
  assert.ok(!r.facts.some(f => f.name === "hidden"));
  assert.throws(() => inspectContract(dir, { id: "repository" }), /invalid graph/);
});

test("confinement, symlink and byte limits never create reassuring empty output", t => {
  const dir = fixture(t);
  fs.symlinkSync(os.tmpdir(), path.join(dir, "escape"));
  assert.throws(() => inspectContract(dir, { unit: "../" }), /escapes/);
  assert.throws(() => inspectContract(dir, { unit: "escape" }), /symlink/);
  assert.throws(() => inspectContract(dir, { unit: ".", entries: ["../outside.ts"] }), /confined/);
  fs.writeFileSync(path.join(dir, "index.ts"), " ".repeat(INSPECTION_LIMITS.fileBytes + 1));
  const r = inspectContract(dir, { unit: "." });
  assert.equal(symbols(r).value, null);
  assert.ok(r.coverage.files.some(f => f.reason === "symlink"));
  assert.ok(r.diagnostics.some(f => f.code === "read-error"));
});

test("CLI is read-only, selection is explicit and JSON/Markdown carry the same evidence", t => {
  const dir = fixture(t);
  const before = inventory(dir);
  const json = run(dir, "--unit", ".", "--json");
  assert.equal(json.status, 0, json.stderr);
  const report = JSON.parse(json.stdout);
  assert.equal(run(dir, "--unit", ".").stdout, renderInspection(report));
  for (const args of [[], ["--unit"], ["--unit", ".", "--id", "x"], ["--unit", ".", "--write"], ["--unit", ".", "--apply"], ["--id"]]) assert.notEqual(run(dir, ...args).status, 0, args.join(" "));
  const repeated = run(dir, "--unit", ".", "--entry", "index.ts", "--entry=types.ts", "--json");
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.ok(JSON.parse(repeated.stdout).proposals.some(p => p.candidateKey === "types.ts"));
  const misuse = spawnSync(process.execPath, [CLI, "contract", "surface", dir, "--unit", "."], { encoding: "utf8" });
  assert.notEqual(misuse.status, 0);
  assert.deepEqual(inventory(dir), before);
});

test("cross-boundary imports carry declared ownership without becoming architecture edges", t => {
  const dir = fixture(t, true);
  const rootFile = path.join(dir, ".agents/cg/contract.yaml");
  const parentFile = path.join(dir, "src/.agents/cg/contract.yaml");
  const parent = loadContract(parentFile, { repoRoot: dir });
  const child = structuredClone(parent);
  child.id = "billing-core"; child.unit = "src/core"; child.kind = "component";
  child.name = "Billing core"; child.responsibilities.owns = ["Calculate charges"];
  child.relations.parent = { contract: "src/.agents/cg/contract.yaml", uses: "Calculate charges" };
  child.relations.composition = "leaf"; child.relations.children = [];
  child.routes = [];
  child.surface[0].path = "index.ts";
  fs.mkdirSync(path.join(dir, "src/core/.agents/cg"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src/core/.agents/cg/contract.yaml"), stringifyContractYaml(child));
  fs.writeFileSync(path.join(dir, "src/core/index.ts"), "export const charge = 1;");
  parent.relations.composition = "composed";
  parent.relations.children = [{ contract: "src/core/.agents/cg/contract.yaml", uses: "Calculate charges" }];
  parent.surface[0].path = "index.ts";
  fs.writeFileSync(path.join(dir, "src/index.ts"), "import { charge } from './core/index.ts'; export const api = charge;");
  fs.writeFileSync(parentFile, stringifyContractYaml(parent));
  assert.ok(fs.existsSync(rootFile));
  assert.deepEqual(loadContractGraph(dir).failures, []);
  const r = inspectContract(dir, { id: "src" });
  const dep = r.facts.find(f => f.category === "dependency");
  assert.equal(dep.resolution.declaredOwner, "src/core/.agents/cg/contract.yaml");
  assert.ok(r.followUp.some(f => f.unit === "src/core"));
  assert.ok(!r.facts.some(f => f.path === "src/core/index.ts"));
  assert.deepEqual(r.fields["relations.dependencies"].value, parent.relations.dependencies);
});

test("concurrent edits invalidate the report and newly created targets invalidate saved evidence", t => {
  const dir = fixture(t);
  const file = path.join(dir, "index.ts");
  const read = fs.readFileSync;
  let changed = false;
  fs.readFileSync = function (name, ...rest) {
    const value = read.call(this, name, ...rest);
    if (typeof name === "string" && fs.realpathSync(name) === fs.realpathSync(file) && !changed) {
      changed = true;
      fs.appendFileSync(file, "\nexport const changed = 1;");
    }
    return value;
  };
  let report;
  try { report = inspectContract(dir, { unit: "." }); }
  finally { fs.readFileSync = read; }
  assert.equal(report.stable, false);
  assert.ok(report.diagnostics.some(d => d.code === "unstable-input"));
  fs.mkdirSync(path.join(dir, "dist"));
  fs.writeFileSync(path.join(dir, "package.json"), '{"exports":"./dist/later.js"}');
  const saved = inspectContract(dir, { unit: "." });
  fs.writeFileSync(path.join(dir, "dist/later.js"), "export const later = 1;");
  assert.ok(inspectionSnapshotChanges(dir, saved.snapshot).includes("dist/later.js"));
});

test("source, scripts and configuration are data; read errors remain explicit", t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ scripts: { prepare: "touch EXECUTED" }, exports: "./index.ts" }));
  fs.writeFileSync(path.join(dir, "index.ts"), "import fs from 'node:fs'; fs.writeFileSync('EXECUTED', 'bad'); export const x = 1;");
  fs.writeFileSync(path.join(dir, "config.js"), "throw new Error('never run config');");
  inspectContract(dir, { unit: "." });
  assert.equal(fs.existsSync(path.join(dir, "EXECUTED")), false);
  const read = fs.readFileSync;
  fs.readFileSync = function (name, ...rest) {
    if (typeof name === "string" && name.endsWith("/index.ts")) { const error = new Error("fixture unreadable"); error.code = "EACCES"; throw error; }
    return read.call(this, name, ...rest);
  };
  let r;
  try { r = inspectContract(dir, { unit: "." }); }
  finally { fs.readFileSync = read; }
  assert.equal(symbols(r).value, null);
  assert.ok(r.diagnostics.some(d => d.code === "read-error"));
});

test("reviewed fact selection can amend a contract without inventing behavioral meaning", t => {
  const dir = fixture(t, true);
  const file = path.join(dir, "src/.agents/cg/contract.yaml");
  const c = loadContract(file, { repoRoot: dir });
  fs.writeFileSync(path.join(dir, "src/index.ts"), "export const publicEntry = () => 1; export const incidental = 2;");
  const before = structuredClone(c);
  const r = inspectContract(dir, { id: "src", entries: ["index.ts"] });
  const p = r.proposals.find(p => p.candidateKey === "src/index.ts");
  assert.deepEqual(p.fields.symbols.value, ["incidental", "publicEntry"]);
  // A fixture author deliberately selects the promised subset, preserving established meaning.
  c.surface[0].path = p.fields.path.value;
  c.surface[0].symbols = p.fields.symbols.value.filter(n => n === "publicEntry");
  assert.equal(p.fields["contract.guarantees"].value, null);
  fs.writeFileSync(file, stringifyContractYaml(c));
  assert.deepEqual(c.surface[0].contract, before.surface[0].contract);
  assert.deepEqual(c.relations, before.relations);
  assert.deepEqual(loadContractGraph(dir).failures, []);
});
