/**
 * Scaffold Contract Graph governance into a target repository.
 *
 * Copies the core template tree plus the selected design packs. Never overwrites an
 * existing file — an install that silently replaces your constitution is an install
 * nobody can trust. Existing files are reported as skipped.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES = path.join(HERE, "..", "templates");

export function availableDesignPacks() {
  const dir = path.join(TEMPLATES, "design");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .map((n) => n.replace(/\.md$/, ""))
    .sort();
}

function copyTree(from, to, written, skipped) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(target, { recursive: true });
      copyTree(source, target, written, skipped);
      continue;
    }
    if (fs.existsSync(target)) {
      skipped.push(target);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    written.push(target);
  }
}

export function init(repoRoot, { packs = [] } = {}) {
  const written = [];
  const skipped = [];

  const core = path.join(TEMPLATES, "core");
  if (!fs.existsSync(core)) {
    throw new Error(`missing template tree: ${core}`);
  }
  fs.mkdirSync(repoRoot, { recursive: true });
  copyTree(core, repoRoot, written, skipped);

  const available = availableDesignPacks();
  const unknown = packs.filter((p) => !available.includes(p));
  if (unknown.length) {
    throw new Error(
      `unknown design pack(s): ${unknown.join(", ")}. Available: ${available.join(", ")}`,
    );
  }

  if (packs.length) {
    const designDir = path.join(repoRoot, ".agents", "cg", "design");
    fs.mkdirSync(designDir, { recursive: true });
    for (const pack of packs) {
      const target = path.join(designDir, `${pack}.md`);
      if (fs.existsSync(target)) {
        skipped.push(target);
        continue;
      }
      fs.copyFileSync(path.join(TEMPLATES, "design", `${pack}.md`), target);
      written.push(target);
    }
  }

  return { written, skipped, packs };
}
