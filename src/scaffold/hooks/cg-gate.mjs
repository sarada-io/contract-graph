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
 * Wire it as a PreToolUse hook on the Skill tool. It reads the hook payload on stdin and writes
 * a permission decision on stdout. Anything it cannot answer confidently is allowed: a gate that
 * fails closed on its own bugs blocks the work it exists to protect.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

const skill = input?.tool_input?.skill ?? "";
if (!GATED.test(skill)) allow(`cg-gate: \`${skill || "unknown"}\` is not queue-gated`);

const repoRoot = input?.cwd ?? process.cwd();

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
