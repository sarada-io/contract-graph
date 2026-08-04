/**
 * Scaffold Contract Graph governance into a target repository.
 *
 * Applies the explicit source-to-repository mapping plus the selected design packs. Never
 * overwrites an existing file — an install that silently replaces your constitution is an
 * install nobody can trust. Existing files are reported as skipped.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadProfileSelection,
  normalizeProfiles,
  profilePath,
  resolveProfiles,
} from "./profiles.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SOURCE_ROOT = path.join(HERE, "..");

/** Directory-level source mapping. `profiles` is configuration and is never scaffolded. */
export const SCAFFOLD_MAPPING = Object.freeze([
  {
    source: "principles",
    target: ".agents/cg/principles",
    mode: "always",
    select: "top-level-markdown",
  },
  {
    source: "principles/design",
    target: ".agents/cg/principles/design",
    mode: "selected",
    select: "design-packs",
  },
  { source: "governance", target: ".agents/cg", mode: "always", select: "tree" },
  { source: "skills", target: ".agents/skills", mode: "always", select: "tree" },
  { source: "scaffold/rules", target: ".agents/rules", mode: "always", select: "tree" },
  { source: "scaffold/module", target: "src", mode: "always", select: "tree" },
  { source: "scaffold/profiles", target: null, mode: "never", select: "tree" },
]);

export function availableDesignPacks() {
  const dir = path.join(SOURCE_ROOT, "principles", "design");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .map((n) => n.replace(/\.md$/, ""))
    .sort();
}

function copyFile(source, target, written, skipped) {
  if (fs.existsSync(target)) {
    skipped.push(target);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  written.push(target);
}

function copyTree(from, to, written, skipped) {
  // Record every outcome so the CLI can distinguish newly installed files from files that
  // already belonged to the target repository.
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(target, { recursive: true });
      copyTree(source, target, written, skipped);
      continue;
    }
    copyFile(source, target, written, skipped);
  }
}

function applyMappingRule(rule, repoRoot, packs, written, skipped) {
  if (rule.mode === "never") return;
  const source = path.join(SOURCE_ROOT, rule.source);
  const target = path.join(repoRoot, rule.target);

  if (rule.select === "tree") {
    copyTree(source, target, written, skipped);
    return;
  }
  if (rule.select === "top-level-markdown") {
    for (const filename of fs.readdirSync(source).filter((name) => name.endsWith(".md")).sort()) {
      copyFile(path.join(source, filename), path.join(target, filename), written, skipped);
    }
    return;
  }
  if (rule.select === "design-packs") {
    for (const pack of packs) {
      copyFile(
        path.join(source, `${pack}.md`),
        path.join(target, `${pack}.md`),
        written,
        skipped,
      );
    }
    return;
  }
  throw new Error(`unknown scaffold mapping selector: ${rule.select}`);
}

export function init(repoRoot, { packs = [], profiles } = {}) {
  const written = [];
  const skipped = [];

  const previous = loadProfileSelection(repoRoot, { allowMissing: true });
  const selectedProfiles = normalizeProfiles(profiles ?? previous?.profiles ?? ["all"]);
  resolveProfiles(selectedProfiles);
  const selectedPacks = [...new Set([...(previous?.packs ?? []), ...packs])].sort();

  fs.mkdirSync(repoRoot, { recursive: true });
  for (const rule of SCAFFOLD_MAPPING.filter((entry) => entry.mode === "always")) {
    applyMappingRule(rule, repoRoot, packs, written, skipped);
  }

  // Validate pack names before copying any optional files. The core scaffold may already have
  // been installed safely, but a misspelled pack must never become an arbitrary filesystem path.
  const available = availableDesignPacks();
  const unknown = selectedPacks.filter((p) => !available.includes(p));
  if (unknown.length) {
    throw new Error(
      `unknown design pack(s): ${unknown.join(", ")}. Available: ${available.join(", ")}`,
    );
  }

  for (const rule of SCAFFOLD_MAPPING.filter((entry) => entry.mode === "selected")) {
    applyMappingRule(rule, repoRoot, selectedPacks, written, skipped);
  }

  const record = profilePath(repoRoot);
  const desired = `${JSON.stringify({ profiles: selectedProfiles, packs: selectedPacks }, null, 2)}\n`;
  const current = fs.existsSync(record) ? fs.readFileSync(record, "utf8") : null;
  if (current === desired) {
    skipped.push(record);
  } else {
    fs.mkdirSync(path.dirname(record), { recursive: true });
    fs.writeFileSync(record, desired, "utf8");
    written.push(record);
  }

  return { written, skipped, packs: selectedPacks, profiles: selectedProfiles };
}
