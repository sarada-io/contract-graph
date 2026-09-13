/** Init's catalog refresh: release defaults for A/E, lossless P format conversion. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { migratePrinciples } from "./migrate-principles.js";
import { discoverContractFiles, parseContractYaml } from "./contracts.js";

const PRODUCT = ".agents/cg/guidelines/product.yaml";
const posix = value => value.split(path.sep).join("/");

/** Validate before any installer writes; no missing product rationale is fabricated. */
export function planInitCatalogs(repoRoot, defaults, reasons = {}) {
  repoRoot = path.resolve(repoRoot);
  const changes = [];
  const observe = (relative, text, action, expectedOriginal) => {
    const file = path.join(repoRoot, relative);
    if (!fs.existsSync(file)) return;
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`${relative}: refusing to update a symbolic link`);
    const original = fs.readFileSync(file, "utf8");
    if (expectedOriginal !== undefined && original !== expectedOriginal) throw new Error(`${relative}: changed during upgrade planning; retry init`);
    if (original === text) return;
    const hash = crypto.createHash("sha256").update(original).digest("hex");
    const backup = posix(path.join(".agents/cg/backups/init", hash, path.basename(relative)));
    changes.push({ file, relative, original, text, action, backup });
  };
  for (const { relative, text } of defaults) observe(relative, text, "refresh release defaults");
  if (fs.existsSync(path.join(repoRoot, PRODUCT))) {
    const original = fs.readFileSync(path.join(repoRoot, PRODUCT), "utf8");
    const migration = migratePrinciples(repoRoot, { reasons, families: ["product"] });
    if (migration.failures.length) {
      const missing = migration.missingReasons.map(item => `  ${item.id}: ${item.statement}`).join("\n");
      throw new Error(`cg init: product catalog migration blocked; no installation files were changed.\n${
        missing ? `Missing product rationale:\n${missing}\nSupply a JSON object mapping those IDs to their rationale, then rerun cg init --reasons <file>.\n` : ""
      }${migration.failures.join("\n")}`);
    }
    for (const item of migration.changed) observe(item.file, item.text, "migrate product format", original);
  } else if (Object.keys(reasons).length) {
    throw new Error("cg init: --reasons was supplied but there is no product catalog to migrate");
  }
  // Older installations used this exact schema host. Only the scalar declaration moves;
  // contract semantics, rule bindings, comments, formatting, and enforcement stay untouched.
  const metadata = discoverContractFiles(repoRoot).contracts.map(file => ({ file, family: "contract" }));
  metadata.push({ file: path.join(repoRoot, ".agents/cg/enforcement.yaml"), family: "enforcement" });
  for (const { file, family } of metadata) {
    if (!fs.existsSync(file)) continue;
    const original = fs.readFileSync(file, "utf8");
    const legacyId = `https://sarada.io/contract-graph/schema/${family}-v1.schema.json`;
    if (!original.includes(legacyId)) continue;
    const data = parseContractYaml(original, { source: file });
    if (data?.$schema !== legacyId || data?.[`${family}Version`] !== "1.0") continue;
    const scalar = parseDocument(original).get("$schema", true);
    const [start, end] = scalar.range;
    const text = original.slice(0, start) + JSON.stringify(`https://contractgraph.dev/schema/${family}-v1.schema.json`) + original.slice(end);
    observe(posix(path.relative(repoRoot, file)), text, "update legacy schema identity", original);
  }
  for (const change of changes) {
    const backup = path.join(repoRoot, change.backup);
    for (const destination of [change.file, backup]) {
      let cursor = destination;
      while (cursor !== repoRoot) {
        if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) {
          throw new Error(`${posix(path.relative(repoRoot, cursor))}: refusing to update through a symbolic link`);
        }
        const parent = path.dirname(cursor);
        if (parent === cursor) break;
        cursor = parent;
      }
    }
    if (fs.existsSync(backup) && fs.readFileSync(backup, "utf8") !== change.original) {
      throw new Error(`${change.backup}: existing backup differs; retain it and resolve before retrying init`);
    }
  }
  return changes;
}

/** Back up all changed catalogs first; roll back our replacements if applying one fails. */
export function applyInitCatalogs(repoRoot, changes) {
  const staged = [];
  const applied = [];
  try {
    for (const item of changes) {
      if (fs.readFileSync(item.file, "utf8") !== item.original) throw new Error(`${item.relative}: changed since preview`);
      const backup = path.join(repoRoot, item.backup);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      if (!fs.existsSync(backup)) fs.writeFileSync(backup, item.original, { flag: "wx", mode: fs.statSync(item.file).mode });
      else if (fs.readFileSync(backup, "utf8") !== item.original) throw new Error(`${item.backup}: backup changed since preview`);
      const directory = fs.mkdtempSync(path.join(path.dirname(item.file), ".cg-init-"));
      const temporary = path.join(directory, "catalog.yaml");
      staged.push({ ...item, directory, temporary });
      fs.writeFileSync(temporary, item.text, { mode: fs.statSync(item.file).mode });
    }
    for (const item of staged) {
      if (fs.readFileSync(item.file, "utf8") !== item.original) throw new Error(`${item.relative}: changed since preview`);
    }
    for (const item of staged) {
      if (fs.readFileSync(item.file, "utf8") !== item.original) throw new Error(`${item.relative}: changed during catalog update`);
      fs.renameSync(item.temporary, item.file);
      applied.push(item);
    }
  } catch (error) {
    const recovery = [];
    for (const item of applied.reverse()) {
      try {
        if (fs.readFileSync(item.file, "utf8") !== item.text) throw new Error("concurrent edit preserved");
        fs.writeFileSync(item.file, item.original);
      } catch (restoreError) {
        recovery.push(`${item.relative}: ${restoreError.message}; original at ${item.backup}`);
      }
    }
    throw new Error(`cg init: catalog update failed: ${error.message}. Any catalog backups created are under .agents/cg/backups/init/.${recovery.length ? `\nRecovery required:\n${recovery.join("\n")}` : ""}`);
  } finally {
    for (const item of staged) fs.rmSync(item.directory, { recursive: true, force: true });
  }
}
