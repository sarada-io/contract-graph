/**
 * Contract Graph's canonical contract engine.
 *
 * A contract is data, not a generated Markdown file. Every governed directory owns exactly
 * one `.agents/cg/contract.yaml`; this module loads those files, proves that their edges form
 * one rooted composition graph, and projects the data into views useful to humans and agents.
 * The installed package includes its YAML parser, so the `cg` executable is self-contained.
 */

import fs from "node:fs";
import path from "node:path";
import { isScalar, parseDocument, stringify, visit } from "yaml";

export const CONTRACT_FILENAME = ".agents/cg/contract.yaml";
export const CONTRACT_VERSION = "1.0";
export const CONTRACT_SCHEMA_ID = "https://sarada.io/contract-graph/schema/contract-v1.schema.json";

const CONTRACT_KINDS = new Set([
  "repository",
  "module",
  "submodule",
  "component",
  "library",
]);
export const DEFAULT_BOUNDARY_HIERARCHY = Object.freeze({
  repository: Object.freeze(["module"]),
  module: Object.freeze(["submodule", "component", "library"]),
  submodule: Object.freeze(["submodule", "component", "library"]),
  component: Object.freeze(["component", "library"]),
  library: Object.freeze([]),
});
const SURFACE_KINDS = new Set([
  "service",
  "module",
  "package",
  "class",
  "function",
  "type",
  "schema",
  "command",
  "http",
  "event",
  "file",
  "other",
]);
const TOP_LEVEL_KEYS = new Set([
  "$schema",
  "contractVersion",
  "id",
  "name",
  "kind",
  "unit",
  "summary",
  "purpose",
  "responsibilities",
  "surface",
  "invariants",
  "relations",
  "rules",
  "verification",
  "routes",
  "agent",
  "assumptions",
  "exceptions",
  "extensions",
]);
const REQUIRED_KEYS = [...TOP_LEVEL_KEYS].filter(
  (key) => !["assumptions", "exceptions", "extensions"].includes(key),
);
const RULE_ID = /^P\d{2}-\d{2}$/;
const EXCEPTION_RULE_ID = /^(?:A\d{2}|P\d{2}-\d{2})$/;
const ID = /^[a-z0-9][a-z0-9._/-]*$/;
const LOCAL_ID = /^[a-z0-9][a-z0-9._-]*$/;
const INVARIANT_ID = /^[A-Z][A-Z0-9_-]*$/;
const CONTRACT_REF = /^(?:\.agents\/cg\/contract\.yaml|[A-Za-z0-9_@][A-Za-z0-9._@/-]*\/\.agents\/cg\/contract\.yaml)$/;
const UNIT = /^(?:\.|[A-Za-z0-9_@][A-Za-z0-9._@/-]*)$/;
const SKIP_DIRECTORIES = new Set([
  ".git",
  ".agents",
  ".claude",
  "node_modules",
  "vendor",
  "target",
  "build",
  "dist",
  "out",
  "coverage",
  ".venv",
  "venv",
]);

export class ContractGraphError extends Error {}

const posix = (value) => value.split(path.sep).join("/");
const exists = (file) => fs.existsSync(file);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

export function contractPathForUnit(unit) {
  return unit === "." ? CONTRACT_FILENAME : `${unit}/${CONTRACT_FILENAME}`;
}

/**
 * Parse the deliberately restricted YAML profile used for contract nodes.
 *
 * Contract YAML is data, not a composition language. Aliases, anchors, explicit tags, merge
 * keys, duplicate keys, non-string keys, multiple documents, and non-JSON scalar values are
 * rejected before contract validation so the same bytes always produce one plain data object.
 */
export function parseContractYaml(sourceText, { source = "contract.yaml" } = {}) {
  const document = parseDocument(sourceText, {
    version: "1.2",
    strict: true,
    uniqueKeys: true,
    merge: false,
    customTags: [],
  });
  const failures = [
    ...document.errors.map((error) => error.message),
    ...document.warnings.map((warning) => warning.message),
  ];

  visit(document, {
    Alias: () => failures.push("aliases are not permitted"),
    Node: (_key, node) => {
      if (node.anchor) failures.push(`anchor \`${node.anchor}\` is not permitted`);
      if (node.tag) failures.push(`explicit tag \`${node.tag}\` is not permitted`);
    },
    Pair: (_key, pair) => {
      if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
        failures.push("mapping keys must be strings");
      } else if (pair.key.value === "<<") {
        failures.push("merge keys are not permitted");
      }
    },
  });

  if (failures.length) {
    throw new ContractGraphError(`${source}: invalid Contract Graph YAML: ${[...new Set(failures)].join("; ")}`);
  }

  let value;
  try {
    value = document.toJS({ mapAsMap: false, maxAliasCount: 0 });
  } catch (error) {
    throw new ContractGraphError(`${source}: invalid Contract Graph YAML: ${error.message}`);
  }

  const inspect = (item, at) => {
    if (item === null || typeof item === "string" || typeof item === "boolean") return;
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new ContractGraphError(`${source}: ${at} must be a finite number`);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach((entry, index) => inspect(entry, `${at}[${index}]`));
      return;
    }
    if (item && typeof item === "object" && Object.getPrototypeOf(item) === Object.prototype) {
      for (const [key, entry] of Object.entries(item)) inspect(entry, `${at}.${key}`);
      return;
    }
    throw new ContractGraphError(`${source}: ${at} must contain JSON-compatible data`);
  };
  inspect(value, "$contract");
  return value;
}

/** Canonical human-editable serialization for scaffolded and rewritten contract nodes. */
export function stringifyContractYaml(contract) {
  return stringify(contract, {
    version: "1.2",
    aliasDuplicateObjects: false,
    lineWidth: 0,
  });
}

function pathIsSafe(value) {
  if (!UNIT.test(value)) return false;
  if (value === ".") return true;
  return !value.split("/").some((part) => part === "" || part === "." || part === "..");
}

function checkKeys(value, required, allowed, at, failures) {
  if (!object(value)) {
    failures.push(`${at}: expected an object`);
    return false;
  }
  for (const key of required) {
    if (!(key in value)) failures.push(`${at}: missing required property \`${key}\``);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) failures.push(`${at}: unknown property \`${key}\``);
  }
  return true;
}

function checkStringList(value, at, failures, { unique = false } = {}) {
  if (!Array.isArray(value)) {
    failures.push(`${at}: expected an array`);
    return;
  }
  value.forEach((item, index) => {
    if (!nonEmpty(item)) failures.push(`${at}[${index}]: expected a non-empty string`);
  });
  if (unique && new Set(value).size !== value.length) failures.push(`${at}: values must be unique`);
}

function checkLocalId(value, at, failures) {
  if (!nonEmpty(value) || !LOCAL_ID.test(value)) {
    failures.push(`${at}: expected a stable lower-case identifier`);
  }
}

function checkContractRef(value, at, failures) {
  const keys = new Set(["contract", "uses", "via"]);
  if (!checkKeys(value, ["contract", "uses"], keys, at, failures)) return;
  if (!nonEmpty(value.contract) || !CONTRACT_REF.test(value.contract) || value.contract.includes("..")) {
    failures.push(`${at}.contract: expected a canonical repository-relative contract.yaml path`);
  }
  if (!nonEmpty(value.uses)) failures.push(`${at}.uses: expected a non-empty CommonMark string`);
  if ("via" in value) checkStringList(value.via, `${at}.via`, failures);
}

function checkUniqueIds(items, at, failures) {
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    if (!object(item) || !nonEmpty(item.id)) continue;
    if (seen.has(item.id)) failures.push(`${at}[${index}].id: duplicate identifier \`${item.id}\``);
    seen.add(item.id);
  }
}

/** Validate the self-contained shape of one parsed contract. */
export function validateContract(contract, { source = "contract.yaml" } = {}) {
  const failures = [];
  if (!checkKeys(contract, REQUIRED_KEYS, TOP_LEVEL_KEYS, source, failures)) return failures;

  if (contract.$schema !== CONTRACT_SCHEMA_ID) {
    failures.push(
      `${source}.$schema: expected canonical schema \`${CONTRACT_SCHEMA_ID}\`, got ${JSON.stringify(contract.$schema)}`,
    );
  }
  if (contract.contractVersion !== CONTRACT_VERSION) {
    failures.push(
      `${source}.contractVersion: expected \`${CONTRACT_VERSION}\`, got ${JSON.stringify(contract.contractVersion)}`,
    );
  }
  if (!nonEmpty(contract.id) || !ID.test(contract.id)) {
    failures.push(`${source}.id: expected a stable lower-case graph identifier`);
  }
  if (!nonEmpty(contract.name)) failures.push(`${source}.name: expected a non-empty string`);
  if (!CONTRACT_KINDS.has(contract.kind)) failures.push(`${source}.kind: unknown boundary kind`);
  if (!nonEmpty(contract.unit) || !pathIsSafe(contract.unit)) {
    failures.push(`${source}.unit: expected \`.\` or a safe repository-relative directory`);
  }
  if (!nonEmpty(contract.summary)) failures.push(`${source}.summary: expected a non-empty string`);
  if (!nonEmpty(contract.purpose)) failures.push(`${source}.purpose: expected a non-empty CommonMark string`);

  if (
    checkKeys(
      contract.responsibilities,
      ["owns", "allows", "forbids"],
      new Set(["owns", "allows", "forbids"]),
      `${source}.responsibilities`,
      failures,
    )
  ) {
    for (const key of ["owns", "allows", "forbids"]) {
      checkStringList(contract.responsibilities[key], `${source}.responsibilities.${key}`, failures);
    }
    if (Array.isArray(contract.responsibilities.owns) && contract.responsibilities.owns.length !== 1) {
      failures.push(`${source}.responsibilities.owns: a boundary must own exactly one responsibility`);
    }
  }

  if (!Array.isArray(contract.surface)) {
    failures.push(`${source}.surface: expected an array`);
  } else {
    checkUniqueIds(contract.surface, `${source}.surface`, failures);
    contract.surface.forEach((entry, index) => {
      const at = `${source}.surface[${index}]`;
      if (!checkKeys(entry, ["id", "kind", "path", "summary", "symbols", "contract"], new Set(["id", "kind", "path", "summary", "symbols", "contract"]), at, failures)) return;
      checkLocalId(entry.id, `${at}.id`, failures);
      if (!SURFACE_KINDS.has(entry.kind)) failures.push(`${at}.kind: unknown surface kind`);
      if (!nonEmpty(entry.path) || !pathIsSafe(entry.path)) failures.push(`${at}.path: expected a safe path relative to the unit`);
      if (!nonEmpty(entry.summary)) failures.push(`${at}.summary: expected a non-empty CommonMark string`);
      checkStringList(entry.symbols, `${at}.symbols`, failures, { unique: true });
      if (checkKeys(entry.contract, ["accepts", "returns", "fails", "guarantees"], new Set(["accepts", "returns", "fails", "guarantees"]), `${at}.contract`, failures)) {
        for (const key of ["accepts", "returns", "fails", "guarantees"]) {
          checkStringList(entry.contract[key], `${at}.contract.${key}`, failures);
        }
      }
    });
    if (contract.kind !== "repository" && !contract.surface.length) {
      failures.push(`${source}.surface: every non-repository boundary must publish at least one surface`);
    }
  }

  if (!Array.isArray(contract.invariants)) {
    failures.push(`${source}.invariants: expected an array`);
  } else {
    checkUniqueIds(contract.invariants, `${source}.invariants`, failures);
    contract.invariants.forEach((entry, index) => {
      const at = `${source}.invariants[${index}]`;
      if (!checkKeys(entry, ["id", "statement", "verification"], new Set(["id", "statement", "verification", "debt"]), at, failures)) return;
      if (!nonEmpty(entry.id) || !INVARIANT_ID.test(entry.id)) failures.push(`${at}.id: expected an upper-case invariant identifier`);
      if (!nonEmpty(entry.statement)) failures.push(`${at}.statement: expected a non-empty CommonMark string`);
      checkStringList(entry.verification, `${at}.verification`, failures, { unique: true });
      if (Array.isArray(entry.verification) && !entry.verification.length && !("debt" in entry)) {
        failures.push(`${at}: an invariant needs verification or an explicit debt record`);
      }
      if ("debt" in entry && checkKeys(entry.debt, ["reason"], new Set(["reason", "trackedBy"]), `${at}.debt`, failures)) {
        if (!nonEmpty(entry.debt.reason)) failures.push(`${at}.debt.reason: expected a non-empty explanation`);
        if ("trackedBy" in entry.debt && !nonEmpty(entry.debt.trackedBy)) failures.push(`${at}.debt.trackedBy: expected a non-empty string`);
      }
    });
  }

  if (
    checkKeys(
      contract.relations,
      ["parent", "composition", "children", "dependencies"],
      new Set(["parent", "composition", "children", "dependencies"]),
      `${source}.relations`,
      failures,
    )
  ) {
    if (contract.relations.parent !== null) checkContractRef(contract.relations.parent, `${source}.relations.parent`, failures);
    if (!new Set(["leaf", "composed", "unmapped"]).has(contract.relations.composition)) failures.push(`${source}.relations.composition: expected \`leaf\`, \`composed\`, or \`unmapped\``);
    for (const key of ["children", "dependencies"]) {
      if (!Array.isArray(contract.relations[key])) {
        failures.push(`${source}.relations.${key}: expected an array`);
      } else {
        contract.relations[key].forEach((entry, index) => checkContractRef(entry, `${source}.relations.${key}[${index}]`, failures));
        const refs = contract.relations[key].map((entry) => entry?.contract).filter(Boolean);
        if (new Set(refs).size !== refs.length) failures.push(`${source}.relations.${key}: contract references must be unique`);
      }
    }
  }

  checkStringList(contract.rules, `${source}.rules`, failures, { unique: true });
  if (Array.isArray(contract.rules)) {
    contract.rules.forEach((rule, index) => {
      if (!RULE_ID.test(rule)) failures.push(`${source}.rules[${index}]: invalid binding rule ID \`${rule}\``);
    });
  }

  if (!Array.isArray(contract.verification)) {
    failures.push(`${source}.verification: expected an array`);
  } else {
    checkUniqueIds(contract.verification, `${source}.verification`, failures);
    contract.verification.forEach((entry, index) => {
      const at = `${source}.verification[${index}]`;
      if (!checkKeys(entry, ["id", "command", "covers"], new Set(["id", "command", "covers"]), at, failures)) return;
      checkLocalId(entry.id, `${at}.id`, failures);
      if (!nonEmpty(entry.command)) failures.push(`${at}.command: expected a non-empty command`);
      checkStringList(entry.covers, `${at}.covers`, failures, { unique: true });
    });
  }

  if (!Array.isArray(contract.routes)) {
    failures.push(`${source}.routes: expected an array`);
  } else {
    checkUniqueIds(contract.routes, `${source}.routes`, failures);
    contract.routes.forEach((entry, index) => {
      const at = `${source}.routes[${index}]`;
      if (!checkKeys(entry, ["id", "when", "contracts"], new Set(["id", "when", "contracts"]), at, failures)) return;
      checkLocalId(entry.id, `${at}.id`, failures);
      checkStringList(entry.when, `${at}.when`, failures, { unique: true });
      checkStringList(entry.contracts, `${at}.contracts`, failures, { unique: true });
      if (Array.isArray(entry.when) && !entry.when.length) failures.push(`${at}.when: expected at least one routing phrase`);
      if (Array.isArray(entry.contracts) && !entry.contracts.length) failures.push(`${at}.contracts: expected at least one contract reference`);
      for (const ref of entry.contracts ?? []) {
        if (!CONTRACT_REF.test(ref) || ref.includes("..")) failures.push(`${at}.contracts: invalid contract path \`${ref}\``);
      }
    });
  }

  if (checkKeys(contract.agent, ["readFirst", "beforeChange"], new Set(["readFirst", "beforeChange"]), `${source}.agent`, failures)) {
    checkStringList(contract.agent.readFirst, `${source}.agent.readFirst`, failures);
    checkStringList(contract.agent.beforeChange, `${source}.agent.beforeChange`, failures);
  }
  if ("assumptions" in contract) checkStringList(contract.assumptions, `${source}.assumptions`, failures);
  if ("exceptions" in contract) {
    if (!Array.isArray(contract.exceptions)) failures.push(`${source}.exceptions: expected an array`);
    else contract.exceptions.forEach((entry, index) => {
      const at = `${source}.exceptions[${index}]`;
      if (!checkKeys(entry, ["rule", "reason", "approvedBy"], new Set(["rule", "reason", "approvedBy", "expires"]), at, failures)) return;
      if (!EXCEPTION_RULE_ID.test(entry.rule)) failures.push(`${at}.rule: invalid binding rule ID`);
      if (!nonEmpty(entry.reason)) failures.push(`${at}.reason: expected a non-empty explanation`);
      if (!nonEmpty(entry.approvedBy)) failures.push(`${at}.approvedBy: expected a non-empty owner`);
      if ("expires" in entry && !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) failures.push(`${at}.expires: expected YYYY-MM-DD`);
    });
  }
  if ("extensions" in contract && !object(contract.extensions)) failures.push(`${source}.extensions: expected an object`);

  return failures;
}

/** Discover canonical contract files without walking dependencies. */
export function discoverContractFiles(repoRoot) {
  const contracts = [];
  const walk = (dir) => {
    const contract = path.join(dir, CONTRACT_FILENAME);
    if (exists(contract)) contracts.push(contract);

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRECTORIES.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;
      walk(path.join(dir, entry.name));
    }
  };
  walk(repoRoot);
  return { contracts: contracts.sort() };
}

export function loadContract(file, { repoRoot = path.dirname(file), validate = true } = {}) {
  let contract;
  try {
    contract = parseContractYaml(fs.readFileSync(file, "utf8"), {
      source: posix(path.relative(repoRoot, file)),
    });
  } catch (error) {
    if (error instanceof ContractGraphError) throw error;
    throw new ContractGraphError(`${posix(path.relative(repoRoot, file))}: ${error.message}`);
  }
  if (validate) {
    const relative = posix(path.relative(repoRoot, file));
    const failures = validateContract(contract, { source: relative });
    if (failures.length) throw new ContractGraphError(failures.join("\n"));
  }
  return contract;
}

function isDescendant(parent, child) {
  return parent === "." ? child !== "." : child.startsWith(`${parent}/`);
}

const TECHNICAL_LAYER_NAMES = new Set([
  "controller",
  "controllers",
  "service",
  "services",
  "repository",
  "repositories",
  "model",
  "models",
]);

const MISCELLANEOUS_NAMES = new Set([
  "common",
  "shared",
  "utils",
  "helpers",
  "util",
  "helper",
]);

function normalizeOwns(value) {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function unitBasename(unit) {
  if (!unit || unit === ".") return "";
  const parts = String(unit).split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function isTechnicalLayerLabel(value) {
  return TECHNICAL_LAYER_NAMES.has(String(value).trim().toLowerCase());
}

function isMiscellaneousLabel(value) {
  return MISCELLANEOUS_NAMES.has(String(value).trim().toLowerCase());
}

/** Load and validate the repository's complete composition graph. */
export function loadContractGraph(
  repoRoot,
  { throwOnError = false, checkSurfacePaths = true, hierarchy = DEFAULT_BOUNDARY_HIERARCHY } = {},
) {
  const root = path.resolve(repoRoot);
  const found = discoverContractFiles(root);
  const failures = [];
  const records = [];

  for (const file of found.contracts) {
    const relative = posix(path.relative(root, file));
    let contract;
    try {
      contract = parseContractYaml(fs.readFileSync(file, "utf8"), { source: relative });
    } catch (error) {
      failures.push(error instanceof ContractGraphError ? error.message : `${relative}: ${error.message}`);
      continue;
    }
    const local = validateContract(contract, { source: relative });
    failures.push(...local);
    if (!local.length) records.push({ file, relative, contract });
  }

  const byId = new Map();
  const byFile = new Map();
  const byUnit = new Map();
  for (const record of records) {
    const { contract, relative } = record;
    if (byId.has(contract.id)) failures.push(`${relative}: duplicate contract id \`${contract.id}\` also used by ${byId.get(contract.id).relative}`);
    else byId.set(contract.id, record);
    if (byUnit.has(contract.unit)) failures.push(`${relative}: duplicate governed unit \`${contract.unit}\` also used by ${byUnit.get(contract.unit).relative}`);
    else byUnit.set(contract.unit, record);
    byFile.set(relative, record);

    const expected = contractPathForUnit(contract.unit);
    if (relative !== expected) failures.push(`${relative}: unit \`${contract.unit}\` requires the contract at \`${expected}\``);
    if (checkSurfacePaths) {
      for (const surface of contract.surface) {
        const target = path.join(root, contract.unit === "." ? "" : contract.unit, surface.path);
        if (!exists(target)) failures.push(`${relative}: surface \`${surface.id}\` points to missing path \`${surface.path}\``);
      }
    }
  }

  const rootRecord = byFile.get(CONTRACT_FILENAME) ?? null;
  if (!rootRecord) failures.push(`missing root contract: ${CONTRACT_FILENAME}`);
  if (rootRecord && rootRecord.contract.kind !== "repository") failures.push(`${CONTRACT_FILENAME}: root contract kind must be \`repository\``);

  const resolve = (from, ref, at) => {
    const target = byFile.get(ref);
    if (!target) failures.push(`${from.relative}: ${at} references missing contract \`${ref}\``);
    return target ?? null;
  };

  for (const record of records) {
    const contract = record.contract;
    const isRoot = record.relative === CONTRACT_FILENAME;
    if (isRoot && contract.relations.parent !== null) failures.push(`${record.relative}: repository root must have a null parent`);
    if (!isRoot && contract.relations.parent === null) failures.push(`${record.relative}: every non-root contract must name its parent`);
    if (!isRoot && contract.kind === "repository") failures.push(`${record.relative}: only the root contract may use kind \`repository\``);
    const children = contract.relations.children;
    if (contract.relations.composition === "leaf" && children.length) failures.push(`${record.relative}: a leaf contract cannot declare children`);
    if (contract.relations.composition === "composed" && !children.length) failures.push(`${record.relative}: a composed contract must declare at least one child`);
    if (contract.relations.composition === "unmapped") {
      if (!isRoot) failures.push(`${record.relative}: only a repository root awaiting brownfield warmup may be unmapped`);
      if (children.length) failures.push(`${record.relative}: an unmapped root cannot declare children`);
    }

    if (contract.relations.parent) {
      const parent = resolve(record, contract.relations.parent.contract, "parent");
      if (parent) {
        if (!isDescendant(parent.contract.unit, contract.unit)) failures.push(`${record.relative}: unit \`${contract.unit}\` is not beneath parent unit \`${parent.contract.unit}\``);
        if (!(hierarchy[parent.contract.kind] ?? []).includes(contract.kind)) {
          failures.push(
            `${record.relative}: boundary kind \`${contract.kind}\` is not permitted beneath ` +
              `\`${parent.contract.kind}\``,
          );
        }
        const reciprocal = parent.contract.relations.children.some((child) => child.contract === record.relative);
        if (!reciprocal) failures.push(`${record.relative}: parent ${parent.relative} does not declare this contract as a child`);
      }
    }
    for (const [index, childRef] of children.entries()) {
      const child = resolve(record, childRef.contract, `children[${index}]`);
      if (!child) continue;
      if (child.relative === record.relative) failures.push(`${record.relative}: a contract cannot be its own child`);
      const parentRef = child.contract.relations.parent?.contract;
      if (parentRef !== record.relative) failures.push(`${record.relative}: child ${child.relative} names ${parentRef ?? "no parent"} instead`);
    }
    for (const [index, dependency] of contract.relations.dependencies.entries()) {
      const target = resolve(record, dependency.contract, `dependencies[${index}]`);
      if (target?.relative === record.relative) failures.push(`${record.relative}: a contract cannot depend on itself`);
    }
    for (const route of contract.routes) {
      for (const ref of route.contracts) resolve(record, ref, `route \`${route.id}\``);
    }

    const invariants = new Map(contract.invariants.map((entry) => [entry.id, entry]));
    const verification = new Map(contract.verification.map((entry) => [entry.id, entry]));
    for (const invariant of contract.invariants) {
      for (const verifyId of invariant.verification) {
        const check = verification.get(verifyId);
        if (!check) failures.push(`${record.relative}: invariant \`${invariant.id}\` names unknown verification \`${verifyId}\``);
        else if (!check.covers.includes(invariant.id)) failures.push(`${record.relative}: verification \`${verifyId}\` does not reciprocally cover invariant \`${invariant.id}\``);
      }
    }
    for (const check of contract.verification) {
      for (const invariantId of check.covers) {
        const invariant = invariants.get(invariantId);
        if (!invariant) failures.push(`${record.relative}: verification \`${check.id}\` covers unknown invariant \`${invariantId}\``);
        else if (!invariant.verification.includes(check.id)) failures.push(`${record.relative}: invariant \`${invariantId}\` does not reciprocally name verification \`${check.id}\``);
      }
    }
  }

  if (rootRecord) {
    const visiting = new Set();
    const visited = new Set();
    const walk = (record) => {
      if (visiting.has(record.relative)) {
        failures.push(`${record.relative}: composition cycle detected`);
        return;
      }
      if (visited.has(record.relative)) return;
      visiting.add(record.relative);
      for (const ref of record.contract.relations.children) {
        const child = byFile.get(ref.contract);
        if (child) walk(child);
      }
      visiting.delete(record.relative);
      visited.add(record.relative);
    };
    walk(rootRecord);
    for (const record of records) {
      if (!visited.has(record.relative)) failures.push(`${record.relative}: contract is not reachable from the repository root through child edges`);
    }
  }

  const dependencyVisiting = new Set();
  const dependencyVisited = new Set();
  const dependencyWalk = (record) => {
    if (dependencyVisiting.has(record.relative)) {
      failures.push(`${record.relative}: dependency cycle detected`);
      return;
    }
    if (dependencyVisited.has(record.relative)) return;
    dependencyVisiting.add(record.relative);
    for (const ref of record.contract.relations.dependencies) {
      const dependency = byFile.get(ref.contract);
      if (dependency) dependencyWalk(dependency);
    }
    dependencyVisiting.delete(record.relative);
    dependencyVisited.add(record.relative);
  };
  for (const record of records) dependencyWalk(record);

  const ownedBy = new Map();
  for (const record of records) {
    const owns = record.contract.responsibilities?.owns?.[0];
    if (owns) {
      const key = normalizeOwns(owns);
      if (key) {
        const previous = ownedBy.get(key);
        if (previous) {
          failures.push(`${record.relative}: owned responsibility is already declared by ${previous}`);
        } else {
          ownedBy.set(key, record.relative);
        }
      }
    }

    const parentRef = record.contract.relations.parent?.contract;
    const parent = parentRef ? byFile.get(parentRef) : null;
    const labels = [record.contract.id, record.contract.name, unitBasename(record.contract.unit)];
    if (
      parent?.contract.kind === "repository" &&
      record.contract.kind === "module" &&
      labels.some(isTechnicalLayerLabel)
    ) {
      failures.push(`${record.relative}: top-level module is named as a horizontal technical layer`);
    }
    if (record.contract.kind !== "repository" && labels.some(isMiscellaneousLabel)) {
      failures.push(`${record.relative}: boundary is named as a miscellaneous bag rather than a responsibility`);
    }
  }

  const result = { repoRoot: root, root: rootRecord, records, byId, byFile, byUnit, failures };
  if (throwOnError && failures.length) throw new ContractGraphError(failures.join("\n"));
  return result;
}

export function findContract(graph, selector = null) {
  if (!selector) return graph.root;
  const normalized = posix(selector).replace(/^\.\//, "").replace(/\/$/, "") || ".";
  return graph.byId.get(selector) ?? graph.byUnit.get(normalized) ?? graph.byFile.get(normalized) ?? null;
}

function section(title, values) {
  if (!values.length) return `## ${title}\n\nNone.`;
  return `## ${title}\n\n${values.map((value) => `- ${value}`).join("\n")}`;
}

/** Render a deterministic human view. The YAML file remains the source of truth. */
export function renderContract(record) {
  const c = record.contract ?? record;
  const lines = [
    `# ${c.name}`,
    "",
    `> ${c.summary}`,
    "",
    `Contract \`${c.id}\` · ${c.kind} · unit \`${c.unit}\` · schema ${c.contractVersion}`,
    "",
    "## Purpose",
    "",
    c.purpose,
    "",
    section("Owns", c.responsibilities.owns),
    "",
    section("Allows", c.responsibilities.allows),
    "",
    section("Forbids", c.responsibilities.forbids),
    "",
    section(
      "Public surface",
      c.surface.map((item) => {
        const behavior = [
          item.contract.accepts.length ? `Accepts: ${item.contract.accepts.join("; ")}.` : "",
          item.contract.returns.length ? `Returns: ${item.contract.returns.join("; ")}.` : "",
          item.contract.fails.length ? `Fails: ${item.contract.fails.join("; ")}.` : "",
          item.contract.guarantees.length ? `Guarantees: ${item.contract.guarantees.join("; ")}.` : "",
        ].filter(Boolean).join(" ");
        return `\`${item.id}\` (${item.kind}) — \`${item.path}\`${item.symbols.length ? `; ${item.symbols.map((s) => `\`${s}\``).join(", ")}` : ""}. ${item.summary}${behavior ? ` ${behavior}` : ""}`;
      }),
    ),
    "",
    section(
      "Invariants",
      c.invariants.map((item) => `\`${item.id}\` — ${item.statement}${item.verification.length ? ` Verify: ${item.verification.map((id) => `\`${id}\``).join(", ")}.` : ` Debt: ${item.debt?.reason ?? "unverified"}.`}`),
    ),
    "",
    section(
      "Children",
      c.relations.children.map((item) => `\`${item.contract}\` — ${item.uses}`),
    ),
    "",
    section(
      "Dependencies",
      c.relations.dependencies.map((item) => `\`${item.contract}\` — ${item.uses}`),
    ),
    "",
    section("Binding rules", c.rules.map((rule) => `\`${rule}\``)),
    "",
    section(
      "Verification",
      c.verification.map((item) => `\`${item.id}\`: \`${item.command}\` (covers ${item.covers.map((id) => `\`${id}\``).join(", ") || "contract shape"})`),
    ),
    "",
    section("Read first", c.agent.readFirst),
    "",
    section("Before change", c.agent.beforeChange),
  ];
  if (c.assumptions?.length) lines.push("", section("Assumptions", c.assumptions));
  if (c.exceptions?.length) lines.push("", section("Exceptions", c.exceptions.map((item) => `\`${item.rule}\` — ${item.reason} (approved by ${item.approvedBy})`)));
  return `${lines.join("\n")}\n`;
}

export function parentChain(graph, record) {
  const chain = [];
  const seen = new Set();
  let current = record;
  while (current && !seen.has(current.relative)) {
    chain.unshift(current);
    seen.add(current.relative);
    const parent = current.contract.relations.parent?.contract;
    current = parent ? graph.byFile.get(parent) : null;
  }
  return chain;
}

export function contractContext(graph, record, rules = new Map()) {
  const chain = parentChain(graph, record);
  const ruleIds = [
    ...new Set([
      ...[...rules.keys()].filter((rule) => /^A\d/.test(rule)),
      ...chain.flatMap((item) => item.contract.rules),
    ]),
  ];
  return {
    contract: record,
    ancestors: chain.slice(0, -1),
    children: record.contract.relations.children.map((ref) => graph.byFile.get(ref.contract)).filter(Boolean),
    dependencies: record.contract.relations.dependencies.map((ref) => graph.byFile.get(ref.contract)).filter(Boolean),
    rules: ruleIds.map((id) => ({ id, text: rules.get(id) ?? null })),
  };
}

export function renderContext(context) {
  const trail = [...context.ancestors, context.contract].map((record) => `\`${record.contract.id}\``).join(" → ");
  const parts = [`# Contract context: ${context.contract.contract.name}`, "", `Path: ${trail}`, "", renderContract(context.contract).trimEnd()];
  if (context.rules.length) parts.push("", section("Resolved rules", context.rules.map((rule) => `\`${rule.id}\` — ${rule.text ?? "definition unavailable"}`)));
  return `${parts.join("\n")}\n`;
}

export function routeContracts(graph, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches = [];
  for (const owner of graph.records) {
    for (const route of owner.contract.routes) {
      const matched = route.when.filter((phrase) => needle.includes(phrase.toLowerCase()));
      if (!matched.length) continue;
      matches.push({
        owner: owner.contract.id,
        route: route.id,
        score: matched.reduce((score, phrase) => score + phrase.length, 0),
        matched,
        contracts: route.contracts.map((ref) => graph.byFile.get(ref)).filter(Boolean),
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score || a.owner.localeCompare(b.owner) || a.route.localeCompare(b.route));
}

export function graphTree(graph) {
  const visit = (record) => ({
    id: record.contract.id,
    name: record.contract.name,
    kind: record.contract.kind,
    unit: record.contract.unit,
    contract: record.relative,
    children: record.contract.relations.children.map((ref) => graph.byFile.get(ref.contract)).filter(Boolean).map(visit),
  });
  return graph.root ? visit(graph.root) : null;
}

export function renderGraph(graph) {
  if (!graph.root) return "(no contract graph)\n";
  const lines = [];
  const visit = (record, prefix, last) => {
    lines.push(`${prefix}${prefix ? (last ? "└─ " : "├─ ") : ""}${record.contract.id} [${record.contract.kind}] — ${record.contract.unit}`);
    const children = record.contract.relations.children.map((ref) => graph.byFile.get(ref.contract)).filter(Boolean);
    children.forEach((child, index) => visit(child, `${prefix}${prefix ? (last ? "   " : "│  ") : ""}`, index === children.length - 1));
  };
  visit(graph.root, "", true);
  return `${lines.join("\n")}\n`;
}

export function renderMermaid(graph) {
  const lines = ["flowchart TD"];
  const node = (id) => `n_${id.replace(/[^A-Za-z0-9_]/g, "_")}`;
  for (const record of graph.records) {
    lines.push(`  ${node(record.contract.id)}[${JSON.stringify(`${record.contract.name}\\n${record.contract.unit}`)}]`);
    for (const ref of record.contract.relations.children) {
      const child = graph.byFile.get(ref.contract);
      if (child) lines.push(`  ${node(record.contract.id)} --> ${node(child.contract.id)}`);
    }
    for (const ref of record.contract.relations.dependencies) {
      const dependency = graph.byFile.get(ref.contract);
      if (dependency) lines.push(`  ${node(record.contract.id)} -.-> ${node(dependency.contract.id)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
