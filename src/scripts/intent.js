/** Repository-owned intent and attributed approval. Digests prove freshness, not identity. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const INTENT_RECORD = ".agents/cg/intent.json";
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const text = value => typeof value === "string" && value.trim().length > 0;
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export const INTENT_SECTIONS = ["Purpose and audience", "Boundaries", "Variation", "Acceptance example", "Open questions", "Binding sources"];

/** No absolute/traversing paths or symlink escape, including a symlink in a parent directory. */
function localPath(root, relative) {
  if (!text(relative) || relative.includes("\\") || /[\x00-\x1f]/.test(relative) || path.isAbsolute(relative) || relative.split("/").some(p => !p || p === "." || p === "..")) throw new Error(`unsafe intent path: ${relative}`);
  const base = fs.realpathSync(root);
  const file = path.join(base, relative);
  let existing = file;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  const real = fs.realpathSync(existing);
  if (real !== base && !real.startsWith(base + path.sep)) throw new Error(`intent path escapes repository: ${relative}`);
  return file;
}

export function intentFile(root) {
  const profile = localPath(root, ".agents/cg/profile.json");
  const docs = fs.existsSync(profile) ? JSON.parse(fs.readFileSync(profile, "utf8")).docs ?? "docs" : "docs";
  const relative = `${docs}/project-intent.md`;
  localPath(root, relative);
  return relative;
}

function sections(markdown) {
  const result = new Map();
  let current = null, fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    }
    const heading = !fence && /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = heading[1];
      if (result.has(current)) throw new Error(`duplicate intent section: ${current}`);
      result.set(current, "");
    } else if (current) result.set(current, result.get(current) + line + "\n");
  }
  return result;
}

export function intentSnapshot(root) {
  const file = intentFile(root);
  const markdown = fs.readFileSync(localPath(root, file), "utf8");
  if (/\b(?:TODO|TBD)\b|Replace this (?:sentence|section)|\[Complete with owner\]/i.test(markdown)) throw new Error(`${file}: intent still contains placeholders`);
  const parts = sections(markdown);
  for (const name of INTENT_SECTIONS) if (!text(parts.get(name))) throw new Error(`${file}: missing or empty ${name}`);
  if (!/^none\.?\s*$/i.test(parts.get("Open questions").trim())) throw new Error(`${file}: resolve material Open questions before approval (write None when settled)`);
  const sources = parts.get("Binding sources").trim();
  const references = [];
  if (!/^none\.?$/i.test(sources)) {
    for (const line of sources.split("\n").filter(l => l.trim())) {
      const match = /^-\s+`([^`]+)`\s*$/.exec(line);
      if (!match) throw new Error(`${file}: Binding sources must be None or bullet-listed repository-relative paths in backticks`);
      const relative = match[1];
      if (relative === file || relative === INTENT_RECORD) throw new Error("intent cannot depend on its own approval or itself");
      references.push(relative);
    }
  }
  const files = [...new Set([file, ...references])].sort().map(relative => {
    const source = localPath(root, relative);
    if (!fs.statSync(source).isFile()) throw new Error(`intent source is not a file: ${relative}`);
    return { path: relative, hash: hash(fs.readFileSync(source)) };
  });
  return { file, files, snapshot: hash(JSON.stringify(files)) };
}

function readRecord(root, evidence) {
  const file = evidence ? path.resolve(root, evidence) : localPath(root, INTENT_RECORD);
  if (!fs.existsSync(file)) return null;
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  if (record?.version !== 1 || !digest(record.review?.snapshot)) throw new Error("invalid intent review record");
  if (record.approval && (!digest(record.approval.snapshot) || record.approval.snapshot !== record.review.snapshot || record.approval.scope !== "repository" || ![record.approval.by, record.approval.response, record.approval.at].every(text))) throw new Error("invalid attributed intent approval");
  return record;
}

export function intentStatus(root, { evidence } = {}) {
  try {
    const current = intentSnapshot(root);
    const record = readRecord(root, evidence);
    if (!record?.approval) return { ...current, ready: false, state: "approval-pending", reason: "Review project intent with the owner and record their actual approval." };
    if (record.approval.snapshot !== current.snapshot) return { ...current, ready: false, state: "review-required", reason: "Intent or a binding source changed since approval; review the current content." };
    return { ...current, ready: true, state: "confirmed", authority: "attributed", by: record.approval.by, reason: "Reviewed content matches attributed approval; this does not authenticate the owner or prove product conformance." };
  } catch (error) {
    return { ready: false, state: "incomplete", reason: error.message };
  }
}

/** Admission applies to installed repositories; read-only graph APIs keep their existing scope. */
export function installedIntent(root) {
  const installed = fs.existsSync(path.join(root, ".agents/cg/manifest.json"));
  return installed ? { required: true, ...intentStatus(root) } : { required: false, ready: false, state: "not-installed", reason: "Intent adoption has not been established." };
}

export function requireIntent(root) {
  const result = installedIntent(root);
  if (result.required && !result.ready) throw new Error(`intent approval required: ${result.reason} Run cg intent status and /cg-warmup.`);
}

export function intentAction(root, action, { evidence } = {}) {
  if (["status", "verify"].includes(action)) return intentStatus(root, { evidence });
  if (!["review", "approve"].includes(action)) throw new Error("intent action must be status, verify, review or approve");
  const current = intentSnapshot(root);
  const at = new Date().toISOString();
  let record;
  if (action === "review") {
    record = { version: 1, review: { ...current, at } };
  } else {
    record = readRecord(root);
    if (!record || record.review.snapshot !== current.snapshot) throw new Error("intent changed or has not been reviewed; run cg intent review and present that version to the owner");
    if (!evidence) throw new Error("intent approve requires --evidence JSON with the actual owner response and reviewed snapshot");
    const answer = JSON.parse(fs.readFileSync(path.resolve(root, evidence), "utf8"));
    if (![answer.by, answer.response].every(text) || answer.scope !== "repository" || answer.snapshot !== current.snapshot) throw new Error("intent approval needs by, response, scope: repository and the exact reviewed snapshot");
    record.approval = { by: answer.by, response: answer.response, scope: answer.scope, snapshot: answer.snapshot, at };
  }
  if (intentSnapshot(root).snapshot !== current.snapshot) throw new Error("intent changed during recording; review again");
  const file = localPath(root, INTENT_RECORD);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(record, null, 2) + "\n"); fs.renameSync(temporary, file); }
  finally { fs.rmSync(temporary, { force: true }); }
  return action === "review" ? { ...current, state: "awaiting-owner", reason: "Present this exact intent and its binding sources for owner review. No approval was recorded." } : intentStatus(root);
}
