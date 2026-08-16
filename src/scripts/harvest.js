/**
 * Validate a decision-harvest manifest.
 *
 * The harvest is where a decision stops being a log entry and becomes a rule, so it is the
 * one hand-off in the framework that can silently lose governance: a cohort that omits an
 * eligible decision drops it without a trace, and a promotion whose rule quotes its
 * originating case produces a rule that expires with the plan.
 *
 * These checks previously shipped as an instruction to run a Python script under a path no
 * scaffold ever created, in a tool with neither Python nor dependencies. A check nobody can
 * run is the failure mode this project exists to reject, so it lives here now.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  BEST_PRACTICE_FAMILIES,
  CORE_BINDING_FAMILIES,
  FORK_FAMILIES,
  PLAN_TICKET,
  RULE_FAMILIES,
  planPathPattern,
  splitLines,
} from "./model.js";

export class HarvestError extends Error {}

/** Where a classified decision may go. Mirrors `cg-unblock` D-5a. */
export const DESTINATIONS = Object.freeze([
  "contract",
  ...CORE_BINDING_FAMILIES,
  ...RULE_FAMILIES,
  ...BEST_PRACTICE_FAMILIES,
  ...FORK_FAMILIES,
  "drop",
]);

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * A stable fingerprint of the classification set.
 *
 * `cg-sign-off` §7.2 requires the accepted classification to survive the handoff unchanged;
 * the digest is what makes "unchanged" checkable rather than asserted. Sorted by ID so the
 * fingerprint tracks content, not file ordering.
 */
export function classificationDigest(classifications) {
  const canonical = [...classifications]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((entry) => `${entry.id}:${entry.destination}:${entry.rule ?? entry.reason ?? ""}`)
    .join("\n");
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

function readJson(file) {
  if (!fs.existsSync(file)) throw new HarvestError(`missing harvest manifest: ${file}`);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new HarvestError(`${file}: invalid JSON: ${error.message}`);
  }
}

/** Owner (`DU-NN`) and autonomous (`DA-NN`) decision-log ids. */
export const DECISION_ID = /^D[AU]-\d{2}$/;
const DECISION_HEADING = /^###\s+(D[AU]-\d{2})\b/;

/** The decision IDs listed under a `## Resolved` heading in the decision log. */
export function resolvedDecisionIds(logFile) {
  if (!fs.existsSync(logFile)) throw new HarvestError(`missing decision log: ${logFile}`);
  const ids = new Set();
  let inResolved = false;
  for (const line of splitLines(fs.readFileSync(logFile, "utf8"))) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      inResolved = /^resolved$/i.test(heading[1]);
      continue;
    }
    if (!inResolved) continue;
    const entry = DECISION_HEADING.exec(line);
    if (entry) ids.add(entry[1]);
  }
  return ids;
}

/**
 * Check one manifest. Returns {failures, digest, cohort, counts}.
 *
 * `stage: "close"` additionally requires the batch acceptance and, when a preparation record
 * is supplied, that the prepared drain route names this exact cohort and digest.
 */
export function checkHarvest(
  manifestFile,
  { decisionLog = null, stage = "classify", preparation = null, docsRoot = "docs" } = {},
) {
  const failures = [];
  const fail = (message) => failures.push(message);
  const manifest = readJson(manifestFile);
  const name = path.basename(manifestFile);

  if (!isNonEmptyString(manifest.cohort)) fail(`${name}: \`cohort\` must be a non-empty string`);
  if (!Array.isArray(manifest.eligibleDecisionIds)) {
    throw new HarvestError(`${name}: \`eligibleDecisionIds\` must be an array`);
  }
  if (!Array.isArray(manifest.classifications)) {
    throw new HarvestError(`${name}: \`classifications\` must be an array`);
  }

  const eligible = manifest.eligibleDecisionIds.map(String);
  const eligibleSet = new Set(eligible);
  if (eligible.length !== eligibleSet.size) {
    fail(`${name}: \`eligibleDecisionIds\` contains a duplicate`);
  }

  // Membership is exact in both directions: an omission drops a decision silently, and an
  // extra ID promotes something the cohort was never scoped to.
  const classified = manifest.classifications.map((entry) => String(entry.id));
  const classifiedSet = new Set(classified);
  if (classified.length !== classifiedSet.size) {
    fail(`${name}: the same decision is classified more than once`);
  }
  const malformed = [...new Set([...eligible, ...classified].filter((id) => !DECISION_ID.test(id)))];
  if (malformed.length) {
    fail(`${name}: decision id(s) must be DA-NN or DU-NN: ${malformed.join(", ")}`);
  }
  const missing = eligible.filter((id) => !classifiedSet.has(id));
  const extra = classified.filter((id) => !eligibleSet.has(id));
  if (missing.length) fail(`${name}: eligible decision(s) not classified: ${missing.join(", ")}`);
  if (extra.length) fail(`${name}: classified decision(s) not in the cohort: ${extra.join(", ")}`);

  const planPath = planPathPattern(docsRoot);
  for (const entry of manifest.classifications) {
    const id = String(entry.id);
    if (!DESTINATIONS.includes(entry.destination)) {
      fail(
        `${name}: ${id} has destination \`${entry.destination}\`; expected one of ` +
          DESTINATIONS.join(", "),
      );
      continue;
    }

    if (entry.destination === "drop") {
      // The reason is the whole record. A resolved decision is binding authority until it is
      // promoted or dropped, so one that leaves with no reason takes a rule the repository
      // was following with it — and the log drains, so this manifest is the only trace.
      if (!isNonEmptyString(entry.reason)) {
        fail(`${name}: ${id} is dropped without a reason — the manifest is its only record`);
      }
      continue;
    }

    if (!isNonEmptyString(entry.rule)) {
      fail(`${name}: ${id} promotes to ${entry.destination} without a \`rule\``);
      continue;
    }
    // §7.1: a promoted rule states itself in full. One that cites its own decision, a ticket,
    // or a plan path is a rule that expires when the plan is archived.
    if (planPath.test(entry.rule)) {
      fail(`${name}: ${id} states its rule by citing a transient plan path`);
    }
    if (PLAN_TICKET.test(entry.rule)) {
      fail(`${name}: ${id} states its rule by citing a plan ticket id`);
    }
    if (new RegExp(`\\b${id}\\b`).test(entry.rule)) {
      fail(`${name}: ${id} states its rule by citing the decision it came from`);
    }

    if (CORE_BINDING_FAMILIES.includes(entry.destination)) {
      if (!isNonEmptyString(entry.measure)) {
        fail(`${name}: ${id} promotes to ${entry.destination} and owes a deterministic measure`);
      }
      if (!isNonEmptyString(entry.detector)) {
        fail(`${name}: ${id} promotes to ${entry.destination} and owes a blocking detector`);
      }
      if (!isNonEmptyString(entry.negativeFixture)) {
        fail(`${name}: ${id} promotes to ${entry.destination} and owes a fail-on-demand fixture`);
      }
    } else if (BEST_PRACTICE_FAMILIES.includes(entry.destination)) {
      // A best practice is deliberately advisory. It moves to A only after it acquires the
      // structural impact, measure, detector, and negative fixture required above.
    } else if (FORK_FAMILIES.includes(entry.destination)) {
      if (!["invariant", "guide"].includes(entry.modality)) {
        fail(
          `${name}: ${id} promotes to ${entry.destination} without \`modality\` of invariant or guide`,
        );
      } else if (entry.modality === "invariant" && !isNonEmptyString(entry.detector)) {
        fail(`${name}: ${id} is a ${entry.destination} invariant and owes a detector`);
      } else if (entry.modality === "guide" && !isNonEmptyString(entry.cost)) {
        fail(`${name}: ${id} is a ${entry.destination} guide and owes a cost clause`);
      }
    } else if (!isNonEmptyString(entry.detector)) {
      fail(`${name}: ${id} promotes to ${entry.destination} and owes a detector`);
    }
  }

  if (decisionLog) {
    const resolved = resolvedDecisionIds(decisionLog);
    const unresolved = eligible.filter((id) => !resolved.has(id));
    if (unresolved.length) {
      fail(
        `${name}: decision(s) not in the log's Resolved section: ${unresolved.join(", ")} — ` +
          "a pending or unknown decision is never eligible",
      );
    }
  }

  const digest = classificationDigest(manifest.classifications);

  if (stage === "close") {
    const acceptance = manifest.acceptance;
    if (!eligible.length) {
      // §7.2: a valid empty cohort closes without acceptance or a route.
    } else if (!acceptance || typeof acceptance !== "object") {
      fail(`${name}: a non-empty cohort must carry an \`acceptance\` block before close`);
    } else {
      if (acceptance.status !== "accepted") {
        fail(`${name}: acceptance.status is \`${acceptance.status}\`; expected \`accepted\``);
      }
      if (!isNonEmptyString(acceptance.acceptedBy)) {
        fail(`${name}: acceptance.acceptedBy must name who accepted`);
      }
      if (!isNonEmptyString(acceptance.acceptedAt) || Number.isNaN(Date.parse(acceptance.acceptedAt))) {
        fail(`${name}: acceptance.acceptedAt must be an unambiguous instant`);
      }
      const accepted = new Set((acceptance.acceptedDecisionIds ?? []).map(String));
      const notAccepted = eligible.filter((id) => !accepted.has(id));
      const overAccepted = [...accepted].filter((id) => !eligibleSet.has(id));
      if (notAccepted.length || overAccepted.length) {
        fail(
          `${name}: acceptance must cover exactly the cohort — ` +
            `${notAccepted.length} missing, ${overAccepted.length} extra`,
        );
      }
    }

    if (preparation && eligible.length) {
      if (!fs.existsSync(preparation)) {
        fail(`${name}: preparation record not found: ${preparation}`);
      } else {
        const text = fs.readFileSync(preparation, "utf8");
        if (!text.includes(digest)) {
          fail(
            `${name}: the prepared drain route does not carry classification digest ${digest} — ` +
              "the accepted set is not provably the one being drained",
          );
        }
        const undrained = eligible.filter((id) => !text.includes(id));
        if (undrained.length) {
          fail(`${name}: prepared route omits drain id(s): ${undrained.join(", ")}`);
        }
      }
    }
  }

  const drops = manifest.classifications.filter((e) => e.destination === "drop").length;
  return {
    failures,
    digest,
    cohort: manifest.cohort,
    counts: { eligible: eligible.length, promoted: eligible.length - drops, dropped: drops },
  };
}
