/** Shared principle vocabulary and family-specific catalog shape validation. */
export const PRINCIPLES_SCHEMA_ID = "https://contractgraph.dev/schema/principles-v1.schema.json";
export const PRINCIPLES_VERSION = "1.0";
export const FAMILY_BINDING = Object.freeze({ architecture: "global", engineering: "advisory", product: "scoped" });
export const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
export const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

export function exactKeys(value, required, at, failures, optional = []) {
  if (!object(value)) {
    failures.push(`${at}: expected an object`);
    return false;
  }
  for (const key of required) if (!(key in value)) failures.push(`${at}: missing \`${key}\``);
  for (const key of Object.keys(value)) {
    if (![...required, ...optional].includes(key)) failures.push(`${at}: unknown \`${key}\``);
  }
  return true;
}

export function validateCatalogHeader(catalog, family, source, failures, fields) {
  if (!exactKeys(catalog, ["$schema", "principlesVersion", "family", "binding", "principles", ...fields], source, failures)) return false;
  if (catalog.$schema !== PRINCIPLES_SCHEMA_ID) failures.push(`${source}.$schema: expected ${PRINCIPLES_SCHEMA_ID}; preview legacy conversion with cg migrate-principles`);
  if (catalog.principlesVersion !== PRINCIPLES_VERSION) failures.push(`${source}.principlesVersion: expected ${PRINCIPLES_VERSION}`);
  if (catalog.family !== family) failures.push(`${source}.family: expected ${family}`);
  if (catalog.binding !== FAMILY_BINDING[family]) failures.push(`${source}.binding: expected ${FAMILY_BINDING[family]}`);
  return true;
}

export function validatePrincipleText(entry, at, failures) {
  for (const key of ["statement", "reason"]) {
    if (!nonEmpty(entry[key])) failures.push(`${at}.${key}: expected a non-empty string`);
  }
  if ("cost" in entry && !nonEmpty(entry.cost)) failures.push(`${at}.cost: expected a non-empty string`);
}

/** E and P retain their named groups; all leaves use the same statement/reason vocabulary. */
export function validateGuidelineCatalog(catalog, family, { source = `${family}.yaml` } = {}) {
  const failures = [];
  const engineering = family === "engineering";
  if (!engineering && family !== "product") return [`${source}: expected engineering or product family`];
  if (!validateCatalogHeader(catalog, family, source, failures, engineering ? ["categories"] : [])) return failures;
  if (engineering && (!Array.isArray(catalog.categories) || catalog.categories.some((item) => !nonEmpty(item)) || new Set(catalog.categories).size !== catalog.categories.length)) {
    failures.push(`${source}.categories: expected unique non-empty strings`);
  }
  const categories = new Set(Array.isArray(catalog.categories) ? catalog.categories : []);
  if (!Array.isArray(catalog.principles)) return [...failures, `${source}.principles: expected an array`];
  const prefix = engineering ? "E" : "P";
  const groups = new Set();
  const entries = new Set();
  for (const [index, group] of catalog.principles.entries()) {
    const at = `${source}.principles[${index}]`;
    if (!exactKeys(group, ["id", "title", "entries", ...(engineering ? ["category"] : [])], at, failures)) continue;
    if (typeof group.id !== "string" || !new RegExp(`^${prefix}\\d{2}$`).test(group.id)) failures.push(`${at}.id: \`${group.id}\` does not belong in ${family}.yaml; expected ${prefix}nn`);
    if (groups.has(group.id)) failures.push(`${at}: defines \`${group.id}.\` more than once`);
    groups.add(group.id);
    if (!nonEmpty(group.title)) failures.push(`${at}.title: expected a non-empty string`);
    if (engineering && !categories.has(group.category)) failures.push(`${at}.category: expected one category declared by the catalog`);
    if (!Array.isArray(group.entries) || !group.entries.length) {
      failures.push(`${at}.entries: expected a non-empty array`);
      continue;
    }
    for (const [entryIndex, entry] of group.entries.entries()) {
      const entryAt = `${at}.entries[${entryIndex}]`;
      if (!exactKeys(entry, ["id", "statement", "reason"], entryAt, failures, engineering ? ["cost"] : [])) continue;
      if (typeof entry.id !== "string" || !new RegExp(`^${prefix}\\d{2}-\\d{2}$`).test(entry.id)) failures.push(`${entryAt}.id: \`${entry.id}\` does not belong in ${family}.yaml; expected ${prefix}nn-nn`);
      else if (!entry.id.startsWith(`${group.id}-`)) failures.push(`${entryAt}: \`${entry.id}\` does not belong under \`${group.id}\``);
      if (entries.has(entry.id)) failures.push(`${entryAt}: duplicate ${entry.id}`);
      entries.add(entry.id);
      validatePrincipleText(entry, entryAt, failures);
    }
  }
  return failures;
}
