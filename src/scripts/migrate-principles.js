/** Explicit, preview-first conversion of repository-owned legacy YAML catalogs. */
import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { parseContractYaml } from "./contracts.js";
import { FAMILY_BINDING, PRINCIPLES_SCHEMA_ID, PRINCIPLES_VERSION, nonEmpty, object, validateGuidelineCatalog } from "./catalog.js";
import { validateBindingCatalog } from "./binding.js";

const FILES = Object.freeze({
  architecture: ".agents/cg/principles/architecture.yaml",
  engineering: ".agents/cg/guidelines/engineering.yaml",
  product: ".agents/cg/guidelines/product.yaml",
});

function rename(map, oldKey, newKey, source) {
  if (!map.has(oldKey)) throw new Error(`${source}: missing legacy ${oldKey}`);
  if (map.has(newKey)) throw new Error(`${source}: both ${oldKey} and ${newKey} exist; reconcile explicitly`);
  // Rename the key in place so order, scalar style, and attached comments survive.
  map.items.find((pair) => pair.key.value === oldKey).key.value = newKey;
}

/** No writes occur unless every proposed catalog validates and every missing reason is supplied. */
export function migratePrinciples(repoRoot, { write = false, reasons = {}, families = Object.keys(FILES) } = {}) {
  if (!Array.isArray(families) || !families.length || new Set(families).size !== families.length || families.some(family => !Object.hasOwn(FILES, family))) {
    throw new Error("migration families must be distinct known principle families");
  }
  if (!object(reasons) || Object.values(reasons).some((reason) => !nonEmpty(reason))) {
    throw new Error("migration reasons must be a JSON object mapping principle IDs to non-empty rationale strings");
  }
  const result = { changed: [], unchanged: [], missingReasons: [], failures: [], written: [], backups: [], recoveryRequired: [] };
  const usedReasons = new Set();
  const pending = [];
  const observed = [];
  for (const [family, relative] of Object.entries(FILES)) {
    if (!families.includes(family)) continue;
    const file = path.join(repoRoot, relative);
    try {
      const original = fs.readFileSync(file, "utf8");
      observed.push({ file, relative, original });
      // Apply exactly the same restricted YAML policy as ordinary runtime loading.
      const data = parseContractYaml(original, { source: relative });
      const validate = (value) => family === "architecture"
        ? validateBindingCatalog(value, { source: relative })
        : validateGuidelineCatalog(value, family, { source: relative });
      if (data?.$schema === PRINCIPLES_SCHEMA_ID) {
        result.failures.push(...validate(data));
        result.unchanged.push(relative);
        continue;
      }
      const legacyId = `https://contractgraph.dev/schema/${family}-v1.schema.json`;
      const historicalId = `https://sarada.io/contract-graph/schema/${family}-v1.schema.json`;
      if (![legacyId, historicalId].includes(data?.$schema) || data?.[`${family}Version`] !== "1.0") {
        throw new Error(`${relative}: unsupported legacy schema/version; expected ${legacyId} and ${family}Version: "1.0"`);
      }
      const doc = parseDocument(original);
      rename(doc.contents, `${family}Version`, "principlesVersion", relative);
      doc.set("principlesVersion", PRINCIPLES_VERSION);
      doc.set("$schema", PRINCIPLES_SCHEMA_ID);
      // A partially converted legacy catalog is ambiguous; never silently replace authority.
      if (doc.has("family") || doc.has("binding")) throw new Error(`${relative}: legacy catalog already has family or binding; reconcile explicitly`);
      doc.set("family", family);
      doc.set("binding", FAMILY_BINDING[family]);
      if (family === "architecture") rename(doc.contents, "rules", "principles", relative);
      const principles = doc.get("principles", true);
      if (!Array.isArray(principles?.items)) throw new Error(`${relative}: expected a principles array`);
      const leaves = family === "architecture"
        ? principles.items
        : principles.items.flatMap((group) => {
          const entries = group?.get?.("entries", true);
          if (!Array.isArray(entries?.items)) throw new Error(`${relative}: expected grouped entries`);
          return entries.items;
        });
      for (const entry of leaves) {
        if (!entry?.has) throw new Error(`${relative}: expected a principle object`);
        const id = entry.get("id");
        rename(entry, family === "product" ? "text" : "rule", "statement", `${relative}:${id}`);
        if (!entry.has("reason")) {
          if (Object.hasOwn(reasons, id)) {
            entry.set("reason", reasons[id]);
            usedReasons.add(id);
          } else {
            result.missingReasons.push({ file: relative, id, statement: entry.get("statement") });
          }
        }
      }
      const text = doc.toString({ lineWidth: 0 });
      result.failures.push(...validate(parseContractYaml(text, { source: relative })));
      result.changed.push({ file: relative, text });
      pending.push({ file, relative, original, text });
    } catch (error) {
      result.failures.push(error.message);
    }
  }
  for (const id of Object.keys(reasons)) {
    if (!usedReasons.has(id)) result.failures.push(`reason ${id} is unused; reasons may only fill missing rationale on legacy entries`);
  }
  if (!write || result.failures.length) return result;

  // Preflight every destination before creating backups or replacing any catalog.
  for (const item of pending) {
    item.backup = `${item.file}.pre-principles-v1.bak`;
    try {
      if (fs.lstatSync(item.file).isSymbolicLink()) result.failures.push(`${item.relative}: refusing to replace a symbolic link`);
      if (fs.existsSync(item.backup)) result.failures.push(`${item.relative}: backup already exists at ${item.backup}; retain or move it before retrying`);
      if (fs.readFileSync(item.file, "utf8") !== item.original) result.failures.push(`${item.relative}: changed during migration; preview again`);
    } catch (error) {
      result.failures.push(`${item.relative}: preflight failed: ${error.message}`);
    }
  }
  if (result.failures.length) return result;
  const staged = [];
  try {
    for (const item of pending) {
      fs.writeFileSync(item.backup, item.original, { flag: "wx", mode: fs.statSync(item.file).mode });
      result.backups.push(`${item.relative}.pre-principles-v1.bak`);
      item.tempDir = fs.mkdtempSync(path.join(path.dirname(item.file), ".cg-principles-"));
      staged.push(item);
      item.temp = path.join(item.tempDir, "catalog.yaml");
      fs.writeFileSync(item.temp, item.text, { mode: fs.statSync(item.file).mode });
    }
    // Even already-converted catalogs participated in validation; do not ignore their edits.
    for (const item of observed) {
      if (fs.readFileSync(item.file, "utf8") !== item.original) throw new Error(`${item.relative}: changed during migration; preview again`);
    }
    for (const item of staged) {
      if (fs.readFileSync(item.file, "utf8") !== item.original) throw new Error(`${item.relative}: changed during migration; preview again`);
      fs.renameSync(item.temp, item.file);
      result.written.push(item.relative);
    }
  } catch (error) {
    result.failures.push(`migration failed: ${error.message}; original bytes remain in the reported backups`);
    // Recover our replacements; never undo a concurrent edit.
    for (const item of staged) {
      if (!result.written.includes(item.relative)) continue;
      try {
        if (fs.readFileSync(item.file, "utf8") !== item.text) throw new Error("concurrent edit preserved");
        fs.writeFileSync(item.file, item.original);
        result.written = result.written.filter(file => file !== item.relative);
      } catch (restoreError) {
        result.failures.push(`${item.relative}: automatic restore failed: ${restoreError.message}; recover from ${item.backup}`);
        result.recoveryRequired.push(item.relative);
      }
    }
  } finally {
    for (const item of staged) {
      try { fs.rmSync(item.tempDir, { recursive: true, force: true }); }
      catch (error) { result.failures.push(`could not remove temporary directory ${item.tempDir}: ${error.message}`); }
    }
  }
  return result;
}
