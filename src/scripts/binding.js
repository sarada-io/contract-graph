/** Load and validate the structural rules enforced by the installed Contract Graph verifier. */

import fs from "node:fs";
import path from "node:path";

import { ContractGraphError, parseContractYaml } from "./contracts.js";

export const BINDING_SCHEMA_ID =
  "https://sarada.io/contract-graph/schema/architecture-v1.schema.json";
export const BINDING_VERSION = "1.0";
export const BINDING_FILENAME = ".agents/cg/principles/architecture.yaml";

export const BUILT_IN_DETECTORS = Object.freeze({
  "A01-E-01": ["cg.verify.contract-node-format", "contract YAML rejects ambiguous or executable YAML features"],
  "A02-E-01": ["cg.verify.contract-node-location", "a contract stored outside its declared unit fails"],
  "A03-E-01": ["cg.verify.single-responsibility", "a contract with multiple owned responsibilities fails"],
  "A04-E-01": ["cg.verify.boundary-hierarchy", "a forbidden parent-child boundary transition fails"],
  "A05-E-01": ["cg.verify.composition-state", "a composed contract with no children fails verification"],
  "A06-E-01": ["cg.verify.composition-tree", "composition cycles are rejected"],
  "A07-E-01": ["cg.verify.child-confinement", "a child unit outside its parent fails"],
  "A08-E-01": ["cg.verify.dependency-reference", "a dangling dependency reference fails"],
  "A09-E-01": ["cg.verify.dependency-acyclicity", "dependency cycles are rejected"],
  "A10-E-01": ["cg.verify.surface-presence", "a non-root contract without a public surface fails"],
  "A11-E-01": ["cg.verify.surface-path", "declared surface paths must exist inside their unit"],
  "A12-E-01": ["cg.verify.invariant-verification", "invariant and verification references must agree in both directions"],
  "A13-E-01": ["cg.verify.binding-enforcement", "an unregistered binding detector fails verification"],
  "A14-E-01": ["cg.verify.unique-responsibility", "duplicate owned responsibilities across contracts fail"],
  "A15-E-01": ["cg.verify.capability-modules", "a top-level module named as a technical layer fails"],
  "A16-E-01": ["cg.verify.named-responsibility", "a boundary named common, shared, utils, or helpers fails"],
});

export class BindingError extends Error {}

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const exactKeys = (value, required, at, failures) => {
  if (!object(value)) {
    failures.push(`${at}: expected an object`);
    return false;
  }
  const allowed = new Set(required);
  for (const key of required) if (!(key in value)) failures.push(`${at}: missing \`${key}\``);
  for (const key of Object.keys(value)) if (!allowed.has(key)) failures.push(`${at}: unknown \`${key}\``);
  return true;
};

/** Validate the catalog and its exact correspondence with detectors built into this package. */
export function validateBindingCatalog(catalog, { source = "rules.yaml" } = {}) {
  const failures = [];
  if (!exactKeys(catalog, ["$schema", "architectureVersion", "scope", "promise", "promotion", "hierarchy", "graph", "rules"], source, failures)) {
    return failures;
  }
  if (catalog.$schema !== BINDING_SCHEMA_ID) failures.push(`${source}.$schema: expected ${BINDING_SCHEMA_ID}`);
  if (catalog.architectureVersion !== BINDING_VERSION) failures.push(`${source}.architectureVersion: expected ${BINDING_VERSION}`);
  if (catalog.scope !== "structural-integrity") failures.push(`${source}.scope: expected structural-integrity`);
  if (!nonEmpty(catalog.promise)) failures.push(`${source}.promise: expected a non-empty string`);
  if (exactKeys(catalog.promotion, ["requires", "action"], `${source}.promotion`, failures)) {
    const required = ["structural-impact", "deterministic-measure", "blocking-detector", "negative-fixture"];
    if (!Array.isArray(catalog.promotion.requires) || catalog.promotion.requires.join(",") !== required.join(",")) {
      failures.push(`${source}.promotion.requires: expected ${required.join(", ")}`);
    }
    if (!nonEmpty(catalog.promotion.action)) failures.push(`${source}.promotion.action: expected a non-empty string`);
  }

  const kinds = ["repository", "module", "submodule", "component", "library"];
  if (exactKeys(catalog.hierarchy, ["root", "kinds", "transitions"], `${source}.hierarchy`, failures)) {
    if (catalog.hierarchy.root !== "repository") failures.push(`${source}.hierarchy.root: expected repository`);
    if (exactKeys(catalog.hierarchy.kinds, kinds, `${source}.hierarchy.kinds`, failures)) {
      for (const kind of kinds) {
        if (!nonEmpty(catalog.hierarchy.kinds[kind])) {
          failures.push(`${source}.hierarchy.kinds.${kind}: expected a non-empty string`);
        }
      }
    }
    if (exactKeys(catalog.hierarchy.transitions, kinds, `${source}.hierarchy.transitions`, failures)) {
      for (const kind of kinds) {
        const children = catalog.hierarchy.transitions[kind];
        if (!Array.isArray(children) || children.some((child) => !kinds.includes(child))) {
          failures.push(`${source}.hierarchy.transitions.${kind}: expected an array of registered kinds`);
        } else if (new Set(children).size !== children.length) {
          failures.push(`${source}.hierarchy.transitions.${kind}: kinds must be unique`);
        }
      }
    }
  }

  const decideIds = ["stay", "add-child", "elsewhere"];
  const graphKeys = ["node", "recurse", "selfSufficient", "surface", "decide", "compose", "stop", "forbid", "adapters"];
  if (exactKeys(catalog.graph, graphKeys, `${source}.graph`, failures)) {
    if (!nonEmpty(catalog.graph.node)) failures.push(`${source}.graph.node: expected a non-empty string`);
    if (!nonEmpty(catalog.graph.recurse)) failures.push(`${source}.graph.recurse: expected a non-empty string`);
    if (exactKeys(catalog.graph.selfSufficient, ["test", "inbound", "outbound", "change"], `${source}.graph.selfSufficient`, failures)) {
      for (const key of ["test", "inbound", "outbound", "change"]) {
        if (!nonEmpty(catalog.graph.selfSufficient[key])) {
          failures.push(`${source}.graph.selfSufficient.${key}: expected a non-empty string`);
        }
      }
    }
    if (exactKeys(catalog.graph.surface, ["enter", "service", "promise", "encapsulate", "bypass"], `${source}.graph.surface`, failures)) {
      for (const key of ["enter", "service", "promise", "encapsulate", "bypass"]) {
        if (!nonEmpty(catalog.graph.surface[key])) {
          failures.push(`${source}.graph.surface.${key}: expected a non-empty string`);
        }
      }
    }
    if (!Array.isArray(catalog.graph.decide) || catalog.graph.decide.length !== decideIds.length) {
      failures.push(`${source}.graph.decide: expected ${decideIds.join(", ")}`);
    } else {
      const seen = new Set();
      for (const [index, entry] of catalog.graph.decide.entries()) {
        const at = `${source}.graph.decide[${index}]`;
        if (!exactKeys(entry, ["id", "when", "do"], at, failures)) continue;
        if (!decideIds.includes(entry.id)) failures.push(`${at}.id: expected one of ${decideIds.join(", ")}`);
        else if (seen.has(entry.id)) failures.push(`${at}.id: duplicate ${entry.id}`);
        else seen.add(entry.id);
        if (!nonEmpty(entry.when)) failures.push(`${at}.when: expected a non-empty string`);
        if (!nonEmpty(entry.do)) failures.push(`${at}.do: expected a non-empty string`);
      }
      for (const id of decideIds) {
        if (!seen.has(id)) failures.push(`${source}.graph.decide: missing \`${id}\``);
      }
    }
    for (const list of ["compose", "stop", "forbid"]) {
      if (
        !Array.isArray(catalog.graph[list]) ||
        !catalog.graph[list].length ||
        catalog.graph[list].some((item) => !nonEmpty(item))
      ) {
        failures.push(`${source}.graph.${list}: expected non-empty strings`);
      }
    }
    if (exactKeys(catalog.graph.adapters, ["port", "option", "mix"], `${source}.graph.adapters`, failures)) {
      for (const key of ["port", "option", "mix"]) {
        if (!nonEmpty(catalog.graph.adapters[key])) {
          failures.push(`${source}.graph.adapters.${key}: expected a non-empty string`);
        }
      }
    }
  }

  if (!Array.isArray(catalog.rules) || !catalog.rules.length) {
    failures.push(`${source}.rules: expected a non-empty array`);
    return failures;
  }
  const ruleIds = new Set();
  const detectorIds = new Set();
  for (const [index, rule] of catalog.rules.entries()) {
    const at = `${source}.rules[${index}]`;
    if (!exactKeys(rule, ["id", "rule", "measure", "enforcedBy"], at, failures)) continue;
    if (!/^A\d{2}$/.test(rule.id ?? "")) failures.push(`${at}.id: expected Ann`);
    else if (ruleIds.has(rule.id)) failures.push(`${at}.id: duplicate ${rule.id}`);
    else ruleIds.add(rule.id);
    if (!nonEmpty(rule.rule)) failures.push(`${at}.rule: expected a non-empty string`);
    if (!nonEmpty(rule.measure)) failures.push(`${at}.measure: expected a non-empty string`);
    if (!Array.isArray(rule.enforcedBy) || !rule.enforcedBy.length) {
      failures.push(`${at}.enforcedBy: expected at least one detector`);
      continue;
    }
    for (const [detectorIndex, detector] of rule.enforcedBy.entries()) {
      const detectorAt = `${at}.enforcedBy[${detectorIndex}]`;
      if (!exactKeys(detector, ["id", "implementation", "negativeFixture"], detectorAt, failures)) continue;
      if (!new RegExp(`^${rule.id}-E-\\d{2}$`).test(detector.id ?? "")) {
        failures.push(`${detectorAt}.id: expected an enforcement ID owned by ${rule.id}`);
      } else if (detectorIds.has(detector.id)) {
        failures.push(`${detectorAt}.id: duplicate ${detector.id}`);
      } else detectorIds.add(detector.id);
      const registered = BUILT_IN_DETECTORS[detector.id];
      if (!registered) failures.push(`${detectorAt}.id: detector is not registered by the installed verifier`);
      else if (detector.implementation !== registered[0]) {
        failures.push(`${detectorAt}.implementation: expected ${registered[0]}`);
      } else if (detector.negativeFixture !== registered[1]) {
        failures.push(`${detectorAt}.negativeFixture: expected ${registered[1]}`);
      }
    }
  }
  if (failures.some((item) => /\.graph: missing `(?:recurse|adapters|surface)`|\.graph\.surface: missing `service`|\.hierarchy: missing `kinds`/.test(item))) {
    failures.push(
      `${source}: installed catalog is older than this verifier; copy the packaged architecture catalog or amend it deliberately — cg init will not overwrite it`,
    );
  }
  return failures;
}

export function loadBindingCatalog(file, { repoRoot = path.dirname(file) } = {}) {
  let catalog;
  try {
    catalog = parseContractYaml(fs.readFileSync(file, "utf8"), {
      source: path.relative(repoRoot, file).split(path.sep).join("/"),
    });
  } catch (error) {
    if (error instanceof ContractGraphError) throw new BindingError(error.message);
    throw new BindingError(`${file}: ${error.message}`);
  }
  const failures = validateBindingCatalog(catalog, {
    source: path.relative(repoRoot, file).split(path.sep).join("/"),
  });
  if (failures.length) throw new BindingError(failures.join("\n"));
  return catalog;
}

export function loadCoreBindingRules(repoRoot) {
  const file = path.join(repoRoot, BINDING_FILENAME);
  if (!fs.existsSync(file)) throw new BindingError(`missing architecture catalog: ${BINDING_FILENAME}`);
  const catalog = loadBindingCatalog(file, { repoRoot });
  return new Map(catalog.rules.map((rule) => [rule.id, rule.rule]));
}
