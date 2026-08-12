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
/** A Step section opens the queue document: `## Step 3: name`. */
const STEP_HEADING = /^##[ \t]+Step[ \t]+(\d+)[ \t]*:?[ \t]*(.*)$/;

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
    number,
    problems,
  };
}

/** One document per phase: `<phase>_detailed_preparation.md`. */
const isQueueDocument = (name) => /_detailed_preparation\.md$/i.test(name);

/** Split a phase document into its Step sections, keeping each one's source line for reporting. */
export function parseQueueDocument(text, file) {
  const lines = text.split("\n");
  const starts = [];
  lines.forEach((line, index) => {
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
      reason: `no \`<phase>_detailed_preparation.md\` under ${docsRoot}/plans/ — a phase must be prepared before it can run`,
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
