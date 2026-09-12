/**
 * Answer "what runs next" from disk rather than from the last thing a model said.
 *
 * `cg-auto-run` advances by reading the `Next action` block the previous stage emitted. That
 * block is the model's own account of where the lifecycle is, so an adapter that trusts it is
 * asking the model to grade its own homework — and it fails exactly on the unattended run the
 * stop conditions exist to protect.
 *
 * This computes the same answer independently, from the Step briefs `cg-prepare` writes. Two
 * sources that must agree is enforcement; one source is a convention.
 */

import fs from "node:fs";
import path from "node:path";

import { profilePath } from "./profiles.js";
import { readPrototypes, programmeName, prototypeSnapshot } from "./prototype.js";
import { installationStatus } from "./runtime.js";

/** The Step lifecycle, as `cg-prepare` and `cg-produce` write it into brief headers. */
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
 * The selection rule is `cg-prepare`'s: the earliest `Ready` Step by priority whose dependencies
 * are all `Complete`. It lives here rather than only in prose so something other than a model
 * can check it was followed.
 */
export function next(repoRoot, { docs, programme } = {}) {
  return { ...nextSelected(repoRoot, { docs, programme }), installation: installationStatus(repoRoot) };
}

function nextSelected(repoRoot, { docs, programme } = {}) {
  const docsRoot = docs ?? readDocsRoot(repoRoot);
  let prototypes;
  try {
    if (programme) programmeName(programme);
    prototypes = readPrototypes(repoRoot);
  } catch (error) {
    return { state: "unreadable", stage: null, problems: [error.message], briefs: [] };
  }
  let briefs = readQueue(repoRoot, docsRoot);
  const active = prototypes.filter(r => !["Closed", "Abandoned"].includes(r.status));
  const programmes = new Set([...active.map(r => r.programme), ...briefs.map(b => b.file.slice(`${docsRoot}/plans/`.length).split("/")[0])]);
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
  if (prototype && !["Handed off", "Closed"].includes(prototype.status)) {
    let stale = false;
    try {
      if (prototype.status === "Approved") stale = prototype.approval.snapshot !== prototypeSnapshot(repoRoot);
    } catch (error) { return { state: "unreadable", stage: null, problems: [error.message], briefs }; }
    return { state: "prototype", stage: "cg-prototype", programme: selected, prototype, briefs, problems: [],
      reason: stale ? "approved source changed; resume the prototype for affected review" : `${selected}: ${prototype.status} — prototype review and handoff precede delivery` };
  }
  return { ...nextQueue(briefs, docsRoot), programme: selected, ...(prototype ? { prototype } : {}) };
}

function nextQueue(briefs, docsRoot) {
  const problems = briefs.flatMap((b) => b.problems);

  if (problems.length) {
    return { state: "unreadable", stage: null, problems, briefs, repairableQueue: true };
  }
  const findings = briefs.flatMap(b => b.gateFindings ?? []);
  if (findings.length) return { state: "repair-required", stage: "cg-prepare", reason: findings.map(f => `${f.file}: ${f.reason}`).join("; "), findings, briefs, problems };
  if (!briefs.length) {
    return {
      state: "no-queue",
      stage: "cg-prepare",
      reason: `no \`<phase>_detailed_preparation.md\` under ${docsRoot}/plans/ — a phase must be prepared before it can run`,
      briefs,
      problems,
    };
  }

  const dependencyKey = (b, number) => `${b.file.split(":")[0]}:${number}`;
  const complete = new Set(briefs.filter((b) => b.status === "Complete").map((b) => dependencyKey(b, b.number)));
  const running = briefs.find((b) => b.status === "In progress");
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

function readDocsRoot(repoRoot) {
  const record = profilePath(repoRoot);
  if (!fs.existsSync(record)) return "docs";
  try {
    return JSON.parse(fs.readFileSync(record, "utf8")).docs ?? "docs";
  } catch {
    return "docs";
  }
}

/** Whether dispatching `skill` right now agrees with what the queue says. */
export function permits(result, skill) {
  if (result.installation?.requiresInit) return { allowed: false, reason: result.installation.reason };
  if (result.state === "unreadable") {
    if (skill === "cg-prepare" && result.repairableQueue) return { allowed: true, reason: "preparation may repair the selected queue syntax; production and closure remain blocked" };
    return { allowed: false, reason: `the Step queue does not parse:\n  ${result.problems.join("\n  ")}` };
  }
  if (result.state === "selection-required") return { allowed: false, reason: result.reason };
  if (skill === "cg-sign-off" && result.prototype) {
    return { allowed: true, entry: "prototype-completion", reason: `${result.prototype.programme}: admit the selected prototype for completion assessment; approval, prepared Steps, and passing final gates are still required to close` };
  }
  if (result.state === "repair-required") return { allowed: ["cg-prepare", "cg-unblock", "cg-auto-run"].includes(skill), reason: result.reason };
  if (result.state === "prototype" && ["cg-prepare", "cg-produce", "cg-sign-off"].includes(skill)) {
    return { allowed: false, reason: result.reason };
  }
  // Preparation repairs the plan of work, including when a failed evidence Step cannot run.
  // Allowing that edit does not authorize production or waive any existing blocker.
  if (skill === "cg-prepare") {
    return { allowed: true, reason: "preparation may amend the queue; production and sign-off remain gated by readiness" };
  }
  // Never gated: one resolves blockers, one is the adapter itself, one is pre-lifecycle, and
  // planning is what you run precisely when the queue has nothing to say.
  if (["cg-unblock", "cg-auto-run", "cg-warmup", "cg-plan", "cg-prototype"].includes(skill)) {
    return { allowed: true, reason: "not gated by queue state" };
  }
  if (skill === result.stage) return { allowed: true, reason: result.reason };
  return {
    allowed: false,
    reason: `queue state is \`${result.state}\` — ${result.reason}. Run \`${result.stage}\`, not \`${skill}\`.`,
  };
}
