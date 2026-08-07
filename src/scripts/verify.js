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
 *  11. The phase map names only real rule families, and every family that ships is
 *      reachable from at least one phase.
 *  10. Design-principle sets have correct grammar, explicit modality and costs,
 *      modality-correct detector rows, unique IDs, and no inheritance entries; and every
 *      architecture and product principle carries exactly one enforcement-map row.
 */

import fs from "node:fs";
import path from "node:path";

import {
  ContractError,
  countLines,
  END_MARKER,
  splitLines,
  MAX_CONTRACT_LINES,
  REQUIRED_SECTIONS,
  REQUIRED_SECTION_PATTERNS,
  planPathPattern,
  PLAN_TICKET,
  generate,
  generateAgentRule,
  generateClaudeSkillWrapper,
  generateRoot,
  inheritancePath,
  loadInheritance,
  loadPrinciples,
  loadPhases,
  ROOT_POINTERS,
  ROOT_BEGIN_MARKER,
  phaseTokens,
  principlesRoot,
  principleFiles,
  FORK_FAMILIES,
  RULE_FAMILIES as FAMILIES,
  enforcementPath,
  governanceContractPath,
  RULE_FAMILIES,
} from "./model.js";
import { moduleCoverage, subBoundaryCount, subBoundaryNames } from "./modules.js";
import { ProfileError, resolveProfileSelection } from "./profiles.js";

const POINTERS = ["CLAUDE.md", "AGENTS.md"];
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKILL_FRONTMATTER_KEYS = ["name", "description"];
const SKILL_INTERFACE_KEYS = ["display_name", "short_description", "default_prompt"];
/**
 * The budget is about *recurring* reading cost, not tidiness.
 *
 * A lifecycle skill is loaded on every session that touches it, so its length is a tax paid
 * again and again — 500 lines is the point past which an agent starts skimming the thing that
 * governs it. `cg-warmup` is categorically different: it runs once in a repository's life, it
 * never runs again, and it is doing the hardest reading the framework asks for. Charging it the
 * recurring-cost budget would buy nothing and would push it toward the abbreviation that makes a
 * weaker model guess. It still has a ceiling, because a procedure nobody finishes reading is
 * unbounded in a different way.
 */
const SKILL_LINE_BUDGETS = { default: 500, "cg-warmup": 1000 };
const skillLineBudget = (name) => SKILL_LINE_BUDGETS[name] ?? SKILL_LINE_BUDGETS.default;
const WRAPPER_LINE_BUDGET = 12;

/**
 * The canonical skills, in the order their names sort. Alphabetical order is meaningful on
 * purpose — an editor listing them gives the sequence for free. The first four are the
 * lifecycle loop; `cg-unblock` follows because it is entered from any of them rather than
 * being a stage; `cg-warmup` is last because it is run once, at adoption, and never again.
 */
export const CORE_CG_SKILLS = [
  "cg-plan",
  "cg-prepare",
  "cg-produce",
  "cg-sign-off",
  "cg-unblock",
  "cg-warmup",
];

/** Fork-loaded families declare a modality per rule; inherited families never do. */
const FORK_ALT = FORK_FAMILIES.join("|");
const FORK_RULE = new RegExp(
  String.raw`^- \*\*((${FORK_ALT})-\d{2}-\d{2})\*\* \x60(invariant|guide)\x60 — (\S.*)$`,
);
const FORK_ID = new RegExp(String.raw`(?:${FORK_ALT})-\d{2}-\d{2}`, "g");
const FORK_COST = /^ {2}\*\*Cost:\*\* \S.*$/;

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

export function checkSkills(
  fail,
  repoRoot,
  requiredSkills = CORE_CG_SKILLS,
  { skillWrappers = { template: "claude-wrapper" } } = {},
) {
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
    const budget = skillLineBudget(folderName);
    if (countLines(text) > budget) {
      fail(`[9] ${relative}: skill exceeds the ${budget}-line progressive-disclosure budget`);
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

    if (!skillWrappers) continue;

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

  // Deliberately outside the `skillWrappers` guard. Putting it inside meant deselecting the
  // Claude profile also disabled the check that would have noticed its wrappers were still
  // there — the guard sat inside the thing it was meant to guard against, and a narrowed
  // selection left a full discovery surface the repository no longer claimed to support.
  const wrapperNames = listDirs(path.join(repoRoot, ".claude", "skills")).filter((name) =>
    exists(path.join(repoRoot, ".claude", "skills", name, "SKILL.md")),
  );
  if (!skillWrappers) {
    if (wrapperNames.length) {
      fail(
        "[9] Contract Graph: .claude/skills/ holds wrapper(s) " +
          `(${wrapperNames.sort().join(", ")}) but no selected profile declares them — ` +
          "delete them, or re-select a profile that does",
      );
    }
  } else {
    const extra = wrapperNames.filter((n) => !skillNames.includes(n));
    if (extra.length) {
      fail(
        `[9] Contract Graph: Claude wrapper(s) have no canonical .agents/skills source: ${extra.sort().join(", ")}`,
      );
    }
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
 * A fork-loaded principle states its own modality, so a `guide` is legitimately absent from the map.
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

/** Verify the explicitly loaded, never-inherited domain-principle sets. */
/**
 * The phase map is only worth having if it cannot drift from what is installed.
 *
 * Two directions, because each catches what the other cannot. A typo'd token would
 * silently load nothing; an installed set no phase names is governance nobody reads —
 * the same failure an unchecked enforcement map produces, one axis over.
 */
export function checkPhases(fail, repoRoot) {
  let phases;
  try {
    phases = loadPhases(repoRoot);
  } catch (error) {
    fail(`[11] ${error.message}`);
    return;
  }

  // Every family ships; the phase map is the only thing that decides where each is loaded.
  const present = principleFiles(repoRoot).map((info) => info.family);
  const known = new Set([...FAMILIES, ...FORK_FAMILIES]);

  const named = phaseTokens(phases);
  for (const token of named) {
    if (!known.has(token)) {
      fail(
        `[11] map/phases.json: token \`${token}\` matches no rule family; expected one of ` +
          `${[...known].join(", ")}`,
      );
    }
  }

  for (const family of present) {
    if (!named.includes(family)) {
      fail(
        `[11] map/phases.json: \`${family}\` principles are installed but no phase loads them — ` +
          "governance no phase reads is governance nobody reads",
      );
    }
  }
}

export function checkForkPrinciples(fail, repoRoot, folders = null) {
  const root = principlesRoot(repoRoot);
  if (!exists(root)) return 0;

  const rules = new Map();
  for (const info of principleFiles(repoRoot).filter((entry) => !entry.inherited)) {
    const { file, filename, family } = info;
    const relative = rel(repoRoot, file);
    const lines = splitLines(read(file));
    const marker = `- **${family}-`;
    let parsedInFile = 0;

    lines.forEach((line, index) => {
      if (!/^- \*\*[A-Z]{2}-/.test(line)) return;
      const number = index + 1;
      const match = FORK_RULE.exec(line);
      if (!match) {
        fail(
          `[10] ${relative}:${number}: malformed rule; expected ` +
            `\`${family}-nn-nn\`, \`invariant\` or \`guide\`, and rule text`,
        );
        return;
      }
      const [, ruleId, actualFamily, modality] = match;
      parsedInFile += 1;
      if (actualFamily !== family) {
        fail(
          `[10] ${relative}:${number}: \`${ruleId}\` is a ${actualFamily} rule and does not ` +
            `belong in ${filename}`,
        );
      }
      if (rules.has(ruleId)) {
        fail(`[10] fork principles: duplicate rule ID \`${ruleId}\``);
      } else {
        rules.set(ruleId, modality);
      }

      // A guide owes exactly one non-empty Cost clause before the next rule starts.
      let nextRule = lines.length;
      for (let i = number; i < lines.length; i += 1) {
        if (lines[i].startsWith(marker)) {
          nextRule = i;
          break;
        }
      }
      const costLines = lines.slice(number, nextRule).filter((l) => l.startsWith("  **Cost:**"));
      const validCosts = costLines.filter((l) => FORK_COST.test(l));
      if (modality === "guide" && validCosts.length !== 1) {
        fail(
          `[10] ${relative}:${number}: guide \`${ruleId}\` must have exactly one non-empty \`Cost:\` clause`,
        );
      }
    });

    if (parsedInFile === 0) {
      fail(`[10] ${relative}: ${family} principle file has no valid rules`);
    }
  }

  const cells = enforcementRowCells(repoRoot);
  if (cells === null && rules.size) {
    fail("[10] fork principles: missing `.agents/cg/map/enforcement.md`");
  }
  const enforcementIds = (cells ?? []).flatMap((cell) => cell.match(FORK_ID) ?? []);

  const count = (id) => enforcementIds.filter((x) => x === id).length;
  for (const [ruleId, modality] of rules) {
    if (modality === "invariant" && count(ruleId) !== 1) {
      fail(`[10] invariant \`${ruleId}\` must have exactly one enforcement-map row`);
    }
    if (modality === "guide" && count(ruleId)) {
      fail(`[10] guide \`${ruleId}\` must not have an enforcement-map row`);
    }
  }
  for (const ruleId of [...new Set(enforcementIds)].sort()) {
    if (!rules.has(ruleId)) {
      fail(`[10] enforcement map references unknown principle ID \`${ruleId}\``);
    }
    if (count(ruleId) > 1) {
      fail(`[10] enforcement map contains duplicate principle ID \`${ruleId}\``);
    }
  }

  let map = folders;
  if (map === null) {
    try {
      map = JSON.parse(read(inheritancePath(repoRoot))).folders ?? {};
    } catch (error) {
      fail(`[10] fork principles: cannot inspect inheritance.json: ${error.message}`);
      map = {};
    }
  }
  for (const [key, entry] of Object.entries(map)) {
    for (const ruleId of entry.rules ?? []) {
      const family = String(ruleId).slice(0, 2);
      if (FORK_FAMILIES.includes(family)) {
        fail(
          `[10] ${key}: \`${ruleId}\` is loaded at a fork and must never be inherited — ` +
            "an unavoidable guide is just a rule",
        );
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

function checkSelfSufficiency(entry, text, fail, planPath) {
  splitLines(text).forEach((line, index) => {
    const number = index + 1;
    if (planPath.test(line)) {
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

/**
 * Ask whether a module's packages are one boundary. Do not try to answer it.
 *
 * The downward edge is the product, and it is the level `cg modules` is blind to — no build
 * manifest declares a package. But nothing mechanical separates "many packages, one purpose" from
 * "many packages, many boundaries". Measured on a repository whose author had already decided,
 * by hand, module by module:
 *
 *     module            packages  cross-package edges  author's answer
 *     mandala-data            12                    9  decompose
 *     mandala-chat             4                    1  decompose
 *     mandala-contracts       15                    4  one boundary
 *     mandala-orchestrator    10                   13  one boundary
 *
 * Count does not separate them (4 decomposes, 15 does not). Coupling does not separate them
 * (0.25 decomposes, 0.27 does not; 0.75 decomposes, 1.30 does not). Even within one module the
 * author gave contracts to 7 of 12 packages — the bounded-context slices, not the shared
 * plumbing. That distinction is semantic and no import graph carries it.
 *
 * So this advises rather than fails, for the same reason `cg modules` does: a heuristic that
 * fails the build is one everyone learns to bypass. And it is silenced by *any* stated reason,
 * because the author is the one who can answer — judging the wording only taught a previous run
 * to write a longer sentence.
 */
const LEAF_CLAIM = /^##[ \t]+Child Contracts[ \t]*$/m;
const SUB_BOUNDARY_ADVISORY_FLOOR = 3;

function checkLeafClaims(repoRoot, folders, advise) {
  for (const [key, entry] of Object.entries(folders)) {
    let body;
    try {
      body = fs.readFileSync(path.join(repoRoot, entry.contract), "utf8");
    } catch {
      continue;
    }
    const match = LEAF_CLAIM.exec(body);
    if (!match) continue;

    const after = body.slice(match.index + match[0].length);
    const section = after.split(/^## /m)[0];
    // A leaf claim is the *absence* of a declared child, not a particular word for it. Keying
    // on "none" let six contracts escape by saying "one boundary: ..." instead.
    if (/contract\.md/.test(section)) continue;

    const names = subBoundaryNames(repoRoot, key);
    const count = names.length;
    if (count < SUB_BOUNDARY_ADVISORY_FLOOR) continue;

    // Any stated reason clears this. The author knows which packages are one boundary; the
    // verifier does not, and policing the wording only produced longer sentences.
    const stated = section.replace(/<!--[\s\S]*?-->/g, "").replace(/\bnone\b/gi, "").trim();
    if (stated.length >= 40) continue;
    {
      advise(
        `[0] ${key}: declares no child contracts over ${count} separate packages. A unit that ` +
          "delivers a nameable functionality and reaches outside itself only rarely owes its " +
          `own contract. To claim they are one boundary instead, account for all ${count} of ` +
          "them and say what makes them inseparable — naming a few, or a sentence that would " +
          "be equally true of any module, is not evidence",
      );
    }
  }
}

/**
 * Catch a warmup that reported success without finishing.
 *
 * Measured on two real adoption runs. One left `Project Identity` as its shipped placeholder —
 * the root of the graph, the first thing every session reads — and nothing objected, because the
 * repository contract is not in `map/inheritance.json` so no section check covers it. The same
 * run wrote no findings file at all, which means the per-unit loop never recorded anything and a
 * context break would have restarted the work from zero.
 *
 * Both are advisory. A greenfield repository legitimately has neither yet: `init` tells that user
 * to fill the identity themselves, and there is no loop to leave findings behind. The findings
 * check is therefore gated on a map that something already populated.
 */
function checkWarmupCompletion(repoRoot, folders, docsRoot, advise) {
  const contract = governanceContractPath(repoRoot);
  if (exists(contract) && read(contract).includes("<!-- Replace this section")) {
    advise(
      "[0] .agents/cg/contract.md still carries a `Replace this section` placeholder — the root " +
        "of the graph is the first thing every session reads, and nothing else fills it",
    );
  }

  if (!Object.keys(folders).length) return;

  // `product.md` untouched after warmup means the harvest step was skipped — the clearest sign
  // available, and invisible until now: a run reported success with eleven modules mapped and
  // the shipped principles file byte-for-byte unchanged.
  const product = path.join(principlesRoot(repoRoot), "product.md");
  if (exists(product) && !PRINCIPLE_ID.test(read(product).split("```").filter((_, i) => i % 2 === 0).join(""))) {
    advise(
      "[0] principles/product.md defines no rules although folders are mapped — `cg-warmup` " +
        "harvests this repository's product rules from its code, so an untouched file means that " +
        "step was skipped, not that the repository owes none",
    );
  }
  PRINCIPLE_ID.lastIndex = 0;

  const findings = path.join(repoRoot, docsRoot, "plans", "warmup-findings.md");
  if (!exists(findings)) {
    advise(
      `[0] ${docsRoot}/plans/warmup-findings.md is absent although ${Object.keys(folders).length} ` +
        "folder(s) are mapped — `cg-warmup` records each unit's findings there as it goes, so an " +
        "absent file means the loop kept its state in context and a break would restart it",
    );
  }
}

/**
 * Catch a graph that was generated rather than written.
 *
 * Measured on a real adoption run: an agent decided ten contracts was mechanical work, wrote a
 * script, and emitted all ten from one string template — `Purpose: core responsibilities for
 * <module>`, `Used by: dependent modules`, every module bound to an identical list of every rule,
 * every module declared a leaf. It passed `cg modules` with full coverage. Nothing in the verifier
 * objected, because the verifier proves a rule ID exists and a heading is present; it cannot read
 * a sentence and notice it says nothing.
 *
 * These two signals can be read mechanically. Both are advisory: a small repository may honestly
 * have two similar contracts, and a rule that genuinely binds everything is legitimate. What is
 * not legitimate is *every* contract agreeing — that is a template, not a judgement.
 */
function checkTemplatedContracts(repoRoot, folders, fail) {
  const entries = Object.entries(folders);
  if (entries.length < 3) return;

  const signatures = new Set(entries.map(([, e]) => e.rules.join(",")));
  if (signatures.size === 1) {
    fail(
      `[12] all ${entries.length} mapped folders inherit an identical rule set — a scope chosen ` +
        "per module is never uniform across a whole repository; check this was authored, not generated",
    );
  }

  // A sentence repeated verbatim across most contracts is boilerplate: true of every module,
  // therefore informative about none. Generated regions are excluded — those are meant to match.
  const seen = new Map();
  for (const [, entry] of entries) {
    let body;
    try {
      body = fs.readFileSync(path.join(repoRoot, entry.contract), "utf8");
    } catch {
      continue;
    }
    const authored = body.split(END_MARKER).pop();
    // Every prose line, not just bullets. Restricting this to `- ` items let ten contracts
    // carry one identical justification sentence — the exact shape the check exists to catch.
    const lines = new Set(
      splitLines(authored)
        .map((line) => line.trim())
        .filter((line) => line.length > 24 && !line.startsWith("#") && !line.startsWith("<!--")),
    );
    for (const line of lines) seen.set(line, (seen.get(line) ?? 0) + 1);
  }

  const threshold = Math.max(3, Math.ceil(entries.length * 0.6));
  const boilerplate = [...seen].filter(([, n]) => n >= threshold).map(([line]) => line);
  if (boilerplate.length) {
    fail(
      `[12] ${boilerplate.length} line(s) appear verbatim in ${threshold}+ of ${entries.length} ` +
        `contracts, e.g. ${JSON.stringify(boilerplate[0].slice(0, 60))} — a sentence true of ` +
        "every module describes none of them",
    );
  }
}

/** Run every check. Returns {failures, advisories, counts}. */
export function verify(repoRoot) {
  const failures = [];
  const advisories = [];
  const fail = (message) => failures.push(message);

  let rules;
  let folders;
  let profile;
  try {
    rules = loadPrinciples(repoRoot);
    folders = loadInheritance(inheritancePath(repoRoot));
    profile = resolveProfileSelection(repoRoot);
  } catch (error) {
    if (error instanceof ContractError || error instanceof ProfileError || error instanceof SyntaxError) {
      return { failures: [error.message], advisories, counts: null };
    }
    throw error;
  }

  // Derived from the repository's own recorded docs root, so relocating the document
  // trees relocates the self-sufficiency check with them.
  const planPath = planPathPattern(profile.docs);

  // Advisory, never a failure: detection reads build manifests and is a heuristic, and a
  // heuristic that fails the build is one everyone learns to bypass. But an unmapped module
  // is the difference between "the scaffold is well-formed" and "this repository is
  // governed", so it must not be silent either.
  const coverage = moduleCoverage(repoRoot, folders);
  for (const module of coverage.unmapped) {
    advisories.push(
      `[0] ${module.path}/ looks like a module root (${module.manifest}) but no entry in ` +
        "map/inheritance.json governs it — run the `cg-warmup` skill once, or record why it is excluded",
    );
  }

  checkTemplatedContracts(repoRoot, folders, fail);
  checkWarmupCompletion(repoRoot, folders, profile.docs, (m) => advisories.push(m));
  checkLeafClaims(repoRoot, folders, (m) => advisories.push(m));

  checkAgentRule(fail, repoRoot);
  checkPhases(fail, repoRoot);
  const skillCount = checkSkills(fail, repoRoot, CORE_CG_SKILLS, profile);
  const designCount = checkForkPrinciples(fail, repoRoot, folders);
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
    checkSelfSufficiency(entry, generated.current, fail, planPath);
    if (generated.current !== generated.desired) {
      fail(`[3] ${entry.contract}: inherited block is stale or was hand-edited. Run \`cg sync\`.`);
    }
  }

  // Same shape as the orphan wrapper check: narrowing the profile selection used to leave a
  // fully generated entry point behind, silently. A file carrying the generated index whose
  // profile is no longer selected is stale; one without it is the repository's own file and
  // is none of our business.
  for (const relPath of Object.keys(ROOT_POINTERS)) {
    if (relPath in profile.rootPointers) continue;
    const file = path.join(repoRoot, relPath);
    if (!exists(file) || !read(file).includes(ROOT_BEGIN_MARKER)) continue;
    fail(
      `[8] ${relPath}: carries a generated principle index but no selected profile writes it — ` +
        "delete it, or re-select the profile that owns it",
    );
  }

  const projectName = path.basename(repoRoot);
  for (const [relPath, prefix] of Object.entries(profile.rootPointers)) {
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
      roots: Object.keys(profile.rootPointers).length,
      skills: skillCount,
      design: designCount,
      modules: { detected: coverage.detected.length, unmapped: coverage.unmapped.length },
    },
  };
}
