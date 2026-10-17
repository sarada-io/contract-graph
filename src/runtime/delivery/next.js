/**
 * @file Resolve programme selection and derive the next admissible lifecycle action.
 * @see .agent/contract.md
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

import { readDocsRoot } from "../installation/profiles.js";
import { readDeliveries, programmeName, deliveryReviewSnapshot, signOffRecovery } from "./delivery.js";
import { installationStatus } from "../distribution/runtime.js";
import { installedIntent } from "./intent.js";

/** The Step lifecycle recorded by cg-produce in brief headers. */
export const STEP_STATES = Object.freeze([
  "Waiting",
  "Ready",
  "Blocked",
  "In progress",
  "Complete",
]);

const HEADER = /^(Priority|Depends on|Blocked by|Status|Weight):[ \t]*(.*)$/;
/** A Step section opens the queue document: `## Step 3: name`. */
const STEP_HEADING = /^##[ \t]+Step[ \t]+(\d+)[ \t]*:?[ \t]*(.*)$/;

/** Accept common authored lists/ranges, but never silently discard an unreadable dependency. */
function dependencyIds(value, problems, file) {
  if (!value || /^none$/i.test(value.trim())) return [];
  const ids = [];
  for (const part of value.replace(/\bSteps?\s+/gi, "").split(/\s*(?:,|\band\b)\s*/i)) {
    const match = /^(\d+)(?:\s*[-–—]\s*(\d+))?$/.exec(part.trim());
    const first = Number(match?.[1]), last = Number(match?.[2] ?? match?.[1]);
    if (!match || first < 1 || last < first || last > 10000) {
      problems.push(`${file}: unreadable Depends on \`${value}\` — use Step 1, Step 2 or Steps 1–2`);
      return [];
    }
    for (let n = first; n <= last; n++) ids.push(n);
  }
  return [...new Set(ids)];
}

/** Detect direct repository-wide residue commands in Step gates, not arbitrary shell programs.
 * Scope changes require preparation; the detector never edits or waives a retained final gate.
 */
function stepGateFindings(text, file) {
  let section = false, fence = null;
  const commands = [];
  for (const line of text.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) fence = { delimiter: marker[1], shell: /^(?:bash|sh|shell)?\s*$/.test(marker[2]) };
      else if (marker[1][0] === fence.delimiter[0] && marker[1].length >= fence.delimiter.length) fence = null;
      continue;
    }
    if (!fence && /^#{1,3}\s/.test(line)) section = /^###\s+Done when\s*$/i.test(line);
    if (section && fence?.shell) commands.push(line);
  }
  // Literal arguments/comments cannot introduce command separators. Keep simple quoted command
  // paths readable, but do not interpret nested shell programs, substitutions, or quoted prose.
  const shell = commands.join("\n").replace(/\\\r?\n/g, " ")
    .replace(/'(?:[^']*)'|"(?:\\.|[^"\\])*"|#[^\n]*/g, token => {
      if (token.startsWith("#")) return "";
      const value = token.slice(1, -1);
      return /[\s;&|`$\\]/.test(value) ? "__quoted_argument__" : value;
    });
  const direct = /(?:^|&&|\|\||[;\n])\s*(?:cg|[^\s;|&]+\/cg|node\s+[^\s;|&]*cg\.js)\s+residue\b([^\n;&|]*)/g;
  return [...shell.matchAll(direct)].filter(match => !/--programme(?:=|\s+)\S+/.test(match[1])).map(() => ({
    code: "repository-residue-in-step", file,
    reason: "repository-wide cg residue is a final closure check, not a Step prerequisite; re-prepare its placement while preserving the required final gate",
  }));
}

/**
 * Parse one Step section's header block.
 *
 * Only the header is read — everything below it is prose for a human and an executing agent.
 * Parsing stops at the first `###` subsection so a `Status:` written inside the body can never be
 * mistaken for the Step's own state.
 */
export function parseBrief(text, file, number = null, title = null) {
  const problems = [];
  const fields = {};
  const lines = text.split("\n");

  if (!title) problems.push(`${file}: Step section has no name`);

  for (const line of lines) {
    if (line.startsWith("### ") || line.startsWith("## ")) break;
    const match = HEADER.exec(line);
    if (match) fields[match[1]] = match[2].trim();
  }

  // `Status: Complete — 2026-08-09` is a natural thing for a closing stage to write, and reading
  // it as an unknown state would make the whole queue unparseable — which makes the gate deny
  // every stage. The state is the token; anything after a dash is a note, and notes are welcome.
  const declared = fields.Status ?? null;
  const status = declared ? declared.replace(/\s+[—–-]\s+.*$/, "").trim() : null;
  if (!status) problems.push(`${file}: no \`Status:\` header`);
  else if (!STEP_STATES.includes(status)) {
    problems.push(`${file}: unknown Status \`${status}\` — expected one of ${STEP_STATES.join(", ")}`);
  }

  const priority = /^\d+$/.test(fields.Priority ?? "") ? Number(fields.Priority) : NaN;
  if (!Number.isSafeInteger(priority)) problems.push(`${file}: no integer \`Priority:\` header`);

  const none = (value) => !value || /^none$/i.test(value.trim());
  const dependsOn = dependencyIds(fields["Depends on"], problems, file);

  return {
    file,
    title,
    status,
    priority: Number.isInteger(priority) ? priority : null,
    dependsOn,
    blockedBy: none(fields["Blocked by"]) ? null : fields["Blocked by"].trim(),
    number,
    problems,
    gateFindings: status === "Complete" ? [] : stepGateFindings(text, file),
  };
}

/** One document per phase: `<phase>_detailed_preparation.md`. */
const isQueueDocument = (name) => /_detailed_preparation\.md$/i.test(name);

/** Split a phase document into its Step sections, keeping each one's source line for reporting. */
export function parseQueueDocument(text, file) {
  const lines = text.split("\n");
  const starts = [];
  let fence = null;
  lines.forEach((line, index) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      return;
    }
    if (fence) return;
    const match = STEP_HEADING.exec(line);
    if (match) starts.push({ index, number: Number(match[1]), title: match[2].trim() || null });
  });

  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : lines.length;
    const body = lines.slice(start.index + 1, end).join("\n");
    return parseBrief(body, `${file}:${start.index + 1}`, start.number, start.title);
  });
}

/** Every active Step. `archive/` holds closed phases and is deliberately excluded. */
export function readQueue(repoRoot, docsRoot = "docs") {
  const root = path.join(repoRoot, docsRoot, "plans");
  const briefs = [];
  if (!fs.existsSync(root)) return briefs;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "archive") walk(full);
        continue;
      }
      if (!isQueueDocument(entry.name)) continue;
      const rel = path.relative(repoRoot, full).split(path.sep).join("/");
      const steps = parseQueueDocument(fs.readFileSync(full, "utf8"), rel);
      if (!steps.length) {
        briefs.push({ file: rel, problems: [`${rel}: no \`## Step <n>\` section`], dependsOn: [] });
        continue;
      }
      briefs.push(...steps);
    }
  };
  walk(root);
  return briefs;
}

/**
 * The stage that owns the next move, and why.
 *
 * The selection rule is `cg-produce`'s: the earliest `Ready` Step by priority whose dependencies
 * are all `Complete`. It lives here rather than only in prose so something other than a model
 * can check it was followed.
 */
/** Git metadata is per worktree, never tracked policy. Non-Git callers use CG_PROGRAMME. */
function selectionFile(root) {
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (fs.realpathSync(top) !== fs.realpathSync(root)) return null;
    const dir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return path.join(dir, "cg-active-programme.json");
  } catch { return null; }
}

/** Only inspect programme-owned plan files; links never expand this read set. */
function programmeFiles(root, docs, programme) {
  const files = [];
  const walk = relative => {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) return;
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`programme scope cannot follow symlink: ${relative}`);
    if (stat.isDirectory()) for (const name of fs.readdirSync(full).sort()) walk(`${relative}/${name}`);
    else if (stat.isFile()) files.push(relative);
    else throw new Error(`unsupported programme evidence: ${relative}`);
  };
  // Check ancestors too, rather than following a symlinked plans directory.
  const relative = `${docs}/plans/${programme}`;
  if (relative.split('/').some(part => !part || part === '..' || part === '.')) throw new Error('invalid programme evidence path');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`programme scope cannot follow symlink: ${relative}`);
  }
  walk(relative);
  return files;
}

/** Read-only admission evidence, not an approval record or a write-confinement mechanism. */
function standaloneNext(root, input, docs, query) {
  const request = typeof input === 'string' ? JSON.parse(fs.readFileSync(path.resolve(root, input), 'utf8')) : input;
  const docsRoot = docs ?? readDocsRoot(root);
  const validPath = value => typeof value === 'string' && value.length > 0 && !path.win32.isAbsolute(value) &&
    !/[\\*?\[\]\x00-\x1f]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..');
  const paths = values => Array.isArray(values) && values.length > 0 && values.every(validPath);
  if (!request || typeof request.task !== 'string' || !request.task.trim() || !paths(request.writes)) throw new Error('standalone request requires task and nonempty repository-relative writes without globs');
  const intersects = (a, b) => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
  for (const write of request.writes) {
    if (['.git', '.agents/cg/deliveries', '.agents/cg/prototypes', `${docsRoot}/plans`].some(folder => intersects(write, folder))) throw new Error('standalone writes cannot alter programme or Git metadata');
    let current = root;
    for (const part of write.split('/')) {
      current = path.join(current, part);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`standalone scope cannot follow symlink: ${write}`);
    }
  }
  if (!validPath(docsRoot)) throw new Error('invalid docs root for standalone scope');
  programmeFiles(root, docsRoot, 'scope-path-validation');
  const plansPath = path.join(root, docsRoot, 'plans');
  if (fs.existsSync(plansPath) && fs.readdirSync(plansPath, { withFileTypes: true }).some(entry => entry.isSymbolicLink())) throw new Error('programme scope cannot follow symlink in plans');
  const records = query.deliveries(), briefs = query.queue();
  if (briefs.some(brief => brief.problems.length)) throw new Error('repair unreadable programme queues before assessing standalone scope');
  const names = new Set([...records.filter(record => record.status !== 'Closed').map(record => record.programme),
    ...briefs.map(brief => brief.file.slice(`${docsRoot}/plans/`.length).split('/')[0]),
    ...sprintRoadmaps(root, docsRoot).map(item => item.programme)]);
  const plans = path.join(root, docsRoot, 'plans');
  if (fs.existsSync(plans)) for (const entry of fs.readdirSync(plans, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== 'archive' && fs.existsSync(path.join(plans, entry.name, 'roadmap.md'))) names.add(entry.name);
  }
  const reviews = request.scopeReviews ?? [];
  if (!Array.isArray(reviews) || reviews.some(review => !review || typeof review.programme !== 'string') || new Set(reviews.map(review => review.programme)).size !== reviews.length) throw new Error('scopeReviews must contain unique programme reviews');
  const scopeReview = [], overlaps = [], unknown = [];
  for (const programme of [...names].sort()) {
    programmeName(programme);
    const record = records.find(item => item.programme === programme);
    if (record?.status === 'Closed') continue;
    const files = programmeFiles(root, docsRoot, programme);
    if (record) files.push(record.file);
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]))).digest('hex');
    const checkpoints = [...(record?.sessions ?? []), ...(record?.history ?? []).map(event => event.checkpoint).filter(Boolean)];
    const knownPaths = [...new Set([...(record?.reviewScope ?? []), ...checkpoints.flatMap(item => [...item.writes, ...(item.evidenceInputs ?? [])])])];
    const review = reviews.find(item => item.programme === programme);
    const reviewed = review?.fingerprint === fingerprint && paths(review.paths) && typeof review.reason === 'string' && review.reason.trim();
    scopeReview.push({ programme, fingerprint, knownPaths, sources: files, reviewed: Boolean(reviewed) });
    if (request.writes.some(write => [...knownPaths, ...(reviewed ? review.paths : [])].some(other => intersects(write, other)))) overlaps.push(programme);
    else if (!reviewed) unknown.push(programme);
  }
  const blocked = overlaps.length || unknown.length;
  return { state: blocked ? 'scope-review-required' : 'standalone-ready', stage: blocked ? null : 'cg-produce',
    programme: null, selectionSource: 'standalone', briefs: [], problems: [], scopeReview, overlaps, unknown,
    task: request.task, writes: request.writes,
    reason: overlaps.length ? `Scope overlaps ${overlaps.join(', ')}; use its existing programme gates.`
      : unknown.length ? `Review scope of ${unknown.join(', ')} using the listed sources; supply current fingerprint, complete paths and rationale in scopeReviews. Unknown ownership does not admit implementation.`
        : 'Admit the authorised bounded correction within its reviewed writes. Preserve existing review preferences and checks; scope assessments are not proof of semantic independence or write confinement. Recheck after scope or programme evidence changes.' };
}

export function selectProgramme(root, programme, { clear = false, docs } = {}) {
  const file = selectionFile(root);
  if (!file) throw new Error("persistent selection requires Git; use CG_PROGRAMME for a non-Git session");
  if (clear) { fs.rmSync(file, { force: true }); return { cleared: true }; }
  programmeName(programme);
  const candidate = createNextQuery(root, { docs }).next({ programme, ignoreSelection: true, environment: {} });
  if (["Closed", "Abandoned"].includes(candidate.receipt?.status)) throw new Error(`cannot select a terminal programme: ${programme} is ${candidate.receipt.status}`);
  if (["selection-required", "unreadable"].includes(candidate.state)) {
    throw new Error(candidate.reason ?? candidate.problems.join("; "));
  }
  const temporary = `${file}.${process.pid}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify({ programme }), { flag: "wx" }); fs.renameSync(temporary, file); }
  finally { fs.rmSync(temporary, { force: true }); }
  return { programme, selectionSource: "worktree" };
}

/** Share inputs within one synchronous query only; the next query rereads disk. */
export function createNextQuery(repoRoot, { docs } = {}) {
  const once = load => {
    let read = false, value, error;
    return () => {
      if (!read) {
        read = true;
        try { value = load(); } catch (failure) { error = failure; }
      }
      if (error) throw error;
      return value;
    };
  };
  const docsRoot = docs ?? readDocsRoot(repoRoot);
  const deliveries = once(() => readDeliveries(repoRoot));
  const queue = once(() => readQueue(repoRoot, docsRoot));
  let recovery;
  try { recovery = signOffRecovery(repoRoot, deliveries()); }
  catch (error) { recovery = { state: "unreadable", candidates: [], reason: error.message }; }
  const common = { installation: installationStatus(repoRoot), intent: installedIntent(repoRoot), signOffRecovery: recovery };
  const query = { deliveries, queue, common };
  return { deliveries, next: (options = {}) => nextFromQuery(repoRoot, { ...options, docs: docsRoot }, query) };
}

export function next(repoRoot, options = {}) {
  return createNextQuery(repoRoot, options).next(options);
}

function nextFromQuery(repoRoot, { docs, programme, skill, standalone, environment = process.env, ignoreSelection = false }, query) {
  const { common } = query;
  const recovery = common.signOffRecovery;
  if (standalone !== undefined) {
    if (programme || environment.CG_PROGRAMME) return { ...common, state: "scope-review-required", stage: null, briefs: [], problems: [], reason: "Standalone work cannot select a programme; clear --programme and CG_PROGRAMME." };
    try { return { ...standaloneNext(repoRoot, standalone, docs, query), ...common }; }
    catch (error) { return { ...common, state: "unreadable", stage: null, briefs: [], problems: [error.message] }; }
  }
  let target = programme, selectionSource = programme ? "explicit" : null;
  if (!target && !ignoreSelection && environment.CG_PROGRAMME) { target = environment.CG_PROGRAMME; selectionSource = "environment"; }
  if (!target && !ignoreSelection) {
    const file = selectionFile(repoRoot);
    if (file && fs.existsSync(file)) {
      try {
        const pointer = JSON.parse(fs.readFileSync(file, "utf8"));
        programmeName(pointer.programme); target = pointer.programme; selectionSource = "worktree";
      } catch (error) {
        return { ...common, state: "selection-required", stage: null, briefs: [], problems: [], reason: `invalid local selection: ${error.message}; run cg status --clear-selection` };
      }
    }
  }
  if (!target && !ignoreSelection && skill === "cg-sign-off" && recovery.state === "resumable") {
    target = recovery.candidates[0].programme; selectionSource = "completion-request";
  }
  const result = nextSelected(repoRoot, { docs, programme: target }, query);
  if (selectionSource === "worktree" && (["selection-required", "unreadable"].includes(result.state) || ["Closed", "Abandoned"].includes(result.receipt?.status))) {
    return { ...result, ...common, state: "selection-required", stage: null, selectionSource,
      reason: `stale local selection ${target}; run cg status --clear-selection or --select <slug>. ${result.reason ?? "Programme is terminal."}` };
  }
  return { ...result, ...common, selectionSource: selectionSource ?? (result.programme ? "single-programme" : null) };
}

/** New roadmaps opt into sprint delivery; existing queues retain their lifecycle. */
export function sprintRoadmaps(root, docs, programme) {
  const folder = path.join(root, docs, "plans");
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== "archive" && (!programme || e.name === programme)).flatMap(e => {
    const file = path.join(folder, e.name, "roadmap.md");
    if (!fs.existsSync(file)) return [];
    const header = fs.readFileSync(file, "utf8").split(/^## /m)[0];
    if (!/^Delivery: sprint\s*$/m.test(header)) return [];
    const states = [...header.matchAll(/^Status: (.+)$/gm)].map(m => m[1].trim());
    if (states.length !== 1 || !["Proposed", "Active", "Complete"].includes(states[0])) throw new Error(`${file}: sprint roadmap needs one Status: Proposed, Active or Complete header`);
    return states[0] === "Complete" ? [] : [{ programme: e.name, status: states[0] }];
  });
}

function nextSelected(repoRoot, { docs, programme }, query) {
  const docsRoot = docs ?? readDocsRoot(repoRoot);
  let prototypes;
  try {
    if (programme) programmeName(programme);
    prototypes = query.deliveries();
  } catch (error) {
    return { state: "unreadable", stage: null, problems: [error.message], briefs: [] };
  }
  let briefs = query.queue();
  const active = prototypes.filter(r => !["Closed", "Abandoned"].includes(r.status));
  let sprints;
  try { sprints = sprintRoadmaps(repoRoot, docsRoot, programme); }
  catch (error) { return { state: "unreadable", stage: null, problems: [error.message], briefs, repairablePlan: true }; }
  const programmes = new Set([...sprints.map(s => s.programme), ...active.map(r => r.programme), ...briefs.map(b => b.file.slice(`${docsRoot}/plans/`.length).split("/")[0])]);
  if (!programme && programmes.size > 1) {
    return { state: "selection-required", stage: null, reason: "multiple programmes are active; pass --programme <slug>", programmes: [...programmes].sort(), briefs, problems: [] };
  }
  const selected = programme ?? (programmes.size === 1 ? [...programmes][0] : null);
  if (programme && !prototypes.some(r => r.programme === programme) &&
      !fs.existsSync(path.join(repoRoot, docsRoot, "plans", programme))) {
    return { state: "selection-required", stage: null, reason: `unknown programme: ${programme}`, programmes: [...programmes].sort(), briefs: [], problems: [] };
  }
  if (selected) briefs = briefs.filter(b => b.file.startsWith(`${docsRoot}/plans/${selected}/`));
  const prototype = prototypes.find(r => r.programme === selected);
  const sprint = sprints.find(s => s.programme === selected);
  const delivery = sprint ? "sprint" : "prepared";
  if (["Closed", "Suspended", "Abandoned"].includes(prototype?.status)) {
    let cleanup;
    try { cleanup = prototype.status === "Closed" ? programmeFiles(repoRoot, docsRoot, selected) : []; }
    catch (error) { return { state: "unreadable", stage: null, problems: [error.message], briefs }; }
    return { state: prototype.status.toLowerCase(), stage: cleanup.length ? "cg-sign-off" : null,
      delivery, programme: selected, receipt: prototype, briefs, problems: [], cleanup,
      reason: prototype.status === "Closed" ? (cleanup.length ? "Closed delivery retains plan files: inspect cleanup and shared consumers; do not resume production." : "Closed delivery has no retained programme plan files; no next action.")
        : `${selected}: ${prototype.status}; an actual request to resume is required.` };
  }
  if (sprint?.status === "Proposed") return { state: "sprint-proposed", stage: "cg-plan", delivery, programme: selected, briefs, problems: [], reason: "Agree the sprint goal and criteria before marking its roadmap Active; execution authority remains separate." };
  if (prototype && !["Handed off", "Closed"].includes(prototype.status)) {
    let stale = false;
    try {
      if (prototype.status === "Approved") stale = prototype.approval.snapshot !== deliveryReviewSnapshot(repoRoot, prototype);
    } catch (error) { return { state: "unreadable", stage: null, problems: [error.message], briefs }; }
    return { state: "delivery-review", stage: delivery === "sprint" ? "cg-produce" : "cg-prototype", delivery, programme: selected, receipt: prototype, briefs, problems: [],
      reason: stale ? "approved source changed; resume the delivery for affected review" : `${selected}: ${prototype.status} — working-result review and handoff precede finishing` };
  }
  if (delivery === "sprint" && !prototype) return { state: "sprint-planned", stage: "cg-produce", delivery, programme: selected, briefs, problems: [], reason: "Sprint delivery starts from the agreed roadmap; confirm execution scope before starting its working review loop." };
  const queue = nextQueue(briefs, docsRoot);
  // Accepted work converges here regardless of how it was developed. Queue state
  // still selects eligible corrections; it does not select a sign-off sub-flow.
  if (prototype?.status === "Handed off" && queue.state !== "unreadable") {
    return { ...queue, stage: "cg-sign-off", delivery, programme: selected, receipt: prototype,
      reason: `Accepted delivery handoff: sign-off owns remaining finishing and verification; produce owns eligible implementation repairs. ${queue.state === "no-queue" ? "No execution queue is required: finish deferred tests and documentation from the roadmap; admit produce only for a named implementation repair." : queue.reason}` };
  }
  return { ...queue, delivery, programme: selected, ...(prototype ? { receipt: prototype } : {}) };
}

function nextQueue(briefs, docsRoot) {
  const problems = briefs.flatMap((b) => b.problems);

  if (problems.length) {
    return { state: "unreadable", stage: null, problems, briefs, repairableQueue: true };
  }
  const findings = briefs.flatMap(b => b.gateFindings ?? []);
  if (findings.length) return { state: "repair-required", stage: "cg-produce", reason: findings.map(f => `${f.file}: ${f.reason}`).join("; "), findings, briefs, problems };
  if (!briefs.length) {
    return {
      state: "no-queue",
      stage: "cg-produce",
      reason: `no \`<phase>_detailed_preparation.md\` under ${docsRoot}/plans/ — cg-produce establishes its internal execution steps before implementation`,
      briefs,
      problems,
    };
  }

  const dependencyKey = (b, number) => `${b.file.split(":")[0]}:${number}`;
  const complete = new Set(briefs.filter((b) => b.status === "Complete").map((b) => dependencyKey(b, b.number)));
  const running = briefs.find((b) => b.status === "In progress" && !b.blockedBy && b.dependsOn.every(id => complete.has(dependencyKey(b, id))));
  if (running) {
    return {
      state: "in-progress",
      stage: "cg-produce",
      step: running,
      reason: `${running.file} is In progress — finish it before selecting another Step`,
      briefs,
      problems,
    };
  }

  const ready = briefs
    .filter((b) => b.status === "Ready" && !b.blockedBy && b.dependsOn.every((id) => complete.has(dependencyKey(b, id))))
    .sort((a, b) => a.priority - b.priority);

  if (ready.length) {
    return {
      state: "ready",
      stage: "cg-produce",
      step: ready[0],
      reason: `${ready[0].file} is the earliest Ready Step with satisfied dependencies`,
      briefs,
      problems,
    };
  }

  if (briefs.every((b) => b.status === "Complete")) {
    return {
      state: "queue-complete",
      stage: "cg-sign-off",
      reason: `all ${briefs.length} Step(s) are Complete — the phase is ready to close`,
      briefs,
      problems,
    };
  }

  const blocked = briefs.filter((b) => b.status === "Blocked" || b.blockedBy);
  return {
    state: "blocked",
    stage: "cg-unblock",
    reason: blocked.length
      ? `no Step is Ready; blocked by ${blocked.map((b) => b.blockedBy ?? b.file).join("; ")}`
      : "no Step is Ready — reconcile Waiting states and dependencies against completed handoffs",
    briefs,
    problems,
  };
}

/** Whether dispatching `skill` right now agrees with what the queue says. */
export function permits(result, skill) {
  if (["cg-prepare", "cg-auto-run"].includes(skill)) return { allowed: false, reason: `${skill} was retired in 0.7.0. Use cg-plan for readiness and cg-produce for execution and automatic continuation.` };
  if (result.installation?.requiresInit) return { allowed: false, reason: result.installation.reason };
  if (result.intent?.required && !result.intent.ready && ["cg-plan", "cg-prototype", "cg-produce", "cg-sign-off"].includes(skill)) return { allowed: false, reason: `intent approval required: ${result.intent.reason} Run /cg-warmup; inspection and clarification remain available.` };
  if (result.state === "unreadable") {
    if (skill === "cg-plan" && result.repairablePlan) return { allowed: true, reason: "planning may repair sprint roadmap headers; delivery remains blocked" };
    if (skill === "cg-produce" && result.repairableQueue) return { allowed: true, reason: "production may repair the selected queue syntax; implementation must wait for corrected readiness and closure remains blocked" };
    return { allowed: false, reason: `the Step queue does not parse:\n  ${result.problems.join("\n  ")}` };
  }
  if (result.state === "selection-required") return { allowed: false, reason: result.reason };
  if (result.state === "scope-review-required") return { allowed: false, reason: result.reason };
  if (result.state === "standalone-ready") return { allowed: skill === "cg-produce", entry: "bounded-change", reason: result.reason };
  if (result.state === "sprint-proposed" && ["cg-produce", "cg-sign-off"].includes(skill)) return { allowed: false, reason: result.reason };
  if (skill === "cg-prototype" && result.delivery === "sprint" && result.receipt && result.receipt.status !== "Closed") {
    return { allowed: false, reason: "This sprint has an active delivery receipt. Continue cg-produce or the accepted cg-sign-off handoff; exploratory work requires an explicit change to the agreed delivery scope." };
  }
  if (skill === "cg-produce" && ["Closed", "Abandoned", "Suspended"].includes(result.receipt?.status)) return { allowed: false, reason: `${result.receipt.programme}: ${result.receipt.status}; selection does not resume delivery.` };
  if (skill === "cg-sign-off" && result.state === "closed") return { allowed: Boolean(result.cleanup?.length), entry: "cleanup-review", handoffReady: false, reason: result.reason };
  if (skill === "cg-sign-off" && result.receipt && result.receipt.status !== "Closed") {
    return { allowed: true, entry: "delivery-completion", handoffReady: result.receipt.status === "Handed off", reason: `${result.receipt.programme}: admit assessment; the user’s requested scope bounds completion; accepted handoff, applicable Step gates, and passing final verification are still required to close` };
  }
  if (result.state === "repair-required") return { allowed: ["cg-produce", "cg-unblock"].includes(skill), reason: result.reason };
  if (result.state === "delivery-review" && ["cg-produce"].includes(skill) && !(result.delivery === "sprint" && skill === "cg-produce" && !["Suspended", "Abandoned"].includes(result.receipt.status))) {
    return { allowed: false, reason: result.reason };
  }
  // Produce now owns the preparation that used to be independently admissible.
  // Keep execution readiness separate: a failed final gate may need a new repair
  // Step before any Step can legitimately become Ready.
  if (skill === "cg-produce" && (result.state === "blocked" ||
      (result.state === "queue-complete" && result.receipt?.completionRequest?.state === "Active"))) {
    return { allowed: true, entry: "execution-preparation", executionAllowed: false,
      reason: "Admit internal preparation only: reconcile the selected queue or prepare an in-scope corrective Step. Do not execute blocked or completed Steps, clear owner/external blockers, or claim closure. Re-run cg next after preparation; implementation requires a Ready or eligible In progress Step and existing execution authority." };
  }
  if (skill === "cg-produce" && result.receipt?.status === "Handed off" &&
      ["ready", "in-progress", "no-queue"].includes(result.state)) {
    return { allowed: true, reason: "Admit scoped implementation repair or its internal preparation; the delivery handoff and existing completion request retain their authority." };
  }
  if (skill === "cg-produce" && result.state === "no-queue" && !result.programme && !result.receipt) {
    return { allowed: true, entry: "bounded-change", reason: "Admit a concrete authorised bounded change; preserve repository policy, verification and required acceptance. Admission creates no execution authority." };
  }
  // Never gated: one resolves blockers, one is the adapter itself, one is pre-lifecycle, and
  // planning is what you run precisely when the queue has nothing to say.
  if (["cg-unblock", "cg-warmup", "cg-plan", "cg-prototype"].includes(skill)) {
    return { allowed: true, reason: "not gated by queue state" };
  }
  if (skill === result.stage) return { allowed: true, reason: result.reason };
  return {
    allowed: false,
    reason: `queue state is \`${result.state}\` — ${result.reason}. Run \`${result.stage}\`, not \`${skill}\`.`,
  };
}
