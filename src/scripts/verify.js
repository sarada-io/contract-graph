/**
 * Verify the structured contract graph, structural bindings, principles, lifecycle, and discovery.
 *
 * Checks:
 *   1. Every module contract has `CLAUDE.md` and `AGENTS.md` pointers.
 *   2. Contract YAML shape, references, reciprocity, cycles, and root reachability are valid.
 *   5. No permanent contract cites a transient plan path or ticket ID.
 *   6. Every contract rule ID exists under the product bindings.
 *   8. Every root entry file carries a current principle index.
 *   9. Every canonical skill uses the cg- namespace, valid frontmatter, UI metadata,
 *      a catalog entry, and an exact generated Claude discovery wrapper.
 *  11. The phase map names only real rule families, and every family that ships is
 *      reachable from at least one phase.
 *  10. Structural bindings name registered enforcement; non-binding architecture practices
 *      have valid grammar; and every product binding carries exactly one enforcement-map row.
 */

import fs from "node:fs";
import path from "node:path";

import {
  BINDING_FILENAME,
  BindingError,
  loadBindingCatalog,
} from "./binding.js";
import { loadContract, loadContractGraph } from "./contracts.js";

import {
  ContractError,
  countLines,
  splitLines,
  planPathPattern,
  PLAN_TICKET,
  generateAgentRule,
  generateClaudeSkillWrapper,
  generateRoot,
  loadBindingPrinciples,
  loadPhases,
  ROOT_POINTERS,
  ROOT_BEGIN_MARKER,
  CORE_BINDING_FAMILIES,
  BEST_PRACTICE_FAMILIES,
  ENFORCEMENT_FILENAME,
  phaseTokens,
  guidelinesRoot,
  principleFiles,
  FORK_FAMILIES,
  RULE_FAMILIES as FAMILIES,
  loadEnforcementMap,
  loadEngineeringMap,
  familyOf,
  productHasHarvestedRules,
  ENGINEERING_FILENAME,
  governanceContractPath,
} from "./model.js";
import { moduleCoverage, openDescent } from "./modules.js";
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
/** `test -f path` and `[ -f path ]` prove a file exists, not that an invariant holds. */
const EXISTENCE_ONLY = /^\s*(?:test\s+-[efd]\s+\S+|\[\s+-[efd]\s+\S+\s*\])\s*$/;

/**
 * The canonical skills, in the order their names sort.
 *
 * The sort order is for readers of this file only. It buys nothing in an editor: Claude Code and
 * Codex both rank their skill pickers by usage, not by name, so no naming scheme puts these in
 * lifecycle order on screen. Sequence is carried by each skill's `Next action` route instead.
 *
 * `cg-auto-run` leads because it is an adapter over the lifecycle rather than a part of it. Then
 * the four lifecycle stages; `cg-unblock` follows because it is entered from any of them rather
 * than being a stage; `cg-warmup` is last because it is run once, at adoption, and never again.
 */
export const CORE_CG_SKILLS = [
  "cg-auto-run",
  "cg-plan",
  "cg-prepare",
  "cg-produce",
  "cg-sign-off",
  "cg-unblock",
  "cg-warmup",
];

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
  let catalog = new Set();
  if (exists(catalogPath)) {
    try {
      const parsed = loadContract(catalogPath, { repoRoot, validate: false });
      catalog = new Set(
        (parsed.extensions?.contractGraph?.skills ?? []).map((entry) => entry?.name).filter(Boolean),
      );
    } catch {
      // The graph validator reports malformed YAML with its exact location.
    }
  }

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

    if (!catalog.has(folderName)) {
      fail(`[9] ${relative}: skill is missing from .agents/cg/contract.yaml catalog`);
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
 * Rule IDs from the authored enforcement map, or `null` when the file is absent.
 * Parse failures are recorded as [10] and return an empty list so later coverage
 * checks do not invent a second diagnosis.
 */
function enforcementRuleIds(fail, repoRoot) {
  try {
    const catalog = loadEnforcementMap(repoRoot);
    if (catalog === null) return null;
    return catalog.entries.flatMap((entry) => entry.rules);
  } catch (error) {
    fail(`[10] ${error.message}`);
    return [];
  }
}

/**
 * [10] Every repository-authored product binding owes exactly one enforcement-map row, and the
 * map may not cite a product rule no guideline file defines. Core A enforcement lives in the
 * architecture catalog; engineering guidelines never appear here.
 */
export function checkPrincipleEnforcement(fail, repoRoot, rules, ids) {
  const productRules = new Map([...rules].filter(([ruleId]) => familyOf(ruleId) === "P"));
  if (ids === null) {
    if (productRules.size) fail(`[10] principles: missing enforcement map \`${ENFORCEMENT_FILENAME}\``);
    return;
  }

  const count = (id) => ids.filter((x) => x === id).length;
  for (const ruleId of productRules.keys()) {
    if (count(ruleId) !== 1) {
      fail(`[10] principle \`${ruleId}\` must have exactly one enforcement-map row`);
    }
  }
  for (const ruleId of [...new Set(ids)].sort()) {
    if (familyOf(ruleId) === "P" && !rules.has(ruleId)) {
      fail(`[10] enforcement map references unknown principle ID \`${ruleId}\``);
    }
  }
}

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
  const present = [...CORE_BINDING_FAMILIES, ...principleFiles(repoRoot).flatMap((info) => info.families)];
  const known = new Set([...CORE_BINDING_FAMILIES, ...FAMILIES, ...BEST_PRACTICE_FAMILIES, ...FORK_FAMILIES]);

  const named = phaseTokens(phases);
  for (const token of named) {
    if (!known.has(token)) {
      fail(
        `[11] phases.json: token \`${token}\` matches no rule family; expected one of ` +
          `${[...known].join(", ")}`,
      );
    }
  }

  for (const family of present) {
    if (!named.includes(family)) {
      fail(
        `[11] phases.json: \`${family}\` principles are installed but no phase loads them — ` +
          "governance no phase reads is governance nobody reads",
      );
    }
  }

  const binding = [...CORE_BINDING_FAMILIES, ...principleFiles(repoRoot, { bindingOnly: true }).flatMap((info) => info.families)];
  for (const [phase, entry] of Object.entries(phases)) {
    for (const family of binding) {
      if (!entry.always.includes(family)) {
        fail(`[11] phases.json: ${phase}.always omits binding family \`${family}\``);
      }
    }
    for (const family of entry.always) {
      if (!binding.includes(family)) {
        fail(
          `[11] phases.json: ${phase}.always contains non-binding family \`${family}\`; ` +
            "advisory families belong in conditional",
        );
      }
    }
    for (const family of entry.conditional) {
      if (binding.includes(family)) {
        fail(
          `[11] phases.json: ${phase}.conditional contains binding family \`${family}\`; ` +
            "binding families belong in always",
        );
      }
    }
  }
}

/** Verify the non-binding engineering catalog and its enforcement-map exclusions. */
export function checkForkPrinciples(fail, repoRoot, enforcementIds) {
  const root = guidelinesRoot(repoRoot);
  if (!exists(root)) return 0;

  let catalog;
  try {
    catalog = loadEngineeringMap(repoRoot);
  } catch (error) {
    fail(`[10] ${error.message}`);
    return 0;
  }
  if (!catalog) {
    fail(`[10] missing non-binding engineering catalog: ${ENGINEERING_FILENAME}`);
    return 0;
  }

  const rules = new Map();
  for (const principle of catalog.principles) {
    for (const rule of principle.rules) {
      if (rules.has(rule.id)) fail(`[10] fork principles: duplicate rule ID \`${rule.id}\``);
      else rules.set(rule.id, rule.modality);
    }
  }

  if (enforcementIds === null && rules.size) {
    fail(`[10] fork principles: missing enforcement map \`${ENFORCEMENT_FILENAME}\``);
  }
  const ids = enforcementIds ?? [];

  const count = (id) => ids.filter((x) => x === id).length;
  for (const [ruleId, modality] of rules) {
    if (modality === "invariant" && count(ruleId) !== 1) {
      fail(`[10] invariant \`${ruleId}\` must have exactly one enforcement-map row`);
    }
    if ((modality === "guide" || modality === "best-practice") && count(ruleId)) {
      fail(`[10] non-binding ${modality} \`${ruleId}\` must not have an enforcement-map row`);
    }
  }
  for (const ruleId of [...new Set(ids)].sort()) {
    if (familyOf(ruleId) !== "P" && !rules.has(ruleId)) {
      fail(`[10] enforcement map references unknown principle ID \`${ruleId}\``);
    }
    if (count(ruleId) > 1) {
      fail(`[10] enforcement map contains duplicate principle ID \`${ruleId}\``);
    }
  }

  return rules.size;
}

/**
 * A phase whose sign-off record exists but whose preparation is still in the active tree.
 *
 * `cg next` reads Step states and nothing else, so it cannot tell "every Step is Complete, ready
 * to close" from "closed days ago, never archived" — both look identical. Left in place, a closed
 * phase keeps `cg next` naming `cg-sign-off`, and `cg-auto-run` will dutifully dispatch it again
 * on a programme that is already signed off. Archiving is the signal, which makes forgetting it a
 * correctness problem rather than untidiness.
 */
function adviseUnarchivedClosures(advise, repoRoot, docsRoot) {
  const plans = path.join(repoRoot, docsRoot, "plans");
  if (!exists(plans)) return;

  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "archive") walk(full);
        continue;
      }
      if (entry.name === "programme-sign-off.md") {
        found.push({ file: rel(repoRoot, full), what: "the programme" });
        continue;
      }
      const phase = /^(.*)_sign-off\.md$/.exec(entry.name)?.[1];
      if (phase && exists(path.join(dir, `${phase}_detailed_preparation.md`))) {
        found.push({ file: rel(repoRoot, full), what: `phase \`${phase}\`` });
      }
    }
  };
  walk(plans);

  for (const { file, what } of found) {
    advise(
      `[0] ${file} records a closed phase that is still in the active plans tree — ${what} is ` +
        "signed off but never archived. `cg next` reads Step states only, so it cannot tell this " +
        "from work that is ready to close: it will keep naming `cg-sign-off`, and `cg-auto-run` " +
        `will dispatch it again. Move the records to ${docsRoot}/plans/archive/`,
    );
  }
}

/** Run every check. Returns {failures, advisories, counts}. */
export function verify(repoRoot) {
  const failures = [];
  const advisories = [];
  const fail = (message) => failures.push(message);

  let bindingRules;
  let bindingCatalog;
  let graph;
  let profile;
  try {
    bindingRules = loadBindingPrinciples(repoRoot);
    bindingCatalog = loadBindingCatalog(path.join(repoRoot, BINDING_FILENAME), { repoRoot });
    graph = loadContractGraph(repoRoot, { hierarchy: bindingCatalog.hierarchy.transitions });
    profile = resolveProfileSelection(repoRoot);
  } catch (error) {
    if (error instanceof BindingError) {
      return { failures: [`[10] ${error.message}`], advisories, counts: null };
    }
    if (error instanceof ContractError || error instanceof ProfileError || error instanceof SyntaxError) {
      return { failures: [error.message], advisories, counts: null };
    }
    throw error;
  }

  for (const message of graph.failures) fail(`[2] ${message}`);

  // Derived from the repository's own recorded docs root, so relocating the document
  // trees relocates the self-sufficiency check with them.
  const planPath = planPathPattern(profile.docs);

  // Advisory, never a failure: detection reads build manifests and is a heuristic, and a
  // heuristic that fails the build is one everyone learns to bypass. But an unmapped module
  // is the difference between "the scaffold is well-formed" and "this repository is
  // governed", so it must not be silent either.
  const governedUnits = graph.records.map((record) => record.contract.unit);
  const coverage = moduleCoverage(repoRoot, governedUnits);
  for (const module of coverage.unmapped) {
    advisories.push(
      `[0] ${module.path}/ looks like a module root (${module.manifest}) but no entry in ` +
        "contract graph governs it — run the `cg-warmup` skill once to write and connect its contract, or record why it is excluded",
    );
  }

  const rootPurpose = graph.root?.contract.purpose ?? "";
  if (/Replace this (?:sentence|section)/i.test(rootPurpose)) {
    advisories.push(
      "[0] .agents/cg/contract.yaml still carries its purpose placeholder — the graph root is the first context every session receives",
    );
  }

  const nonRoot = graph.records.filter((record) => record.contract.unit !== ".");
  let harvestedProduct = false;
  try {
    harvestedProduct = productHasHarvestedRules(repoRoot);
  } catch {
    harvestedProduct = false;
  }
  if (nonRoot.length && !harvestedProduct) {
    advisories.push(
      "[0] the P catalog under guidelines/ defines no repository-specific rules although implementation boundaries are governed — brownfield warmup must confirm this is intentional or harvest the product rules already embodied in code",
    );
  }
  const findings = path.join(repoRoot, profile.docs, "plans", "warmup-findings.md");
  if (nonRoot.length && !harvestedProduct && !exists(findings)) {
    advisories.push(
      `[0] ${profile.docs}/plans/warmup-findings.md is absent while warmup is incomplete — record each inspected unit before moving on so a context break can resume`,
    );
  } else if (nonRoot.length && harvestedProduct && exists(findings)) {
    advisories.push(
      `[0] ${profile.docs}/plans/warmup-findings.md survives a finished warmup — it is a resume log with no reader left; delete it`,
    );
  }
  if (nonRoot.length >= 3) {
    const signatures = new Set(nonRoot.map((record) => record.contract.rules.join(",")));
    if (signatures.size === 1) {
      fail(
        `[12] all ${nonRoot.length} non-root contracts bind an identical rule set — ` +
          "scope rules per boundary instead of generating one repository-wide list",
      );
    }
    const prose = new Map();
    for (const record of nonRoot) {
      const values = new Set([
        record.contract.summary,
        record.contract.purpose,
        ...record.contract.responsibilities.owns,
        ...record.contract.responsibilities.allows,
        ...record.contract.responsibilities.forbids,
      ].filter((value) => value.length > 24));
      for (const value of values) prose.set(value, (prose.get(value) ?? 0) + 1);
    }
    const threshold = Math.max(3, Math.ceil(nonRoot.length * 0.6));
    const repeated = [...prose].find(([, count]) => count >= threshold);
    if (repeated) {
      fail(
        `[12] contract prose appears verbatim in ${repeated[1]} of ${nonRoot.length} boundaries, e.g. ` +
          `${JSON.stringify(repeated[0].slice(0, 60))} — describe each boundary rather than cloning a template`,
      );
    }
  }

  for (const record of graph.records) {
    const { contract } = record;
    const unknown = contract.rules.filter((rule) => !bindingRules.has(rule));
    if (unknown.length) {
      fail(`[6] ${record.relative}: rule id(s) not defined by the structural or product binding catalogs: ${unknown.join(", ")}`);
    }

    const serialized = JSON.stringify(contract, null, 2);
    splitLines(serialized).forEach((line, index) => {
      if (planPath.test(line)) {
        fail(`[5] ${record.relative}:${index + 1}: cites a transient plan path — state permanent contract truth in full`);
      }
      const ticket = PLAN_TICKET.exec(line);
      if (ticket) fail(`[5] ${record.relative}:${index + 1}: cites plan ticket id \`${ticket[0]}\` — state the rule in full instead`);
    });

    if (contract.kind === "module") {
      for (const pointer of POINTERS) {
        const file = path.join(repoRoot, contract.unit, pointer);
        if (!exists(file)) {
          fail(`[1] ${contract.unit}: missing ${pointer} — module is not openable as a workspace root`);
          continue;
        }
        const text = read(file);
        if (!text.includes(".agents/cg/contract.yaml")) fail(`[1] ${contract.unit}/${pointer}: missing canonical module contract pointer`);
        if (!text.includes(".agents/cg/principles/architecture.yaml")) fail(`[1] ${contract.unit}/${pointer}: missing structural binding pointer`);
        if (!text.includes(".agents/cg/guidelines/")) fail(`[1] ${contract.unit}/${pointer}: missing canonical repository guidelines pointer`);
      }
    }

    for (const entry of contract.verification ?? []) {
      if (EXISTENCE_ONLY.test(entry.command ?? "")) {
        fail(
          `[12] ${record.relative}: verification \`${entry.id}\` only proves a path exists — ` +
            "name the test or command that exercises the invariant",
        );
      }
    }
  }

  for (const row of openDescent(repoRoot, graph.records)) {
    advisories.push(
      `[0] ${row.unit}: ${row.count} undeclared code-bearing packages (${row.names.join(", ")}) — ` +
        "apply graph.recurse or record Leaf rationale: why they are inseparable",
    );
  }

  checkAgentRule(fail, repoRoot);
  checkPhases(fail, repoRoot);
  const skillCount = checkSkills(fail, repoRoot, CORE_CG_SKILLS, profile);
  const enforcementIds = enforcementRuleIds(fail, repoRoot);
  const engineeringCount = checkForkPrinciples(fail, repoRoot, enforcementIds);
  checkPrincipleEnforcement(fail, repoRoot, bindingRules, enforcementIds);
  adviseUnarchivedClosures((message) => advisories.push(message), repoRoot, profile.docs);

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
      folders: nonRoot.length,
      roots: Object.keys(profile.rootPointers).length,
      skills: skillCount,
      engineering: engineeringCount,
      modules: { detected: coverage.detected.length, unmapped: coverage.unmapped.length },
    },
  };
}
