/**
 * Shared model for the Contract Graph contract generator and verifier.
 *
 * No third-party dependencies. Both `sync.js` and `verify.js` import this module;
 * neither duplicates parsing logic.
 */

import fs from "node:fs";
import path from "node:path";

export const BEGIN_MARKER = "<!-- BEGIN INHERITED";
export const END_MARKER = "<!-- END INHERITED -->";
export const BEGIN_LINE =
  "<!-- BEGIN INHERITED — generated from .agents/cg/principles/ · do not edit -->";

export const ROOT_BEGIN_MARKER = "<!-- BEGIN PRINCIPLES INDEX";
export const ROOT_END_MARKER = "<!-- END PRINCIPLES INDEX -->";
export const ROOT_BEGIN_LINE =
  "<!-- BEGIN PRINCIPLES INDEX — generated from .agents/cg/principles/ · do not edit -->";

/**
 * Rule families that may be inherited into a folder contract, in document order.
 *
 * `DP` is deliberately absent. Domain principles are topic-scoped and loaded at a fork;
 * inheriting a guide would make it unavoidable, and an unavoidable guide is just a rule.
 */
export const RULE_FAMILIES = ["AP", "PP"];
const FAMILY_ALT = RULE_FAMILIES.join("|");

export const RULE_START = new RegExp(
  String.raw`^- \*\*((?:${FAMILY_ALT})-\d{2}-\d{2})\*\*\s+—\s+(.*)$`,
);
export const RULE_ID = new RegExp(String.raw`^(?:${FAMILY_ALT})-\d{2}-\d{2}$`);
export const PRINCIPLE_HEADING = new RegExp(
  String.raw`^## ((?:${FAMILY_ALT})-\d{2})\. (.+?)\s*$`,
);

export const FAMILY_BLURB = {
  AP: "Architecture Principles — structural; hold for any product built in this repository.",
  PP: "Product Principles — exist because of *this* product's market, pricing, and shape.",
};

export const MAX_CONTRACT_LINES = 200;

/** Root entry file -> prefix that reaches `.agents/cg/` from that file's directory. */
export const ROOT_POINTERS = {
  "AGENTS.md": "",
  "CLAUDE.md": "",
  ".github/copilot-instructions.md": "../",
};

export const REQUIRED_SECTIONS = {
  module: [
    "## Module Identity",
    "## Allowed Responsibilities",
    "## Forbidden Responsibilities",
    "## Verify Command",
    "## Sibling Contracts",
    "## Agent Workflow Hook",
  ],
  folder: [
    "## Scope",
    "## Forbidden Responsibilities",
    "## Verify Command",
    "## Sibling Contracts",
  ],
};

/** Invariant headings vary in wording across contracts, so match by pattern. */
export const REQUIRED_SECTION_PATTERNS = {
  module: [/^## .*Invariants\s*$/m],
  folder: [/^## .*Invariants\s*$/m],
};

/** Default root for the three scaffolded document trees. Overridable at `cg init`. */
export const DEFAULT_DOCS_ROOT = "docs";

/** The document trees `init` creates under the docs root, and what each one is for. */
export const DOCS_TREES = Object.freeze({
  plans: "transient — roadmaps, preparation records, and the decision log",
  design: "permanent — design records a contract may cite",
  guides: "permanent — operator and product guidance",
});

/**
 * The Contract Self-Sufficiency Rule, machine-checked. A permanent contract may cite
 * permanent design records, never a transient plan path or a plan ticket ID.
 * `XX-pp-nn` rule IDs are contract IDs, not ticket IDs, and are exempt.
 *
 * The pattern is derived from the repository's recorded docs root rather than hardcoded,
 * so relocating the trees relocates the check with them. A rule that only holds at the
 * default path is a rule the first repository to move its docs would escape.
 */
export const planPathPattern = (docsRoot = DEFAULT_DOCS_ROOT) =>
  new RegExp(`${docsRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/plans/`);
export const PLAN_TICKET = new RegExp(
  String.raw`\b(?!(?:${FAMILY_ALT})-)[A-Z]{2,6}-\d+(?:\.\d+)+\b`,
);

export class ContractError extends Error {}

const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);
const readIfPresent = (file) => (exists(file) ? read(file) : "");

/**
 * Split into lines the way a text file actually reads: a single trailing newline is a
 * terminator, not an empty final line.
 *
 * `"a\n".split("\n")` yields `["a", ""]`, so any round trip that re-joins and re-appends a
 * newline grows the file by one blank line per run — which makes the generator
 * non-idempotent and every drift check permanently red.
 */
export function splitLines(text) {
  const lines = text.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Line count with the same terminator semantics as `splitLines`. */
export const countLines = (text) => splitLines(text).length;

export const cgRoot = (repoRoot) => path.join(repoRoot, ".agents", "cg");
export const skillsRoot = (repoRoot) => path.join(repoRoot, ".agents", "skills");

/**
 * Governance layout. Every path the tool reads or writes is named here once, so a rename is
 * one edit rather than a search across three modules and twenty deliverables.
 */
export const principlesRoot = (repoRoot) => path.join(cgRoot(repoRoot), "principles");
export const domainsRoot = (repoRoot) => path.join(principlesRoot(repoRoot), "domains");
export const mapRoot = (repoRoot) => path.join(cgRoot(repoRoot), "map");
export const inheritancePath = (repoRoot) => path.join(mapRoot(repoRoot), "inheritance.json");
export const enforcementPath = (repoRoot) => path.join(mapRoot(repoRoot), "enforcement.md");
export const routingPath = (repoRoot) => path.join(mapRoot(repoRoot), "routing.md");
export const phasesPath = (repoRoot) => path.join(mapRoot(repoRoot), "phases.json");
export const manifestPath = (repoRoot) => path.join(mapRoot(repoRoot), "manifest.json");

/** Lifecycle phases a repository can scope principle loading to. */
export const PHASE_NAMES = Object.freeze(["plan", "prepare", "produce", "sign-off", "unblock"]);

/**
 * Read `map/phases.json`: which rule families and domain sets each phase loads.
 *
 * Tokens, not filenames. `AP`, `PP`, and `DP-<SET>` survive any reorganisation of the
 * principle files, which is the point — loading and layout should not be able to break
 * each other. `always` means *load if the repository selected it*, never *must exist*:
 * `DP` is excluded from inheritance on purpose, so a repo with no domain packs is valid.
 */
export function loadPhases(repoRoot) {
  const file = phasesPath(repoRoot);
  if (!exists(file)) throw new ContractError(`missing phase map: ${file}`);

  let parsed;
  try {
    parsed = JSON.parse(read(file));
  } catch (error) {
    throw new ContractError(`${file}: invalid JSON: ${error.message}`);
  }
  const phases = parsed?.phases;
  if (!phases || typeof phases !== "object" || Array.isArray(phases)) {
    throw new ContractError(`${file}: expected a \`phases\` object`);
  }

  const missing = PHASE_NAMES.filter((name) => !(name in phases));
  if (missing.length) throw new ContractError(`${file}: missing phase(s): ${missing.join(", ")}`);
  const extra = Object.keys(phases).filter((name) => !PHASE_NAMES.includes(name));
  if (extra.length) throw new ContractError(`${file}: unknown phase(s): ${extra.join(", ")}`);

  const result = {};
  for (const [name, entry] of Object.entries(phases)) {
    for (const key of ["always", "conditional"]) {
      if (!Array.isArray(entry?.[key]) || entry[key].some((v) => typeof v !== "string")) {
        throw new ContractError(`${file}: ${name}.${key} must be an array of tokens`);
      }
    }
    const seen = new Set();
    for (const token of [...entry.always, ...entry.conditional]) {
      if (seen.has(token)) {
        throw new ContractError(`${file}: ${name} names \`${token}\` more than once`);
      }
      seen.add(token);
    }
    result[name] = { always: [...entry.always], conditional: [...entry.conditional] };
  }
  return result;
}

/** Every token any phase names, deduplicated. */
export const phaseTokens = (phases) =>
  [...new Set(Object.values(phases).flatMap((p) => [...p.always, ...p.conditional]))].sort();
export const governanceContractPath = (repoRoot) => path.join(cgRoot(repoRoot), "contract.md");

/** One file per rule family. Filename order is family order, and `architecture` sorts first. */
export const PRINCIPLE_FILES = Object.freeze({
  "architecture.md": "AP",
  "product.md": "PP",
});

/**
 * The principle files holding inheritable rules, in filename order.
 *
 * One file per family, each holding that family's `## XX-nn.` sections. `product.md` ships
 * with no rules and no headings by design — you inherit nobody else's product opinions — so
 * it alone may be empty. An unrelated Markdown filename is an error rather than governance
 * that disappears silently.
 */
export function principleFiles(repoRoot) {
  const root = principlesRoot(repoRoot);
  if (!exists(root)) throw new ContractError(`missing principles directory: ${root}`);

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const family = PRINCIPLE_FILES[entry.name];
      if (!family) {
        throw new ContractError(
          `invalid principles filename ${entry.name}; expected one of ` +
            `${Object.keys(PRINCIPLE_FILES).join(", ")}`,
        );
      }
      return {
        file: path.join(root, entry.name),
        filename: entry.name,
        family,
        allowEmpty: family === "PP",
      };
    })
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

/** Yield Markdown lines outside fenced code blocks. Examples must remain visible but inert. */
function markdownProseLines(text) {
  const prose = [];
  let fence = null;
  for (const line of splitLines(text)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (marker) {
      const next = marker[1][0];
      if (fence === null) fence = next;
      else if (fence === next) fence = null;
      continue;
    }
    if (fence === null) prose.push(line);
  }
  return prose;
}

/**
 * Return {ruleId: single-line full text} from one principles file.
 *
 * A rule is a `- **XX-pp-nn** — ...` bullet whose text may wrap onto indented continuation
 * lines. Continuations are joined and whitespace collapsed so the rule occupies exactly one
 * line in a generated digest, without losing wording.
 *
 * `allowEmpty` exists for `product.md`, which ships with no rules by design.
 */
export function parsePrinciples(file, { allowEmpty = false } = {}) {
  if (!exists(file)) throw new ContractError(`missing principles file: ${file}`);

  const rules = new Map();
  let currentId = null;
  let parts = [];

  const flush = () => {
    if (currentId === null) return;
    const text = parts.join(" ").split(/\s+/).filter(Boolean).join(" ");
    if (!text) throw new ContractError(`${currentId} has no rule text in ${file}`);
    if (rules.has(currentId)) throw new ContractError(`duplicate rule id ${currentId} in ${file}`);
    rules.set(currentId, text);
  };

  for (const raw of markdownProseLines(read(file))) {
    const match = RULE_START.exec(raw);
    if (match) {
      flush();
      currentId = match[1];
      parts = [match[2]];
      continue;
    }
    if (currentId === null) continue;
    // Continuation lines are indented and non-empty; anything else ends the rule.
    if (raw.trim() && /^[ \t]/.test(raw) && !raw.trimStart().startsWith("- ")) {
      parts.push(raw.trim());
      continue;
    }
    flush();
    currentId = null;
    parts = [];
  }
  flush();

  if (rules.size === 0 && !allowEmpty) {
    throw new ContractError(`no XX-pp-nn rules parsed from ${file}`);
  }
  return rules;
}

/**
 * Return [{principle, ruleIds}] for one file, in document order.
 *
 * Rules appearing before any heading are collected under `null`, which the correspondence
 * check rejects by name rather than silently attributing them to nothing.
 */
export function parseRuleSections(file) {
  const sections = [];
  let current = { principle: null, ruleIds: [] };
  for (const raw of markdownProseLines(read(file))) {
    const heading = PRINCIPLE_HEADING.exec(raw);
    if (heading) {
      if (current.principle !== null || current.ruleIds.length) sections.push(current);
      current = { principle: heading[1], ruleIds: [] };
      continue;
    }
    const rule = RULE_START.exec(raw);
    if (rule) current.ruleIds.push(rule[1]);
  }
  if (current.principle !== null || current.ruleIds.length) sections.push(current);
  return sections;
}

/**
 * Enforce the identity a principles file carries: its family, its headings, and — the part
 * a filename cannot express once a file holds several principles — that every rule sits
 * under the heading matching its own principle number.
 *
 * Without the heading check, `AP-01-03` filed under `## AP-04.` parses cleanly, inherits
 * cleanly, and lands in the generated digest under a principle it does not belong to. That
 * was unreachable while each file held exactly one principle and the filename carried the
 * ID; it became reachable the moment the families were collapsed into one file each.
 */
function assertPrincipleCorrespondence({ file, filename, family }, rules) {
  const sections = parseRuleSections(file);
  const seen = new Set();

  for (const { principle, ruleIds } of sections) {
    if (principle === null) {
      throw new ContractError(
        `${filename}: rule(s) ${ruleIds.join(", ")} appear before any \`## ${family}-nn.\` heading`,
      );
    }
    if (!principle.startsWith(`${family}-`)) {
      throw new ContractError(
        `${filename} holds ${family} principles; \`## ${principle}.\` belongs in another file`,
      );
    }
    if (seen.has(principle)) {
      throw new ContractError(`${filename} defines \`## ${principle}.\` more than once`);
    }
    seen.add(principle);

    for (const ruleId of ruleIds) {
      const owner = ruleId.slice(0, ruleId.lastIndexOf("-"));
      if (owner !== principle) {
        throw new ContractError(
          `${filename}: \`${ruleId}\` sits under \`## ${principle}.\` but belongs to ` +
            `\`## ${owner}.\``,
        );
      }
    }
  }

  for (const ruleId of rules.keys()) {
    if (!ruleId.startsWith(`${family}-`)) {
      throw new ContractError(
        `\`${ruleId}\` is a ${ruleId.slice(0, 2)} rule and does not belong in ${filename}`,
      );
    }
  }
}

/**
 * Merge every inheritable rule across the principles directory, in filename order.
 */
export function loadPrinciples(repoRoot) {
  const merged = new Map();
  const owners = new Map();
  const principleOwners = new Map();
  for (const info of principleFiles(repoRoot)) {
    const { file, filename, allowEmpty } = info;
    const rules = parsePrinciples(file, { allowEmpty });
    assertPrincipleCorrespondence(info, rules);
    for (const [ruleId, text] of rules) {
      if (merged.has(ruleId)) {
        throw new ContractError(
          `duplicate rule id ${ruleId} across ${owners.get(ruleId)} and ${filename}`,
        );
      }
      merged.set(ruleId, text);
      owners.set(ruleId, filename);
    }
    for (const { principle } of parseRuleSections(file)) {
      if (principle === null) continue;
      if (principleOwners.has(principle)) {
        throw new ContractError(
          `${principle} is defined by both ${principleOwners.get(principle)} and ${filename}`,
        );
      }
      principleOwners.set(principle, filename);
    }
  }
  if (merged.size === 0) {
    throw new ContractError(`no XX-pp-nn rules found under ${principlesRoot(repoRoot)}`);
  }
  return merged;
}

/**
 * Return [{id, title, count}] in document order.
 *
 * Drives the generated index in every root entry file, so a harness that reads only
 * `AGENTS.md` still learns that the principles exist and what each one covers.
 */
export function parsePrincipleIndex(file, { allowEmpty = false } = {}) {
  if (!exists(file)) throw new ContractError(`missing principles file: ${file}`);

  const index = [];
  const counts = new Map();
  for (const raw of markdownProseLines(read(file))) {
    const heading = PRINCIPLE_HEADING.exec(raw);
    if (heading) {
      index.push({ id: heading[1], title: heading[2] });
      continue;
    }
    const rule = RULE_START.exec(raw);
    if (rule) {
      const principle = rule[1].slice(0, rule[1].lastIndexOf("-"));
      counts.set(principle, (counts.get(principle) ?? 0) + 1);
    }
  }

  if (index.length === 0 && !allowEmpty) {
    throw new ContractError(`no \`## XX-nn. Title\` principle headings found in ${file}`);
  }
  const orphan = index.filter((e) => !counts.has(e.id)).map((e) => e.id);
  if (orphan.length) {
    throw new ContractError(`principle(s) with no rules in ${file}: ${orphan.join(", ")}`);
  }
  return index.map((e) => ({ ...e, count: counts.get(e.id) }));
}

/** The merged principle index across every principles file, in family order. */
export function loadPrincipleIndex(repoRoot) {
  return principleFiles(repoRoot).flatMap(({ file, filename, allowEmpty }) =>
    parsePrincipleIndex(file, { allowEmpty }).map((entry) => ({ ...entry, filename })),
  );
}

/** Render the principle index for a root entry file, without trailing newline. */
export function renderRootIndex(repoRoot, prefix) {
  const principles = loadPrincipleIndex(repoRoot);
  const total = principles.reduce((sum, e) => sum + e.count, 0);
  const target = `${prefix}.agents/cg/principles/`;

  const lines = [
    ROOT_BEGIN_LINE,
    "## Binding principles — index",
    "",
    `**You MUST read [\`${target}\`](${target}) before planning any change.** It is binding: where ` +
      "your code and those files disagree, **the files win and the code is wrong.** The index " +
      `below lists what is in them (${total} rules) — the index is not the rule; cite rules by ID ` +
      "(`AP-01-01`), never by position.",
  ];
  for (const family of RULE_FAMILIES) {
    const rows = principles.filter((e) => e.id.startsWith(`${family}-`));
    if (!rows.length) continue;
    lines.push("", `**${FAMILY_BLURB[family]}**`, "");
    for (const { id, title, count, filename } of rows) {
      const file = `${target}${filename}`;
      lines.push(
        `- [**${id}** ${title}](${file}) — ${count} rule${count === 1 ? "" : "s"}`,
      );
    }
  }
  lines.push(ROOT_END_MARKER);
  return lines.join("\n");
}

/** Render a complete root entry file: static preamble plus the generated index. */
export function renderRootPointer(repoRoot, prefix, projectName) {
  const contract = `${prefix}.agents/cg/contract.md`;
  return [
    `# ${projectName} — agent entry point`,
    "",
    `**Start here: [\`${contract}\`](${contract})** — the repository constitution. It sets the ` +
      "required reading order, the module contract map, and the harness notes.",
    "",
    "`.agents/cg/` is a dot-directory. If your tool's indexer skips hidden paths, open " +
      "these files by exact path rather than relying on search.",
    "",
    renderRootIndex(repoRoot, prefix),
    "",
    "## Required reading order",
    "",
    `1. [\`${prefix}.agents/cg/contract.md\`](${contract}) — constitution and harness notes.`,
    `2. [\`${prefix}.agents/cg/principles/\`](${prefix}.agents/cg/principles/) — the binding ` +
      "rules indexed above.",
    `3. [\`${prefix}.agents/cg/workflow.md\`](${prefix}.agents/cg/workflow.md) — the mandatory ` +
      "agent workflow.",
    `4. [\`${prefix}.agents/cg/map/routing.md\`](${prefix}.agents/cg/map/routing.md) — ` +
      "task-to-module contract mapping.",
    "5. `<module>/.agents/cg/contract.md` — lazy-loaded per impacted module; each one " +
      "repeats the rules that bind that module.",
    "",
    "Do not put instructions in this file — the index above is generated, and everything " +
      "else belongs under `.agents/cg/`. Regenerate with `cg sync`.",
    "",
  ].join("\n");
}

/** Return {path, current, desired} for one root entry file. */
export function generateRoot(repoRoot, relPath, prefix, projectName) {
  const file = path.join(repoRoot, relPath);
  const current = readIfPresent(file);
  const desired = current.includes(ROOT_BEGIN_MARKER)
    ? applyBlock(current, renderRootIndex(repoRoot, prefix), file, ROOT_BEGIN_MARKER, ROOT_END_MARKER)
    : renderRootPointer(repoRoot, prefix, projectName);
  return { path: file, current, desired };
}

/** Return the exact name/description frontmatter used by generated wrappers. */
export function parseSkillMetadata(file) {
  const text = read(file);
  if (!text.startsWith("---\n")) throw new ContractError(`${file}: missing YAML frontmatter`);
  const closing = text.indexOf("\n---\n", 4);
  if (closing < 0) throw new ContractError(`${file}: frontmatter has no closing \`---\``);

  const metadata = {};
  for (const line of splitLines(text.slice(4, closing))) {
    const match = /^(name|description):[ \t]+(.+)$/.exec(line);
    if (!match) {
      throw new ContractError(
        `${file}: canonical skill frontmatter must contain name/description only`,
      );
    }
    const [, key, value] = match;
    if (key in metadata) {
      throw new ContractError(`${file}: duplicate canonical skill frontmatter field \`${key}\``);
    }
    if (/^[[{|>&*!]/.test(value) || value.includes(": ") || value.includes(" #")) {
      throw new ContractError(`${file}: \`${key}\` must be a non-empty one-line plain scalar`);
    }
    metadata[key] = value;
  }

  const missing = ["name", "description"].filter((k) => !(k in metadata));
  if (missing.length) {
    throw new ContractError(
      `${file}: missing canonical skill frontmatter field(s): ${missing.join(", ")}`,
    );
  }
  const folder = path.basename(path.dirname(file));
  if (metadata.name !== folder) {
    throw new ContractError(
      `${file}: frontmatter name \`${metadata.name}\` does not match folder \`${folder}\``,
    );
  }
  return metadata;
}

/** Render one small Claude discovery wrapper around a canonical shared skill. */
export function renderClaudeSkillWrapper(canonicalSkill, wrapperPath) {
  const metadata = parseSkillMetadata(canonicalSkill);
  const target = path
    .relative(path.dirname(wrapperPath), canonicalSkill)
    .split(path.sep)
    .join("/");
  return [
    "---",
    `name: ${metadata.name}`,
    `description: ${metadata.description}`,
    "---",
    "",
    "# Contract Graph Skill Discovery",
    "",
    `Read and follow [\`${target}\`](${target}).`,
    "",
  ].join("\n");
}

/** Return {path, current, desired} for one Claude skill wrapper. */
export function generateClaudeSkillWrapper(repoRoot, canonicalSkill) {
  const wrapper = path.join(
    repoRoot,
    ".claude",
    "skills",
    path.basename(path.dirname(canonicalSkill)),
    "SKILL.md",
  );
  return {
    path: wrapper,
    current: readIfPresent(wrapper),
    desired: renderClaudeSkillWrapper(canonicalSkill, wrapper),
  };
}

/** Render the concise shared-agent Contract Graph rule pointer. */
export function renderAgentRule() {
  return [
    "# Contract Graph",
    "",
    "Before planning or changing code, read",
    "[`../cg/contract.md`](../cg/contract.md) and follow its reading order.",
    "Use the matching [`../skills/cg-*/SKILL.md`](../skills/) for non-trivial lifecycle work.",
    "Binding guidance lives under `.agents/cg/`; canonical skills live under `.agents/skills/`.",
    "",
  ].join("\n");
}

/** Return {path, current, desired} for the shared-agent rule pointer. */
export function generateAgentRule(repoRoot) {
  const file = path.join(repoRoot, ".agents", "rules", "cg.md");
  return { path: file, current: readIfPresent(file), desired: renderAgentRule() };
}

/** Order by family, then principle, then rule. */
export function ruleSortKey(ruleId) {
  const [family, principle, rule] = ruleId.split("-");
  return [RULE_FAMILIES.indexOf(family), Number(principle), Number(rule)];
}

const compareRules = (a, b) => {
  const ka = ruleSortKey(a);
  const kb = ruleSortKey(b);
  for (let i = 0; i < ka.length; i += 1) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
};

/** Return the validated folder map from inheritance.json. */
export function loadInheritance(file) {
  if (!exists(file)) throw new ContractError(`missing inheritance map: ${file}`);
  const data = JSON.parse(read(file));
  const folders = data.folders;
  if (!folders || typeof folders !== "object" || !Object.keys(folders).length) {
    throw new ContractError(`${file} has no non-empty 'folders' object`);
  }

  for (const [key, entry] of Object.entries(folders)) {
    for (const field of ["depth", "kind", "contract", "rules"]) {
      if (!(field in entry)) throw new ContractError(`${key}: missing '${field}' in ${file}`);
    }
    if (!(entry.kind in REQUIRED_SECTIONS)) {
      throw new ContractError(`${key}: unknown kind '${entry.kind}'`);
    }
    if (!Array.isArray(entry.rules) || !entry.rules.length) {
      throw new ContractError(`${key}: 'rules' must be a non-empty list`);
    }
    for (const ruleId of entry.rules) {
      // Called out separately because this is the mistake people actually make, and
      // "malformed rule id" would not explain why a well-formed DP id is refused.
      if (String(ruleId).startsWith("DP-")) {
        throw new ContractError(
          `[10] ${key}: domain principle '${ruleId}' must be loaded explicitly at a fork, ` +
            "never inherited — an unavoidable guide is just a rule",
        );
      }
      if (!RULE_ID.test(String(ruleId))) {
        throw new ContractError(`[6] ${key}: malformed rule id '${ruleId}'`);
      }
    }
    if (new Set(entry.rules).size !== entry.rules.length) {
      throw new ContractError(`${key}: duplicate rule ids in 'rules'`);
    }
  }
  return folders;
}

/** Relative path from a contract's own directory to the principles directory. */
export function principlesPointer(repoRoot, contractPath) {
  return (
    path
      .relative(path.dirname(contractPath), principlesRoot(repoRoot))
      .split(path.sep)
      .join("/") + "/"
  );
}

/** Render the inherited-rules block for one folder, without trailing newline. */
export function renderBlock(repoRoot, entry, rules, contractPath) {
  const unknown = entry.rules.filter((r) => !rules.has(r));
  if (unknown.length) {
    throw new ContractError(
      `${contractPath}: rule ids not defined under principles/: ${unknown.join(", ")}`,
    );
  }
  const ordered = [...entry.rules].sort(compareRules);
  return [
    BEGIN_LINE,
    `## Inherited Rules — full text \`${principlesPointer(repoRoot, contractPath)}\``,
    ...ordered.map((id) => `- **${id}** — ${rules.get(id)}`),
    END_MARKER,
  ].join("\n");
}

/** Return `text` with the generated block replaced, or inserted after the H1. */
export function applyBlock(
  text,
  block,
  contractPath,
  beginMarker = BEGIN_MARKER,
  endMarker = END_MARKER,
) {
  const label = beginMarker.replace("<!-- BEGIN ", "").trim();
  const lines = splitLines(text);
  let begin = null;
  let end = null;

  lines.forEach((line, index) => {
    if (line.startsWith(beginMarker)) {
      if (begin !== null) {
        throw new ContractError(`${contractPath}: more than one BEGIN ${label} marker`);
      }
      begin = index;
    } else if (line.trim() === endMarker) {
      if (end !== null) {
        throw new ContractError(`${contractPath}: more than one END ${label} marker`);
      }
      end = index;
    }
  });

  if ((begin === null) !== (end === null)) {
    throw new ContractError(`${contractPath}: unbalanced ${label} markers`);
  }

  if (begin !== null) {
    if (end < begin) {
      throw new ContractError(`${contractPath}: END ${label} precedes BEGIN ${label}`);
    }
    return [...lines.slice(0, begin), ...splitLines(block), ...lines.slice(end + 1)].join("\n") + "\n";
  }

  const heading = lines.findIndex((line) => line.startsWith("# "));
  if (heading < 0) {
    throw new ContractError(`${contractPath}: no H1 to anchor the inherited block`);
  }
  return (
    [...lines.slice(0, heading + 1), "", ...splitLines(block), ...lines.slice(heading + 1)].join(
      "\n",
    ) + "\n"
  );
}

/** Return {path, current, desired} for one folder entry. */
export function generate(repoRoot, entry, rules) {
  const contractPath = path.join(repoRoot, entry.contract);
  if (!exists(contractPath)) {
    throw new ContractError(`missing contract file: ${entry.contract}`);
  }
  const current = read(contractPath);
  const block = renderBlock(repoRoot, entry, rules, contractPath);
  return { path: contractPath, current, desired: applyBlock(current, block, contractPath) };
}
