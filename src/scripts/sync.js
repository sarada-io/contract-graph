/**
 * Regenerate every derived artifact: the canonical agent entry, root discovery pointers, module
 * workspace-root pointers, the shared-agent rule pointer, and the Claude discovery wrappers.
 * Contracts themselves are authored YAML and are never rewritten by sync.
 *
 * Idempotent. Running it twice writes nothing the second time, which is exactly what
 * `cg verify`'s drift check depends on.
 */

import fs from "node:fs";
import path from "node:path";

import {
  generateAgentRule,
  generateCgAgent,
  generateClaudeSkillWrapper,
  generateModulePointer,
  generateRoot,
  MODULE_POINTERS,
  skillsRoot,
} from "./model.js";
import { loadContractGraph } from "./contracts.js";
import { resolveProfileSelection } from "./profiles.js";

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
  const graph = loadContractGraph(repoRoot, { throwOnError: true });
  const profile = resolveProfileSelection(repoRoot);
  const changed = [];

  // Generate the same units in both modes; `apply` is the only place that suppresses writes for
  // a dry run, so `cg sync --check` reports exactly what a real sync would change.
  const projectName = path.basename(repoRoot);
  const canonical = generateCgAgent(repoRoot);
  apply(canonical, changed, dryRun);
  if (canonical.legacyPath) {
    if (!dryRun) fs.rmSync(canonical.legacyPath);
    changed.push(canonical.legacyPath);
  }
  for (const [relPath, prefix] of Object.entries(profile.rootPointers)) {
    apply(generateRoot(repoRoot, relPath, prefix, projectName), changed, dryRun);
  }

  for (const record of graph.records) {
    if (record.contract.kind !== "module") continue;
    for (const pointer of MODULE_POINTERS) {
      apply(generateModulePointer(repoRoot, record.contract, pointer), changed, dryRun);
    }
  }

  apply(generateAgentRule(repoRoot), changed, dryRun);

  const skills = skillsRoot(repoRoot);
  let wrapperCount = 0;
  if (profile.skillWrappers && fs.existsSync(skills)) {
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
      folders: graph.records.filter((record) => record.contract.unit !== ".").length,
      roots: Object.keys(profile.rootPointers).length,
      wrappers: wrapperCount,
    },
  };
}
