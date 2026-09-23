import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectNative } from "../src/scripts/inspection/native-languages.js";
import { inspectContract } from "../src/scripts/contract-inspection.js";
import { detectModuleRoots, subBoundaryNames } from "../src/scripts/modules.js";
import { init } from "../src/scripts/init.js";
import { loadContract, stringifyContractYaml } from "../src/scripts/contracts.js";
const inspect = text => inspectNative("api.dart", text);
const names = r => [...new Set(r.facts.filter(f => f.category === "export").map(f => f.name))].sort();
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-flutter-"));
  fs.cpSync(fileURLToPath(new URL("./fixtures/contract-inspection/flutter", import.meta.url)), dir, { recursive: true });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("Flutter widgets, main and super parameters retain public evidence without private State or inherited API claims", t => {
  const dir = fixture(t);
  const r = inspectContract(dir, { unit: ".", entries: ["lib/main.dart"] });
  assert.deepEqual(names(r), ["App", "App.App", "App.build", "Counter", "Counter.Counter", "Counter.createState", "main"]);
  assert.ok(r.facts.some(f => f.entryKind === "dart-main-function" && f.path === "lib/main.dart"));
  assert.ok(r.facts.some(f => f.specifier === "package:flutter/material.dart" && f.resolution.state === "unresolved"));
  assert.equal(r.proposals[0].fields.symbols.value, null);
  assert.ok(r.diagnostics.some(d => d.code === "inherited-members"));
  assert.ok(r.facts.every(f => f.category !== "export" || (f.range && f.sha256)));
});

test("Dart directives preserve every conditional URI, alias, deferred marker and show/hide sequence", () => {
  const r = inspect(`import 'stub.dart' if (dart.library.io) 'io.dart' if (dart.library.html) 'web.dart' as impl show Api, Result hide Hidden;
import 'lazy.dart' deferred as lazy;
export 'src/api.dart' show Api;
part 'api.g.dart';`);
  const deps = r.facts.filter(f => f.category === "dependency");
  assert.deepEqual(deps.map(d => d.specifier), ["stub.dart", "io.dart", "web.dart", "lazy.dart", "src/api.dart", "api.g.dart"]);
  assert.equal(deps[0].alias, "impl");
  assert.equal(deps[3].deferred, true);
  assert.deepEqual(deps[0].combinators, [{ kind: "show", names: ["Api", "Result"] }, { kind: "hide", names: ["Hidden"] }]);
  assert.deepEqual(deps.slice(0, 3).map(d => d.conditional), [false, true, true]);
  assert.match(deps[1].condition, /dart.library.io/);
  assert.ok(r.facts.some(f => f.entryKind === "dart-export-library"));
  assert.equal(r.coverage, "partial");
  assert.deepEqual(names(r), []);
  assert.ok(r.diagnostics.some(d => d.code === "unresolved-reexports"));
  assert.ok(r.diagnostics.some(d => d.code === "unresolved-library-parts"));
});

test("Dart parts, generated source and unsupported URI decoding remain explicit", () => {
  for (const text of ["part of 'api.dart'; class Result {}", "part of library.name; class Result {}"])
    assert.ok(inspect(text).diagnostics.some(d => d.code === "unresolved-library-parts"));
  const generated = inspectNative("api.g.dart", "part of 'api.dart'; class Result {}");
  assert.ok(generated.diagnostics.some(d => d.code === "generated-source"));
  const escaped = inspect(String.raw`import 'p\u0061th.dart';`);
  assert.equal(escaped.coverage, "partial");
  assert.equal(escaped.facts.find(f => f.category === "dependency").specifier, null);
});

test("Dart modern declarations qualify mixins, extensions, enum generation and unnamed operators", () => {
  const r = inspect(`abstract interface class Port { void run(); }
mixin Work on Base { void run() {} }
class Alias = Base with Work;
enum Mode { first, _hidden; void run() {} }
extension Label on String { int get size => length; }
extension on String { void extra() {} }
extension type Id(int value) {}
class Sum { int operator +(int other) => 1; }`);
  assert.deepEqual(names(r), ["Alias", "Id", "Label", "Label.size", "Mode", "Mode.first", "Mode.run", "Port", "Port.run", "Sum", "Work", "Work.run"]);
  assert.equal(r.coverage, "partial");
  for (const code of ["inherited-members", "generated-members", "extension-resolution", "unnamed-extension", "unsupported-declaration"])
    assert.ok(r.diagnostics.some(d => d.code === code), code);
});

test("Flutter pubspec discovery, nested packages and generated/test exclusions preserve routing boundaries", t => {
  const dir = fixture(t);
  for (const relative of ["packages/widget", ".dart_tool/cache", "build/generated", "integration_test"])
    fs.mkdirSync(path.join(dir, relative), { recursive: true });
  fs.writeFileSync(path.join(dir, "packages/widget/pubspec.yaml"), "name: widget\n");
  fs.writeFileSync(path.join(dir, "packages/widget/api.dart"), "class Other {}");
  for (const relative of [".dart_tool/cache", "build/generated", "integration_test"])
    fs.writeFileSync(path.join(dir, relative, "ignored.dart"), "class Ignored {}");
  fs.mkdirSync(path.join(dir, "lib/billing"));
  fs.writeFileSync(path.join(dir, "lib/billing/api.dart"), "class Billing {}");
  assert.deepEqual(detectModuleRoots(dir).map(m => [m.path, m.ecosystem]), [[".", "dart"], ["packages/widget", "dart"]]);
  assert.deepEqual(subBoundaryNames(dir, ".").sort(), ["lib", "packages"]);
  const r = inspectContract(dir, { unit: "." });
  assert.ok(r.followUp.some(f => f.unit === "packages/widget"));
  assert.ok(!names(r).includes("Other") && !names(r).includes("Ignored"));
  assert.deepEqual(names(inspectContract(dir, { unit: "packages/widget" })), ["Other"]);
});

test("Dart authored promises, comments and surface identity survive inspection byte-for-byte", t => {
  const dir = fixture(t);
  init(dir, {});
  const contractFile = path.join(dir, ".agents/cg/contract.yaml");
  const contract = loadContract(contractFile, { repoRoot: dir });
  contract.surface = [{ id: "flutter-entry", kind: "other", summary: "Launch Flutter application.", path: "lib/main.dart", symbols: [], contract: { accepts: [], returns: ["Application UI."], fails: [], guarantees: [] } }];
  contract.surface[0].path = "lib/main.dart";
  contract.surface[0].symbols = ["PromisedApi"];
  contract.surface[0].contract.guarantees = ["Preserve owner intent."];
  fs.writeFileSync(contractFile, `# Owner comment\n${stringifyContractYaml(contract)}`);
  const before = fs.readFileSync(contractFile);
  const r = inspectContract(dir, { unit: "." });
  assert.deepEqual(fs.readFileSync(contractFile), before);
  assert.deepEqual(r.proposals[0].authored[0].symbols, ["PromisedApi"]);
  assert.deepEqual(r.proposals[0].authored[0].contract.guarantees, ["Preserve owner intent."]);
});

test("Dart unknown, parser failure and observed empty cannot collapse to an empty proposal", t => {
  const dir = fixture(t);
  for (const [text, expected] of [["class _Private {}", []], ["export 'absent.dart';", null], ["class Broken {", null]]) {
    fs.writeFileSync(path.join(dir, "lib/main.dart"), text);
    const r = inspectContract(dir, { unit: ".", entries: ["lib/main.dart"] });
    assert.deepEqual(r.proposals[0].fields.symbols.value, expected);
  }
});
