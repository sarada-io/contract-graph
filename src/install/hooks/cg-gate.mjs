#!/usr/bin/env node
/**
 * Refuse a Contract Graph dispatch that the Step queue on disk does not agree with.
 *
 * `cg-auto-run` decides what to run next by reading the `Next action` block the previous stage
 * emitted — the model's own account of where the lifecycle is. That is enough for a convention
 * and not enough for enforcement: a stage that reports `Ready` when every Step is `Blocked`
 * advances an unattended run past exactly the condition that was meant to stop it.
 *
 * This runs before the Skill tool and answers the same question from `cg next`, which reads the
 * Step briefs instead. Agreement lets the dispatch through; disagreement denies it and says what
 * the queue actually shows. Two independent sources that must agree is the whole mechanism.
 *
 * Wire it as a PreToolUse hook on the Skill tool, and as a UserPromptSubmit hook. It reads the hook
 * payload on stdin and writes a permission decision on stdout. Anything it cannot answer
 * confidently is allowed: a gate that fails closed on its own bugs blocks the work it exists to
 * protect.
 *
 * ```json
 * { "hooks": {
 *     "PreToolUse":      [{ "matcher": "Skill",
 *                           "hooks": [{ "type": "command",
 *                                       "command": "node \"$CLAUDE_PROJECT_DIR/.agents/hooks/cg-gate.mjs\"" }] }],
 *     "UserPromptSubmit": [{ "hooks": [{ "type": "command",
 *                                        "command": "node \"$CLAUDE_PROJECT_DIR/.agents/hooks/cg-gate.mjs\"" }] }] } }
 * ```
 *
 * The UserPromptSubmit half is what makes the stage boundary usable rather than obstructive. The
 * boundary is meant to stop a *model* running the whole programme off one instruction — not to stop
 * *you* reading what a stage produced and then asking for the next one. Every turn you take clears
 * the record, so the rule reads as "one stage per instruction", and you never have to abandon a
 * session, and its context, to get past your own gate.
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/**
 * Which cg- stages this session has already dispatched.
 *
 * Kept in the OS temp directory, keyed by repository and session, because it is scratch state for
 * one conversation and the repository is not a place to put it — `cg residue` exists because this
 * framework takes that seriously.
 */
function sessionStore(repoRoot, sessionId) {
  const key = crypto.createHash("sha256").update(`${repoRoot}\u0000${sessionId}`).digest("hex").slice(0, 16);
  const file = path.join(os.tmpdir(), `cg-gate-${key}.json`);
  let seen = [];
  try {
    seen = JSON.parse(fs.readFileSync(file, "utf8")).seen ?? [];
  } catch {
    seen = [];
  }
  return {
    seen,
    record(skill) {
      if (seen.includes(skill)) return;
      try {
        fs.writeFileSync(file, JSON.stringify({ seen: [...seen, skill] }), "utf8");
      } catch {
        // Losing the record costs enforcement, never the user's work.
      }
    },
    reset() {
      try {
        fs.rmSync(file, { force: true });
      } catch {
        // Same trade: a stale record can only over-block, and the escape hatch is documented.
      }
    },
  };
}

/**
 * Where to find `cg`, most specific first.
 *
 * PATH alone is not enough. A globally installed `cg` may predate `cg next` entirely, in which
 * case it exits with "unknown command" and the gate silently stops gating — the failure mode
 * that matters most, because nothing looks wrong. `CG_BIN` lets a repository point at the build
 * it actually governs itself with.
 */
function cgCommand(repoRoot) {
  if (process.env.CG_BIN) return [process.execPath, [process.env.CG_BIN]];
  const local = path.join(repoRoot, "node_modules", ".bin", "cg");
  if (fs.existsSync(local)) return [local, []];
  return ["cg", []];
}

const GATED = /^cg-(prepare|produce|sign-off)$/;

const allow = (reason) => {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: reason } }),
  );
  process.exit(0);
};

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } }),
  );
  process.exit(0);
};

let payload = "";
for await (const chunk of process.stdin) payload += chunk;

let input;
try {
  input = JSON.parse(payload || "{}");
} catch {
  allow("cg-gate: unreadable hook payload, not gating");
}

const repoRoot = input?.cwd ?? process.cwd();
const store = sessionStore(repoRoot, input?.session_id ?? "no-session");

// A new instruction is a new turn: whatever the last one dispatched no longer constrains this one.
if (input?.hook_event_name === "UserPromptSubmit") {
  store.reset();
  process.exit(0);
}

const skill = input?.tool_input?.skill ?? "";
const alreadyRan = store.seen.filter((s) => GATED.test(s));
store.record(skill);

if (!GATED.test(skill)) allow(`cg-gate: \`${skill || "unknown"}\` is not queue-gated`);

/**
 * One stage per invocation, unless `cg-auto-run` is driving.
 *
 * A stage naming its successor is how a person knows what to do next; it is not permission for the
 * model to go and do it. Someone who runs `cg-prepare` to read the queue it produced, and is handed
 * a closed phase instead, has lost the review the stage boundary exists for — the decision point is
 * gone and the work already sits downstream of it.
 *
 * `cg-auto-run` is the sanctioned way across, because it carries the two things ad-hoc chaining
 * has none of: a granted authority level, and a ledger that survives a context break. Set
 * `CG_GATE_CHAIN=1` to allow chaining without it.
 */
if (
  alreadyRan.length &&
  !alreadyRan.includes(skill) &&
  !store.seen.includes("cg-auto-run") &&
  process.env.CG_GATE_CHAIN !== "1"
) {
  deny(
    `Blocked by cg-gate: \`${alreadyRan.join("\`, \`")}\` already ran in this session, and ` +
      `dispatching \`${skill}\` crosses a stage boundary.\n\n` +
      "One stage per invocation. The `Next action` block names the successor so the user can " +
      "choose it — naming it is not permission to take it, and continuing removes the review the " +
      "boundary exists for.\n\n" +
      "Report the stage that finished and stop. If the user wants the chain run for them, " +
      "`cg-auto-run` is what does it: it carries an authority level and a ledger " +
      "that survives a context break.\n\n" +
      "This resets on the user's next message, so they can simply ask for the next stage — they " +
      "do not need a new session, and should not be told to start one. To chain inside a single " +
      "instruction without `cg-auto-run`, set CG_GATE_CHAIN=1.",
  );
}

let result;
try {
  const [bin, prefix] = cgCommand(repoRoot);
  const stdout = execFileSync(bin, [...prefix, "next", repoRoot, "--json", "--for", skill], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  result = JSON.parse(stdout);
} catch (error) {
  // A non-zero exit is the deny path and still prints JSON; only unparseable output is a fault.
  try {
    result = JSON.parse(error.stdout ?? "");
  } catch {
    allow(
      `cg-gate: NOT GATING — \`cg next\` did not run. Install a Contract Graph build that has it, ` +
        `or set CG_BIN to one. (${error.message.split("\n")[0]})`,
    );
  }
}

if (result.allowed) allow(`cg-gate: queue agrees — ${result.reason}`);

deny(
  `Blocked by cg-gate: the Step queue on disk does not support dispatching \`${skill}\`.\n\n` +
    `${result.reason}\n\n` +
    `This is the enforcement half of cg-auto-run: the previous stage's Next action block is the ` +
    `model's account of lifecycle state, and \`cg next\` is the repository's. They disagree, so ` +
    `nothing advances. Run \`cg next\` to see the queue, fix the Step states or the blocker it ` +
    `names, and dispatch what it reports.`,
);
