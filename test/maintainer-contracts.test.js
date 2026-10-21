/**
 * @file Check maintainer navigation against broken links, disconnected nodes and lost pointers.
 * @see ../src/runtime/distribution/.agent/contract.md
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkMaintainerContracts } from "../scripts/check-maintainer-contracts.mjs";

test("this repository's maintainer graph is navigable", () => {
  assert.deepEqual(checkMaintainerContracts(), []);
});

test("maintainer check detects broken navigation and ownership without consumer state", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-maintainer-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const entry = "[Installation](../src/runtime/installation/.agent/contract.md)\n";
  const child = "Parent: [repository](../../../../.agent/contract.md).\n[init](../init.js)\n";
  write(".agent/contract.md", entry);
  write("src/runtime/installation/.agent/contract.md", child);
  write("src/runtime/installation/init.js", "/** @see .agent/contract.md */\n");
  assert.deepEqual(checkMaintainerContracts(root), []);

  write("src/runtime/installation/.agent/contract.md", child + "[missing](../gone.js)\n");
  assert.ok(checkMaintainerContracts(root).some(error => error.includes("broken link: ../gone.js")));
  write("src/runtime/installation/.agent/contract.md", child);

  write(".agent/contract.md", "# Repository\n");
  const disconnected = checkMaintainerContracts(root);
  assert.ok(disconnected.some(error => error.includes("unreachable")));
  assert.ok(disconnected.some(error => error.includes("parent has no link back")));
  write(".agent/contract.md", entry);

  write("src/runtime/installation/init.js", "/** @see missing.md */\n");
  assert.ok(checkMaintainerContracts(root).some(error => error.includes("unknown @see")));
  write("src/runtime/installation/init.js", "export const init = () => {};\n");
  assert.ok(checkMaintainerContracts(root).some(error => error.includes("missing or unknown @see")));

  write("src/runtime/installation/.agent/contract.md", "# Installation\n");
  assert.ok(checkMaintainerContracts(root).some(error => error.includes("Parent must link")));
});
