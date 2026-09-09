/** Provisional work, attributed acceptance, and delivery receipts. No application code is generated here. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { profilePath } from "./profiles.js";

export const PROTOTYPE_ROOT = ".agents/cg/prototypes";
export const PROTOTYPE_STATES = ["Iterating", "Awaiting review", "Approved", "Handed off", "Suspended", "Abandoned", "Closed"];
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const digestPattern = /^[a-f0-9]{64}$/;

export function programmeName(value) {
  if (typeof value !== "string" || !slugPattern.test(value)) throw new Error("--programme must be a lowercase programme slug");
  return value;
}

export function prototypeDocs(root) {
  const file = profilePath(root);
  const docs = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).docs ?? "docs" : "docs";
  if (typeof docs !== "string" || !/^[^./\\][^/\\]*$/.test(docs) || docs === "..") throw new Error("invalid docs root in profile");
  return docs;
}

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

function ownedPath(root, relative) {
  const parts = relative.split("/");
  let current = path.resolve(root);
  for (const part of parts) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`prototype metadata cannot follow a symlink: ${relative}`);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return current;
}

/** Conservatively identify all Git-visible source, including uncommitted and untracked files.
 * Lifecycle receipts and transient plan prose do not invalidate their own evidence.
 * Ignored files and external services are not covered; the delivery gate must cover those inputs.
 */
export function prototypeSnapshot(root) {
  const hash = crypto.createHash("sha256");
  for (const entry of sourceEntries(root)) hash.update(JSON.stringify(entry));
  return hash.digest("hex");
}

function sourceEntries(root) {
  const docs = prototypeDocs(root);
  const files = [...new Set(git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean))].sort();
  const entries = [];
  for (const file of files) {
    if (file.startsWith(`${PROTOTYPE_ROOT}/`) || (file.startsWith(`${docs}/plans/`) && /\.(md|json)$/.test(file))) continue;
    const full = path.join(root, file);
    let stat;
    try { stat = fs.lstatSync(full); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (stat.isDirectory()) throw new Error(`snapshot cannot account for directory or submodule: ${file}`);
    const mode = stat.isSymbolicLink() ? "symlink" : (stat.mode & 0o111) ? "executable" : "file";
    const body = stat.isSymbolicLink() ? Buffer.from(fs.readlinkSync(full)) : fs.readFileSync(full);
    entries.push([file, mode, sha(body)]);
  }
  return entries;
}

function nonempty(value) { return typeof value === "string" && value.trim().length > 0; }

export function validatePrototype(record, file) {
  if (!record || record.version !== 1 || typeof record.programme !== "string" || !slugPattern.test(record.programme) ||
      !PROTOTYPE_STATES.includes(record.status) || !digestPattern.test(record.baseline ?? "") ||
      !Array.isArray(record.history) || !record.history.length ||
      record.history.some((event) => !PROTOTYPE_STATES.includes(event.status) || !nonempty(event.at)) ||
      record.history.at(-1).status !== record.status) throw new Error(`${file}: malformed prototype record`);
  if (["Approved", "Handed off", "Closed"].includes(record.status)) {
    const approval = record.approval;
    if (!approval || ![approval.by, approval.response, approval.scope, approval.at].every(nonempty) ||
        !digestPattern.test(approval.snapshot ?? "")) throw new Error(`${file}: missing attributed prototype approval`);
  }
  if (record.status === "Closed") {
    const closure = record.closure;
    if (!closure || !nonempty(closure.command) || closure.exitCode !== 0 || !nonempty(closure.signOff) ||
        !digestPattern.test(closure.snapshot ?? "") || !digestPattern.test(closure.outputHash ?? "")) {
      throw new Error(`${file}: missing successful delivery receipt`);
    }
  }
  if (record.sessions !== undefined && (!Array.isArray(record.sessions) || record.sessions.some(s =>
    !s || !nonempty(s.session) || !["active", "released"].includes(s.state) ||
    !Array.isArray(s.writes) || s.writes.some(p => !nonempty(p)) ||
    !Array.isArray(s.resources) || s.resources.some(p => !nonempty(p)) ||
    !Array.isArray(s.files) || s.files.some(e => !Array.isArray(e) || e.length !== 3 || !nonempty(e[0]) || !digestPattern.test(e[2] ?? ""))))) {
    throw new Error(`${file}: malformed prototype session checkpoint`);
  }
  if (record.deliveryAttempts !== undefined && !Array.isArray(record.deliveryAttempts)) throw new Error(`${file}: malformed delivery attempts`);
  if (record.completionRequest !== undefined) {
    const request = record.completionRequest;
    if (!request || !["Active", "Completed"].includes(request.state) ||
        ![request.by, request.response, request.scope, request.at, request.session].every(nonempty) ||
        !digestPattern.test(request.snapshot ?? "") ||
        (request.state === "Active" && record.status !== "Handed off") ||
        (request.state === "Completed" && record.status !== "Closed")) {
      throw new Error(`${file}: malformed prototype completion request`);
    }
  }
  return record;
}

export function readPrototypes(root) {
  const directory = ownedPath(root, PROTOTYPE_ROOT);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).sort().map((name) => {
    // Atomic writers expose only complete JSON records to readers.
    if (/^\.[a-z0-9-]+\.[a-f0-9-]{36}\.tmp$/.test(name)) return null;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(name)) throw new Error(`${PROTOTYPE_ROOT}/${name}: unexpected prototype record`);
    const file = `${PROTOTYPE_ROOT}/${name}`;
    const record = validatePrototype(JSON.parse(fs.readFileSync(ownedPath(root, file), "utf8")), file);
    if (name !== `${record.programme}.json`) throw new Error(`${file}: programme differs from filename`);
    return { ...record, file };
  }).filter(Boolean);
}

function save(root, record, status, event = {}) {
  record.status = status;
  record.history.push({ ...event, status, at: new Date().toISOString() });
  const file = ownedPath(root, `${PROTOTYPE_ROOT}/${record.programme}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.${record.programme}.${crypto.randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temp, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
    fs.renameSync(temp, file);
  } finally { fs.rmSync(temp, { force: true }); }
  return record;
}

function context(root) {
  return { worktree: git(root, ["rev-parse", "--show-toplevel"]).trim(),
    branch: git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim(),
    commit: git(root, ["rev-parse", "HEAD"]).trim() };
}

const intersects = (a, b) => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
function checkpoint(root, record, session, evidence) {
  if (!session || !evidence) throw new Error("checkpoint requires --session and --evidence JSON with writes, state, and note");
  const input = JSON.parse(fs.readFileSync(path.resolve(root, evidence), "utf8"));
  const writes = input.writes;
  if (!Array.isArray(writes) || writes.some(p => !nonempty(p) || p.includes("\\") || /[*?\[\]\x00-\x1f]/.test(p) ||
      p.split("/").some(part => !part || part === "." || part === "..")) ||
      !["active", "released"].includes(input.state) || !nonempty(input.note) ||
      (input.resources !== undefined && (!Array.isArray(input.resources) || input.resources.some(r => !nonempty(r))))) {
    throw new Error("checkpoint needs repository-relative file/directory writes (no globs), active/released state, note, and optional resource names");
  }
  const resources = input.resources ?? [];
  const records = readPrototypes(root);
  const sessions = records.filter(r => r.status !== "Closed").flatMap(r => (r.sessions ?? []).map(s => ({ ...s, programme: r.programme })));
  const previous = sessions.find(s => s.programme === record.programme && s.session === session);
  const files = sourceEntries(root).filter(([p]) => writes.some(w => intersects(p, w)));
  const prior = new Map((previous?.files ?? []).map(entry => [entry[0], JSON.stringify(entry)]));
  const current = new Map(files.map(entry => [entry[0], JSON.stringify(entry)]));
  const observedChanges = previous ? [...new Set([...prior.keys(), ...current.keys()])].filter(p => prior.get(p) !== current.get(p)).sort() : [];
  const peers = sessions.filter(s => s.state === "active" && !(s.programme === record.programme && s.session === session))
    .map(s => ({ programme: s.programme, session: s.session, context: s.context,
      overlappingWrites: writes.filter(p => s.writes.some(w => intersects(p, w))),
      sharedResources: resources.filter(r => s.resources.includes(r)) }));
  const dirty = [...new Set([git(root, ["diff", "--name-only", "-z", "HEAD"]),
    git(root, ["ls-files", "--others", "--exclude-standard", "-z"])].join("\0").split("\0").filter(Boolean))].sort();
  const entry = { session, state: input.state, writes, resources, note: input.note, context: context(root),
    at: new Date().toISOString(), snapshot: prototypeSnapshot(root), files, observedChanges, dirty, peers,
    unregisteredProgrammes: records.filter(r => r.programme !== record.programme && r.status !== "Closed" && !r.sessions?.length).map(r => r.programme) };
  record.sessions = [...(record.sessions ?? []).filter(s => s.session !== session), entry];
  return entry;
}

/** CLI actions require actual user authority to be supplied by the invoking skill.
 * Approval records attribute an answer; they do not authenticate a human identity.
 */
export function prototypeAction(root, action, options = {}) {
  const { programme, session } = options;
  if (programme !== undefined) programmeName(programme);
  if (action === "status") return readPrototypes(root).filter(r => !programme || r.programme === programme);
  const name = programmeName(programme);
  if (session !== undefined && (!nonempty(session) || session.length > 200 || /[\x00-\x1f]/.test(session))) throw new Error("--session must be a nonempty session identifier of at most 200 characters");
  // A slow close must not overwrite a resume/checkpoint made by another process.
  // Locks are worktree-local and programme-local; other programmes remain usable.
  const lock = path.join(git(root, ["rev-parse", "--absolute-git-dir"]).trim(), `cg-prototype-${name}.lock`);
  try { fs.mkdirSync(lock); } catch (error) {
    if (error.code === "EEXIST") throw new Error(`prototype ${name} is being updated; inspect ${lock} and retry. Remove an interrupted lock only after confirming its owner has stopped`);
    throw error;
  }
  try {
    fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, session: session ?? null, action, at: new Date().toISOString() }));
    return performAction(root, action, options);
  } finally { fs.rmSync(lock, { recursive: true, force: true }); }
}

function performAction(root, action, { programme: name, evidence, gate, session } = {}) {
  let record = readPrototypes(root).find(r => r.programme === name);
  if (record) { record = { ...record }; delete record.file; }
  const event = { action, session: session ?? null, context: context(root) };
  const persist = (status, extra = {}) => save(root, record, status, { ...event, ...extra });
  const roadmap = `${prototypeDocs(root)}/plans/${name}/roadmap.md`;
  if (action === "start") {
    if (record) throw new Error("prototype already exists; resume it instead of overwriting its history");
    const snapshot = prototypeSnapshot(root);
    record = { version: 1, programme: name, status: "Iterating", baseline: snapshot, history: [] };
    const target = ownedPath(root, roadmap);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `# ${name}\nStatus: Proposed\n\n## Final outcome\nDescribe the intended experience as it becomes clear.\n\n## Prototype\nRecord scope, launch instructions, current changes, feedback, review conditions, and known gaps here.\n\n## Assumptions and decisions\nRecord consequential choices and the actual user responses.\n\n## Measured baseline\nInitial source snapshot: ${snapshot}\n\n## Phase map\nFinalise delivery phases after prototype acceptance.\n\n## Dependencies and risks\nRecord unresolved prerequisites and deferred verification.\n\n## Programme completion gate\nName the repository delivery gate before handoff.\n`);
    }
    return persist("Iterating");
  }
  if (!record) throw new Error(`no prototype for ${name}; start it first`);
  if (action === "checkpoint") {
    if (record.status === "Closed") throw new Error("resume a closed prototype before recording new session work");
    return persist(record.status, { checkpoint: checkpoint(root, record, session, evidence) });
  }
  const allowed = {
    review: ["Iterating"], approve: ["Awaiting review"], handoff: ["Approved"],
    "request-sign-off": ["Handed off"],
    suspend: ["Iterating", "Awaiting review", "Approved", "Handed off"],
    resume: ["Suspended", "Abandoned", "Approved", "Awaiting review", "Handed off", "Closed"],
    abandon: ["Iterating", "Awaiting review", "Approved", "Suspended"], close: ["Handed off", "Closed"],
  };
  if (!allowed[action]?.includes(record.status)) throw new Error(`cannot ${action} prototype in ${record.status}`);
  if (action === "resume") {
    const previousEvidence = { approval: record.approval ?? null, closure: record.closure ?? null, completionRequest: record.completionRequest ?? null };
    delete record.approval; delete record.closure; delete record.review; delete record.completionRequest;
    return persist("Iterating", { previousEvidence });
  }
  if (action === "review") {
    record.review = prototypeSnapshot(root);
    return persist("Awaiting review");
  }
  if (action === "approve") {
    if (!evidence) throw new Error("approve requires --evidence JSON with by, response, and scope from the user");
    const answer = JSON.parse(fs.readFileSync(path.resolve(root, evidence), "utf8"));
    if (![answer.by, answer.response, answer.scope].every(nonempty)) throw new Error("approval needs by, response, and scope");
    const snapshot = prototypeSnapshot(root);
    if (record.review !== snapshot) throw new Error("prototype changed after review; resume and present the current result");
    record.approval = { by: answer.by, response: answer.response, scope: answer.scope, snapshot, at: new Date().toISOString() };
    return persist("Approved", { approval: record.approval });
  }
  if (action === "handoff") {
    if (prototypeSnapshot(root) !== record.approval.snapshot) throw new Error("approved prototype changed; resume for affected human review");
    const plan = fs.readFileSync(ownedPath(root, roadmap), "utf8");
    if (!/^Status: Active\s*$/m.test(plan) || !/^## Phase map\s*$/m.test(plan) || !/^## Programme completion gate\s*$/m.test(plan)) {
      throw new Error("finalise the roadmap with Status: Active, Phase map, and Programme completion gate before handoff");
    }
    return persist("Handed off");
  }
  if (action === "request-sign-off") {
    if (!session || !evidence) throw new Error("request-sign-off requires --session and --evidence JSON with the user's by, response, and scope");
    const request = JSON.parse(fs.readFileSync(path.resolve(root, evidence), "utf8"));
    if (!request || ![request.by, request.response, request.scope].every(nonempty)) throw new Error("completion request needs by, response, and scope");
    if (record.completionRequest?.state === "Active") throw new Error("prototype completion is already requested; resume the recorded work without replacing its authority");
    record.completionRequest = { by: request.by, response: request.response, scope: request.scope,
      session, state: "Active", at: new Date().toISOString(), snapshot: prototypeSnapshot(root) };
    return persist(record.status, { completionRequest: record.completionRequest });
  }
  if (action === "close") {
    if (!gate || !evidence) throw new Error("close requires --gate with the repository delivery command and --evidence with the sign-off document");
    const signOff = fs.readFileSync(path.resolve(root, evidence), "utf8");
    if (!signOff.trim()) throw new Error("sign-off evidence is empty");
    const before = prototypeSnapshot(root);
    const attempt = { session: session ?? null, context: context(root), startedAt: new Date().toISOString(),
      snapshot: before, command: gate, result: "Running",
      otherProgrammes: readPrototypes(root).filter(r => r.programme !== name).map(r => ({ programme: r.programme, status: r.status })) };
    record.deliveryAttempts ??= [];
    record.deliveryAttempts.push(attempt);
    persist(record.status, { action: "close-started" });
    // Execute only a command explicitly supplied by the caller, never one loaded from repository metadata.
    const result = spawnSync(gate, { cwd: root, shell: true, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    attempt.finishedAt = new Date().toISOString();
    attempt.exitCode = result.status;
    attempt.outputHash = sha(`${result.stdout}\n${result.stderr}`);
    if (result.error || result.status !== 0) {
      attempt.result = "Failed";
      persist(record.status, { action: "close-failed" });
      throw new Error(`delivery gate failed: ${result.error?.message ?? result.stderr ?? result.status}`);
    }
    try { attempt.finalSnapshot = prototypeSnapshot(root); } catch (error) {
      attempt.result = "Snapshot failed";
      persist(record.status, { action: "close-failed" });
      throw error;
    }
    if (attempt.finalSnapshot !== before) {
      attempt.result = "Inputs changed";
      persist(record.status, { action: "close-stale" });
      throw new Error("delivery gate changed source inputs or another session edited them; inspect changes and run close again");
    }
    attempt.result = "Passed";
    record.closure = { snapshot: before, command: gate, exitCode: 0, signOff, outputHash: sha(`${result.stdout}\n${result.stderr}`) };
    if (record.completionRequest) record.completionRequest = { ...record.completionRequest, state: "Completed", completedAt: new Date().toISOString() };
    return persist("Closed", { closure: record.closure });
  }
  const previousRequest = record.completionRequest ?? null;
  delete record.completionRequest;
  return persist(action === "suspend" ? "Suspended" : "Abandoned", { completionRequest: previousRequest });
}

/** A required CI check complements ordinary CI. It never executes commands from a PR receipt.
 * --base must be a trusted target ref with fetched history, not a value chosen by the PR.
 */
export function deliveryReadiness(root, { base, gate } = {}) {
  const failures = [];
  if (!nonempty(gate)) return { failures: ["a trusted --gate command is required to validate delivery receipts"] };
  let records;
  try { records = readPrototypes(root); } catch (error) { return { failures: [error.message] }; }
  let affected = records;
  if (base) {
    if (git(root, ["rev-parse", "--is-shallow-repository"]).trim() === "true") throw new Error("delivery verification requires fetched history; shallow clones cannot detect removed prototype records");
    const commit = git(root, ["rev-parse", "--verify", `${base}^{commit}`]).trim();
    const history = git(root, ["log", "--format=", "--name-only", `${commit}..HEAD`, "--", PROTOTYPE_ROOT]);
    const changed = git(root, ["diff", "--name-only", commit, "--", PROTOTYPE_ROOT]);
    const names = new Set(`${history}\n${changed}`.split("\n").filter(name => name.startsWith(`${PROTOTYPE_ROOT}/`)));
    // Include records still uncommitted or untracked in a local pre-merge check.
    for (const record of records) {
      try { git(root, ["cat-file", "-e", `${commit}:${record.file}`]); } catch { names.add(record.file); }
    }
    for (const file of names) if (!records.some(r => r.file === file)) failures.push(`${file}: prototype record was removed; retain its delivery obligation`);
    affected = records.filter(r => names.has(r.file) || r.status !== "Closed");
  }
  const snapshot = affected.length ? prototypeSnapshot(root) : null;
  for (const record of affected) {
    if (record.status !== "Closed") failures.push(`${record.programme}: Prototype — ${record.status}; final sign-off is required before merge`);
    else if (record.closure.command !== gate) failures.push(`${record.programme}: closure did not run the required delivery command`);
    else if (record.closure.snapshot !== snapshot) failures.push(`${record.programme}: source changed after final sign-off`);
  }
  return { failures, programmes: affected.map(r => r.programme) };
}
