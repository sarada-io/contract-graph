#!/usr/bin/env node
/** Check actual readiness and scoped completion authority before skill dispatch. */

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
  let state = { seen: [], completionProgramme: null, sprintProgramme: null };
  try {
    state = { ...state, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    state = { seen: [], completionProgramme: null, sprintProgramme: null };
  }
  return {
    seen: state.seen,
    completionProgramme: state.completionProgramme,
    sprintProgramme: state.sprintProgramme,
    admitSprint(programme) {
      state.sprintProgramme = programme;
      try { fs.writeFileSync(file, JSON.stringify(state), "utf8"); } catch { /* no scoped continuation */ }
    },
    admitDelivery(programme) {
      state.completionProgramme = programme;
      try { fs.writeFileSync(file, JSON.stringify(state), "utf8"); } catch { /* no durable grant */ }
    },
    record(skill) {
      if (state.seen.includes(skill)) return;
      try {
        state.seen = [...state.seen, skill];
        fs.writeFileSync(file, JSON.stringify(state), "utf8");
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
 * Use the same `cg` on PATH as ordinary skill commands. Do not silently prefer a repository
 * npm dependency. CG_BIN is an explicit development/test override; installed build identity
 * must still agree with the selected executable.
 */
function cgCommand() {
  if (process.env.CG_BIN) return [process.execPath, [process.env.CG_BIN]];
  return ["cg", []];
}

const GATED = /^cg-(produce|sign-off)$/;

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
if (["cg-prepare", "cg-auto-run"].includes(skill)) deny(`${skill} was retired in 0.7.0; use cg-plan and cg-produce.`);
const alreadyRan = store.seen.filter((s) => GATED.test(s));

if (!/^cg-(plan|prototype|produce|sign-off)$/.test(skill)) {
  store.record(skill);
  allow(`cg-gate: \`${skill || "unknown"}\` is not queue-gated`);
}


let result;
let expectedBuild = null;
try {
  expectedBuild = JSON.parse(fs.readFileSync(path.join(repoRoot, ".agents/cg/manifest.json"), "utf8")).runtime?.buildId ?? null;
} catch { /* Legacy repositories have no build handshake; a current CLI diagnoses them. */ }
try {
  const [bin, prefix] = cgCommand();
  const programme = process.env.CG_PROGRAMME || store.completionProgramme;
  const selection = programme ? ["--programme", programme] : [];
  const stdout = execFileSync(bin, [...prefix, "next", repoRoot, "--json", "--for", skill, ...selection], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  result = JSON.parse(stdout);
} catch (error) {
  // A non-zero exit is the deny path and still prints JSON; only unparseable output is a fault.
  try {
    result = JSON.parse(error.stdout ?? "");
  } catch {
    if (expectedBuild) deny("Blocked by cg-gate: the selected cg could not report its build identity. Update the global CLI and re-run cg init with the existing docs root and profiles; do not interpret this as a product or phase blocker.");
    allow(
      `cg-gate: NOT GATING — \`cg next\` did not run. Install a Contract Graph build that has it, ` +
        `or set CG_BIN to one. (${error.message.split("\n")[0]})`,
    );
  }
}

if (expectedBuild && result.installation?.runtime?.buildId !== expectedBuild) {
  deny("Blocked by cg-gate: the selected cg differs from the build that installed these skills, or is too old to identify itself. Update the global CLI and re-run cg init with the existing docs root and profiles. Do not switch programmes or waive gates to bypass an installation mismatch.");
}

// Entering sign-off admits only this programme. Chaining additionally requires an attributed,
// active completion request; this never releases production blockers or authorizes final closure.
const sprintChain = result.delivery === "sprint" && result.receipt?.completionRequest?.state === "Active" &&
  (result.receipt?.completionRequest?.session === input?.session_id || store.completionProgramme === result.receipt?.programme || store.sprintProgramme === result.receipt?.programme);
const deliveryChain = (result.receipt?.status === "Handed off" || sprintChain) &&
  result.receipt?.completionRequest?.state === "Active" &&
  store.completionProgramme === result.receipt.programme;
if (store.completionProgramme &&
    (result.receipt?.programme !== store.completionProgramme || (skill !== "cg-sign-off" && !deliveryChain && !sprintChain))) {
  deny("Blocked by cg-gate: delivery continuation requires an active completion request for the programme admitted by sign-off in this session. Return to that sign-off entry or obtain a new instruction for another programme.");
}

// A preview-only request does not grant finishing authority. Active scoped completion does.
if (GATED.test(skill) && alreadyRan.length && !alreadyRan.includes(skill) &&
    process.env.CG_GATE_CHAIN !== "1" && !deliveryChain && !sprintChain) {
  deny("Blocked by cg-gate: crossing into finishing or repair requires an active completion request for the selected delivery, or a new user instruction. A next-action recommendation alone is not authority.");
}

if (result.allowed) {
  store.record(skill);
  if (skill === "cg-produce" && result.delivery === "sprint") store.admitSprint(result.programme);
  if (skill === "cg-sign-off" && result.entry === "delivery-completion") store.admitDelivery(result.receipt.programme);
  allow(`cg-gate: queue agrees — ${result.reason}${result.executionAllowed === false ? " executionAllowed: false — preparation only, not implementation permission." : ""}`);
}

deny(
  `Blocked by cg-gate: the Step queue on disk does not support dispatching \`${skill}\`.\n\n` +
    `${result.reason}\n\n` +
    `This checks the production loop: the previous stage's Next action block is the ` +
    `model's account of lifecycle state, and \`cg next\` is the repository's. They disagree, so ` +
    `nothing advances. Run \`cg next\` to see the queue, fix the Step states or the blocker it ` +
    `names, and dispatch what it reports.`,
);
