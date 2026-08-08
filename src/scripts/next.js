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

/** The Step lifecycle, as `cg-prepare` and `cg-produce` write it into brief headers. */
export const STEP_STATES = Object.freeze([
  "Waiting",
  "Ready",
  "Blocked",
  "In progress",
  "Complete",
]);

const HEADER = /^(Priority|Depends on|Blocked by|Status|Weight):[ \t]*(.*)$/;
const STEP_ID = /\bStep\s+(\d+)\b/g;

/**
 * Parse one Step brief's header block.
 *
 * Only the header is read — everything below it is prose for a human and an executing agent.
 * Parsing stops at the first blank-line-separated section so a `Status:` mentioned in the body
 * can never be mistaken for the Step's own state.
 */
export function parseBrief(text, file) {
  const problems = [];
  const fields = {};
  const lines = text.split("\n");

  const title = lines[0]?.startsWith("# ") ? lines[0].slice(2).trim() : null;
  if (!title) problems.push(`${file}: no \`# Phase <n> Step <n>: <name>\` title`);

  for (const line of lines.slice(1)) {
    if (line.startsWith("## ")) break;
    const match = HEADER.exec(line);
    if (match) fields[match[1]] = match[2].trim();
  }

  const status = fields.Status ?? null;
  if (!status) problems.push(`${file}: no \`Status:\` header`);
  else if (!STEP_STATES.includes(status)) {
    problems.push(`${file}: unknown Status \`${status}\` — expected one of ${STEP_STATES.join(", ")}`);
  }

  const priority = Number.parseInt(fields.Priority ?? "", 10);
  if (!Number.isInteger(priority)) problems.push(`${file}: no integer \`Priority:\` header`);

  const none = (value) => !value || /^none$/i.test(value.trim());
  const ids = (value) => (none(value) ? [] : [...value.matchAll(STEP_ID)].map((m) => Number(m[1])));

  return {
    file,
    title,
    status,
    priority: Number.isInteger(priority) ? priority : null,
    dependsOn: ids(fields["Depends on"]),
    blockedBy: none(fields["Blocked by"]) ? null : fields["Blocked by"].trim(),
    number: Number(/\bStep\s+(\d+)\b/.exec(title ?? "")?.[1] ?? priority),
    problems,
  };
}

const isBrief = (name) => /^step-.*\.md$/i.test(name);

/** Every active Step brief. `archive/` holds closed phases and is deliberately excluded. */
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
      if (!isBrief(entry.name)) continue;
      briefs.push(
        parseBrief(fs.readFileSync(full, "utf8"), path.relative(repoRoot, full).split(path.sep).join("/")),
      );
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
export function next(repoRoot, { docs } = {}) {
  const docsRoot = docs ?? readDocsRoot(repoRoot);
  const briefs = readQueue(repoRoot, docsRoot);
  const problems = briefs.flatMap((b) => b.problems);

  if (problems.length) {
    return { state: "unreadable", stage: null, problems, briefs };
  }
  if (!briefs.length) {
    return {
      state: "no-queue",
      stage: "cg-prepare",
      reason: `no Step briefs under ${docsRoot}/plans/ — a phase must be prepared before it can run`,
      briefs,
      problems,
    };
  }

  const complete = new Set(briefs.filter((b) => b.status === "Complete").map((b) => b.number));
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
    .filter((b) => b.status === "Ready" && b.dependsOn.every((id) => complete.has(id)))
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
      : "no Step is Ready and none is Complete — the queue cannot advance",
    briefs,
    problems,
  };
}

function readDocsRoot(repoRoot) {
  const record = path.join(repoRoot, ".agents", "cg", "map", "profile.json");
  if (!fs.existsSync(record)) return "docs";
  try {
    return JSON.parse(fs.readFileSync(record, "utf8")).docs ?? "docs";
  } catch {
    return "docs";
  }
}

/** Whether dispatching `skill` right now agrees with what the queue says. */
export function permits(result, skill) {
  if (result.state === "unreadable") {
    return { allowed: false, reason: `the Step queue does not parse:\n  ${result.problems.join("\n  ")}` };
  }
  // Never gated: one resolves blockers, one is the adapter itself, one is pre-lifecycle, and
  // planning is what you run precisely when the queue has nothing to say.
  if (["cg-unblock", "cg-auto-run", "cg-warmup", "cg-plan"].includes(skill)) {
    return { allowed: true, reason: "not gated by queue state" };
  }
  if (skill === result.stage) return { allowed: true, reason: result.reason };
  return {
    allowed: false,
    reason: `queue state is \`${result.state}\` — ${result.reason}. Run \`${result.stage}\`, not \`${skill}\`.`,
  };
}
