/** Verify that targeted behavioral regressions are detected, using disposable source copies. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = [
  ["family binding is ignored", "src/scripts/catalog.js", "catalog.binding !== FAMILY_BINDING[family]", "false"],
  ["blank reasons are accepted", "src/scripts/catalog.js", 'for (const key of ["statement", "reason"])', 'for (const key of ["statement"])'],
  ["promotion requirements are string-coerced", "src/scripts/binding.js",
    'catalog.promotion.requires.length !== required.length ||\n        catalog.promotion.requires.some((item, index) => item !== required[index])',
    'catalog.promotion.requires.join(",") !== required.join(",")'],
  ["unregistered A detector implementations are accepted", "src/scripts/binding.js", 'const registered = BUILT_IN_DETECTORS[detector.id];', 'const registered = [detector.implementation, detector.negativeFixture];'],
  ["A rules disappear from contract context", "src/scripts/binding.js", 'return new Map(catalog.principles.map((rule) => [rule.id, rule.statement]));', 'return new Map();'],
  ["a valid preview writes files", "src/scripts/migrate-principles.js", 'if (!write || result.failures.length) return result;', 'if (result.failures.length) return result;'],
  ["backups contain converted data instead of originals", "src/scripts/migrate-principles.js", 'fs.writeFileSync(item.backup, item.original,', 'fs.writeFileSync(item.backup, item.text,'],
  ["failed commits do not restore earlier files", "src/scripts/migrate-principles.js", 'if (!result.written.includes(item.relative)) continue;', 'if (true) continue;'],
  ["P rationale is optional in the schema", "src/cg/schema/principles.schema.json", null, null, "principles", schema => { schema.$defs.productEntry.required = ["id", "statement"]; }],
  ["legacy product export points to a deleted schema", "src/scripts/build.js", '"./product-schema": "./agent/cg/schema/principles.schema.json"', '"./product-schema": "./agent/cg/schema/product.schema.json"', "build"],
];

let caught = 0;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "cg-principles-mutations-"));
try {
  for (const [index, [name, file, before, after, suite = "principles", editJson]] of cases.entries()) {
    const dir = path.join(scratch, String(index));
    fs.mkdirSync(dir);
    for (const name of ["bin", "src", "docs", "test", "package.json", "LICENSE", "README.md"]) {
      fs.cpSync(path.join(root, name), path.join(dir, name), { recursive: true });
    }
    fs.symlinkSync(path.join(root, "node_modules"), path.join(dir, "node_modules"), "dir");
    const target = path.join(dir, file);
    const original = fs.readFileSync(target, "utf8");
    let modified;
    if (editJson) {
      const json = JSON.parse(original);
      editJson(json);
      modified = JSON.stringify(json);
    } else {
      if (original.split(before).length !== 2) throw new Error(`mutation target must occur exactly once: ${name}`);
      modified = original.replace(before, after);
    }
    fs.writeFileSync(target, modified);
    const syntax = file.endsWith(".js") ? spawnSync(process.execPath, ["--check", target], { encoding: "utf8" }) : { status: 0 };
    if (syntax.status !== 0) throw new Error(`invalid mutation ${name}: ${syntax.stderr}`);
    const result = spawnSync(process.execPath, ["--test", `test/${suite}.test.js`], { cwd: dir, encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    // A syntax/import error is not evidence that a behavioral regression was detected.
    const output = `${result.stdout}\n${result.stderr}`;
    const detected = result.status === 1 && /AssertionError|ERR_ASSERTION/.test(output) && !/SyntaxError|ERR_MODULE_NOT_FOUND/.test(output);
    if (detected) caught++;
    process.stdout.write(`${detected ? "DETECTED" : "NOT DETECTED"}: ${name}\n`);
    if (!detected) process.stderr.write(output);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  process.stdout.write(`${caught}/${cases.length} targeted behavioral regressions detected\n`);
  process.exitCode = caught === cases.length ? 0 : 1;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
