/**
 * @file Check this checkout's Markdown contract links and source ownership pointers.
 * @see ../src/runtime/distribution/.agent/contract.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));

// Deliberately limited to maintainer context: no YAML, source parsing or dependencies.
export function checkMaintainerContracts(root = repository) {
  const errors = [];
  const entry = path.resolve(root, ".agent/contract.md");
  const files = [];
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) walk(file);
      else if (item.isFile()) files.push(file);
    }
  }
  for (const directory of ["src", "scripts", "bin"]) walk(path.resolve(root, directory));
  const contracts = new Set([entry, ...files.filter(file =>
    file.endsWith(path.join(".agent", "contract.md")))]);
  const edges = new Map();
  const parents = new Map();
  const report = (file, message) => errors.push(`${path.relative(root, file)}: ${message}`);
  const resolve = (file, target) => path.resolve(path.dirname(file), target.split("#")[0]);

  for (const file of contracts) {
    if (!fs.existsSync(file)) {
      report(file, "missing contract");
      continue;
    }
    const source = fs.readFileSync(file, "utf8");
    const links = [...source.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)]
      .map(match => match[1]).filter(link => !/^(?:[a-z][a-z\d+.-]*:|#)/i.test(link));
    const targets = links.map(link => resolve(file, link));
    edges.set(file, targets.filter(target => contracts.has(target)));
    for (let i = 0; i < links.length; i++) {
      if (!fs.existsSync(targets[i])) report(file, `broken link: ${links[i]}`);
    }
    if (file !== entry) {
      const parentLink = source.match(/^Parent: \[[^\]]+\]\(([^)]+)\)/m)?.[1];
      const parent = parentLink && resolve(file, parentLink);
      if (!contracts.has(parent)) report(file, "Parent must link to a maintainer contract");
      else parents.set(file, parent);
    }
  }
  for (const [file, parent] of parents) {
    if (!edges.get(parent)?.includes(file)) report(file, "parent has no link back to this contract");
  }
  const reached = new Set();
  function visit(file) {
    if (reached.has(file)) return;
    reached.add(file);
    for (const child of edges.get(file) ?? []) visit(child);
  }
  visit(entry);
  for (const file of contracts) {
    if (!reached.has(file)) report(file, "unreachable from repository contract");
  }

  for (const file of files.filter(file => /\.(?:js|mjs)$/.test(file) &&
    ["src/runtime/", "scripts/", "bin/"].some(prefix =>
      path.relative(root, file).split(path.sep).join("/").startsWith(prefix)))) {
    const pointer = fs.readFileSync(file, "utf8").slice(0, 2048).match(/@see\s+(\S+)/)?.[1];
    if (!pointer || !contracts.has(resolve(file, pointer))) {
      report(file, "missing or unknown @see maintainer contract");
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkMaintainerContracts();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Maintainer contract links and ownership pointers OK.");
}
