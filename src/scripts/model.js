/**
 * Shared model for Contract Graph principles, phases, and generated agent-discovery files.
 *
 * Both `sync.js` and `verify.js` import this module; neither duplicates parsing logic.
 */

import fs from "node:fs";
import path from "node:path";

import { BINDING_FILENAME, loadCoreBindingRules } from "./binding.js";
import { parseContractYaml } from "./contracts.js";

export const ROOT_BEGIN_MARKER = "<!-- BEGIN PRINCIPLES INDEX";
export const ROOT_END_MARKER = "<!-- END PRINCIPLES INDEX -->";
export const ROOT_BEGIN_LINE =
  "<!-- BEGIN PRINCIPLES INDEX — generated from architecture and product rules · do not edit -->";

/** Repository-authored product guideline family. Core architecture principles use A in YAML. */
export const RULE_FAMILIES = ["P"];
export const CORE_BINDING_FAMILIES = ["A"];
export const BEST_PRACTICE_FAMILIES = ["E"];

/** Empty: decision guidance lives in the E catalog, not a second family. */
export const FORK_FAMILIES = [];
export const ALL_FAMILIES = [...RULE_FAMILIES, ...BEST_PRACTICE_FAMILIES, ...FORK_FAMILIES];

export const familyOf = (id) => (typeof id === "string" && /^[A-Z]/.test(id) ? id[0] : "");

const FAMILY_ALT = RULE_FAMILIES.join("|");
const ANY_FAMILY = ALL_FAMILIES.join("|");

export const RULE_START = new RegExp(
  String.raw`^- \*\*((?:${FAMILY_ALT})\d{2}-\d{2})\*\*\s+—\s+(.*)$`,
);
const ANY_RULE_START = new RegExp(
  String.raw`^- \*\*((?:${ANY_FAMILY})\d{2}-\d{2})\*\*(?: \`(invariant|guide)\`)?\s+—\s+(.*)$`,
);
/** Headings are parsed for every family. */
export const PRINCIPLE_HEADING = new RegExp(
  String.raw`^#{2,3} ((?:${ANY_FAMILY})\d{2})\. (.+?)\s*$`,
);

export const FAMILY_BLURB = {
  A: "Architecture Principles — machine-enforced structural integrity supplied by Contract Graph.",
  P: "Product Guidelines — exist because of *this* product's market, pricing, and shape.",
  E: "Engineering Guidelines — non-binding software-engineering judgement.",
};

/** Every authored guideline catalog, its families, and whether contracts may bind its rule IDs. */
export const PRINCIPLE_FILES = Object.freeze({
  "engineering.yaml": {
    families: [...BEST_PRACTICE_FAMILIES],
    bindingFamilies: [],
    bestPracticeFamilies: BEST_PRACTICE_FAMILIES,
    forkFamilies: FORK_FAMILIES,
    boundaryScopedFamilies: [],
    format: "yaml",
  },
  "product.yaml": {
    families: ["P"],
    bindingFamilies: ["P"],
    bestPracticeFamilies: [],
    forkFamilies: [],
    boundaryScopedFamilies: ["P"],
    allowEmpty: true,
    format: "yaml",
  },
});

export const ARCHITECTURE_SCHEMA_ID =
  "https://sarada.io/contract-graph/schema/architecture-v1.schema.json";
export const ENGINEERING_SCHEMA_ID =
  "https://sarada.io/contract-graph/schema/engineering-v1.schema.json";
export const ENGINEERING_VERSION = "1.0";
export const ENGINEERING_FILENAME = ".agents/cg/guidelines/engineering.yaml";
export const PRODUCT_SCHEMA_ID =
  "https://sarada.io/contract-graph/schema/product-v1.schema.json";
export const PRODUCT_VERSION = "1.0";
export const PRODUCT_FILENAME = ".agents/cg/guidelines/product.yaml";
const PRINCIPLE_STALE = Object.freeze({
  "engineering.yaml": ["engineering.md", "engineering.json", "design.yaml", "design.md", "design.json"],
  "product.yaml": ["product.md", "product.json"],
});
const PRINCIPLE_STALE_NAMES = Object.freeze(Object.values(PRINCIPLE_STALE).flat());
const E_HEADING = /^E\d{2}$/;
const E_ENTRY = /^E\d{2}-\d{2}$/;
const PRODUCT_PRINCIPLE = /^P\d{2}$/;
const PRODUCT_ENTRY = /^P\d{2}-\d{2}$/;

/** Map an installed catalog filename onto its PRINCIPLE_FILES key. */
export function principleLogicalName(filename) {
  if (!filename.endsWith(".json")) return filename;
  const stem = filename.slice(0, -".json".length);
  if (PRINCIPLE_FILES[`${stem}.md`]) return `${stem}.md`;
  if (PRINCIPLE_FILES[`${stem}.yaml`]) return `${stem}.yaml`;
  return `${stem}.md`;
}

/** Root entry file -> prefix that reaches `.agents/cg/` from that file's directory. */
export const ROOT_POINTERS = {
  "AGENTS.md": "",
  "CLAUDE.md": "",
  ".github/copilot-instructions.md": "../",
};

/** Canonical Contract Graph instructions shared by every editor-specific root pointer. */
export const CG_AGENT_ENTRY = ".agents/cg/contract-graph-agent.md";
export const LEGACY_CG_AGENT_ENTRY = ".agents/cg/AGENTS.md";


/** Default root for the three scaffolded document trees. Overridable at `cg init`. */
export const DEFAULT_DOCS_ROOT = "docs";

/** The document trees `init` creates under the docs root, and what each one is for. */
export const DOCS_TREES = Object.freeze({
  plans: "transient — roadmaps, preparation records, and the decision log",
  decisions: "permanent — decision records a contract may cite",
  guides: "permanent — operator and product guidance",
});

/**
 * The Contract Self-Sufficiency Rule, machine-checked. A permanent contract may cite
 * permanent decision records, never a transient plan path or a plan ticket ID.
 * `XX-pp-nn` rule IDs are contract IDs, not ticket IDs, and are exempt.
 *
 * The pattern is derived from the repository's recorded docs root rather than hardcoded,
 * so relocating the trees relocates the check with them. A rule that only holds at the
 * default path is a rule the first repository to move its docs would escape.
 */
export const planPathPattern = (docsRoot = DEFAULT_DOCS_ROOT) =>
  new RegExp(`${docsRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/plans/`);
export const PLAN_TICKET = new RegExp(
  String.raw`\b(?!(?:${[...CORE_BINDING_FAMILIES, ...ALL_FAMILIES].join("|")})-)[A-Z]{2,6}-\d+(?:\.\d+)+\b`,
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
 * Generated and authored files that live at the contract-graph root.
 * Every path the tool reads or writes is named here once, so a rename is
 * one edit rather than a search across three modules and twenty deliverables.
 */
export const principlesRoot = (repoRoot) => path.join(cgRoot(repoRoot), "principles");
export const guidelinesRoot = (repoRoot) => path.join(cgRoot(repoRoot), "guidelines");
export const ENFORCEMENT_SCHEMA_ID =
  "https://sarada.io/contract-graph/schema/enforcement-v1.schema.json";
export const ENFORCEMENT_VERSION = "1.0";
export const ENFORCEMENT_FILENAME = ".agents/cg/enforcement.yaml";
const ENFORCEMENT_RULE = /^P\d{2}-\d{2}$/;
const ENFORCEMENT_STALE = ["enforcement.md", "enforcement.json"];
export const architecturePath = (repoRoot) => path.join(principlesRoot(repoRoot), "architecture.yaml");
export const engineeringPath = (repoRoot) => path.join(guidelinesRoot(repoRoot), "engineering.yaml");
export const productPath = (repoRoot) => path.join(guidelinesRoot(repoRoot), "product.yaml");

export const enforcementPath = (repoRoot) => path.join(cgRoot(repoRoot), "enforcement.yaml");
export const phasesPath = (repoRoot) => path.join(cgRoot(repoRoot), "phases.json");
export const manifestPath = (repoRoot) => path.join(cgRoot(repoRoot), "manifest.json");

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Validate and return an authored enforcement map. */
export function loadEnforcementCatalog(file, { repoRoot = path.dirname(file) } = {}) {
  const source = path.relative(repoRoot, file).split(path.sep).join("/");
  let catalog;
  try {
    catalog = parseContractYaml(fs.readFileSync(file, "utf8"), { source });
  } catch (error) {
    throw new ContractError(error.message);
  }
  if (!object(catalog)) throw new ContractError(`${source}: expected an object`);
  const failures = [];
  for (const key of ["$schema", "enforcementVersion", "entries"]) {
    if (!(key in catalog)) failures.push(`${source}: missing \`${key}\``);
  }
  for (const key of Object.keys(catalog)) {
    if (!["$schema", "enforcementVersion", "entries"].includes(key)) {
      failures.push(`${source}: unknown \`${key}\``);
    }
  }
  if (catalog.$schema !== ENFORCEMENT_SCHEMA_ID) {
    failures.push(`${source}.$schema: expected ${ENFORCEMENT_SCHEMA_ID}`);
  }
  if (catalog.enforcementVersion !== ENFORCEMENT_VERSION) {
    failures.push(`${source}.enforcementVersion: expected ${ENFORCEMENT_VERSION}`);
  }
  if (!Array.isArray(catalog.entries)) {
    failures.push(`${source}.entries: expected an array`);
  } else {
    const seen = new Set();
    for (const [index, entry] of catalog.entries.entries()) {
      const at = `${source}.entries[${index}]`;
      if (!object(entry)) {
        failures.push(`${at}: expected an object`);
        continue;
      }
      for (const key of ["rules", "detector"]) {
        if (!(key in entry)) failures.push(`${at}: missing \`${key}\``);
      }
      for (const key of Object.keys(entry)) {
        if (!["rules", "detector"].includes(key)) failures.push(`${at}: unknown \`${key}\``);
      }
      if (!Array.isArray(entry.rules) || !entry.rules.length) {
        failures.push(`${at}.rules: expected a non-empty array`);
      } else {
        const local = new Set();
        for (const [ruleIndex, ruleId] of entry.rules.entries()) {
          if (!ENFORCEMENT_RULE.test(ruleId ?? "")) {
            failures.push(`${at}.rules[${ruleIndex}]: expected Pnn-nn`);
          } else if (local.has(ruleId) || seen.has(ruleId)) {
            failures.push(`${at}.rules[${ruleIndex}]: duplicate ${ruleId}`);
          } else {
            local.add(ruleId);
            seen.add(ruleId);
          }
        }
      }
      if (typeof entry.detector !== "string" || !entry.detector.trim()) {
        failures.push(`${at}.detector: expected a non-empty string`);
      }
    }
  }
  if (failures.length) throw new ContractError(failures.join("; "));
  return catalog;
}

/**
 * Load the repository enforcement map, or `null` when the file is absent.
 * Leftover Markdown or compiled JSON from earlier layouts is a failure, not a fallback.
 */
export function loadEnforcementMap(repoRoot) {
  const stale = ENFORCEMENT_STALE
    .map((name) => path.join(cgRoot(repoRoot), name))
    .filter(exists)
    .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"));
  if (stale.length) {
    throw new ContractError(
      `stale enforcement file(s) ${stale.join(", ")}; the authored map is ${ENFORCEMENT_FILENAME}`,
    );
  }
  const file = enforcementPath(repoRoot);
  if (!exists(file)) return null;
  return loadEnforcementCatalog(file, { repoRoot });
}

function assertNoStalePrinciples(repoRoot) {
  const failures = [];
  for (const [canonical, leftovers] of Object.entries(PRINCIPLE_STALE)) {
    const stale = leftovers
      .map((name) => path.join(guidelinesRoot(repoRoot), name))
      .filter(exists)
      .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"));
    if (!stale.length) continue;
    const authored = canonical === "engineering.yaml" ? ENGINEERING_FILENAME : PRODUCT_FILENAME;
    failures.push(
      `stale ${canonical.replace(/\.yaml$/, "")} file(s) ${stale.join(", ")}; the authored catalog is ${authored}`,
    );
  }
  if (failures.length) throw new ContractError(failures.join("; "));
}

/** Validate and return an authored engineering catalog, with entries normalized to rules. */
export function loadEngineeringCatalog(file, { repoRoot = path.dirname(file) } = {}) {
  const source = path.relative(repoRoot, file).split(path.sep).join("/");
  const spec = PRINCIPLE_FILES["engineering.yaml"];
  let catalog;
  try {
    catalog = parseContractYaml(fs.readFileSync(file, "utf8"), { source });
  } catch (error) {
    throw new ContractError(error.message);
  }
  if (!object(catalog)) throw new ContractError(`${source}: expected an object`);
  const failures = [];
  for (const key of ["$schema", "engineeringVersion", "categories", "principles"]) {
    if (!(key in catalog)) failures.push(`${source}: missing \`${key}\``);
  }
  for (const key of Object.keys(catalog)) {
    if (!["$schema", "engineeringVersion", "categories", "principles"].includes(key)) {
      failures.push(`${source}: unknown \`${key}\``);
    }
  }
  if (catalog.$schema !== ENGINEERING_SCHEMA_ID) {
    failures.push(`${source}.$schema: expected ${ENGINEERING_SCHEMA_ID}`);
  }
  if (catalog.engineeringVersion !== ENGINEERING_VERSION) {
    failures.push(`${source}.engineeringVersion: expected ${ENGINEERING_VERSION}`);
  }
  if (
    !Array.isArray(catalog.categories) ||
    !catalog.categories.length ||
    catalog.categories.some((category) => typeof category !== "string" || !category.trim()) ||
    new Set(catalog.categories).size !== catalog.categories.length
  ) {
    failures.push(`${source}.categories: expected unique non-empty strings`);
  }
  const knownCategories = new Set(Array.isArray(catalog.categories) ? catalog.categories : []);
  const seenPrinciples = new Set();
  const seenEntries = new Set();
  const parsedFamilies = new Set();
  const principles = [];
  if (!Array.isArray(catalog.principles) || !catalog.principles.length) {
    failures.push(`${source}.principles: expected a non-empty array`);
  } else {
    for (const [index, principle] of catalog.principles.entries()) {
      const at = `${source}.principles[${index}]`;
      if (!object(principle)) {
        failures.push(`${at}: expected an object`);
        continue;
      }
      for (const key of ["id", "title", "category", "entries"]) {
        if (!(key in principle)) failures.push(`${at}: missing \`${key}\``);
      }
      for (const key of Object.keys(principle)) {
        if (!["id", "title", "category", "entries"].includes(key)) {
          failures.push(`${at}: unknown \`${key}\``);
        }
      }
      if (!E_HEADING.test(principle.id ?? "")) {
        failures.push(`${at}.id: \`${principle.id ?? "<missing>"}\` is not an Enn id`);
        continue;
      }
      const principleFamily = familyOf(principle.id);
      if (!spec.families.includes(principleFamily)) {
        failures.push(`${at}.id: \`${principle.id}\` does not belong in engineering.yaml`);
      }
      if (seenPrinciples.has(principle.id)) {
        failures.push(`${at}: defines \`${principle.id}.\` more than once`);
      }
      seenPrinciples.add(principle.id);
      if (typeof principle.title !== "string" || !principle.title.trim()) {
        failures.push(`${at}.title: expected a non-empty string`);
      }
      if (typeof principle.category !== "string" || !knownCategories.has(principle.category)) {
        failures.push(`${at}.category: expected one category declared by the catalog`);
      }
      if (!Array.isArray(principle.entries) || !principle.entries.length) {
        failures.push(`${at}.entries: expected a non-empty array`);
        continue;
      }
      const rules = [];
      for (const [entryIndex, entry] of principle.entries.entries()) {
        const entryAt = `${at}.entries[${entryIndex}]`;
        if (!object(entry)) {
          failures.push(`${entryAt}: expected an object`);
          continue;
        }
        for (const key of ["id", "rule", "reason"]) {
          if (!(key in entry)) failures.push(`${entryAt}: missing \`${key}\``);
        }
        for (const key of Object.keys(entry)) {
          if (!["id", "rule", "reason", "cost"].includes(key)) {
            failures.push(`${entryAt}: unknown \`${key}\``);
          }
        }
        if (!E_ENTRY.test(entry.id ?? "")) {
          failures.push(`${entryAt}.id: \`${entry.id ?? "<missing>"}\` is not an Enn-nn id`);
          continue;
        }
        const family = familyOf(entry.id);
        parsedFamilies.add(family);
        if (!spec.families.includes(family)) {
          failures.push(`${entryAt}: \`${entry.id}\` does not belong in engineering.yaml`);
        }
        if (entry.id.slice(0, entry.id.lastIndexOf("-")) !== principle.id) {
          failures.push(`${entryAt}: \`${entry.id}\` does not belong under \`${principle.id}\``);
        }
        if (seenEntries.has(entry.id)) {
          failures.push(`${entryAt}: duplicate ${entry.id}`);
        }
        seenEntries.add(entry.id);
        if (typeof entry.rule !== "string" || !entry.rule.trim()) {
          failures.push(`${entryAt}.rule: expected a non-empty string`);
        }
        if (typeof entry.reason !== "string" || !entry.reason.trim()) {
          failures.push(`${entryAt}.reason: expected a non-empty string`);
        }
        if ("cost" in entry && (typeof entry.cost !== "string" || !entry.cost.trim())) {
          failures.push(`${entryAt}.cost: expected a non-empty string`);
        }
        const rule = {
          id: entry.id,
          modality: "best-practice",
          rule: entry.rule ?? "",
          reason: entry.reason ?? "",
        };
        if (entry.cost) rule.cost = entry.cost;
        rules.push(rule);
      }
      principles.push({
        id: principle.id,
        title: principle.title,
        category: principle.category,
        rules,
      });
    }
  }
  for (const family of spec.families) {
    if (!parsedFamilies.has(family)) {
      failures.push(`${source}: ${family} has no valid rules`);
    }
  }
  if (failures.length) throw new ContractError(failures.join("; "));
  return {
    $schema: catalog.$schema,
    engineeringVersion: catalog.engineeringVersion,
    families: spec.families,
    categories: catalog.categories,
    principles,
  };
}

/**
 * Load the repository engineering catalog, or `null` when the file is absent.
 * Leftover Markdown or compiled JSON from earlier layouts is a failure, not a fallback.
 */
export function loadEngineeringMap(repoRoot) {
  assertNoStalePrinciples(repoRoot);
  const file = engineeringPath(repoRoot);
  if (!exists(file)) return null;
  return loadEngineeringCatalog(file, { repoRoot });
}

/** Validate and return an authored product catalog, with entries normalized to binding rules. */
export function loadProductCatalog(file, { repoRoot = path.dirname(file) } = {}) {
  const source = path.relative(repoRoot, file).split(path.sep).join("/");
  const spec = PRINCIPLE_FILES["product.yaml"];
  let catalog;
  try {
    catalog = parseContractYaml(fs.readFileSync(file, "utf8"), { source });
  } catch (error) {
    throw new ContractError(error.message);
  }
  if (!object(catalog)) throw new ContractError(`${source}: expected an object`);
  const failures = [];
  for (const key of ["$schema", "productVersion", "principles"]) {
    if (!(key in catalog)) failures.push(`${source}: missing \`${key}\``);
  }
  for (const key of Object.keys(catalog)) {
    if (!["$schema", "productVersion", "principles"].includes(key)) {
      failures.push(`${source}: unknown \`${key}\``);
    }
  }
  if (catalog.$schema !== PRODUCT_SCHEMA_ID) {
    failures.push(`${source}.$schema: expected ${PRODUCT_SCHEMA_ID}`);
  }
  if (catalog.productVersion !== PRODUCT_VERSION) {
    failures.push(`${source}.productVersion: expected ${PRODUCT_VERSION}`);
  }
  const seenPrinciples = new Set();
  const seenEntries = new Set();
  const principles = [];
  if (!Array.isArray(catalog.principles)) {
    failures.push(`${source}.principles: expected an array`);
  } else {
    for (const [index, principle] of catalog.principles.entries()) {
      const at = `${source}.principles[${index}]`;
      if (!object(principle)) {
        failures.push(`${at}: expected an object`);
        continue;
      }
      for (const key of ["id", "title", "entries"]) {
        if (!(key in principle)) failures.push(`${at}: missing \`${key}\``);
      }
      for (const key of Object.keys(principle)) {
        if (!["id", "title", "entries"].includes(key)) {
          failures.push(`${at}: unknown \`${key}\``);
        }
      }
      if (!PRODUCT_PRINCIPLE.test(principle.id ?? "")) {
        failures.push(`${at}.id: \`${principle.id ?? "<missing>"}\` is not a Pnn id`);
        continue;
      }
      if (!spec.families.includes(familyOf(principle.id))) {
        failures.push(`${at}.id: \`${principle.id}\` does not belong in product.yaml`);
      }
      if (seenPrinciples.has(principle.id)) {
        failures.push(`${at}: defines \`${principle.id}.\` more than once`);
      }
      seenPrinciples.add(principle.id);
      if (typeof principle.title !== "string" || !principle.title.trim()) {
        failures.push(`${at}.title: expected a non-empty string`);
      }
      if (!Array.isArray(principle.entries) || !principle.entries.length) {
        failures.push(`${at}.entries: expected a non-empty array`);
        continue;
      }
      const rules = [];
      for (const [entryIndex, entry] of principle.entries.entries()) {
        const entryAt = `${at}.entries[${entryIndex}]`;
        if (!object(entry)) {
          failures.push(`${entryAt}: expected an object`);
          continue;
        }
        for (const key of ["id", "text"]) {
          if (!(key in entry)) failures.push(`${entryAt}: missing \`${key}\``);
        }
        for (const key of Object.keys(entry)) {
          if (!["id", "text"].includes(key)) {
            failures.push(`${entryAt}: unknown \`${key}\``);
          }
        }
        if (!PRODUCT_ENTRY.test(entry.id ?? "")) {
          failures.push(`${entryAt}.id: \`${entry.id ?? "<missing>"}\` is not a Pnn-nn id`);
          continue;
        }
        if (entry.id.slice(0, entry.id.lastIndexOf("-")) !== principle.id) {
          failures.push(`${entryAt}: \`${entry.id}\` does not belong under \`${principle.id}\``);
        }
        if (seenEntries.has(entry.id)) {
          failures.push(`${entryAt}: duplicate ${entry.id}`);
        }
        seenEntries.add(entry.id);
        if (typeof entry.text !== "string" || !entry.text.trim()) {
          failures.push(`${entryAt}.text: expected a non-empty string`);
        }
        rules.push({ id: entry.id, modality: "binding", text: entry.text ?? "" });
      }
      principles.push({
        id: principle.id,
        title: principle.title,
        rules,
      });
    }
  }
  if (failures.length) throw new ContractError(failures.join("; "));
  return {
    $schema: catalog.$schema,
    productVersion: catalog.productVersion,
    families: spec.families,
    principles,
  };
}

/**
 * Load the repository product catalog, or `null` when the file is absent.
 * Leftover Markdown or compiled JSON from earlier layouts is a failure, not a fallback.
 */
export function loadProductMap(repoRoot) {
  assertNoStalePrinciples(repoRoot);
  const file = productPath(repoRoot);
  if (!exists(file)) return null;
  return loadProductCatalog(file, { repoRoot });
}

/** True when the authored product catalog contains at least one P rule. */
export function productHasHarvestedRules(repoRoot) {
  const catalog = loadProductMap(repoRoot);
  return Boolean(catalog?.principles.some((principle) => principle.rules.length));
}

/** Lifecycle phases a repository can scope principle loading to. */
export const PHASE_NAMES = Object.freeze(["plan", "prepare", "produce", "sign-off", "unblock"]);

/**
 * Read `phases.json`: which rule families each phase loads.
 *
 * Tokens, not filenames. `A`, `E`, and `P` survive any reorganisation of the
 * catalog files, which is the point — loading and layout should not be able to break
 * each other. `always` means *load if the repository selected it*, never *must exist*; a
 * repository with no architecture catalog is invalid, but an empty product catalog is valid.
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
export const governanceContractPath = (repoRoot) => path.join(cgRoot(repoRoot), "contract.yaml");

/**
 * The principle files, in filename order.
 *
 * `engineering.yaml` is the complete non-binding non-product inventory.
 * `product.yaml` stays separate because its P guidelines belong to the adopting product and ship
 * empty by design. An unrelated catalog filename is an error rather than policy that disappears
 * silently.
 */
export function principleFiles(repoRoot, { boundaryScopedOnly = false, bindingOnly = false } = {}) {
  const root = guidelinesRoot(repoRoot);
  if (!exists(root)) throw new ContractError(`missing guidelines directory: ${root}`);

  const files = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:md|json|ya?ml)$/.test(entry.name))
    .filter((entry) => !PRINCIPLE_STALE_NAMES.includes(entry.name))
    .map((entry) => {
      const logicalName = principleLogicalName(entry.name);
      const spec = PRINCIPLE_FILES[logicalName];
      if (!spec) {
        throw new ContractError(
          `invalid guidelines filename ${entry.name}; expected one of ` +
            `${Object.keys(PRINCIPLE_FILES).flatMap((name) => {
              const compiled = name.replace(/\.md$/, ".json");
              return compiled === name ? [name] : [name, compiled];
            }).join(", ")}`,
        );
      }
      return {
        file: path.join(root, entry.name),
        filename: entry.name,
        logicalName,
        families: boundaryScopedOnly
          ? spec.boundaryScopedFamilies
          : bindingOnly
            ? spec.bindingFamilies
            : spec.families,
        catalogFamilies: spec.families,
        bindingFamilies: spec.bindingFamilies,
        bestPracticeFamilies: spec.bestPracticeFamilies,
        forkFamilies: spec.forkFamilies,
        binding: spec.bindingFamilies.length > 0,
        fork: spec.forkFamilies.length > 0,
        boundaryScoped: spec.boundaryScopedFamilies.length > 0,
        allowEmpty: Boolean(spec.allowEmpty),
      };
    })
    .filter((info) => info.families.length > 0)
    .sort((a, b) => a.filename.localeCompare(b.filename));
  const stems = new Map();
  for (const info of files) {
    const stem = info.filename.replace(/\.(?:md|json|ya?ml)$/, "");
    const names = stems.get(stem) ?? [];
    names.push(info.filename);
    stems.set(stem, names);
  }
  for (const [stem, names] of stems) {
    if (names.length > 1) {
      throw new ContractError(
        `${root}: duplicate principle catalog formats for ${stem}: ${names.join(", ")}`,
      );
    }
  }
  return files;
}

/** Read one JSON or YAML principle catalog. */
export function readPrincipleCatalog(file) {
  const logical = principleLogicalName(path.basename(file));
  if (logical === "engineering.yaml") return loadEngineeringCatalog(file);
  if (logical === "product.yaml") return loadProductCatalog(file);
  let catalog;
  try {
    catalog = JSON.parse(read(file));
  } catch (error) {
    throw new ContractError(`${file}: invalid JSON: ${error.message}`);
  }
  if (!catalog || typeof catalog !== "object" || !Array.isArray(catalog.principles)) {
    throw new ContractError(`${file}: expected a compiled principle catalog`);
  }
  if (catalog.categories !== undefined) {
    if (
      !Array.isArray(catalog.categories) ||
      !catalog.categories.length ||
      catalog.categories.some((category) => typeof category !== "string" || !category.trim()) ||
      new Set(catalog.categories).size !== catalog.categories.length
    ) {
      throw new ContractError(`${file}: categories must be unique non-empty strings`);
    }
    const known = new Set(catalog.categories);
    const invalid = catalog.principles.find(
      (principle) => typeof principle?.category !== "string" || !known.has(principle.category),
    );
    if (invalid) {
      throw new ContractError(
        `${file}: principle ${invalid.id ?? "<unknown>"} requires one category declared by the catalog`,
      );
    }
  } else if (catalog.principles.some((principle) => principle && "category" in principle)) {
    throw new ContractError(`${file}: a principle category requires a catalog categories list`);
  }
  const rules = catalog.principles.flatMap((principle) => principle?.rules ?? []);
  if (rules.some((rule) => !rule || typeof rule.id !== "string" || typeof rule.text !== "string")) {
    throw new ContractError(`${file}: compiled rules require string id and text fields`);
  }
  return catalog;
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
 * `allowEmpty` exists for `product.yaml`, which ships with no rules by design.
 */
export function parsePrinciples(file, { allowEmpty = false, families = RULE_FAMILIES } = {}) {
  if (!exists(file)) throw new ContractError(`missing principles file: ${file}`);

  if (file.endsWith(".json") || file.endsWith(".yaml") || file.endsWith(".yml")) {
    const catalog = readPrincipleCatalog(file);
    const rules = new Map();
    for (const rule of catalog.principles.flatMap((principle) => principle.rules)) {
      if (rule.modality !== "binding" || !families.includes(familyOf(rule.id))) continue;
      if (rules.has(rule.id)) throw new ContractError(`duplicate rule id ${rule.id} in ${file}`);
      rules.set(rule.id, rule.text);
    }
    if (!rules.size && !allowEmpty) throw new ContractError(`no XX-pp-nn rules parsed from ${file}`);
    return rules;
  }

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
      if (!families.includes(familyOf(match[1]))) {
        currentId = null;
        parts = [];
        continue;
      }
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
 * Return [{principle, rules, ruleIds}] for one file, in document order.
 *
 * Rules appearing before any heading are collected under `null`, which the correspondence
 * check rejects by name rather than silently attributing them to nothing.
 */
export function parseRuleSections(file) {
  if (file.endsWith(".json") || file.endsWith(".yaml") || file.endsWith(".yml")) {
    return readPrincipleCatalog(file).principles.map((principle) => ({
      principle: principle.id,
      rules: principle.rules.map((rule) => ({ id: rule.id, modality: rule.modality })),
      ruleIds: principle.rules.map((rule) => rule.id),
    }));
  }
  const logicalName = principleLogicalName(path.basename(file));
  const spec = PRINCIPLE_FILES[logicalName];
  const sections = [];
  let current = { principle: null, rules: [], ruleIds: [] };
  for (const raw of markdownProseLines(read(file))) {
    const heading = PRINCIPLE_HEADING.exec(raw);
    if (heading) {
      if (current.principle !== null || current.ruleIds.length) sections.push(current);
      current = { principle: heading[1], rules: [], ruleIds: [] };
      continue;
    }
    const rule = ANY_RULE_START.exec(raw);
    if (rule) {
      const family = familyOf(rule[1]);
      const modality = rule[2] ?? (spec?.bestPracticeFamilies.includes(family) ? "best-practice" : "binding");
      current.rules.push({ id: rule[1], modality });
      current.ruleIds.push(rule[1]);
    }
  }
  if (current.principle !== null || current.ruleIds.length) sections.push(current);
  return sections;
}

/**
 * Enforce the identity a principles file carries: its family, its headings, and — the part
 * a filename cannot express once a file holds several principles — that every rule sits
 * under the heading matching its own principle number.
 *
 * Without the heading check, `E01-03` filed under `## E04.` parses cleanly and resolves
 * under a principle it does not belong to. That
 * was unreachable while each file held exactly one principle and the filename carried the
 * ID; it became reachable the moment the families were collapsed into one file each.
 */
function assertPrincipleCorrespondence(
  { file, filename, catalogFamilies, bindingFamilies, bestPracticeFamilies, forkFamilies },
  rules,
) {
  const sections = parseRuleSections(file);
  const seen = new Set();

  for (const { principle, rules: sectionRules, ruleIds } of sections) {
    if (principle === null) {
      const expected = catalogFamilies.length === 1 ? ` \`## ${catalogFamilies[0]}nn.\` heading` : " principle heading";
      throw new ContractError(
        `${filename}: rule(s) ${ruleIds.join(", ")} appear before any${expected}`,
      );
    }
    const principleFamily = familyOf(principle);
    if (!catalogFamilies.includes(principleFamily)) {
      throw new ContractError(
        `${filename} holds ${catalogFamilies.join(", ")} principles; \`## ${principle}.\` belongs in another file`,
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
    for (const rule of sectionRules) {
      const family = familyOf(rule.id);
      if (bindingFamilies.includes(family) && rule.modality !== "binding") {
        throw new ContractError(`${filename}: binding rule \`${rule.id}\` must not declare a fork modality`);
      }
      if (bestPracticeFamilies.includes(family) && rule.modality !== "best-practice") {
        throw new ContractError(`${filename}: architecture rule \`${rule.id}\` must be a non-binding best practice`);
      }
      if (forkFamilies.includes(family) && rule.modality === "binding") {
        throw new ContractError(
          `${filename}: fork-loaded rule \`${rule.id}\` requires an \`invariant\` or \`guide\` modality`,
        );
      }
    }
  }

  for (const ruleId of rules.keys()) {
    if (!catalogFamilies.some((family) => familyOf(ruleId) === family)) {
      throw new ContractError(
        `\`${ruleId}\` is a ${familyOf(ruleId)} rule and does not belong in ${filename}`,
      );
    }
  }
}

/**
 * Merge rules that boundary contracts may reference, in filename order.
 */
export function loadPrinciples(repoRoot) {
  return loadPrincipleRules(repoRoot, { boundaryScopedOnly: true, allowEmptyResult: true });
}

/** Merge global A architecture principles and repository-authored P guidelines. */
export function loadBindingPrinciples(repoRoot) {
  const merged = loadCoreBindingRules(repoRoot);
  const product = loadPrincipleRules(repoRoot, { bindingOnly: true, allowEmptyResult: true });
  for (const [ruleId, text] of product) {
    if (merged.has(ruleId)) throw new ContractError(`duplicate binding rule id ${ruleId}`);
    merged.set(ruleId, text);
  }
  return merged;
}

function loadPrincipleRules(repoRoot, selection) {
  const merged = new Map();
  const owners = new Map();
  const principleOwners = new Map();
  const files = principleFiles(repoRoot, selection);
  if (selection.bindingOnly) {
    const present = new Set(files.map((info) => info.logicalName));
    const missing = Object.entries(PRINCIPLE_FILES)
      .filter(([, spec]) => spec.bindingFamilies.length > 0)
      .map(([filename]) => filename)
      .filter((filename) => !present.has(filename));
    if (missing.length) {
      throw new ContractError(`missing binding principle file(s): ${missing.join(", ")}`);
    }
  }
  for (const info of files) {
    const { file, filename, allowEmpty, families } = info;
    const rules = parsePrinciples(file, { allowEmpty, families });
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
  if (merged.size === 0 && !selection.allowEmptyResult) {
    throw new ContractError(`no XX-pp-nn rules found under ${guidelinesRoot(repoRoot)}`);
  }
  return merged;
}

/**
 * Return [{id, title, count}] in document order.
 *
 * Drives the generated index in `.agents/cg/contract-graph-agent.md`. Editor-specific root files point there
 * without copying the index into repository-owned instructions.
 */
export function parsePrincipleIndex(file, { allowEmpty = false, families = RULE_FAMILIES } = {}) {
  if (!exists(file)) throw new ContractError(`missing principles file: ${file}`);

  if (file.endsWith(".json") || file.endsWith(".yaml") || file.endsWith(".yml")) {
    const index = readPrincipleCatalog(file).principles
      .filter((principle) => families.includes(familyOf(principle.id)))
      .map((principle) => ({
        id: principle.id,
        title: principle.title,
        count: principle.rules.filter((rule) => rule.modality === "binding").length,
      }));
    if (!index.length && !allowEmpty) {
      throw new ContractError(`no principle entries found in ${file}`);
    }
    const orphan = index.filter((entry) => !entry.count).map((entry) => entry.id);
    if (orphan.length) throw new ContractError(`principle(s) with no rules in ${file}: ${orphan.join(", ")}`);
    return index;
  }

  const index = [];
  const counts = new Map();
  for (const raw of markdownProseLines(read(file))) {
    const heading = PRINCIPLE_HEADING.exec(raw);
    if (heading) {
      if (families.includes(familyOf(heading[1]))) {
        index.push({ id: heading[1], title: heading[2] });
      }
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
  return principleFiles(repoRoot, { bindingOnly: true }).flatMap(({ file, filename, allowEmpty, families }) =>
    parsePrincipleIndex(file, { allowEmpty, families }).map((entry) => ({ ...entry, filename })),
  );
}

/** Render the principle index for a root entry file, without trailing newline. */
export function renderRootIndex(repoRoot, prefix, { local = false } = {}) {
  const principles = loadPrincipleIndex(repoRoot);
  const core = loadCoreBindingRules(repoRoot);
  const total = core.size + principles.reduce((sum, e) => sum + e.count, 0);
  const target = `${prefix}.agents/cg/guidelines/`;
  const bindingTarget = `${prefix}${BINDING_FILENAME}`;
  const targetHref = local ? "guidelines/" : target;
  const bindingHref = local ? "principles/architecture.yaml" : bindingTarget;

  const lines = [
    ROOT_BEGIN_LINE,
    "## Binding rules — index",
    "",
    `**You MUST read [\`${bindingTarget}\`](${bindingHref}) before planning any change.** It is binding: where ` +
      "your code and the architecture catalog disagree, **the catalog wins and the code is wrong.** Its `graph` " +
      "section is the recursive mapping: kinds, self-sufficiency, stay, add-child, or elsewhere; " +
      "the delivery workflow does not replace that decision. The index " +
      `below lists the binding context (${total} rules) — the index is not the rule; cite rules by ID ` +
      "(`A01`), never by position.",
  ];
  lines.push("", `**${FAMILY_BLURB.A}**`, "");
  lines.push(`- [**A** Structural integrity](${bindingHref}) — ${core.size} rules`);
  for (const family of RULE_FAMILIES) {
    const rows = principles.filter((e) => familyOf(e.id) === family);
    if (!rows.length) continue;
    lines.push("", `**${FAMILY_BLURB[family]}**`, "");
    for (const { id, title, count, filename } of rows) {
      const file = `${targetHref}${filename}`;
      lines.push(
        `- [**${id}** ${title}](${file}) — ${count} rule${count === 1 ? "" : "s"}`,
      );
    }
  }
  lines.push(ROOT_END_MARKER);
  return lines.join("\n");
}

/** Render the canonical shared instructions stored inside `.agents/cg/`. */
export function renderCgAgent(repoRoot) {
  return [
    "# Contract Graph — agent entry point",
    "",
    "**Start here: [`.agents/cg/contract.yaml`](contract.yaml)** — the root of the project's context graph. " +
      "It explains the system, sets the reading order, and routes work into module and sub-module " +
      "contracts before implementation code is read.",
    "",
    "`.agents/cg/` is a dot-directory. If your tool's indexer skips hidden paths, open " +
      "these files by exact path rather than relying on search.",
    "",
    renderRootIndex(repoRoot, "", { local: true }),
    "",
    "## Required reading order",
    "",
    "1. [`.agents/cg/contract.yaml`](contract.yaml) — repository contract and graph root.",
    `2. [\`${BINDING_FILENAME}\`](principles/architecture.yaml) — architecture principles: \`hierarchy.kinds\` and \`graph\` (recurse, selfSufficient, stay / add-child / elsewhere), then A detectors.`,
    "3. [`.agents/cg/guidelines/`](guidelines/) — non-binding engineering guidelines and repository-owned product guidelines.",
    "4. [`.agents/cg/workflow.md`](workflow.md) — the repository-owned agent workflow.",
    "5. Run `cg contract route --task \"<request>\"` — resolve the first task-to-contract edge " +
      "from routes owned by contracts.",
    "6. `<module>/.agents/cg/contract.yaml`, then its relevant child contracts — traverse until " +
      "the responsible boundary is clear; only then read implementation. Use `cg contract context` " +
      "to resolve the rules that bind the selected boundary.",
    "",
    "The principle index in this file is generated. Keep repository-specific instructions in the " +
      "root entry files or other repository-owned context. Regenerate with `cg sync`.",
    "",
  ].join("\n");
}

/** Return {path, current, desired} for the canonical shared instructions. */
export function generateCgAgent(repoRoot) {
  const file = path.join(repoRoot, CG_AGENT_ENTRY);
  const current = readIfPresent(file);
  const legacyFile = path.join(repoRoot, LEGACY_CG_AGENT_ENTRY);
  const legacyPath = !current && exists(legacyFile) ? legacyFile : null;
  const source = legacyPath ? read(legacyFile) : current;

  if (source.includes(ROOT_BEGIN_MARKER)) {
    return {
      path: file,
      current,
      legacyPath,
      desired: applyBlock(
        source,
        renderRootIndex(repoRoot, "", { local: true }),
        file,
        ROOT_BEGIN_MARKER,
        ROOT_END_MARKER,
      ),
    };
  }

  if (source.trim()) {
    if (!splitLines(source).some((line) => line.startsWith("# "))) {
      throw new ContractError(
        `${CG_AGENT_ENTRY}: existing file has no H1 to anchor the generated principle index. ` +
          "Add a top-level heading, or move this file aside and re-run `cg sync`.",
      );
    }
    return {
      path: file,
      current,
      legacyPath,
      desired: applyBlock(
        source,
        renderRootIndex(repoRoot, "", { local: true }),
        file,
        ROOT_BEGIN_MARKER,
        ROOT_END_MARKER,
      ),
    };
  }

  return { path: file, current, legacyPath, desired: renderCgAgent(repoRoot) };
}

/** Render a complete root entry file: static preamble plus the generated index. */
export function renderRootPointer(repoRoot, prefix, projectName) {
  const contract = `${prefix}.agents/cg/contract.yaml`;
  return [
    `# ${projectName} — agent entry point`,
    "",
    `**Start here: [\`${contract}\`](${contract})** — the root of the project's context graph. ` +
      "It explains the system, sets the reading order, and routes work into module and sub-module " +
      "contracts before implementation code is read.",
    "",
    "`.agents/cg/` is a dot-directory. If your tool's indexer skips hidden paths, open " +
      "these files by exact path rather than relying on search.",
    "",
    renderRootIndex(repoRoot, prefix),
    "",
    "## Required reading order",
    "",
    `1. [\`${prefix}.agents/cg/contract.yaml\`](${contract}) — repository contract and graph root.`,
    `2. [\`${prefix}${BINDING_FILENAME}\`](${prefix}${BINDING_FILENAME}) — architecture principles: \`hierarchy.kinds\` and \`graph\` (recurse, selfSufficient, stay / add-child / elsewhere), then A detectors.`,
    `3. [\`${prefix}.agents/cg/guidelines/\`](${prefix}.agents/cg/guidelines/) — non-binding engineering guidelines and repository-owned product guidelines.`,
    `4. [\`${prefix}.agents/cg/workflow.md\`](${prefix}.agents/cg/workflow.md) — the repository-owned ` +
      "agent workflow.",
    "5. Run `cg contract route --task \"<request>\"` — resolve the first task-to-contract edge " +
      "from routes owned by contracts.",
    "6. `<module>/.agents/cg/contract.yaml`, then its relevant child contracts — traverse until " +
      "the responsible boundary is clear; only then read implementation. Use `cg contract context` " +
      "to resolve the rules that bind the selected boundary.",
    "",
    "Do not put instructions in this file — the index above is generated, and everything " +
      "else belongs under `.agents/cg/`. Regenerate with `cg sync`.",
    "",
  ].join("\n");
}

/** The one-line discovery pointer each supported root file carries before repository guidance. */
export function renderRootReference(relPath, prefix, entry = CG_AGENT_ENTRY) {
  if (relPath === "CLAUDE.md") return `@${prefix}${entry}`;
  return `Read [\`${prefix}${entry}\`](${prefix}${entry}) before planning or changing code.`;
}

/** Remove a legacy generated index while retaining repository-authored text around it. */
function removeRootIndex(text, file) {
  const lines = splitLines(text);
  const begin = lines.findIndex((line) => line.startsWith(ROOT_BEGIN_MARKER));
  const end = lines.findIndex((line) => line.trim() === ROOT_END_MARKER);
  if (begin < 0 && end < 0) return text;
  if (begin < 0 || end < 0 || end < begin) {
    throw new ContractError(`${file}: unbalanced or reversed PRINCIPLES INDEX markers`);
  }
  return [...lines.slice(0, begin), ...lines.slice(end + 1)].join("\n").replace(/^\n+|\n+$/g, "");
}

/**
 * Return {path, current, desired} for one root discovery file.
 *
 * Existing content belongs to the repository. Contract Graph owns only the first line, which
 * points at its canonical instructions. A legacy generated index is removed during migration;
 * everything outside that marked block survives, including files with no H1.
 */
export function generateRoot(repoRoot, relPath, prefix, projectName) {
  const file = path.join(repoRoot, relPath);
  const current = readIfPresent(file);
  const reference = renderRootReference(relPath, prefix);
  const legacyReference = renderRootReference(relPath, prefix, LEGACY_CG_AGENT_ENTRY);
  let remainder = current;

  // A pristine legacy entry file contains no repository content to retain.
  if (current === renderRootPointer(repoRoot, prefix, projectName)) remainder = "";
  else if (current.includes(ROOT_BEGIN_MARKER) || current.includes(ROOT_END_MARKER)) {
    remainder = removeRootIndex(current, file);
  }

  const lines = splitLines(remainder).filter(
    (line) => line.trim() !== reference && line.trim() !== legacyReference,
  );
  const body = lines.join("\n").replace(/^\n+|\n+$/g, "");
  const desired = `${reference}${body ? `\n\n${body}` : ""}\n`;
  return { path: file, current, desired };
}

/** Module workspace-root pointer files `cg verify` [1] requires. */
export const MODULE_POINTERS = Object.freeze(["AGENTS.md", "CLAUDE.md"]);

/** Prefix from `<unit>/AGENTS.md` to the repository `.agents/cg/` tree. */
export function modulePointerPrefix(unit) {
  const depth = String(unit).split("/").filter(Boolean).length;
  return "../".repeat(Math.max(depth, 1));
}

/**
 * The short module pointer `cg sync` writes so a newly governed module is openable as a
 * workspace root. Matches `install/templates/module/AGENTS.md` for unit `src`.
 */
export function renderModulePointer(unit, name = unit) {
  const prefix = modulePointerPrefix(unit);
  return [
    `# ${name} — agent entry point`,
    "",
    "This folder is openable as a workspace root on its own.",
    "",
    "**Start here: `.agents/cg/contract.yaml`** — how this module is used by the project, its boundary,",
    "entry points, and the child contracts that locate narrower responsibilities. Traverse those",
    "contracts before reading implementation.",
    "",
    `The structural rules that bind every boundary are in \`${prefix}.agents/cg/principles/architecture.yaml\`.`,
    `Repository product and engineering guidelines are under \`${prefix}.agents/cg/guidelines/\`; engineering entries there are`,
    "non-binding.",
    `For the lifecycle workflow, read \`${prefix}.agents/cg/workflow.md\`.`,
    "",
    "Do not put instructions in this file.",
    "",
  ].join("\n");
}

/** Return {path, current, desired} for one module pointer file. */
export function generateModulePointer(repoRoot, contract, relPath) {
  const file = path.join(repoRoot, contract.unit, relPath);
  return {
    path: file,
    current: readIfPresent(file),
    desired: renderModulePointer(contract.unit, contract.name || contract.id),
  };
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
    "[`../cg/contract.yaml`](../cg/contract.yaml) and traverse its context graph from repository to",
    "module to relevant sub-module before reading implementation code.",
    "Read [`../cg/principles/architecture.yaml`](../cg/principles/architecture.yaml) for the recursive mapping and enforced architecture principles.",
    "Use the matching [`../skills/cg-*/SKILL.md`](../skills/) for non-trivial lifecycle work.",
    "Optional engineering guidance lives under `.agents/cg/guidelines/`; canonical skills live under",
    "`.agents/skills/`.",
    "",
  ].join("\n");
}

/** Return {path, current, desired} for the shared-agent rule pointer. */
export function generateAgentRule(repoRoot) {
  const file = path.join(repoRoot, ".agents", "rules", "cg.md");
  return { path: file, current: readIfPresent(file), desired: renderAgentRule() };
}

/** Return Markdown with one generated discovery block replaced or inserted after the H1. */
export function applyBlock(text, block, file, beginMarker, endMarker) {
  const label = beginMarker.replace("<!-- BEGIN ", "").trim();
  const lines = splitLines(text);
  let begin = null;
  let end = null;

  lines.forEach((line, index) => {
    if (line.startsWith(beginMarker)) {
      if (begin !== null) {
        throw new ContractError(`${file}: more than one BEGIN ${label} marker`);
      }
      begin = index;
    } else if (line.trim() === endMarker) {
      if (end !== null) {
        throw new ContractError(`${file}: more than one END ${label} marker`);
      }
      end = index;
    }
  });

  if ((begin === null) !== (end === null)) {
    throw new ContractError(`${file}: unbalanced ${label} markers`);
  }

  if (begin !== null) {
    if (end < begin) {
      throw new ContractError(`${file}: END ${label} precedes BEGIN ${label}`);
    }
    return [...lines.slice(0, begin), ...splitLines(block), ...lines.slice(end + 1)].join("\n") + "\n";
  }

  const heading = lines.findIndex((line) => line.startsWith("# "));
  if (heading < 0) {
    throw new ContractError(`${file}: no H1 to anchor the generated block`);
  }
  return (
    [...lines.slice(0, heading + 1), "", ...splitLines(block), ...lines.slice(heading + 1)].join(
      "\n",
    ) + "\n"
  );
}
