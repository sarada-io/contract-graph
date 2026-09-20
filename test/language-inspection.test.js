import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectNative, adapters } from "../src/scripts/inspection/native-languages.js";
import { inspectContract, inspectionSnapshotChanges } from "../src/scripts/contract-inspection.js";
const fixtures = fileURLToPath(new URL("./fixtures/contract-inspection/languages/", import.meta.url));
const names = r => [...new Set(r.facts.filter(f => f.category === "export").map(f => f.name))].sort();
const scenarios = [
  ["api.dart", "dart", ["Api", "Api.Api", "Api.named", "Api.name", "Api.count", "Api.charge", "Handler", "first", "second", "message", "title", "submit"]],
  ["Api.java", "java", ["Api", "Api.Api", "Api.Receipt", "Api.Receipt.total", "Api.charge", "Api.count"]],
  ["Api.kt", "kotlin", ["Api", "Api.charge", "Api.count", "Api.id", "Name", "submit"]],
  ["api.py", "python", ["Account", "Account.save", "LIMIT", "charge"]],
  ["api.go", "go", ["Account", "Account.Balance", "Account.Charge", "Limit", "Public", "Reader", "Reader.Read", "Second", "Submit"]],
  ["Api.cs", "c_sharp", ["Api", "Api.Api", "Api.Charge", "Api.Count", "Api.Receipt", "Api.Receipt.Total", "Port", "Port.Submit"]],
];
for (const [file, language, expected] of scenarios) {
  test(`${language}: visibility, member ownership, imports and decoys use parsed syntax`, () => {
    const text = fs.readFileSync(path.join(fixtures, file), "utf8");
    const report = inspectNative(file, text, language);
    assert.equal(report.coverage, "complete-for-supported-syntax", JSON.stringify(report.diagnostics));
    assert.deepEqual(names(report), expected.sort());
    assert.ok(report.facts.some(f => f.category === "dependency"));
    assert.ok(report.facts.every(f => f.language === language && f.range.start.line > 0));
    assert.ok(report.facts.every(f => !/Imaginary|Phantom|phantom|local|Local|bypass|Bypass/.test(f.name ?? "")));
    const mutated = inspectNative(file, text.replaceAll(language === "go" ? "Submit" : language === "python" ? "charge" : ["kotlin", "dart"].includes(language) ? "submit" : language === "c_sharp" ? "Charge" : "charge", "Renamed"), language);
    assert.ok(names(mutated).some(n => n.endsWith("Renamed")));
  });
  test(`${language}: invalid syntax is failure, never an empty public API`, () => {
    const r = inspectNative(file, fs.readFileSync(path.join(fixtures, file), "utf8") + (language === "python" ? "\ndef broken(:\n" : "\nclass { fn (\n"), language);
    assert.equal(r.coverage, "failed");
    assert.ok(r.diagnostics.some(d => d.code === "parse-error"));
    assert.deepEqual(r.facts, []);
  });
}

test("Java interface visibility and inherited/generated API limitations", () => {
  const r = inspectNative("Port.java", "public interface Port { int LIMIT = 1; void run(); private void hidden() {} class Child {} }", "java");
  assert.deepEqual(names(r), ["Port", "Port.Child", "Port.LIMIT", "Port.run"]);
  const inherited = inspectNative("Api.java", "public class Api extends Base { public void run() {} }", "java");
  assert.equal(inherited.coverage, "partial");
  assert.ok(inherited.diagnostics.some(d => d.code === "inherited-members"));
  assert.ok(names(inherited).includes("Api.run"));
  assert.equal(inspectNative("Mode.java", "public enum Mode { A, B }", "java").coverage, "partial");
});

test("Kotlin private/internal/protected and implicit override visibility do not become public", () => {
  const r = inspectNative("Api.kt", "class Api {\n protected fun secret() {}\n override fun unknown() {}\n public override fun known() {}\n}\n", "kotlin");
  assert.equal(r.coverage, "partial");
  assert.deepEqual(names(r), ["Api", "Api.known"]);
  assert.ok(r.diagnostics.some(d => d.code === "override-visibility"));
});

test("Python exports remain unknown for dynamic __all__, imports, decorators and conditional definitions", () => {
  for (const source of [
    "__all__ = names()\ndef visible(): pass\n",
    "__all__ = ['visible']\n__all__.append('later')\ndef visible(): pass\n",
    "__all__ = ['missing']\n",
    "from elsewhere import *\n",
    "@decorate\ndef visible(): pass\n",
    "if condition:\n def visible(): pass\n",
    "exec(source)\n",
  ]) assert.notEqual(inspectNative("api.py", source, "python").coverage, "complete-for-supported-syntax", source);
  const empty = inspectNative("api.py", "__all__ = []\ndef visible(): pass\n", "python");
  assert.deepEqual(names(empty), []);
  assert.equal(empty.coverage, "complete-for-supported-syntax");
  const imports = inspectNative("api.py", "from .helpers import prepare as alias\nimport os.path as path\n", "python");
  assert.ok(imports.facts.some(f => f.specifier === ".helpers"));
  assert.ok(imports.facts.some(f => f.specifier === "os.path" && f.alias === "path"));
  assert.equal(imports.coverage, "partial");
});

test("Go Unicode visibility, grouped declarations, embedded types and build conditions", () => {
  const r = inspectNative("api.go", "package api\nvar (\n Export = 1\n Second = 2\n)\nfunc Écho() {}\nfunc hidden() {}\n", "go");
  assert.deepEqual(names(r), ["Export", "Second", "Écho"]);
  const conditional = inspectNative("api_linux.go", "//go:build linux\n\npackage api\ntype Public struct { Embedded }\n", "go");
  assert.equal(conditional.coverage, "partial");
  assert.ok(conditional.diagnostics.some(d => d.code === "build-constraint"));
  assert.ok(conditional.diagnostics.some(d => d.code === "embedded-members"));
});

test("C# .NET namespaces, aliases, partial types, attributes and preprocessing remain qualified", () => {
  const r = inspectNative("Api.cs", "using A = System.String; namespace Billing; public partial class Api { public void Run() {} }", "c_sharp");
  assert.ok(r.facts.some(f => f.category === "dependency" && f.alias === "A" && f.specifier === "System.String"));
  assert.ok(r.facts.some(f => f.name === "Api.Run" && f.namespace === "Billing"));
  assert.ok(r.diagnostics.some(d => d.code === "partial-or-generated-members"));
  for (const source of ["#if FEATURE\npublic class Api {}\n#endif\n", "[Generated] public class Api {}", "public class Api : Base {}"])
    assert.notEqual(inspectNative("Api.cs", source, "c_sharp").coverage, "complete-for-supported-syntax");
});

test("mixed-language report preserves source, proposes evidenced paths and never resolves imports as graph edges", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-language-report-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(fixtures, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "unsupported.fs"), "module Unsupported");
  const before = Object.fromEntries(fs.readdirSync(dir).map(name => [name, fs.readFileSync(path.join(dir, name), "utf8")]));
  const r = inspectContract(dir, { unit: "." });
  assert.equal(r.adapters.length, 7);
  assert.equal(adapters.every(a => /^[a-f0-9]{64}$/.test(a.grammarSha256)), true);
  assert.deepEqual(r.proposals.map(p => p.candidateKey).sort(), scenarios.map(s => s[0]).sort());
  assert.ok(r.facts.filter(f => f.category === "dependency").every(f => f.resolution.state === "unresolved"));
  assert.equal(r.fields["relations.dependencies"].value, null);
  assert.ok(r.coverage.files.some(f => f.path === "unsupported.fs" && f.state === "unsupported"));
  assert.ok(r.proposals.every(p => p.fields.path.evidence.length > 0 && p.fields.symbols.value !== null));
  assert.deepEqual(Object.fromEntries(fs.readdirSync(dir).map(name => [name, fs.readFileSync(path.join(dir, name), "utf8")])), before);
  assert.deepEqual(inspectContract(dir, { unit: "." }), r);
  fs.appendFileSync(path.join(dir, "api.go"), "\nfunc Added() {}\n");
  assert.ok(inspectionSnapshotChanges(dir, r.snapshot).includes("api.go"));
});

test("Python nested imports and class declarations retain syntax evidence without dynamic closure claims", () => {
  const r = inspectNative("api.py", "class Api:\n LIMIT = 1\n class Nested:\n  def run(self): pass\n def run(self):\n  from .helpers import work\n", "python");
  assert.deepEqual(names(r), ["Api", "Api.LIMIT", "Api.Nested", "Api.Nested.run", "Api.run"]);
  assert.ok(r.facts.some(f => f.category === "dependency" && f.specifier === ".helpers"));
  assert.ok(!names(r).includes("work"));
  assert.equal(inspectNative("api.py", "def __getattr__(name): return anything\n", "python").coverage, "partial");
});

test("nested .NET/Go/JVM/Python projects remain separate inspection selections", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-language-boundaries-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const manifests = ["service.csproj", "go.mod", "pom.xml", "pyproject.toml", "build.gradle.kts", "pubspec.yaml"];
  for (const [i, manifest] of manifests.entries()) {
    const unit = path.join(dir, `unit${i}`); fs.mkdirSync(unit);
    fs.writeFileSync(path.join(unit, manifest), "");
    fs.writeFileSync(path.join(unit, "Api.cs"), "public class Api {}");
  }
  const r = inspectContract(dir, { unit: "." });
  assert.equal(r.followUp.length, manifests.length);
  assert.equal(r.facts.filter(f => f.category === "export").length, 0);
  assert.ok(inspectContract(dir, { unit: "unit0" }).facts.some(f => f.name === "Api"));
});
