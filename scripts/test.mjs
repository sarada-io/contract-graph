/** Run repository tests with isolated, automatically cleaned scratch storage. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { constants } from "node:os";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratchRoot = path.join(root, "tmp", "tests");
fs.mkdirSync(scratchRoot, { recursive: true });
const scratch = fs.mkdtempSync(path.join(scratchRoot, "run-"));
const requested = process.argv.slice(2);
const targets = requested.length ? requested : fs.readdirSync(path.join(root, "test"))
  .filter(name => name.endsWith(".test.js"))
  .sort()
  .map(name => path.join("test", name));
const child = spawn(process.execPath, ["--test", ...targets], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    TMPDIR: scratch,
    TMP: scratch,
    TEMP: scratch,
    NODE_COMPILE_CACHE: path.join(scratch, "node-compile-cache"),
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", error => {
  console.error(`Unable to run tests: ${error.message}`);
});
child.on("close", (code, signal) => {
  process.exitCode = code ?? (signal ? 128 + (constants.signals[signal] ?? 1) : 1);
  try {
    fs.rmSync(scratch, { recursive: true, force: true });
  } catch (error) {
    console.error(`Could not remove test scratch directory ${scratch}: ${error.message}`);
    process.exitCode = 1;
  }
});
