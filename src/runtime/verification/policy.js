/**
 * @file Load and project installed policy catalogs and validate phase-loading policy.
 * @see .agent/contract.md
 */
import fs from "node:fs";
import path from "node:path";

import { loadCoreBindingRules, validateBindingCatalog } from "./binding.js";
import { DEFAULT_DOCS_ROOT } from "../installation/profiles.js";
import { parseContractYaml } from "../graph/contracts.js";
import { PRINCIPLES_SCHEMA_ID, validateGuidelineCatalog } from "./catalog.js";
export { PRINCIPLES_SCHEMA_ID, PRINCIPLES_VERSION } from "./catalog.js";

/** Repository-authored product guideline family. Core architecture principles use A in YAML. */
export const RULE_FAMILIES = ["P"];
export const CORE_BINDING_FAMILIES = ["A"];
export const BEST_PRACTICE_FAMILIES = ["E"];

export const ALL_FAMILIES = [...RULE_FAMILIES, ...BEST_PRACTICE_FAMILIES];

export const familyOf = (id) => (typeof id === "string" && /^[A-Z]/.test(id) ? id[0] : "");

export const FAMILY_BLURB = {
  A: "Architecture Principles — machine-enforced structural integrity supplied by Contract Graph (global MUST).",
  P: "Product Guidelines — exist because of *this* product's market, pricing, and shape (scoped MUST).",
  E: "Engineering Guidelines — shipped software-engineering judgement that SHOULD hold; cg verify does not enforce them.",
};

/** Every authored guideline catalog, its families, and whether contracts may bind its rule IDs. */
export const PRINCIPLE_FILES = Object.freeze({
  "engineering.yaml": {
    families: [...BEST_PRACTICE_FAMILIES],
    bindingFamilies: [],
    boundaryScopedFamilies: [],
  },
  "product.yaml": {
    families: ["P"],
    bindingFamilies: ["P"],
    boundaryScopedFamilies: ["P"],
    allowEmpty: true,
  },
});

export const ENGINEERING_SCHEMA_ID = PRINCIPLES_SCHEMA_ID;
export const ENGINEERING_FILENAME = ".agents/cg/guidelines/engineering.yaml";
export const PRODUCT_SCHEMA_ID = PRINCIPLES_SCHEMA_ID;
export const PRODUCT_FILENAME = ".agents/cg/guidelines/product.yaml";
const PRINCIPLE_STALE = Object.freeze({
  "engineering.yaml": ["engineering.md", "engineering.json", "design.yaml", "design.md", "design.json"],
  "product.yaml": ["product.md", "product.json"],
});
const PRINCIPLE_STALE_NAMES = Object.freeze(Object.values(PRINCIPLE_STALE).flat());

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

/**
 * Generated and authored files that live at the contract-graph root.
 * Policy consumers share these paths with installation and graph verification.
 */
export const guidelinesRoot = (repoRoot) => path.join(cgRoot(repoRoot), "guidelines");
export const ENFORCEMENT_SCHEMA_ID =
  "https://contractgraph.dev/schema/enforcement-v1.schema.json";
export const ENFORCEMENT_VERSION = "1.0";
export const ENFORCEMENT_FILENAME = ".agents/cg/enforcement.yaml";
const ENFORCEMENT_RULE = /^P\d{2}-\d{2}$/;
const ENFORCEMENT_STALE = ["enforcement.md", "enforcement.json"];
export const engineeringPath = (repoRoot) => path.join(guidelinesRoot(repoRoot), "engineering.yaml");
export const productPath = (repoRoot) => path.join(guidelinesRoot(repoRoot), "product.yaml");

export const enforcementPath = (repoRoot) => path.join(cgRoot(repoRoot), "enforcement.yaml");
export const phasesPath = (repoRoot) => path.join(cgRoot(repoRoot), "phases.json");

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

/** Load any principle family through one entry point; semantic A checks stay verifier-owned. */
export function loadPrinciplesCatalog(file, { repoRoot = path.dirname(file), family } = {}) {
  const source = path.relative(repoRoot, file).split(path.sep).join("/");
  let catalog;
  try {
    catalog = parseContractYaml(fs.readFileSync(file, "utf8"), { source });
  } catch (error) {
    throw new ContractError(error.message);
  }
  const expected = family ?? catalog?.family;
  const failures = expected === "architecture"
    ? validateBindingCatalog(catalog, { source })
    : validateGuidelineCatalog(catalog, expected, { source });
  if (failures.length) throw new ContractError(failures.join("; "));
  return catalog;
}

function loadGuidelineCatalog(file, family, options) {
  const catalog = loadPrinciplesCatalog(file, { ...options, family });
  const engineering = family === "engineering";
  return {
    ...catalog,
    families: PRINCIPLE_FILES[`${family}.yaml`].families,
    principles: catalog.principles.map(({ entries, ...group }) => ({
      ...group,
      rules: entries.map((entry) => ({
        ...entry,
        modality: engineering ? "best-practice" : "binding",
        // Preserve the existing rendering API while authored catalogs use statement.
        [engineering ? "rule" : "text"]: entry.statement,
      })),
    })),
  };
}

export function loadEngineeringCatalog(file, options = {}) {
  return loadGuidelineCatalog(file, "engineering", options);
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

export function loadProductCatalog(file, options = {}) {
  return loadGuidelineCatalog(file, "product", options);
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
export const PHASE_NAMES = Object.freeze(["plan", "prototype", "produce", "sign-off", "unblock"]);

/**
 * Read `phases.json`: which rule families each phase loads.
 *
 * Tokens, not filenames. `A`, `E`, and `P` survive any reorganisation of the
 * catalog files, which is the point — loading and layout should not be able to break
 * each other. `always` means *in view on every task*, never *must exist*; a
 * repository with no architecture catalog is invalid, but an empty product catalog is valid.
 * Advisory E may sit in `always` without becoming a verify failure.
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

  // Existing repository-owned maps predate the optional prototype entry. Its skill reads A/P
  // directly until the repository adopts a row; upgrades must not force a policy rewrite.
  const missing = PHASE_NAMES.filter((name) => name !== "prototype" && !(name in phases));
  if (missing.length) throw new ContractError(`${file}: missing phase(s): ${missing.join(", ")}`);
  const extra = Object.keys(phases).filter((name) => !PHASE_NAMES.includes(name) && name !== "prepare");
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
 * `engineering.yaml` is the complete non-product SHOULD inventory.
 * `product.yaml` stays separate because its P principles belong to the adopting product and ship
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
      const logicalName = entry.name;
      const spec = PRINCIPLE_FILES[logicalName];
      if (!spec) {
        throw new ContractError(
          `invalid guidelines filename ${entry.name}; expected one of ` +
            `${Object.keys(PRINCIPLE_FILES).join(", ")}`,
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
        allowEmpty: Boolean(spec.allowEmpty),
      };
    })
    .filter((info) => info.families.length > 0)
    .sort((a, b) => a.filename.localeCompare(b.filename));
  return files;
}

/** Load a canonical YAML guideline catalog through its family validator. */
export function readPrincipleCatalog(file) {
  const filename = path.basename(file);
  if (filename === "engineering.yaml") return loadEngineeringCatalog(file);
  if (filename === "product.yaml") return loadProductCatalog(file);
  throw new ContractError(`invalid guidelines filename ${filename}; expected one of ${Object.keys(PRINCIPLE_FILES).join(", ")}`);
}

/** Return binding rule text from one validated YAML catalog. */
export function parsePrinciples(file, { allowEmpty = false, families = RULE_FAMILIES } = {}) {
  if (!exists(file)) throw new ContractError(`missing principles file: ${file}`);
  const catalog = readPrincipleCatalog(file);
  const rules = new Map(catalog.principles.flatMap(principle => principle.rules)
    .filter(rule => rule.modality === "binding" && families.includes(familyOf(rule.id)))
    .map(rule => [rule.id, rule.statement]));
  if (!rules.size && !allowEmpty) throw new ContractError(`no XX-pp-nn rules parsed from ${file}`);
  return rules;
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
    for (const [ruleId, text] of rules) {
      if (merged.has(ruleId)) {
        throw new ContractError(
          `duplicate rule id ${ruleId} across ${owners.get(ruleId)} and ${filename}`,
        );
      }
      merged.set(ruleId, text);
      owners.set(ruleId, filename);
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

  const index = readPrincipleCatalog(file).principles
    .filter(principle => families.includes(familyOf(principle.id)))
    .map(principle => ({
      id: principle.id,
      title: principle.title,
      count: principle.rules.filter(rule => rule.modality === "binding").length,
    }));
  if (!index.length && !allowEmpty) throw new ContractError(`no principle entries found in ${file}`);
  const orphan = index.filter(entry => !entry.count).map(entry => entry.id);
  if (orphan.length) throw new ContractError(`principle(s) with no rules in ${file}: ${orphan.join(", ")}`);
  return index;
}

/** The merged principle index across every principles file, in family order. */
export function loadPrincipleIndex(repoRoot) {
  return principleFiles(repoRoot, { bindingOnly: true }).flatMap(({ file, filename, allowEmpty, families }) =>
    parsePrincipleIndex(file, { allowEmpty, families }).map((entry) => ({ ...entry, filename })),
  );
}
