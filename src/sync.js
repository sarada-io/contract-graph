/**
 * Regenerate every derived artifact: inherited-rule blocks, root principle indexes,
 * the shared-agent rule pointer, and the Claude discovery wrappers.
 *
 * Idempotent. Running it twice writes nothing the second time, which is exactly what
 * `cg verify`'s drift check depends on.
 */

import fs from "node:fs";
import path from "node:path";

import {
  ROOT_POINTERS,
  generate,
  generateAgentRule,
  generateClaudeSkillWrapper,
  generateRoot,
  inheritancePath,
  loadInheritance,
  parsePrinciples,
  principlesPath,
  skillsRoot,
} from "./model.js";

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

/** Apply one {path, current, desired} triple. Returns true when it changed the file. */
function apply(unit, changed, dryRun) {
  if (unit.current === unit.desired) return false;
  if (!dryRun) write(unit.path, unit.desired);
  changed.push(unit.path);
  return true;
}

export function sync(repoRoot, { dryRun = false } = {}) {
  const rules = parsePrinciples(principlesPath(repoRoot));
  const folders = loadInheritance(inheritancePath(repoRoot));
  const changed = [];

  for (const entry of Object.values(folders)) {
    apply(generate(repoRoot, entry, rules), changed, dryRun);
  }

  const projectName = path.basename(repoRoot);
  for (const [relPath, prefix] of Object.entries(ROOT_POINTERS)) {
    apply(generateRoot(repoRoot, relPath, prefix, projectName), changed, dryRun);
  }

  apply(generateAgentRule(repoRoot), changed, dryRun);

  const skills = skillsRoot(repoRoot);
  let wrapperCount = 0;
  if (fs.existsSync(skills)) {
    for (const name of fs.readdirSync(skills).sort()) {
      const skillFile = path.join(skills, name, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;
      wrapperCount += 1;
      apply(generateClaudeSkillWrapper(repoRoot, skillFile), changed, dryRun);
    }
  }

  return {
    changed,
    counts: {
      folders: Object.keys(folders).length,
      roots: Object.keys(ROOT_POINTERS).length,
      wrappers: wrapperCount,
    },
  };
}
