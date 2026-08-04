/**
 * Verify that every folder-scoped contract is complete, current, and self-sufficient.
 *
 * Checks:
 *   1. Every module folder has `CLAUDE.md` and `AGENTS.md` — openable as a workspace root.
 *   2. Every mapped `CONTRACT.md` has its required sections.
 *   3. Re-running the generator produces no diff — inherited block not stale or hand-edited.
 *   4. A `CONTRACT.md` over the suggested threshold advises; size alone never fails.
 *   5. No `CONTRACT.md` cites a transient plan path or ticket ID — self-sufficiency.
 *   6. Every rule ID in `map/inheritance.json` exists under `principles/`.
 *   7. Every entry's `depth` and `contract` path agree with its key.
 *   8. Every root entry file carries a current principle index.
 *   9. Every canonical skill uses the cg- namespace, valid frontmatter, UI metadata,
 *      a catalog entry, and an exact generated Claude discovery wrapper.
 *  10. Design-principle sets have correct grammar, explicit modality and costs,
 *      modality-correct detector rows, unique IDs, and no inheritance entries; and every
 *      architecture and product principle carries exactly one enforcement-map row.
 */

import fs from "node:fs";
import path from "node:path";

import {
  ContractError,
  countLines,
  splitLines,
  MAX_CONTRACT_LINES,
  REQUIRED_SECTIONS,
  REQUIRED_SECTION_PATTERNS,
  ROOT_POINTERS,
  PLAN_PATH,
  PLAN_TICKET,
  generate,
  generateAgentRule,
  generateClaudeSkillWrapper,
  generateRoot,
  inheritancePath,
  loadInheritance,
  loadPrinciples,
  designRoot,
  enforcementPath,
  governanceContractPath,
  RULE_FAMILIES,
} from "./model.js";

const POINTERS = ["CLAUDE.md", "AGENTS.md"];
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKILL_FRONTMATTER_KEYS = ["name", "description"];
const SKILL_INTERFACE_KEYS = ["display_name", "short_description", "default_prompt"];
const SKILL_LINE_BUDGET = 500;
const WRAPPER_LINE_BUDGET = 12;

export const CORE_CG_SKILLS = [
  "cg-plan",
  "cg-prepare",
  "cg-execute",
  "cg-decide",
  "cg-complete",
  "cg-document",
];

/** Design sets ship as `<lowercase>.md` holding `DP-<UPPERCASE>-nn-nn` rules. */
const DESIGN_RULE = /^- \*\*(DP-([A-Z]+)-\d{2}-\d{2})\*\* `(invariant|guide)` — (\S.*)$/;
const DESIGN_ID = /DP-[A-Z]+-\d{2}-\d{2}/g;
const DESIGN_COST = /^ {2}\*\*Cost:\*\* \S.*$/;

/** Architecture and product principles ship under `principles/` as `XX-nn-nn`. */
const PRINCIPLE_ID = new RegExp(String.raw`(?:${RULE_FAMILIES.join("|")})-\d{2}-\d{2}`, "g");

const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);
const rel = (repoRoot, file) => path.relative(repoRoot, file).split(path.sep).join("/");

function listDirs(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function parseSkillFrontmatter(relative, text, fail) {
  if (!text.startsWith("---\n")) {
    fail(`[9] ${relative}: missing YAML frontmatter`);
    return null;
  }
  const closing = text.indexOf("\n---\n", 4);
  if (closing < 0) {
    fail(`[9] ${relative}: frontmatter has no closing \`---\``);
    return null;
  }

  const metadata = {};
  splitLines(text.slice(4, closing)).forEach((line, index) => {
      const number = index + 2;
      const match = /^([a-z_]+):[ \t]+(.+)$/.exec(line);
      if (!match) {
        fail(`[9] ${relative}:${number}: invalid one-line YAML frontmatter field`);
        return;
      }
      const [, key, value] = match;
      if (!SKILL_FRONTMATTER_KEYS.includes(key)) {
        fail(`[9] ${relative}:${number}: unsupported frontmatter field \`${key}\``);
        return;
      }
      if (key in metadata) {
        fail(`[9] ${relative}:${number}: duplicate frontmatter field \`${key}\``);
        return;
      }
      if (/^[[{|>&*!]/.test(value) || value.includes(": ") || value.includes(" #")) {
        fail(`[9] ${relative}:${number}: \`${key}\` must be a non-empty one-line plain scalar`);
        return;
      }
      metadata[key] = value;
    });

  const missing = SKILL_FRONTMATTER_KEYS.filter((k) => !(k in metadata));
  if (missing.length) {
    fail(`[9] ${relative}: missing frontmatter field(s): ${missing.join(", ")}`);
  }
  return metadata;
}

function parseSkillInterface(relative, text, fail) {
  const lines = splitLines(text);
  if (!lines.length || lines[0] !== "interface:") {
    fail(`[9] ${relative}: expected top-level \`interface:\` mapping`);
    return null;
  }

  const metadata = {};
  lines.slice(1).forEach((line, index) => {
    if (!line.trim()) return;
    const number = index + 2;
    const match = /^ {2}([a-z_]+):[ \t]+("(?:[^"\\]|\\.)*")$/.exec(line);
    if (!match) {
      fail(`[9] ${relative}:${number}: invalid quoted interface field`);
      return;
    }
    const [, key, encoded] = match;
    if (!SKILL_INTERFACE_KEYS.includes(key)) {
      fail(`[9] ${relative}:${number}: unsupported interface field \`${key}\``);
      return;
    }
    if (key in metadata) {
      fail(`[9] ${relative}:${number}: duplicate interface field \`${key}\``);
      return;
    }
    try {
      metadata[key] = JSON.parse(encoded);
    } catch {
      fail(`[9] ${relative}:${number}: invalid quoted string`);
    }
  });

  const missing = SKILL_INTERFACE_KEYS.filter((k) => !(k in metadata));
  if (missing.length) {
    fail(`[9] ${relative}: missing interface field(s): ${missing.join(", ")}`);
  }
  return metadata;
}

export function checkSkills(fail, repoRoot, requiredSkills = CORE_CG_SKILLS) {
  const root = path.join(repoRoot, ".agents", "skills");
  const catalogPath = governanceContractPath(repoRoot);
  const catalog = exists(catalogPath) ? read(catalogPath) : "";

  const skillNames = listDirs(root).filter((name) =>
    exists(path.join(root, name, "SKILL.md")),
  );
  if (!skillNames.length) {
    fail("[9] Contract Graph: no canonical repository skills found under .agents/skills");
    return 0;
  }

  const missingCore = requiredSkills.filter((n) => !skillNames.includes(n));
  if (missingCore.length) {
    fail(`[9] Contract Graph: missing core skill(s): ${missingCore.sort().join(", ")}`);
  }

  for (const folderName of skillNames) {
    const file = path.join(root, folderName, "SKILL.md");
    const relative = rel(repoRoot, file);
    const text = read(file);

    if (!folderName.startsWith("cg-")) {
      fail(`[9] ${relative}: public skill folder must use the cg- prefix`);
    }
    if (!SKILL_NAME.test(folderName)) {
      fail(`[9] ${relative}: invalid skill folder name \`${folderName}\``);
    }
    if (countLines(text) > SKILL_LINE_BUDGET) {
      fail(
        `[9] ${relative}: skill exceeds the ${SKILL_LINE_BUDGET}-line progressive-disclosure budget`,
      );
    }

    const metadata = parseSkillFrontmatter(relative, text, fail);
    if (metadata === null) continue;

    if (metadata.name !== folderName) {
      fail(
        `[9] ${relative}: frontmatter name \`${metadata.name ?? ""}\` does not match folder \`${folderName}\``,
      );
    }
    if (!metadata.description) {
      fail(`[9] ${relative}: frontmatter description is required`);
    } else if (metadata.description.length > 1024) {
      fail(`[9] ${relative}: frontmatter description exceeds 1024 characters`);
    }

    if (!catalog.includes(`](../skills/${folderName}/SKILL.md)`)) {
      fail(`[9] ${relative}: skill is missing from .agents/cg/contract.md catalog`);
    }

    const interfaceFile = path.join(root, folderName, "agents", "openai.yaml");
    if (!exists(interfaceFile)) {
      fail(`[9] ${relative}: missing agents/openai.yaml`);
      continue;
    }
    const interfaceRelative = rel(repoRoot, interfaceFile);
    const interfaceMetadata = parseSkillInterface(
      interfaceRelative,
      read(interfaceFile),
      fail,
    );
    if (interfaceMetadata === null) continue;
    const shortDescription = interfaceMetadata.short_description ?? "";
    if (shortDescription && (shortDescription.length < 25 || shortDescription.length > 64)) {
      fail(`[9] ${interfaceRelative}: short_description must contain 25–64 characters`);
    }
    if (!(interfaceMetadata.default_prompt ?? "").includes(`$${folderName}`)) {
      fail(`[9] ${interfaceRelative}: default prompt must name \`$${folderName}\``);
    }

    let wrapper;
    try {
      wrapper = generateClaudeSkillWrapper(repoRoot, file);
    } catch (error) {
      fail(`[9] ${relative}: cannot generate Claude wrapper: ${error.message}`);
      continue;
    }
    const wrapperRelative = rel(repoRoot, wrapper.path);
    if (!exists(wrapper.path)) {
      fail(`[9] ${relative}: missing Claude discovery wrapper ${wrapperRelative}`);
      continue;
    }
    if (countLines(wrapper.current) > WRAPPER_LINE_BUDGET) {
      fail(`[9] ${wrapperRelative}: Claude discovery wrapper exceeds ${WRAPPER_LINE_BUDGET} lines`);
    }
    if (wrapper.current !== wrapper.desired) {
      fail(
        `[9] ${wrapperRelative}: Claude discovery wrapper is stale or hand-edited; run \`cg sync\``,
      );
    }
  }

  const wrapperNames = listDirs(path.join(repoRoot, ".claude", "skills")).filter((name) =>
    exists(path.join(repoRoot, ".claude", "skills", name, "SKILL.md")),
  );
  const extra = wrapperNames.filter((n) => !skillNames.includes(n));
  if (extra.length) {
    fail(
      `[9] Contract Graph: Claude wrapper(s) have no canonical .agents/skills source: ${extra.sort().join(", ")}`,
    );
  }

  return skillNames.length;
}

export function checkAgentRule(fail, repoRoot) {
  const { path: file, current, desired } = generateAgentRule(repoRoot);
  if (current !== desired) {
    fail(
      `[9] ${rel(repoRoot, file)}: shared-agent Contract Graph rule is missing, stale, or hand-edited; run \`cg sync\``,
    );
  }
}

/**
 * First-cell text of every enforcement-map table row, or `null` when the file is absent.
 * One reader serves both coverage checks so the two can never disagree about what a row is.
 */
function enforcementRowCells(repoRoot) {
  const file = enforcementPath(repoRoot);
  if (!exists(file)) return null;
  return splitLines(read(file))
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|")[1] ?? "");
}

/**
 * [10] Every architecture and product principle owes exactly one enforcement-map row, and the
 * map may not cite a principle ID no principles file defines.
 *
 * A design principle states its own modality, so a `guide` is legitimately absent from the map.
 * `AP-` and `PP-` rules carry no modality marker: the map claims a row for every one of them,
 * and this is the check that makes the claim true rather than decorative.
 */
export function checkPrincipleEnforcement(fail, repoRoot, rules) {
  const cells = enforcementRowCells(repoRoot);
  if (cells === null) {
    if (rules.size) fail("[10] principles: missing `.agents/cg/map/enforcement.md`");
    return;
  }

  const ids = cells.flatMap((cell) => cell.match(PRINCIPLE_ID) ?? []);
  const count = (id) => ids.filter((x) => x === id).length;
  for (const ruleId of rules.keys()) {
    if (count(ruleId) !== 1) {
      fail(`[10] principle \`${ruleId}\` must have exactly one enforcement-map row`);
    }
  }
  for (const ruleId of [...new Set(ids)].sort()) {
    if (!rules.has(ruleId)) {
      fail(`[10] enforcement map references unknown principle ID \`${ruleId}\``);
    }
  }
}

/** Verify the explicitly loaded, never-inherited design-principle sets. */
export function checkDesignPrinciples(fail, repoRoot, folders = null) {
  const root = designRoot(repoRoot);
  if (!exists(root)) return 0;

  const files = fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".md"))
    .sort();

  const rules = new Map();
  for (const filename of files) {
    const setName = filename.replace(/\.md$/, "");
    if (!/^[a-z][a-z0-9-]*$/.test(setName)) {
      fail(`[10] design principles: set file \`${filename}\` must be lowercase-kebab`);
      continue;
    }
    const expectedSet = setName.toUpperCase().replace(/-/g, "");
    const file = path.join(root, filename);
    const relative = rel(repoRoot, file);
    const lines = splitLines(read(file));
    let parsedInFile = 0;

    lines.forEach((line, index) => {
      if (!line.startsWith("- **DP-")) return;
      const number = index + 1;
      const match = DESIGN_RULE.exec(line);
      if (!match) {
        fail(
          `[10] ${relative}:${number}: malformed design-principle rule; expected ` +
            "`DP-SET-nn-nn`, `invariant` or `guide`, and rule text",
        );
        return;
      }
      const [, ruleId, actualSet, modality] = match;
      parsedInFile += 1;
      if (actualSet !== expectedSet) {
        fail(
          `[10] ${relative}:${number}: \`${ruleId}\` belongs in the ` +
            `${actualSet.toLowerCase()}.md set, not ${filename}`,
        );
      }
      if (rules.has(ruleId)) {
        fail(`[10] design principles: duplicate rule ID \`${ruleId}\``);
      } else {
        rules.set(ruleId, modality);
      }

      // A guide owes exactly one non-empty Cost clause before the next rule starts.
      let nextRule = lines.length;
      for (let i = number; i < lines.length; i += 1) {
        if (lines[i].startsWith("- **DP-")) {
          nextRule = i;
          break;
        }
      }
      const costLines = lines.slice(number, nextRule).filter((l) => l.startsWith("  **Cost:**"));
      const validCosts = costLines.filter((l) => DESIGN_COST.test(l));
      if (modality === "guide" && validCosts.length !== 1) {
        fail(
          `[10] ${relative}:${number}: guide \`${ruleId}\` must have exactly one non-empty \`Cost:\` clause`,
        );
      }
    });

    if (parsedInFile === 0) {
      fail(`[10] ${relative}: design set file has no valid rules`);
    }
  }

  const cells = enforcementRowCells(repoRoot);
  if (cells === null && rules.size) {
    fail("[10] design principles: missing `.agents/cg/map/enforcement.md`");
  }
  const enforcementIds = (cells ?? []).flatMap((cell) => cell.match(DESIGN_ID) ?? []);

  const count = (id) => enforcementIds.filter((x) => x === id).length;
  for (const [ruleId, modality] of rules) {
    if (modality === "invariant" && count(ruleId) !== 1) {
      fail(`[10] design invariant \`${ruleId}\` must have exactly one enforcement-map row`);
    }
    if (modality === "guide" && count(ruleId)) {
      fail(`[10] design guide \`${ruleId}\` must not have an enforcement-map row`);
    }
  }
  for (const ruleId of [...new Set(enforcementIds)].sort()) {
    if (!rules.has(ruleId)) {
      fail(`[10] enforcement map references unknown design-principle ID \`${ruleId}\``);
    }
    if (count(ruleId) > 1) {
      fail(`[10] enforcement map contains duplicate design-principle ID \`${ruleId}\``);
    }
  }

  let map = folders;
  if (map === null) {
    try {
      map = JSON.parse(read(inheritancePath(repoRoot))).folders ?? {};
    } catch (error) {
      fail(`[10] design principles: cannot inspect inheritance.json: ${error.message}`);
      map = {};
    }
  }
  for (const [key, entry] of Object.entries(map)) {
    for (const ruleId of entry.rules ?? []) {
      if (String(ruleId).startsWith("DP-")) {
        fail(`[10] ${key}: design principle \`${ruleId}\` must be loaded explicitly, never inherited`);
      }
    }
  }

  return rules.size;
}

function checkPointers(key, entry, fail, repoRoot) {
  if (entry.kind !== "module") return;
  for (const pointer of POINTERS) {
    const file = path.join(repoRoot, key, pointer);
    if (!exists(file)) {
      fail(`[1] ${key}: missing ${pointer} — folder is not openable as a workspace root`);
      continue;
    }
    const text = read(file);
    if (!text.includes("`.agents/cg/contract.md`")) {
      fail(`[1] ${key}/${pointer}: missing canonical module contract pointer`);
    }
    if (!text.includes("../.agents/cg/principles/")) {
      fail(`[1] ${key}/${pointer}: missing canonical repository principles pointer`);
    }
  }
}

function checkMapShape(key, entry, fail) {
  const segments = key.split("/");
  if (entry.depth !== segments.length) {
    fail(
      `[7] ${key}: depth ${entry.depth} does not match the ${segments.length} path segment(s) in the key`,
    );
  }
  if (!entry.contract.startsWith(`${key}/`)) {
    fail(`[7] ${key}: contract path ${entry.contract} is not inside the folder`);
  }
}

function checkSections(key, entry, text, fail) {
  // Match the heading as a complete line. A substring test would accept
  // `## Verify Commands (typo)` as `## Verify Command` and silently pass a contract
  // whose required section was renamed out from under it.
  const headings = new Set(splitLines(text).map((line) => line.trimEnd()));
  for (const heading of REQUIRED_SECTIONS[entry.kind]) {
    if (!headings.has(heading)) {
      fail(`[2] ${entry.contract}: missing required section \`${heading}\``);
    }
  }
  for (const pattern of REQUIRED_SECTION_PATTERNS[entry.kind]) {
    if (!pattern.test(text)) {
      fail(`[2] ${entry.contract}: no section heading matching ${pattern.source}`);
    }
  }
}

function checkBudget(entry, text, advise) {
  const count = countLines(text);
  if (count > MAX_CONTRACT_LINES) {
    advise(
      `[4] ${entry.contract}: ${count} lines exceeds the suggested ${MAX_CONTRACT_LINES}-line ` +
        "readability threshold — consider whether the implementation owns more than one real " +
        "boundary; size alone does not require a split",
    );
  }
}

function checkSelfSufficiency(entry, text, fail) {
  splitLines(text).forEach((line, index) => {
    const number = index + 1;
    if (PLAN_PATH.test(line)) {
      fail(
        `[5] ${entry.contract}:${number}: cites a transient plan path — a permanent contract may ` +
          "cite a permanent design record, never a plan",
      );
    }
    const ticket = PLAN_TICKET.exec(line);
    if (ticket) {
      fail(
        `[5] ${entry.contract}:${number}: cites plan ticket id \`${ticket[0]}\` — state the rule in full instead`,
      );
    }
  });
}

/** Run every check. Returns {failures, advisories, counts}. */
export function verify(repoRoot) {
  const failures = [];
  const advisories = [];
  const fail = (message) => failures.push(message);

  let rules;
  let folders;
  try {
    rules = loadPrinciples(repoRoot);
    folders = loadInheritance(inheritancePath(repoRoot));
  } catch (error) {
    if (error instanceof ContractError || error instanceof SyntaxError) {
      return { failures: [error.message], advisories, counts: null };
    }
    throw error;
  }

  checkAgentRule(fail, repoRoot);
  const skillCount = checkSkills(fail, repoRoot);
  const designCount = checkDesignPrinciples(fail, repoRoot, folders);
  checkPrincipleEnforcement(fail, repoRoot, rules);

  for (const [key, entry] of Object.entries(folders)) {
    checkMapShape(key, entry, fail);
    checkPointers(key, entry, fail, repoRoot);

    // [6] Dangling rule references are reported per folder, then the folder is skipped
    // for generation so one bad id does not mask the remaining checks.
    const unknown = entry.rules.filter((r) => !rules.has(r));
    if (unknown.length) {
      fail(`[6] ${key}: rule id(s) not defined under principles/: ${unknown.join(", ")}`);
      continue;
    }

    let generated;
    try {
      generated = generate(repoRoot, entry, rules);
    } catch (error) {
      fail(`[3] ${key}: ${error.message}`);
      continue;
    }

    checkSections(key, entry, generated.current, fail);
    checkBudget(entry, generated.current, (m) => advisories.push(m));
    checkSelfSufficiency(entry, generated.current, fail);
    if (generated.current !== generated.desired) {
      fail(`[3] ${entry.contract}: inherited block is stale or was hand-edited. Run \`cg sync\`.`);
    }
  }

  const projectName = path.basename(repoRoot);
  for (const [relPath, prefix] of Object.entries(ROOT_POINTERS)) {
    let generated;
    try {
      generated = generateRoot(repoRoot, relPath, prefix, projectName);
    } catch (error) {
      fail(`[8] ${relPath}: ${error.message}`);
      continue;
    }
    if (generated.current !== generated.desired) {
      fail(`[8] ${relPath}: principle index is missing, stale, or hand-edited. Run \`cg sync\`.`);
    }
  }

  return {
    failures,
    advisories,
    counts: {
      folders: Object.keys(folders).length,
      roots: Object.keys(ROOT_POINTERS).length,
      skills: skillCount,
      design: designCount,
    },
  };
}
