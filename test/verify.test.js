/**
 * Fail-on-demand coverage for the verifier.
 *
 * Every negative case here is load-bearing. A verifier suite that only proves the green
 * path passes is indistinguishable from a verifier that checks nothing — which is the exact
 * failure mode `map/enforcement.md` warns about. Each test mutates one thing in an
 * otherwise-green repository and asserts the specific check fires.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { init, SCAFFOLD_MAPPING, SOURCE_ROOT } from "../src/scripts/init.js";
import { checkHarvest } from "../src/scripts/harvest.js";
import { detectModuleRoots, moduleCoverage, subBoundaryCount } from "../src/scripts/modules.js";
import { renderAgentRule } from "../src/scripts/model.js";
import { next, permits } from "../src/scripts/next.js";
import { sync } from "../src/scripts/sync.js";
import { CORE_CG_SKILLS, verify } from "../src/scripts/verify.js";
import {
  parsePrinciples,
  loadPrinciples,
  splitLines,
  ContractError,
  REQUIRED_SECTIONS,
} from "../src/scripts/model.js";
import {
  ProfileError,
  availableProfiles,
  loadProfileConfig,
  resolveProfiles,
} from "../src/scripts/profiles.js";

/** A green repository: core template plus the named domain packs, synced. */
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-test-"));
  init(dir, {});
  sync(dir);
  return dir;
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), "utf8");
const write = (dir, rel, text) => fs.writeFileSync(path.join(dir, rel), text, "utf8");
const edit = (dir, rel, fn) => write(dir, rel, fn(read(dir, rel)));
const sha = (text) => crypto.createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");

/** Assert at least one failure carries the given check code, and show all of them if not. */
function assertFails(dir, code, note) {
  const { failures } = verify(dir);
  const hit = failures.some((f) => f.startsWith(`[${code}]`));
  assert.ok(
    hit,
    `expected a [${code}] failure (${note}); got:\n${failures.map((f) => `  ${f}`).join("\n") || "  (none)"}`,
  );
}

const CONTRACT = "src/.agents/cg/contract.md";
const INHERITANCE = ".agents/cg/map/inheritance.json";
const PROFILE = ".agents/cg/map/profile.json";
const MANIFEST = ".agents/cg/map/manifest.json";
const OPERATIONS = ".agents/cg/principles/operations.md";
const ENFORCEMENT = ".agents/cg/map/enforcement.md";
const PRODUCT = ".agents/cg/principles/product.md";
const ARCHITECTURE = ".agents/cg/principles/architecture.md";

// ---------------------------------------------------------------- green path

test("a freshly initialised repository verifies green", () => {
  const dir = makeRepo();
  const { failures, counts } = verify(dir);
  assert.deepEqual(failures, []);
  assert.equal(counts.folders, 1);
  assert.equal(counts.roots, 3);
  assert.equal(counts.skills, CORE_CG_SKILLS.length);
  assert.ok(counts.design > 0);
});

test("sync is idempotent — the second run rewrites nothing", () => {
  const dir = makeRepo();
  assert.deepEqual(sync(dir).changed, []);
});

test("init never overwrites an existing file", () => {
  const dir = makeRepo();
  const sentinel = "# mine, not yours\n";
  write(dir, CONTRACT, sentinel);
  const { written, skipped } = init(dir, {});
  assert.deepEqual(written, []);
  assert.ok(skipped.length > 0);
  assert.equal(read(dir, CONTRACT), sentinel);
});

test("init persists the selected profiles and domain packs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-profile-record-"));
  init(dir, { profiles: ["claude"] });
  assert.deepEqual(JSON.parse(read(dir, PROFILE)), { profiles: ["claude"], docs: "docs" });
});

test("a Claude-only selection syncs and verifies without other root pointers", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-claude-only-"));
  init(dir, { profiles: ["claude"] });
  sync(dir);
  assert.ok(fs.existsSync(path.join(dir, "CLAUDE.md")));
  assert.ok(!fs.existsSync(path.join(dir, "AGENTS.md")));
  assert.ok(!fs.existsSync(path.join(dir, ".github", "copilot-instructions.md")));
  const result = verify(dir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.counts.roots, 1);
});

test("a missing scaffold profile record fails verification", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, PROFILE));
  assert.match(verify(dir).failures.join("\n"), /missing scaffold profile record/);
});

test("shipped profile configs validate and all resolves to their union", () => {
  assert.deepEqual(availableProfiles(), ["all", "antigravity", "claude", "codex", "copilot"]);
  const all = resolveProfiles(["all"]);
  assert.deepEqual(all.rootPointers, {
    "CLAUDE.md": "",
    "AGENTS.md": "",
    ".github/copilot-instructions.md": "../",
  });
  assert.deepEqual(all.skillWrappers, {
    dir: ".claude/skills",
    template: "claude-wrapper",
  });
});

test("a malformed profile config fails with its filename and field", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-profile-config-"));
  const file = path.join(root, "broken.scaffolding.conf.json");
  fs.writeFileSync(
    file,
    JSON.stringify({ name: "broken", displayName: "Broken", rootPointers: [], extends: [] }),
  );
  assert.throws(
    () => loadProfileConfig("broken", { root }),
    (error) =>
      error instanceof ProfileError &&
      error.message.includes(file) &&
      error.message.includes("rootPointers"),
  );
});

test("profile extends cycles are rejected by name", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cg-profile-cycle-"));
  for (const [name, parent] of [
    ["one", "two"],
    ["two", "one"],
  ]) {
    fs.writeFileSync(
      path.join(root, `${name}.scaffolding.conf.json`),
      `${JSON.stringify({ name, displayName: name, rootPointers: {}, extends: [parent] })}\n`,
    );
  }
  assert.throws(() => resolveProfiles(["one"], { root }), /one -> two -> one/);
});

const PROFILE_ARTIFACTS = {
  all: [
    ".github/copilot-instructions.md",
    "AGENTS.md",
    "CLAUDE.md",
    ...CORE_CG_SKILLS.map((name) => `.claude/skills/${name}/SKILL.md`),
  ],
  antigravity: [],
  claude: [
    "CLAUDE.md",
    ...CORE_CG_SKILLS.map((name) => `.claude/skills/${name}/SKILL.md`),
  ],
  codex: ["AGENTS.md"],
  copilot: [".github/copilot-instructions.md"],
};

const isDiscoveryArtifact = (file) =>
  ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"].includes(file) ||
  file.startsWith(".claude/skills/");

function discoveryArtifacts(dir) {
  return filesUnder(dir).filter(isDiscoveryArtifact);
}

for (const [profile, expected] of Object.entries(PROFILE_ARTIFACTS)) {
  test(`profile ${profile} scaffolds exactly its declared discovery artifacts`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cg-profile-${profile}-`));
    init(dir, { profiles: [profile] });
    sync(dir);
    assert.deepEqual(discoveryArtifacts(dir), expected.sort());
    assert.deepEqual(verify(dir).failures, []);
  });
}

/**
 * The harness-neutral claim, asserted rather than assumed. A profile selects a discovery
 * surface and nothing else: governance under `.agents/` is byte-identical for every editor,
 * with `map/profile.json` the one file that records the selection and so must differ.
 *
 * Without this, a profile that started writing its own governance would pass every other
 * test — each profile's own artifacts would still be exactly what it declares — while the
 * neutrality promise in README and docs/scaffolding.md quietly stopped being true.
 */
test("every profile scaffolds byte-identical universal governance", () => {
  const universal = (profile) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cg-neutral-${profile}-`));
    init(dir, { profiles: [profile] });
    sync(dir);
    return filesUnder(dir)
      .filter((file) => !isDiscoveryArtifact(file))
      .map((file) => [file, file === PROFILE ? "<records the selection>" : read(dir, file)]);
  };

  const baseline = universal("all");
  assert.ok(baseline.length > 0);
  for (const profile of Object.keys(PROFILE_ARTIFACTS)) {
    if (profile === "all") continue;
    assert.deepEqual(
      universal(profile),
      baseline,
      `universal governance differs between profiles "all" and "${profile}" — ` +
        `a profile may only add discovery artifacts, and the culprit may be either name`,
    );
  }
});

test("a selected Claude profile fails when its wrappers are deleted", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-claude-wrapper-required-"));
  init(dir, { profiles: ["claude"] });
  sync(dir);
  fs.rmSync(path.join(dir, ".claude", "skills", "cg-produce"), { recursive: true });
  assertFails(dir, 9, "selected Claude profile requires wrappers");
});

test("a profile that never selected Claude is green without wrappers", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-no-claude-wrapper-"));
  init(dir, { profiles: ["codex"] });
  sync(dir);
  assert.ok(!fs.existsSync(path.join(dir, ".claude")));
  assert.deepEqual(verify(dir).failures, []);
});

test("an unknown profile fails by name and lists valid profiles", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-unknown-profile-"));
  assert.throws(
    () => init(dir, { profiles: ["cursor"] }),
    /unknown profile\(s\): cursor\. Available: all, antigravity, claude, codex, copilot/,
  );
  assert.deepEqual(filesUnder(dir), []);
});

// ---------------------------------------------------------- contract drift

test("[3] a hand-edited inherited block fails", () => {
  const dir = makeRepo();
  edit(dir, CONTRACT, (t) => t.replace(/^- \*\*AP-01-01\*\* — .*$/m, "- **AP-01-01** — nope"));
  assertFails(dir, 3, "hand-edited inherited rule text");
});

test("[3] a deleted inherited rule line fails", () => {
  const dir = makeRepo();
  edit(dir, CONTRACT, (t) =>
    splitLines(t)
      .filter((l) => !l.startsWith("- **AP-02-01**"))
      .join("\n") + "\n",
  );
  assertFails(dir, 3, "inherited rule removed by hand");
});

test("[6] an inheritance rule id absent from the principles files fails", () => {
  const dir = makeRepo();
  edit(dir, INHERITANCE, (t) => t.replace('"AP-01-01"', '"AP-99-99"'));
  assertFails(dir, 6, "dangling rule reference");
});

test("[7] a depth that disagrees with the key fails", () => {
  const dir = makeRepo();
  edit(dir, INHERITANCE, (t) => t.replace('"depth": 1', '"depth": 3'));
  assertFails(dir, 7, "depth/key mismatch");
});

test("[2] a missing required section fails", () => {
  const dir = makeRepo();
  // A renamed heading, not a deleted one: the check must not accept a substring match.
  edit(dir, CONTRACT, (t) => t.replace("## Verify Command", "## Verify Commands (typo)"));
  assertFails(dir, 2, "missing `## Verify Command`");
});

test("[2] a contract with no Invariants heading fails", () => {
  const dir = makeRepo();
  edit(dir, CONTRACT, (t) => t.replace("## Hard Invariants", "## Things That Matter"));
  assertFails(dir, 2, "no heading matching /Invariants/");
});

// ------------------------------------------------------- self-sufficiency

test("[5] a contract citing a transient plan path fails", () => {
  const dir = makeRepo();
  edit(dir, CONTRACT, (t) => `${t}\nSee docs/plans/whatever-v1.md for the rule.\n`);
  assertFails(dir, 5, "cites a plan path");
});

test("[5] a contract citing a plan ticket id fails", () => {
  const dir = makeRepo();
  edit(dir, CONTRACT, (t) => `${t}\nDefined by CS-4.2 elsewhere.\n`);
  assertFails(dir, 5, "cites a plan ticket id");
});

test("[5] a rule ID is not mistaken for a plan ticket id", () => {
  const dir = makeRepo();
  edit(dir, CONTRACT, (t) => `${t}\nThis folder is bound by AP-01-02.\n`);
  const { failures } = verify(dir);
  assert.deepEqual(
    failures.filter((f) => f.startsWith("[5]")),
    [],
  );
});

// ------------------------------------------------------------- pointers

test("[1] a module folder missing CLAUDE.md fails", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, "src", "CLAUDE.md"));
  assertFails(dir, 1, "module not openable as a workspace root");
});

test("[1] a pointer without the principles reference fails", () => {
  const dir = makeRepo();
  edit(dir, "src/AGENTS.md", (t) => t.replace("../.agents/cg/principles/", "somewhere"));
  assertFails(dir, 1, "pointer missing principles reference");
});

// ---------------------------------------------------------- root indexes

test("[8] a stale root principle index fails", () => {
  const dir = makeRepo();
  edit(dir, "AGENTS.md", (t) => t.replace(/\(\d+ rules\)/, "(999 rules)"));
  assertFails(dir, 8, "stale generated principle index");
});

// --------------------------------------------------------------- skills

test("[9] a skill whose frontmatter name mismatches its folder fails", () => {
  const dir = makeRepo();
  edit(dir, ".agents/skills/cg-plan/SKILL.md", (t) =>
    t.replace("name: cg-plan", "name: cg-planning"),
  );
  assertFails(dir, 9, "frontmatter/folder name mismatch");
});

test("[9] a missing Claude discovery wrapper fails", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, ".claude", "skills", "cg-produce", "SKILL.md"));
  assertFails(dir, 9, "wrapper absent");
});

test("[9] a hand-edited Claude discovery wrapper fails", () => {
  const dir = makeRepo();
  edit(dir, ".claude/skills/cg-produce/SKILL.md", (t) => `${t}\nextra instruction\n`);
  assertFails(dir, 9, "wrapper drift");
});

test("[9] a wrapper with no canonical source fails", () => {
  const dir = makeRepo();
  const orphan = path.join(dir, ".claude", "skills", "cg-ghost");
  fs.mkdirSync(orphan, { recursive: true });
  fs.writeFileSync(path.join(orphan, "SKILL.md"), "---\nname: cg-ghost\n---\n");
  assertFails(dir, 9, "orphan wrapper");
});

test("[9] a skill missing from the CONTRACT catalog fails", () => {
  const dir = makeRepo();
  edit(dir, ".agents/cg/contract.md", (t) =>
    t.replace("](../skills/cg-unblock/SKILL.md)", "](elsewhere)"),
  );
  assertFails(dir, 9, "skill absent from catalog");
});

test("[9] a missing core skill fails", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, ".agents", "skills", "cg-sign-off"), { recursive: true });
  fs.rmSync(path.join(dir, ".claude", "skills", "cg-sign-off"), { recursive: true });
  assertFails(dir, 9, "core skill removed");
});

// ----------------------------------------------------- fork principles

test("[10] a guide carrying an enforcement-map row fails", () => {
  const dir = makeRepo();
  const guide = /- \*\*(OP-\d{2}-\d{2})\*\* `guide`/.exec(read(dir, OPERATIONS));
  assert.ok(guide, "fixture must contain an OP guide");
  edit(dir, ENFORCEMENT, (t) => `${t}\n| ${guide[1]} | some detector |\n`);
  assertFails(dir, 10, "guide must not be in the enforcement map");
});

test("[10] an invariant with no enforcement-map row fails", () => {
  const dir = makeRepo();
  edit(dir, OPERATIONS, (t) => t.replace("** `guide` —", "** `invariant` —"));
  assertFails(dir, 10, "invariant owes exactly one detector row");
});

test("[10] a rule filed in the wrong family file fails", () => {
  const dir = makeRepo();
  edit(dir, OPERATIONS, (t) => t.replace(/\*\*OP-/, "**SP-"));
  assertFails(dir, 10, "a rule whose family disagrees with its file");
});

test("[10] a guide with no Cost clause fails", () => {
  const dir = makeRepo();
  edit(dir, OPERATIONS, (t) =>
    splitLines(t)
      .filter((l) => !l.startsWith("  **Cost:**"))
      .join("\n") + "\n",
  );
  assertFails(dir, 10, "guide owes exactly one Cost clause");
});

test("[10] a malformed fork rule line fails", () => {
  const dir = makeRepo();
  edit(dir, OPERATIONS, (t) => t.replace(/`(invariant|guide)` — /, ""));
  assertFails(dir, 10, "rule missing its modality marker");
});

test("[10] an inherited fork principle fails", () => {
  const dir = makeRepo();
  edit(dir, INHERITANCE, (t) => t.replace('"AP-01-01"', '"OP-01-01"'));
  assertFails(dir, 10, "DP must be loaded explicitly, never inherited");
});

test("[10] an enforcement row for an unknown fork id fails", () => {
  const dir = makeRepo();
  edit(dir, ENFORCEMENT, (t) => `${t}\n| OP-99-99 | ghost detector |\n`);
  assertFails(dir, 10, "enforcement map references a nonexistent rule");
});

// ------------------------------------------- architecture principle coverage

test("[10] an architecture principle with no enforcement-map row fails", () => {
  const dir = makeRepo();
  edit(dir, ENFORCEMENT, (t) =>
    splitLines(t)
      .filter((l) => !l.startsWith("| AP-04-01 "))
      .join("\n") + "\n",
  );
  assertFails(dir, 10, "every AP rule owes exactly one detector row");
});

test("[10] a new architecture principle without its detector row fails", () => {
  const dir = makeRepo();
  edit(dir, ARCHITECTURE, (t) =>
    t.replace(
      "## AP-02.",
      "- **AP-01-04** — A rule invented without its detector must not merge.\n\n## AP-02.",
    ),
  );
  assertFails(dir, 10, "AP-01-02 is only real if adding a rule without a row fails");
});

test("[10] an enforcement row for an unknown architecture id fails", () => {
  const dir = makeRepo();
  edit(dir, ENFORCEMENT, (t) => `${t}\n| AP-99-99 | ghost detector |\n`);
  assertFails(dir, 10, "enforcement map references a nonexistent principle");
});

test("[10] a duplicated architecture detector row fails", () => {
  const dir = makeRepo();
  edit(dir, ENFORCEMENT, (t) => `${t}\n| AP-04-01 | a second, competing detector |\n`);
  assertFails(dir, 10, "exactly one row means one, not two");
});

// ---------------------------------------------------------- decision harvest

/**
 * The harvest is the one hand-off that can silently lose governance.
 *
 * A resolved decision is binding authority under `cg-unblock` D-2 until it is promoted or
 * dropped, and the log drains at phase close — so the manifest is the only durable record
 * that a dropped decision ever existed. These checks shipped as an instruction to run a
 * Python script no scaffold creates; a check nobody can run is exactly what this project
 * refuses to count as enforcement.
 */
const COHORT = {
  cohort: "phase-3",
  eligibleDecisionIds: ["DL-01-01", "DL-02-03"],
  classifications: [
    {
      id: "DL-01-01",
      destination: "AP",
      rule: "Every request entering the system carries a trace id.",
      detector: "middleware test asserts a trace id on every inbound request",
    },
    { id: "DL-02-03", destination: "drop", reason: "superseded by the tenancy contract" },
  ],
};

function harvestFixture(mutate = (m) => m) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-harvest-"));
  const manifest = structuredClone(COHORT);
  mutate(manifest);
  const file = path.join(dir, "harvest.json");
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    path.join(dir, "log.md"),
    "# Decision log\n\n## Pending your review\n\n_(none)_\n\n## Resolved\n\n" +
      "### DL-01-01 — trace ids\nanswered.\n\n### DL-02-03 — tenancy\nanswered.\n",
  );
  return { dir, file, log: path.join(dir, "log.md") };
}

const harvestFailures = (mutate, options) => {
  const { file, log } = harvestFixture(mutate);
  return checkHarvest(file, { decisionLog: log, ...options }).failures.join("\n");
};

test("a well-formed harvest cohort passes and reports a stable digest", () => {
  const { file, log } = harvestFixture();
  const first = checkHarvest(file, { decisionLog: log });
  assert.deepEqual(first.failures, []);
  assert.deepEqual(first.counts, { eligible: 2, promoted: 1, dropped: 1 });
  assert.match(first.digest, /^[0-9a-f]{16}$/);
  // The digest tracks content, not file order — otherwise it cannot prove the accepted set
  // survived the handoff unchanged.
  const { file: reordered, log: log2 } = harvestFixture((m) => m.classifications.reverse());
  assert.equal(checkHarvest(reordered, { decisionLog: log2 }).digest, first.digest);
});

test("a dropped decision without a reason fails — the manifest is its only record", () => {
  assert.match(
    harvestFailures((m) => delete m.classifications[1].reason),
    /DL-02-03 is dropped without a reason/,
  );
});

test("cohort membership must be exact in both directions", () => {
  assert.match(harvestFailures((m) => m.classifications.pop()), /not classified: DL-02-03/);
  assert.match(
    harvestFailures((m) =>
      m.classifications.push({ id: "DL-09-99", destination: "drop", reason: "x" }),
    ),
    /not in the cohort: DL-09-99/,
  );
});

test("a promoted rule may not take its authority from a transient source", () => {
  assert.match(
    harvestFailures((m) => (m.classifications[0].rule = "Per DL-01-01, carry a trace id.")),
    /citing the decision it came from/,
  );
  assert.match(
    harvestFailures((m) => (m.classifications[0].rule = "See docs/plans/roadmap.md.")),
    /citing a transient plan path/,
  );
  assert.match(
    harvestFailures((m) => (m.classifications[0].rule = "As agreed in CS-4.2, carry a trace id.")),
    /citing a plan ticket id/,
  );
});

test("a promotion owes what its destination owes", () => {
  assert.match(harvestFailures((m) => delete m.classifications[0].detector), /owes a detector/);
  assert.match(
    harvestFailures((m) => {
      m.classifications[0].destination = "DP";
      delete m.classifications[0].detector;
    }),
    /without `modality`/,
  );
  assert.match(
    harvestFailures((m) => {
      m.classifications[0].destination = "DP";
      m.classifications[0].modality = "guide";
      delete m.classifications[0].detector;
    }),
    /owes a cost clause/,
  );
});

test("a decision that is not Resolved is never eligible", () => {
  assert.match(
    harvestFailures((m) => {
      m.eligibleDecisionIds = ["DL-01-01", "DL-02-99"];
      m.classifications[1] = { id: "DL-02-99", destination: "drop", reason: "x" };
    }),
    /not in the log's Resolved section: DL-02-99/,
  );
});

test("closing requires acceptance covering exactly the cohort", () => {
  assert.match(harvestFailures((m) => m, { stage: "close" }), /must carry an `acceptance` block/);
  const accept = (m, over) => {
    m.acceptance = {
      status: "accepted",
      acceptedBy: "owner",
      acceptedAt: "2026-08-05T10:00:00Z",
      acceptedDecisionIds: over ?? m.eligibleDecisionIds,
    };
  };
  assert.deepEqual(
    checkHarvest(harvestFixture((m) => accept(m)).file, { stage: "close" }).failures,
    [],
  );
  assert.match(
    harvestFailures((m) => accept(m, ["DL-01-01"]), { stage: "close" }),
    /must cover exactly the cohort/,
  );
  assert.match(
    harvestFailures((m) => {
      accept(m);
      m.acceptance.status = "pending";
    }, { stage: "close" }),
    /expected `accepted`/,
  );
});

test("an empty cohort closes without acceptance", () => {
  const { file } = harvestFixture((m) => {
    m.eligibleDecisionIds = [];
    m.classifications = [];
  });
  assert.deepEqual(checkHarvest(file, { stage: "close" }).failures, []);
});

test("the prepared drain route must carry the accepted digest and every drain id", () => {
  const { dir, file, log } = harvestFixture((m) => {
    m.acceptance = {
      status: "accepted",
      acceptedBy: "owner",
      acceptedAt: "2026-08-05T10:00:00Z",
      acceptedDecisionIds: m.eligibleDecisionIds,
    };
  });
  const { digest } = checkHarvest(file, { decisionLog: log });
  const prep = path.join(dir, "preparation.md");

  fs.writeFileSync(prep, "# Preparation\n\nno route recorded here\n");
  assert.match(
    checkHarvest(file, { stage: "close", preparation: prep }).failures.join("\n"),
    /does not carry classification digest/,
  );

  fs.writeFileSync(prep, `# Preparation\n\ndigest ${digest}\ndrain: DL-01-01\n`);
  assert.match(
    checkHarvest(file, { stage: "close", preparation: prep }).failures.join("\n"),
    /omits drain id\(s\): DL-02-03/,
  );

  fs.writeFileSync(prep, `# Preparation\n\ndigest ${digest}\ndrain: DL-01-01, DL-02-03\n`);
  assert.deepEqual(checkHarvest(file, { stage: "close", preparation: prep }).failures, []);
});

// ------------------------------------------------------ module discovery

/**
 * The gap warmup exists to close, made visible.
 *
 * A freshly initialised brownfield repository verifies green while governing none of its
 * real modules — the inheritance map ships with one example entry, so the verifier checks
 * that entry and nothing else. Detection reads build manifests, so it is a heuristic and
 * reports as an advisory rather than a failure; a heuristic that fails the build is one
 * everyone learns to bypass.
 */
function brownfieldRepo(layout) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-modules-"));
  for (const [file, body] of Object.entries(layout)) {
    fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), body);
  }
  return dir;
}

test("module detection reads build manifests and skips vendored trees", () => {
  const dir = brownfieldRepo({
    "go.mod": "module example.com/app\n",
    "web/package.json": "{}\n",
    "services/billing/go.mod": "module example.com/billing\n",
    "node_modules/junk/package.json": "{}\n",
    "vendor/dep/go.mod": "module vendored\n",
    "api/handler.go": "// no manifest of its own\n",
  });
  const found = detectModuleRoots(dir).map((m) => m.path);
  assert.deepEqual(found, [".", "services/billing", "web"]);
});

test("an unmapped module root is reported as an advisory, not a failure", () => {
  const dir = brownfieldRepo({
    "go.mod": "module example.com/app\n",
    "web/package.json": "{}\n",
    "api/handler.go": "// code\n",
  });
  init(dir, {});
  sync(dir);
  const { failures, advisories, counts } = verify(dir);

  assert.deepEqual(failures, [], "an unmapped module must never fail the build on a heuristic");
  assert.equal(counts.modules.detected, 2);
  assert.equal(counts.modules.unmapped, 2);
  assert.match(advisories.join("\n"), /web\/ looks like a module root \(package\.json\)/);
  assert.match(advisories.join("\n"), /cg-warmup/, "the advisory must name the way out");
});

test("a brownfield init leaves no starter module mapped", () => {
  const dir = brownfieldRepo({ "go.mod": "module x\n", "api/handler.go": "// code\n" });
  init(dir, {});
  assert.deepEqual(
    JSON.parse(read(dir, INHERITANCE)).folders,
    {},
    "a map entry for the skipped starter module would dangle and break the first sync",
  );
  assert.doesNotThrow(() => sync(dir));
  assert.deepEqual(verify(dir).failures, []);
});

test("mapping a parent covers the modules beneath it", () => {
  const dir = brownfieldRepo({
    "services/billing/go.mod": "module b\n",
    "services/orders/go.mod": "module o\n",
  });
  init(dir, {});
  const { unmapped: before } = moduleCoverage(dir, {});
  assert.equal(before.length, 2);
  const { unmapped: after } = moduleCoverage(dir, { services: {} });
  assert.deepEqual(after, [], "a contract on services/ governs what is under it");
});

// ------------------------------------------------------ brownfield safety

/**
 * The starter module tree is a worked example for a repository with no modules yet.
 * Writing it into a repository that already has modules invents one that does not exist,
 * and `cg verify` would then pass while governing none of the real ones.
 */
test("init scaffolds the starter module only into an empty repository", () => {
  const greenfield = fs.mkdtempSync(path.join(os.tmpdir(), "cg-greenfield-"));
  const green = init(greenfield, {});
  assert.equal(green.brownfield, false);
  assert.ok(fs.existsSync(path.join(greenfield, "src", ".agents", "cg", "contract.md")));

  const brown = fs.mkdtempSync(path.join(os.tmpdir(), "cg-brown-module-"));
  fs.mkdirSync(path.join(brown, "api"));
  fs.writeFileSync(path.join(brown, "api", "handler.go"), "// existing\n");
  const result = init(brown, {});
  assert.equal(result.brownfield, true);
  assert.ok(!fs.existsSync(path.join(brown, "src")), "must not invent a module that does not exist");
  assert.ok(fs.existsSync(path.join(brown, ".agents", "cg", "contract.md")), "governance still lands");
});

test("a repository holding only README, LICENSE and git metadata still counts as empty", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-nearly-empty-"));
  fs.writeFileSync(path.join(dir, "README.md"), "# new project\n");
  fs.writeFileSync(path.join(dir, "LICENSE"), "Apache-2.0\n");
  fs.mkdirSync(path.join(dir, ".git"));
  assert.equal(init(dir, {}).brownfield, false);
  assert.ok(fs.existsSync(path.join(dir, "src", ".agents", "cg", "contract.md")));
});

/**
 * `sync` owns the region between its markers, never the whole file.
 *
 * A repository adopting Contract Graph usually already has a root `CLAUDE.md`. Replacing it
 * wholesale destroys hand-written instructions with no recovery but git — and `sync` is the
 * very next command `init` tells you to run.
 */
test("sync preserves a hand-written root pointer and adds its block under the H1", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-brownfield-"));
  init(dir, {});
  const mine = "# Our house rules\n\nAlways run `make lint` before pushing.\n";
  write(dir, "CLAUDE.md", mine);

  sync(dir);
  const after = read(dir, "CLAUDE.md");
  assert.match(after, /# Our house rules/);
  assert.match(after, /make lint/, "hand-written guidance must survive");
  assert.match(after, /BEGIN PRINCIPLES INDEX/);
  assert.deepEqual(verify(dir).failures, []);
  assert.deepEqual(sync(dir).changed, [], "a second sync must rewrite nothing");
});

test("sync refuses a root pointer with content but no H1 to anchor the block", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-brownfield-noh1-"));
  init(dir, {});
  write(dir, "CLAUDE.md", "just some prose with no heading at all\n");
  assert.throws(() => sync(dir), /no H1 to anchor/);
  assert.match(read(dir, "CLAUDE.md"), /just some prose/, "the file must be left alone");
});

// -------------------------------------------------- narrowing a selection

/**
 * Deselecting a profile must not leave its artifacts behind unnoticed.
 *
 * Both checks used to sit *inside* a guard on the profile still being selected — so the
 * moment you narrowed the selection, the check that would have caught the leftovers was the
 * thing that got switched off. The repository kept a full discovery surface it no longer
 * claimed to support, and `cg verify` said OK.
 */
test("[9] wrappers left by a deselected profile fail", () => {
  const dir = makeRepo();
  init(dir, { profiles: ["codex"] });
  sync(dir);
  assert.ok(fs.existsSync(path.join(dir, ".claude", "skills")), "the leftovers are still there");
  assertFails(dir, 9, "wrappers no selected profile declares");
});

test("[8] a root pointer left by a deselected profile fails", () => {
  const dir = makeRepo();
  init(dir, { profiles: ["claude"] });
  sync(dir);
  assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")), "the leftover is still there");
  assertFails(dir, 8, "a generated entry point no profile writes");
});

test("a hand-written root file with no generated block is not an orphan", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-own-file-"));
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# mine\n\nnotes.\n");
  init(dir, { profiles: ["claude"] });
  sync(dir);
  assert.deepEqual(verify(dir).failures, [], "the repository's own file is none of our business");
  assert.match(read(dir, "AGENTS.md"), /notes\./);
});

// ----------------------------------------------------------------- cli

/**
 * A retired flag must fail, not be ignored.
 *
 * Selection moved into `map/phases.json` in 0.1.0 and `--packs` was retired. Swallowed as an
 * unknown boolean, it left its value to be read as a positional argument and scaffolded a
 * repository silently, exit code 0. An upgrade failure that reports success is worse than one
 * that stops.
 */
test("the CLI refuses an unknown option instead of ignoring it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-cli-flags-"));
  const target = path.join(dir, "repo");
  const run = (args) => {
    try {
      execFileSync(process.execPath, [path.join(SOURCE_ROOT, "..", "bin", "cg.js"), ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { code: 0 };
    } catch (error) {
      return { code: error.status, stderr: error.stderr ?? "" };
    }
  };

  const retired = run(["init", target, "--packs", "saas"]);
  assert.equal(retired.code, 1);
  assert.match(retired.stderr, /unknown option `--packs`/);
  assert.match(retired.stderr, /--profile/, "the error must list what is valid");
  assert.ok(!fs.existsSync(target), "a refused invocation must scaffold nothing");

  assert.equal(run(["init", target]).code, 0);
});

/**
 * A repository that documents under `docs-plans/` gets a second, empty `docs/plans/` — and
 * now two files both look like the decision log. The first brownfield adoption run spent a
 * `DL-02` entry discovering that. `init` never overwrites, so creating the tree is correct;
 * doing it without a word is what made it a surprise.
 */
test("init names an existing split documentation convention instead of silently doubling it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-rival-"));
  for (const tree of ["docs-plans", "docs-design", "docs-guides", "src"]) {
    fs.mkdirSync(path.join(dir, tree), { recursive: true });
    fs.writeFileSync(path.join(dir, tree, "README.md"), "# existing\n");
  }

  const output = execFileSync(
    process.execPath,
    [path.join(SOURCE_ROOT, "..", "bin", "cg.js"), "init", dir],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  for (const tree of ["docs-design", "docs-guides", "docs-plans"]) {
    assert.match(output, new RegExp(`\`${tree}/\``), `init must name ${tree}/`);
    assert.ok(
      fs.existsSync(path.join(dir, tree, "README.md")),
      "the existing tree must be left exactly as it was",
    );
  }
  assert.match(output, /two documentation trees/);
  assert.ok(fs.existsSync(path.join(dir, "docs", "plans")), "the cg tree is still created");

  // A directory that merely starts with the same word is not a documentation convention.
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-plain-"));
  fs.mkdirSync(path.join(plain, "test-fixtures"), { recursive: true });
  fs.writeFileSync(path.join(plain, "test-fixtures", "a.txt"), "x\n");
  const quiet = execFileSync(
    process.execPath,
    [path.join(SOURCE_ROOT, "..", "bin", "cg.js"), "init", plain],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  assert.ok(!/two documentation trees/.test(quiet), "no false positive on an unrelated directory");
});

/**
 * Warmup is the only skill that meets a repository with months of hand-written governance
 * already in it. Writing ten contracts before noticing the predecessor means writing over
 * it, so the search has to come first and the comparison has to be reported — otherwise
 * "the new files are at least as strong" is an assertion with no evidence behind it.
 */
test("cg-warmup searches for a predecessor framework before authoring anything", () => {
  const skill = fs.readFileSync(
    path.join(SOURCE_ROOT, "skills", "cg-warmup", "SKILL.md"),
    "utf8",
  );
  const heading = (text) => skill.indexOf(`\n## ${text}`);

  const predecessor = heading("1. Look for the framework that came before");
  assert.ok(predecessor > 0, "warmup must have a predecessor step");
  assert.ok(
    predecessor < heading("4. Write this unit's contract"),
    "the search must come before contract authoring, or it is archaeology after the fact",
  );

  assert.match(skill, /never run it|never delete it/i, "the predecessor is read, not executed");
  assert.match(skill, /^## Predecessor$/m, "the report owes a predecessor section");
  assert.match(
    skill,
    /carried forward/,
    "the comparison must state which predecessor rules survived",
  );

  // Measured on the first real adoption: the architecture family is pre-seeded and looked
  // complete, while 23 product rules and 10 requirements silently became zero. Harvest is the
  // right route for a rule nobody has written yet and the wrong one for a rule already written.
  assert.match(
    skill,
    /product rules into `principles\/product\.md`/,
    "predecessor product rules must be carried over, not left to re-accrue through harvest",
  );

  // Same run: eleven passing tenant-isolation tests kept passing while the rule IDs behind
  // them stopped resolving. A green test bound to nothing is deletable by the next agent.
  assert.match(
    skill,
    /detector that loses its rule/i,
    "an orphaned predecessor detector must be reported, not just noticed",
  );

  // Observed live: an agent found `CS-5.6` in a build file and started hunting a predecessor
  // framework. It is a work-item id from a deleted plan — 14 refs, 11 files, all dead ends.
  // The grammar separates them: a rule is obeyed, a work item is scheduled.
  assert.match(skill, /work items, not rules/i, "warmup must separate rule ids from ticket ids");

  // A run deleted the skill on finishing and reported `cg verify` clean; it was failing on the
  // missing core skill and an orphaned Claude wrapper.
  assert.match(skill, /Never delete it/, "finishing is not a reason to remove the skill");
  for (const cue of ["scheduled in", "deferred to", "forbids"]) {
    assert.ok(skill.includes(cue), `the discriminator needs the \`${cue}\` cue`);
  }
  assert.match(
    skill,
    /The ID is not the finding/,
    "a dead identifier can still wrap a live constraint — take the constraint, drop the id",
  );
});

/**
 * The economic case for warmup: a rule that exists only as a pattern in the code is re-derived
 * by every session that meets it. Measured on the first adoption — 23 product rules and 10
 * requirements were already written down in that repository and the graph came out with none.
 * Harvesting has to happen while the code is being read, not after the contracts are written.
 */
test("cg-warmup harvests the rules the code enforces into principles", () => {
  const skill = fs.readFileSync(
    path.join(SOURCE_ROOT, "skills", "cg-warmup", "SKILL.md"),
    "utf8",
  );
  const heading = (text) => skill.indexOf(`\n## ${text}`);

  const harvest = heading("9. Harvest the rules the code already enforces");
  assert.ok(harvest > 0, "warmup must have a harvest step");
  assert.ok(
    harvest > heading("8. Assess the repository against the principles"),
    "harvest reads the code after the assessment has established what the principles already cover",
  );
  assert.ok(harvest < heading("11. Report coverage honestly"), "harvest precedes the report");

  // Family placement is the whole difficulty. A product rule filed as `AP-` binds repositories
  // that can never satisfy it; a testable rule filed as a `guide` buys silence for the price
  // of the detector.
  assert.match(skill, /Do not file a product rule as an architecture rule/);
  assert.match(skill, /Do not file a testable rule as a `guide`/);

  // Every AP-/PP- rule owes an enforcement-map row — `cg verify` fails without one, so a
  // harvest step that does not say so produces a repository that cannot verify.
  assert.match(skill, /exactly one enforcement-map row/);
  assert.match(skill, /inheritance\.json/, "a harvested rule bound to nothing governs nothing");

  // A harvested rule contradicting a binding principle is the owner's call, never warmup's.
  assert.match(skill, /contradicts a binding principle/i);

  // The owner confirms the set; they do not approve it in advance, which would leave the rules
  // unwritten and the code as their only record.
  assert.match(skill, /^## New principles — please confirm$/m);
  assert.match(skill, /never ask for approval before writing them/);
});

/**
 * The downward edge is the product. Composition edges — proving a *declared* child set is the
 * whole set — are designed and unbuilt, but the cheap half is available now: require the section
 * so a contract either names its children or says it is a leaf. Left optional, the section is
 * simply absent wherever nobody thought about it, and an agent cannot tell a leaf from an
 * omission. `docs/vision.md`: a contract that cannot say where to go next is prose, not a node.
 */
test("a contract with no Child Contracts section fails verification", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-children-"));
  init(dir, {});
  sync(dir);
  assert.equal(verify(dir).failures.length, 0, "the shipped scaffold must already satisfy this");

  const contract = path.join(dir, "src", ".agents", "cg", "contract.md");
  const body = fs.readFileSync(contract, "utf8");
  assert.match(body, /^## Child Contracts$/m, "the module scaffold ships the section");

  fs.writeFileSync(contract, body.replace(/^## Child Contracts$/m, "## Notes"));
  const { failures } = verify(dir);
  assert.ok(
    failures.some((message) => message.includes("Child Contracts")),
    `expected a Child Contracts failure, got: ${failures.join(" | ") || "none"}`,
  );
});

/**
 * `cg-warmup` copies its own template rather than the scaffold's, so the two drift silently and
 * the drift only shows up in an adopted repository. It has happened once: the scaffold gained the
 * traversal fields and warmup kept writing contracts without them.
 */
test("the warmup templates carry the same sections as the scaffold", () => {
  const sections = (file) =>
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("## "));

  const scaffold = sections(path.join(SOURCE_ROOT, "scaffold", "module", ".agents", "cg", "contract.md"));
  const warmup = sections(path.join(SOURCE_ROOT, "skills", "cg-warmup", "assets", "module-contract.template.md"));
  assert.deepEqual(warmup, scaffold, "warmup's module template must match the scaffold's contract");

  for (const field of ["- Project role:", "- Parent contract:", "- Used by:"]) {
    for (const file of ["scaffold/module/.agents/cg/contract.md", "skills/cg-warmup/assets/module-contract.template.md"]) {
      assert.match(
        fs.readFileSync(path.join(SOURCE_ROOT, file), "utf8"),
        new RegExp(`^${field.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}`, "m"),
        `${file} is missing \`${field}\` — the edge that places a unit in its parent's context`,
      );
    }
  }

  // `cg-produce` carries a third copy for new modules it creates mid-phase. It drifted too.
  const produce = sections(path.join(SOURCE_ROOT, "skills", "cg-produce", "assets", "module-contract.template.md"));
  assert.deepEqual(produce, scaffold, "cg-produce's module template must match the scaffold's contract");

  // A sub-module contract is `kind: "folder"`, and warmup cannot write one without a template.
  const sub = sections(path.join(SOURCE_ROOT, "skills", "cg-warmup", "assets", "submodule-contract.template.md"));
  for (const required of REQUIRED_SECTIONS.folder) {
    assert.ok(sub.includes(required), `the sub-module template is missing \`${required}\``);
  }
});

/**
 * A skill that names a file which is not installed sends the agent looking for something that
 * cannot be found, and a weaker model will invent the contents rather than stop. `cg-unblock`
 * pointed at `principles/{saas,ux,ops}.md` for nine months after those three files became
 * `design.md`, `operations.md`, `ux.md`, and `security.md`.
 */
test("every governance path a skill names is a file init installs", () => {
  const installed = new Set();
  for (const file of fs.readdirSync(path.join(SOURCE_ROOT, "principles"))) {
    installed.add(`.agents/cg/principles/${file}`);
  }
  for (const file of fs.readdirSync(path.join(SOURCE_ROOT, "governance", "map"))) {
    installed.add(`.agents/cg/map/${file}`);
  }
  for (const file of fs.readdirSync(path.join(SOURCE_ROOT, "governance"))) {
    if (file.endsWith(".md")) installed.add(`.agents/cg/${file}`);
  }
  // Written by init into the docs root, not shipped under src/governance.
  installed.add("docs/plans/decision-log.md");

  const skills = path.join(SOURCE_ROOT, "skills");
  for (const skill of fs.readdirSync(skills)) {
    const file = path.join(skills, skill, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file, "utf8");
    for (const [index, line] of body.split("\n").entries()) {
      for (const ref of line.match(/\.agents\/cg\/[A-Za-z0-9/{},._-]+\.(?:md|json)/g) ?? []) {
        assert.ok(
          installed.has(ref),
          `${skill}/SKILL.md:${index + 1}: names \`${ref}\`, which init does not install`,
        );
      }
    }
  }
});

/**
 * A ```-fenced block nested inside another ```-fenced block terminates the outer one. The
 * cold-start Step brief in `cg-prepare` did exactly that: its `Done when` bash block ended the
 * template early, so everything after it read as prose rather than as part of the template.
 */
test("no skill nests a same-length code fence inside another", () => {
  const skills = path.join(SOURCE_ROOT, "skills");
  for (const skill of fs.readdirSync(skills)) {
    const file = path.join(skills, skill, "SKILL.md");
    if (!fs.existsSync(file)) continue;

    let open = null;
    for (const [index, line] of fs.readFileSync(file, "utf8").split("\n").entries()) {
      const fence = /^\s*(`{3,})(\w*)\s*$/.exec(line);
      if (!fence) continue;
      const [, ticks, language] = fence;
      if (!open) {
        open = { ticks, line: index + 1 };
      } else if (ticks.length < open.ticks.length) {
        // Shorter than the fence that opened the block, so it is literal content. This is the
        // shape a nested template must use.
      } else if (!language) {
        open = null;
      } else {
        // Enough backticks to close, but carrying an info string — so it closes the outer block
        // and immediately looks like it opened a new one. This is the defect.
        assert.fail(
          `${skill}/SKILL.md:${index + 1}: \`\`\`${language} ends the block opened at line ` +
            `${open.line} instead of nesting — give the outer fence more backticks`,
        );
      }
    }
    assert.equal(open, null, `${skill}/SKILL.md: unclosed code fence opened at line ${open?.line}`);
  }
});

/**
 * Warmup is a loop, not a linear procedure, and the loop is what makes it survive a repository
 * bigger than one context window. Measured: the ten-module run read 663 source files to write
 * ~1,800 lines of governance. Four times that does not fit, so nothing may be carried between
 * iterations — each unit's findings go to disk, and `cg modules` is the resume point.
 */
test("cg-warmup states a resumable per-unit loop, not one linear pass", () => {
  const file = path.join(SOURCE_ROOT, "skills", "cg-warmup", "SKILL.md");
  const skill = fs.readFileSync(file, "utf8");

  for (const phase of ["# Phase B — repeat", "# Phase C — once"]) {
    assert.ok(skill.includes(`\n${phase}`), `warmup must mark \`${phase}…\``);
  }
  assert.ok(
    skill.indexOf("\n# Phase B") < skill.indexOf("\n# Phase C"),
    "the loop must precede the consolidation that reads its output",
  );

  // The resume path: a context break mid-warmup must not restart the whole thing.
  assert.match(skill, /resuming after a context break/i);
  assert.match(skill, /cg modules/, "the resume point is the tool that reports unmapped roots");

  // Per-unit findings are the state. Without the write-down, the loop is just batching.
  const record = skill.indexOf("\n## 6. Record what this unit taught you");
  assert.ok(record > 0, "the loop needs a step that writes each unit's findings to disk");
  assert.ok(
    record < skill.indexOf("\n# Phase C"),
    "the write-down belongs inside the loop, not after it",
  );
  assert.match(skill, /warmup-findings\.md/, "the findings file is the durable working state");

  // Consolidation exists precisely because one rule surfaces in many units.
  assert.match(skill, /Consolidate before you write/);

  // A one-time skill is charged a different budget than one read every session.
  assert.ok(
    skill.split("\n").length <= 1000,
    "cg-warmup exceeds its 1000-line budget",
  );
});

/**
 * A graph that was generated rather than written.
 *
 * Measured on a real adoption run: the agent judged ten contracts to be mechanical work, wrote
 * `generate_contracts.py`, and emitted all ten from one string template — `Purpose: core
 * responsibilities for <module>`, every module bound to an identical list of every rule, every
 * module declared a leaf. `cg modules` reported full coverage. The only thing that objected was
 * a heading mismatch; had the template used the right heading it would have been green.
 */
test("verify flags a contract set that was generated rather than written", () => {
  const dir = makeRepo();
  const contract = read(dir, "src/.agents/cg/contract.md");
  const map = JSON.parse(read(dir, INHERITANCE));
  const template = map.folders.src;

  // Three modules, identical rule sets, identical authored prose — the shape a template makes.
  for (const name of ["alpha", "beta", "gamma"]) {
    fs.mkdirSync(path.join(dir, name, ".agents", "cg"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, name, ".agents", "cg", "contract.md"),
      contract.replace(/^# .*$/m, `# ${name} CONTRACT`),
    );
    for (const pointer of ["CLAUDE.md", "AGENTS.md"]) {
      fs.copyFileSync(path.join(dir, "src", pointer), path.join(dir, name, pointer));
    }
    map.folders[name] = { ...template, contract: `${name}/.agents/cg/contract.md` };
  }
  delete map.folders.src;
  write(dir, INHERITANCE, JSON.stringify(map, null, 2));
  sync(dir);

  // Every section is present and every rule id resolves — a templated graph is *well-formed*.
  // It fails anyway, because a graph nobody can route with is worse than none: it looks answered.
  const { failures } = verify(dir);
  assert.ok(
    failures.some((m) => m.includes("identical rule set")),
    `expected the uniform-scope failure, got: ${failures.join(" | ")}`,
  );
  assert.ok(
    failures.some((m) => m.includes("appear verbatim")),
    `expected the boilerplate failure, got: ${failures.join(" | ")}`,
  );

  // Vary one module's scope and prose: the repository stops looking generated.
  map.folders.gamma = { ...template, contract: "gamma/.agents/cg/contract.md", rules: template.rules.slice(0, 1) };
  write(dir, INHERITANCE, JSON.stringify(map, null, 2));
  write(
    dir,
    "gamma/.agents/cg/contract.md",
    read(dir, "gamma/.agents/cg/contract.md").replace(/^- .*$/gm, "- gamma owns exactly one thing"),
  );
  sync(dir);
  assert.ok(
    !verify(dir).failures.some((m) => m.includes("identical rule set")),
    "a scope that varies per module must not be flagged",
  );
});

/**
 * A self-sufficient unit — one delivering a nameable functionality that reaches outside itself
 * only rarely — owes its own contract. `cg-warmup` retrofits that for repositories that never
 * did it, but the cheap moment is the Step that introduces the boundary, so the greenfield
 * lifecycle has to carry the same obligation. Otherwise every repository needs an archaeology
 * pass, which is the cost the graph exists to remove.
 */
test("the lifecycle skills own component identification, not just warmup", () => {
  const skill = (name) =>
    fs.readFileSync(path.join(SOURCE_ROOT, "skills", name, "SKILL.md"), "utf8");

  // Planning names the units a phase introduces, so preparation can allocate their contracts.
  assert.match(skill("cg-plan"), /components, libraries, sub-modules, or modules a phase introduces/);

  // Preparation carries them in the ledger and forbids deferring the contract to a later Step.
  assert.match(skill("cg-prepare"), /new component\/library\/sub-module/);
  assert.match(skill("cg-prepare"), /cannot be deferred to a later Step/);

  // Execution delivers the contract, the map entry, and the parent's edge together.
  const produce = skill("cg-produce");
  assert.match(produce, /A new self-sufficient unit owes a contract in the Step that creates it/);
  assert.match(produce, /parent's Child Contracts/);
  assert.match(produce, /inheritance\.json/);

  // All four agree on the criterion, so a weaker model meets one definition rather than three.
  for (const name of ["cg-plan", "cg-prepare", "cg-produce", "cg-warmup"]) {
    const body = skill(name);
    assert.ok(
      /self-sufficient|context graph/.test(body),
      `${name} must state why a unit earns a contract`,
    );
  }
});

/**
 * `subBoundaryCount` descends past the single-child chain every language puts in front of its
 * source, then counts where it first branches. The bug worth pinning: a build script beside the
 * source made the module root itself look code-bearing, which collapsed the shared prefix to
 * nothing and reported every module in a ten-module repository as having exactly one boundary.
 */
test("sub-boundary counting ignores build scripts and test trees", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-subcount-"));
  const mk = (rel, body = "x") => {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };

  // A build manifest at the module root, production packages, and a mirrored test tree.
  mk("svc/build.gradle.kts", "plugins { java }\n");
  for (const pkg of ["billing", "identity", "search"]) {
    mk(`svc/src/main/java/com/acme/${pkg}/Thing.java`, "class Thing {}");
    mk(`svc/src/test/java/com/acme/${pkg}/ThingTest.java`, "class ThingTest {}");
  }
  assert.equal(
    subBoundaryCount(dir, "svc"),
    3,
    "the manifest must not count as source, and the test tree must not double the count",
  );

  // A genuinely flat module branches nowhere.
  mk("flat/build.gradle.kts", "plugins { java }\n");
  mk("flat/src/main/java/com/acme/flat/A.java", "class A {}");
  mk("flat/src/main/java/com/acme/flat/B.java", "class B {}");
  assert.equal(subBoundaryCount(dir, "flat"), 0, "a flat module is a real leaf");
});

/**
 * The downward edge is the product, and it is the level `cg modules` is blind to — no build
 * manifest declares a package. Measured across two adoption runs of one repository: nineteen
 * sub-module contracts from one, zero from the other, with the identical instruction to descend.
 * Prose did not carry it, so this is mechanical.
 */
test("verify asks about undeclared sub-boundaries without failing the build", () => {
  const dir = makeRepo();
  const contract = "src/.agents/cg/contract.md";

  fs.writeFileSync(path.join(dir, "src", "build.gradle.kts"), "plugins { java }\n");
  fs.mkdirSync(path.join(dir, "src", "lib", "core"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "lib", "core", "a.ts"), "export const a = 1;\n");
  write(dir, contract, read(dir, contract).replace(
    /^## Child Contracts$[\s\S]*?(?=^## )/m,
    "## Child Contracts\nNone — leaf module\n\n",
  ));
  sync(dir);
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("declares no child")),
    "a module with one package must not be nagged",
  );

  for (const pkg of ["billing", "identity", "search", "reporting"]) {
    fs.mkdirSync(path.join(dir, "src", "lib", pkg), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "lib", pkg, "index.ts"), "export const x = 1;\n");
  }

  // Nothing mechanical can tell "many packages, one purpose" from "many packages, many
  // boundaries", so this asks and never blocks. Measured: a 4-package module decomposed while a
  // 15-package one did not, and coupling ranked them the same way round.
  const { failures, advisories } = verify(dir);
  assert.ok(
    !failures.some((m) => m.includes("declares no child")),
    "an undeclared boundary must not fail the build — the verifier cannot decide it",
  );
  const asked = advisories.find((m) => m.includes("declares no child"));
  assert.ok(asked, `expected the advisory, got: ${advisories.join(" | ")}`);
  assert.match(asked, /5 separate packages/);

  // Any stated reason clears it. Judging the wording only produced longer sentences.
  write(dir, contract, read(dir, contract).replace(
    "None — leaf module",
    "One boundary: these five packages are the storefront pipeline and ship as a single unit.",
  ));
  sync(dir);
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("declares no child")),
    "a stated reason must clear the advisory",
  );

  // So does declaring the children.
  write(dir, contract, read(dir, contract).replace(
    /^One boundary:.*$/m,
    "- `lib/billing/.agents/cg/contract.md` — money movement",
  ));
  sync(dir);
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("declares no child")),
    "a declared child set must clear the advisory",
  );
});

test("boilerplate is caught at a majority, not only at near-unanimity", () => {
  const dir = makeRepo();
  const base = read(dir, "src/.agents/cg/contract.md");
  const map = JSON.parse(read(dir, INHERITANCE));
  const template = map.folders.src;
  const shared = "One boundary: these share a lifecycle and are never changed independently.";

  for (let i = 0; i < 10; i += 1) {
    const name = `m${i}`;
    fs.mkdirSync(path.join(dir, name, ".agents", "cg"), { recursive: true });
    // Six of ten carry the identical sentence; the rest say something specific to themselves.
    const line = i < 6 ? shared : `Owns the ${name} ledger and nothing else.`;
    fs.writeFileSync(
      path.join(dir, name, ".agents", "cg", "contract.md"),
      base.replace(/^# .*$/m, `# ${name} CONTRACT`).replace(/^## Scope$/m, `${line}\n\n## Scope`),
    );
    for (const pointer of ["CLAUDE.md", "AGENTS.md"]) {
      fs.copyFileSync(path.join(dir, "src", pointer), path.join(dir, name, pointer));
    }
    map.folders[name] = {
      ...template,
      contract: `${name}/.agents/cg/contract.md`,
      rules: template.rules.slice(0, (i % 3) + 1),
    };
  }
  delete map.folders.src;
  write(dir, INHERITANCE, JSON.stringify(map, null, 2));
  sync(dir);

  const failures = verify(dir).failures;
  assert.ok(
    failures.some((m) => m.includes("appear verbatim") && m.includes("6+ of 10")),
    `expected boilerplate caught at six of ten, got: ${failures.join(" | ")}`,
  );
});

/**
 * `product.md` untouched after warmup means §9 harvested nothing — the single clearest sign the
 * step was skipped. Measured on a run that reported success: eleven modules mapped, `cg verify`
 * green, and the shipped principles file byte-for-byte unchanged. Advisory rather than a failure,
 * because a repository may honestly owe no product rule; silence is what must not happen.
 */
test("verify notices that warmup harvested no product rules", () => {
  const dir = makeRepo();
  const advisories = verify(dir).advisories;
  assert.ok(
    advisories.some((m) => m.includes("product.md")),
    `expected a harvest advisory once folders are mapped, got: ${advisories.join(" | ")}`,
  );

  const product = ".agents/cg/principles/product.md";
  write(dir, product, `${read(dir, product)}\n## PP-01. Tenancy\n\n- **PP-01-01** — A tenant is a path prefix.\n`);
  write(dir, ENFORCEMENT, `${read(dir, ENFORCEMENT)}| PP-01-01 | \`TenantPathTest\` |\n`);
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("product.md")),
    "one real product rule clears it",
  );
});

/**
 * Two failure modes seen on a real run that reported success: the root of the graph left as its
 * shipped placeholder, and no findings file at all — meaning the per-unit loop kept its state in
 * context, so a break would have restarted the work.
 */
test("verify flags a warmup that reported success without finishing", () => {
  const dir = makeRepo();
  const root = ".agents/cg/contract.md";

  const initial = verify(dir).advisories;
  assert.ok(
    initial.some((m) => m.includes("Replace this section")),
    "the shipped root contract carries the placeholder and should say so",
  );

  write(dir, root, read(dir, root).replace(/<!-- Replace this section[\s\S]*?-->/, "A billing platform."));
  const filled = verify(dir).advisories;
  assert.ok(!filled.some((m) => m.includes("Replace this section")), "a filled root clears it");

  // The findings advisory is gated on a populated map: a greenfield repo has no loop to record.
  assert.ok(
    filled.some((m) => m.includes("warmup-findings.md")),
    `expected the findings advisory once folders are mapped, got: ${filled.join(" | ")}`,
  );
  fs.mkdirSync(path.join(dir, "docs", "plans"), { recursive: true });
  fs.writeFileSync(path.join(dir, "docs", "plans", "warmup-findings.md"), "# findings\n");
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("warmup-findings.md")),
    "a present findings file clears it",
  );
});

/**
 * The repository contract is the root of the graph, and nothing fills it automatically: it is
 * not in `map/inheritance.json`, so `cg verify` never asks for its sections, and the brownfield
 * `init` message routes the user to `cg-warmup` rather than telling them to write it. Warmup
 * therefore owns it — a run that maps forty modules and leaves the root a placeholder has built
 * a graph whose first node says nothing about the product.
 */
test("cg-warmup fills the repository contract that nothing else fills", () => {
  const skill = fs.readFileSync(
    path.join(SOURCE_ROOT, "skills", "cg-warmup", "SKILL.md"),
    "utf8",
  );
  const step = skill.indexOf("\n## 7. Fill the repository contract");
  assert.ok(step > 0, "warmup must own the root contract");
  assert.ok(
    step > skill.indexOf("\n# Phase C"),
    "it belongs after the loop: the product's identity is what the module roles add up to",
  );
  assert.match(skill, /Project Identity/);
  assert.match(skill, /What This Product Is Not/);

  // The scaffolded root contract really does ship those placeholders.
  const root = fs.readFileSync(
    path.join(SOURCE_ROOT, "governance", "contract.md"),
    "utf8",
  );
  for (const heading of ["## Project Identity", "### What This Product Is Not"]) {
    assert.ok(root.includes(heading), `the root contract must ship \`${heading}\``);
  }
});

/**
 * `inheritance.json` is read by hand more than any other generated file, and its comment block
 * is the only explanation most users get. It claimed only `DP-` was fork-loaded (there are four
 * families), named `CONTRACT.md` against the lowercase convention, and pointed at "the example
 * below" — which brownfield `init` strips, leaving the sentence dangling.
 */
test("the inheritance map explains itself accurately", () => {
  const raw = fs.readFileSync(
    path.join(SOURCE_ROOT, "governance", "map", "inheritance.json"),
    "utf8",
  );
  const comment = JSON.parse(raw).$comment.join("\n");

  for (const family of ["DP-", "OP-", "UP-", "SP-"]) {
    assert.ok(comment.includes(family), `the comment must name \`${family}\` as fork-loaded`);
  }
  assert.ok(!/CONTRACT\.md/.test(comment), "contract files are lowercase `contract.md`");
  assert.ok(
    !/example below/.test(comment),
    "brownfield init strips the example, so the comment must not point at it",
  );
  assert.match(comment, /cg-warmup/, "an empty map should say what fills it");
});

/**
 * HTML comments do not nest: the first `-->` closes the outermost `<!--`, so the remainder of
 * the intended comment renders as visible text in the contract an agent then copies. Same shape
 * as the nested-code-fence defect, and made in the same session while fixing it.
 */
test("no shipped markdown nests an HTML comment", () => {
  const roots = [
    path.join(SOURCE_ROOT, "skills"),
    path.join(SOURCE_ROOT, "scaffold"),
    path.join(SOURCE_ROOT, "principles"),
    path.join(SOURCE_ROOT, "governance"),
  ];

  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith(".md") ? [full] : [];
    });

  for (const file of roots.filter((dir) => fs.existsSync(dir)).flatMap(walk)) {
    const relative = path.relative(SOURCE_ROOT, file);
    let open = null;
    for (const [index, line] of fs.readFileSync(file, "utf8").split("\n").entries()) {
      for (const token of line.match(/<!--|-->/g) ?? []) {
        if (token === "<!--") {
          assert.equal(
            open,
            null,
            `${relative}:${index + 1}: \`<!--\` inside the comment opened at line ${open} — ` +
              "the first `-->` closes both, and the rest renders as visible text",
          );
          open = index + 1;
        } else {
          open = null;
        }
      }
    }
    assert.equal(open, null, `${relative}: unterminated HTML comment opened at line ${open}`);
  }
});

/**
 * A fork-loaded principle is shipped to every repository that loads that family. A rule naming
 * one product's roles or artifacts reads as a rule about *their* product and is silently wrong
 * everywhere else. Two shipped rules had this defect — a "customer-care agent" who "does not
 * leave the ticket surface", and a "super-admin configurator" — both lifted verbatim from the
 * repository the principles were extracted from.
 */
test("no shipped principle names one product's roles or artifacts", () => {
  // Split so this file is not its own match when the stale-path detector walks the tree.
  const vocabulary = [
    "merchant",
    "storefront",
    "super-" + "admin",
    "customer-care",
    "ticket surface",
  ];
  const dir = path.join(SOURCE_ROOT, "principles");

  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const body = fs.readFileSync(path.join(dir, file), "utf8");
    for (const [index, line] of body.split("\n").entries()) {
      for (const word of vocabulary) {
        assert.ok(
          !line.toLowerCase().includes(word),
          `principles/${file}:${index + 1}: names \`${word}\` — a principle shipped to every ` +
            "repository must state the generic lean, not one product's vocabulary",
        );
      }
    }
  }
});

/**
 * The fork families exist so a brownfield repository inherits something better than an empty
 * file. They were extracted from one real codebase; that extraction is only useful if it kept
 * the leans and dropped the specifics.
 */
test("every fork-loaded family ships a usable starter set", () => {
  const dir = path.join(SOURCE_ROOT, "principles");
  const forkFiles = { "design.md": "DP", "operations.md": "OP", "ux.md": "UP", "security.md": "SP" };

  for (const [file, family] of Object.entries(forkFiles)) {
    const body = fs.readFileSync(path.join(dir, file), "utf8");
    const rules = body.match(new RegExp(String.raw`^- \*\*${family}-\d{2}-\d{2}\*\* \``, "gm")) ?? [];
    assert.ok(
      rules.length >= 4,
      `principles/${file}: ${rules.length} rule(s) — a family thin enough to skip is one nobody loads`,
    );
    const sections = body.match(new RegExp(String.raw`^## ${family}-\d{2}\. `, "gm")) ?? [];
    assert.ok(sections.length >= 2, `principles/${file}: needs more than one principle heading`);
  }
});

// ------------------------------------------------------------- manifest

/**
 * `cg upgrade` ships later, but its baseline cannot be captured later. These assert the
 * record is complete and, more importantly, that it is never refreshed — a later `init`
 * that re-hashed an edited file would adopt the user's edits as pristine and destroy the
 * only evidence that they changed anything.
 */
test("init records every file it installed, with the version that installed it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-manifest-"));
  const { written } = init(dir, {});
  const manifest = JSON.parse(read(dir, MANIFEST));
  const shipped = JSON.parse(
    fs.readFileSync(path.join(SOURCE_ROOT, "..", "package.json"), "utf8"),
  ).version;

  assert.equal(manifest.version, shipped);
  assert.equal(manifest.docs, "docs");

  const installed = written
    .map((file) => path.relative(dir, file).split(path.sep).join("/"))
    .filter((file) => file !== MANIFEST && file !== PROFILE);
  assert.ok(installed.length > 20, "expected a substantial scaffold");
  for (const file of installed) {
    assert.ok(manifest.files[file], `${file} was installed but is unrecorded`);
  }

  const entry = manifest.files[".agents/cg/principles/architecture.md"];
  assert.equal(entry.version, shipped);
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
});

/**
 * Only files `init` copies are recorded. Anything `cg sync` regenerates is excluded on
 * purpose — its hash would go stale on the next sync, and upgrade must never treat a
 * generated artifact as content the user owns.
 */
test("the recorded hash matches what init wrote, and sync-owned files are excluded", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-manifest-hash-"));
  init(dir, {});
  const manifest = JSON.parse(read(dir, MANIFEST));
  for (const [relative, entry] of Object.entries(manifest.files)) {
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(dir, relative)))
      .digest("hex");
    assert.equal(entry.sha256, actual, `${relative} hash does not match its contents`);
  }
  assert.ok(!manifest.files[MANIFEST], "the manifest must not record itself");
  assert.ok(!manifest.files[PROFILE], "the selection record is not installed content");
});

test("a later init never refreshes the baseline of a file the user edited", () => {
  const dir = makeRepo();
  const before = JSON.parse(read(dir, MANIFEST)).files[CONTRACT].sha256;
  write(dir, CONTRACT, "# mine, not yours\n");
  init(dir, {});
  const after = JSON.parse(read(dir, MANIFEST)).files[CONTRACT].sha256;
  assert.equal(after, before, "the baseline must survive a user edit, or upgrade is blind");
});

test("a file already present when cg arrives is recorded as adopted", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-adopt-"));
  fs.mkdirSync(path.join(dir, "src", ".agents", "cg"), { recursive: true });
  fs.writeFileSync(path.join(dir, CONTRACT), "# pre-existing\n");
  init(dir, {});
  const entry = JSON.parse(read(dir, MANIFEST)).files[CONTRACT];
  assert.equal(entry.adopted, true, "its contents predate this install and are not what shipped");
  assert.ok(!JSON.parse(read(dir, MANIFEST)).files[".agents/cg/contract.md"].adopted);
});

// ------------------------------------------------------------ phase map

const PHASES = ".agents/cg/map/phases.json";

test("[11] a phase naming an unknown token fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replace('"AP",', '"AP", "DP-NOSUCHSET",'));
  assertFails(dir, 11, "phase map cites a set that is not installed");
});

test("[11] a phase naming a misspelled family fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replace('"PP"', '"XP"'));
  assertFails(dir, 11, "phase map cites a nonexistent rule family");
});

test("[11] an installed family no phase loads fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replaceAll('"OP",', "").replaceAll('"OP"', '""'));
  edit(dir, PHASES, (t) => t.replace(/"",?/g, "").replace(/,(\s*])/g, "$1"));
  assertFails(dir, 11, "an installed set unreachable from every phase");
});

test("[11] a phase map missing a lifecycle phase fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => {
    const parsed = JSON.parse(t);
    delete parsed.phases["sign-off"];
    return `${JSON.stringify(parsed, null, 2)}\n`;
  });
  assertFails(dir, 11, "every lifecycle phase must be present");
});

test("[11] a phase naming the same token twice fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replace('"AP", "PP"', '"AP", "AP", "PP"'));
  assertFails(dir, 11, "a duplicated token in one phase");
});

// ---------------------------------------------------------------- model

test("parsePrinciples joins wrapped continuation lines into one rule", () => {
  const dir = makeRepo();
  const rules = parsePrinciples(path.join(dir, ARCHITECTURE));
  const text = rules.get("AP-01-02");
  assert.match(text, /same commit/);
  assert.ok(!text.includes("\n"), "a parsed rule must occupy exactly one line");
  assert.ok(!/ {2}/.test(text), "continuation whitespace must be collapsed");
});

test("parsePrinciples rejects a duplicate rule id", () => {
  const dir = makeRepo();
  const file = path.join(dir, ARCHITECTURE);
  fs.appendFileSync(file, "\n- **AP-06-01** — a second definition.\n");
  assert.throws(() => parsePrinciples(file), ContractError);
});

test("loadPrinciples rejects a duplicate rule id across files and names the collision", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-duplicate-"));
  const root = path.join(dir, ".agents", "cg", "principles");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "architecture.md"),
    "## AP-01. First\n\n- **AP-01-01** — First definition.\n",
  );
  fs.writeFileSync(
    path.join(root, "product.md"),
    "## PP-01. Second\n\n- **AP-01-01** — Conflicting definition.\n",
  );

  assert.throws(() => loadPrinciples(dir), /AP-01-01/);
});

/**
 * The check that replaces the filename correspondence lost by collapsing each family into
 * one file. A rule under the wrong heading parses and inherits cleanly, so nothing else
 * catches it.
 */
test("loadPrinciples rejects a rule sitting under the wrong principle heading", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-correspondence-"));
  const root = path.join(dir, ".agents", "cg", "principles");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "architecture.md"),
    "## AP-01. First\n\n- **AP-01-01** — First rule.\n\n" +
      "## AP-02. Second\n\n- **AP-01-02** — Moved rule.\n",
  );

  assert.throws(
    () => loadPrinciples(dir),
    /`AP-01-02` sits under `## AP-02\.` but belongs to `## AP-01\.`/,
  );
});

test("loadPrinciples rejects a duplicated principle heading", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-duplicate-heading-"));
  const root = path.join(dir, ".agents", "cg", "principles");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "architecture.md"),
    "## AP-01. First\n\n- **AP-01-01** — A rule.\n\n" +
      "## AP-01. Again\n\n- **AP-01-02** — Another.\n",
  );
  assert.throws(() => loadPrinciples(dir), /defines `## AP-01\.` more than once/);
});

test("loadPrinciples rejects a rule appearing before any heading", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-orphan-rule-"));
  const root = path.join(dir, ".agents", "cg", "principles");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "architecture.md"),
    "- **AP-01-01** — Stray.\n\n## AP-01. First\n\n- **AP-01-02** — A rule.\n",
  );
  assert.throws(() => loadPrinciples(dir), /appear before any `## AP-nn\.` heading/);
});

test("splitLines treats a single trailing newline as a terminator", () => {
  assert.deepEqual(splitLines("a\nb\n"), ["a", "b"]);
  assert.deepEqual(splitLines("a\nb"), ["a", "b"]);
  assert.deepEqual(splitLines("a\n\n"), ["a", ""]);
});

// ------------------------------------------------- split principles files

test("the shipped product file has no rules and is green", () => {
  const dir = makeRepo();
  assert.equal(
    parsePrinciples(path.join(dir, PRODUCT), { allowEmpty: true }).size,
    0,
    "the visible fenced example must remain inert",
  );
  assert.deepEqual(verify(dir).failures, []);
});

test("a product rule is loaded and inherited like an architecture one", () => {
  const dir = makeRepo();
  edit(
    dir,
    PRODUCT,
    (t) => `${t}\n## PP-01. Billing shape\n\n- **PP-01-01** — Every price is quoted in minor units.\n`,
  );
  edit(dir, ENFORCEMENT, (t) => `${t}\n| PP-01-01 | <no price field is a float> |\n`);
  edit(dir, INHERITANCE, (t) => t.replace('"AP-01-01"', '"AP-01-01", "PP-01-01"'));
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  assert.match(read(dir, CONTRACT), /- \*\*PP-01-01\*\* — Every price is quoted in minor units\./);
});

test("an architecture rule filed in the product file is refused by name", () => {
  const dir = makeRepo();
  edit(
    dir,
    PRODUCT,
    (t) => `${t}\n## PP-01. Wrong family\n\n- **AP-01-01** — a second, conflicting definition.\n`,
  );
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /AP-01-01/.test(f) && /product\.md/.test(f)),
    `the misplaced rule and wrong file must be named; got:\n${failures.join("\n") || "  (none)"}`,
  );
});

test("a product rule filed in the architecture file is refused by name", () => {
  const dir = makeRepo();
  edit(dir, ARCHITECTURE, (t) => `${t}\n- **PP-09-09** — wrong file for this family.\n`);
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /PP-09-09/.test(f) && /architecture\.md/.test(f)),
    `expected a correspondence failure naming architecture.md; got:\n${failures.join("\n") || "  (none)"}`,
  );
});

// ------------------------------------------------------ scaffold mapping

function filesUnder(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  };
  walk(root);
  return files.sort();
}

function ruleMatchesSource(rule, relative) {
  if (rule.select === "tree") {
    return relative.startsWith(`${rule.source}/`);
  }
  if (rule.select === "top-level-markdown") {
    return path.posix.dirname(relative) === rule.source && relative.endsWith(".md");
  }
  return false;
}

test("scaffold mapping covers every eligible src file exactly once", () => {
  const eligible = filesUnder(SOURCE_ROOT).filter(
    (file) => !file.startsWith("scripts/") && !file.startsWith("scaffold/profiles/"),
  );
  const uncovered = [];
  const overlapping = [];
  for (const file of eligible) {
    const matches = SCAFFOLD_MAPPING.filter(
      (rule) => rule.mode !== "never" && ruleMatchesSource(rule, file),
    );
    if (matches.length === 0) uncovered.push(file);
    if (matches.length > 1) overlapping.push(`${file}: ${matches.map((rule) => rule.source).join(", ")}`);
  }
  assert.deepEqual(uncovered, [], `unmapped src files:\n${uncovered.join("\n")}`);
  assert.deepEqual(overlapping, [], `multiply mapped src files:\n${overlapping.join("\n")}`);
});

test("init round trip writes exactly the canonical mapped file set", () => {
  // This is intentionally independent of SCAFFOLD_MAPPING's targets. If a mapping target is
  // mistyped, init follows the typo while this detector continues to assert the contract.
  const canonical = [
    {
      source: "principles",
      target: ".agents/cg/principles",
      mode: "always",
      select: "top-level-markdown",
    },
    { source: "governance", target: ".agents/cg", mode: "always", select: "tree" },
    { source: "skills", target: ".agents/skills", mode: "always", select: "tree" },
    { source: "scaffold/rules", target: ".agents/rules", mode: "always", select: "tree" },
    { source: "scaffold/hooks", target: ".agents/hooks", mode: "always", select: "tree" },
    { source: "scaffold/module", target: "src", mode: "always", select: "tree" },
    { source: "scaffold/docs/plans", target: "docs/plans", mode: "always", select: "tree" },
    { source: "scaffold/docs/design", target: "docs/design", mode: "always", select: "tree" },
    { source: "scaffold/docs/guides", target: "docs/guides", mode: "always", select: "tree" },
  ];
    const sourceFiles = filesUnder(SOURCE_ROOT);
  const expected = [];
  for (const rule of canonical) {
    for (const file of sourceFiles.filter((candidate) => ruleMatchesSource(rule, candidate))) {
      const within = path.posix.relative(rule.source, file);
      expected.push(path.posix.join(rule.target, within));
    }
  }
  expected.push(PROFILE, MANIFEST, ".gitignore");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-round-trip-"));
  init(dir, {});
  assert.deepEqual(filesUnder(dir), expected.sort());
});

// -------------------------------------------------- no dangling conventions

/**
 * A shipped skill may only name a document tree that `init` actually creates.
 *
 * This is the failure that shipped in 0.1.0's first cut: `cg-unblock` and `cg-sign-off` wrote
 * to `docs/plans/decision-log.md`, `workflow.md` forbade contracts from citing it, and the
 * mapping created none of it — a convention with no artifact behind it, which is the exact
 * class of defect an enforcement map exists to prevent. Deriving the expectation from the
 * shipped prose rather than a hardcoded list means naming a fourth tree fails until it is
 * scaffolded too.
 */
test("every document tree the shipped skills reference is scaffolded", () => {
  const referenced = new Set();
  for (const relative of filesUnder(SOURCE_ROOT)) {
    if (!relative.endsWith(".md") || relative.startsWith("scaffold/docs/")) continue;
    const text = fs.readFileSync(path.join(SOURCE_ROOT, relative), "utf8");
    for (const [, tree] of text.matchAll(/\bdocs\/([a-z]+)\//g)) referenced.add(tree);
  }
  assert.ok(referenced.size > 0, "expected the shipped skills to name at least one document tree");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-doc-trees-"));
  init(dir, {});
  const missing = [...referenced]
    .sort()
    .filter((tree) => !fs.existsSync(path.join(dir, "docs", tree)));
  assert.deepEqual(missing, [], `document tree(s) referenced but never scaffolded: ${missing}`);

  // The decision log is cited by exact filename, so its existence is part of the contract.
  assert.ok(fs.existsSync(path.join(dir, "docs", "plans", "decision-log.md")));
});

test("a chosen docs root relocates the trees and is recorded", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-root-"));
  init(dir, { docs: "handbook" });
  sync(dir);
  assert.ok(fs.existsSync(path.join(dir, "handbook", "plans", "decision-log.md")));
  assert.ok(fs.existsSync(path.join(dir, "handbook", "design", "README.md")));
  assert.ok(!fs.existsSync(path.join(dir, "docs")));
  assert.equal(JSON.parse(read(dir, PROFILE)).docs, "handbook");
  assert.deepEqual(verify(dir).failures, []);
});

test("a recorded docs root survives a re-run that does not name one", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-sticky-"));
  init(dir, { docs: "handbook" });
  const second = init(dir, {});
  assert.equal(second.docs, "handbook");
  assert.ok(!fs.existsSync(path.join(dir, "docs")), "must not silently create a second tree");
});

/**
 * The self-sufficiency rule follows the repository's docs root. A contract citing the
 * relocated plans directory must fail exactly as one citing `docs/plans/` does — otherwise
 * moving the trees would be a way to escape the check.
 */
test("[5] a contract citing a relocated plans path fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-selfsuff-"));
  init(dir, { docs: "handbook" });
  sync(dir);
  edit(dir, CONTRACT, (t) => `${t}\nSee handbook/plans/roadmap.md for the rule.\n`);
  assertFails(dir, 5, "relocated transient plan path");
});

test("init rejects a docs root that is not a single directory name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-invalid-"));
  assert.throws(() => init(dir, { docs: "a/b" }), /invalid docs root/);
  assert.throws(() => init(dir, { docs: ".hidden" }), /invalid docs root/);
});

// ------------------------------------------------------ no stale paths

/**
 * This detector proves no shipped or contributor-facing file still names an obsolete layout —
 * the same standard the framework demands of any rename it governs. Extend `STALE` whenever a
 * governance or implementation path is renamed again.
 */
test("no shipped file references a pre-rename governance path", () => {
  const STALE = [
    /\.agents\/cg\/principles\.md/,
    /\.agents\/cg\/enforcement-map\.md/,
    /\.agents\/cg\/MAP\.md/,
    /\.agents\/cg\/inheritance\.json/,
    /\.agents\/cg\/CONTRACT\.md/,
    /\.agents\/cg\/WORKFLOW\.md/,
    /\.agents\/cg\/design\//,
    /module-CONTRACT\.template\.md/,
    /templates\//,
    /src\/(?:model|init|sync|verify|dev)\.js/,
    /bin\/cg\.js#L\d+/,
    /bin\/cg\.js:\d+/,
    // Pre-0.1.0 skill names. One of the four was merged rather than renamed, so a
    // surviving reference is a dangling skill rather than a stale path — same failure.
    // Written with escapes so this list does not match itself; see the guard below.
    /\bcg\-execute\b/,
    /\bcg\-decide\b/,
    /\bcg\-complete\b/,
    /\bcg\-document\b/,
    // The harvest check the skills used to name but nothing shipped. `cg harvest` replaces it.
    // A plain word has nothing to escape, so the character class is what stops this pattern
    // from matching its own source line.
    /verify_decision_[h]arvest/,
    /scripts\/contracts\//,
  ];
  const repo = path.resolve(import.meta.dirname, "..");
  // `.github` is walked because CI is the first thing a rename breaks and the last place
  // anyone looks — a stale flag there fails on push rather than in review.
  const roots = [
    "src",
    "bin",
    "docs",
    "test",
    ".github",
    "README.md",
    "CONTRIBUTING.md",
    "package.json",
  ];
  /**
   * The migration guide's job is to name what was renamed, so it is the one shipped file
   * allowed to carry obsolete names. Exempt it by path rather than by pattern, so adding a
   * stale name anywhere else still fails.
   */
  const EXEMPT = new Set(["docs/migration-0.1.0.md"]);
  const hits = [];

  const walk = (target) => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(target)) walk(path.join(target, name));
      return;
    }
    if (!/\.(js|md|json|ya?ml)$/.test(target)) return;
    if (EXEMPT.has(path.relative(repo, target).split(path.sep).join("/"))) return;
    const text = fs.readFileSync(target, "utf8");
    splitLines(text).forEach((line, index) => {
      for (const pattern of STALE) {
        // This test names the stale paths, so it must not flag its own list.
        if (pattern.test(line) && !line.includes("/\\.agents\\/cg\\/")) {
          hits.push(`${path.relative(repo, target)}:${index + 1}: ${line.trim()}`);
        }
      }
    });
  };
  for (const root of roots) walk(path.join(repo, root));

  assert.deepEqual(hits, [], `stale governance paths still referenced:\n${hits.join("\n")}`);
});

// ------------------------------------------------------------ what ships

/**
 * `files` includes `src`, so anything added under it reaches users by default. `dev.js` is
 * repository tooling — it drives `./cg try`, reads `tmp/`, and has no meaning inside an
 * installed package — so it is excluded by name. This asserts the exclusion holds and that
 * excluding it did not take the scaffold sources with it, which is the way a `files`
 * negation usually goes wrong.
 */
test("the published tarball ships the scaffold sources and no dev tooling", () => {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const output = execFileSync(npm, ["pack", "--dry-run", "--json"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const shipped = JSON.parse(output)[0].files.map((entry) => entry.path);

  assert.ok(!shipped.includes("src/scripts/dev.js"), "dev tooling must not ship");
  for (const required of [
    "bin/cg.js",
    "src/scripts/cli.js",
    "src/principles/architecture.md",
    "src/principles/product.md",
    "src/governance/contract.md",
    "src/scaffold/profiles/all.scaffolding.conf.json",
    "src/scaffold/module/CLAUDE.md",
    "src/skills/cg-plan/SKILL.md",
  ]) {
    assert.ok(shipped.includes(required), `${required} must ship`);
  }
});


// ---------------------------------------------------------------------------
// init ownership — framework core is replaced, repository context never is
// ---------------------------------------------------------------------------

const SKILL = ".agents/skills/cg-plan/SKILL.md";

test("re-running init replaces a framework file the repository edited", () => {
  const dir = makeRepo();
  write(dir, SKILL, "edited\n");
  const { replaced } = init(dir, {});
  assert.ok(replaced.some((f) => f.endsWith(path.join("cg-plan", "SKILL.md"))));
  assert.notEqual(read(dir, SKILL), "edited\n");
});

test("re-running init never touches the repository's own context", () => {
  const dir = makeRepo();
  const owned = {
    ".agents/cg/contract.md": "# our graph\n",
    ".agents/cg/map/routing.md": "our routes\n",
    ".agents/cg/principles/product.md": "our product rules\n",
    ".agents/cg/workflow.md": "our workflow\n",
    "docs/plans/decision-log.md": "our decisions\n",
  };
  for (const [file, text] of Object.entries(owned)) write(dir, file, text);

  const { replaced } = init(dir, {});
  for (const [file, text] of Object.entries(owned)) {
    assert.equal(read(dir, file), text, `${file} must survive a re-init`);
    assert.ok(!replaced.some((f) => f.endsWith(file.split("/").join(path.sep))));
  }
});

test("a re-init that changes nothing reports nothing to replace", () => {
  const dir = makeRepo();
  assert.deepEqual(init(dir, { dryRun: true }).replaced, []);
});

test("init --check writes nothing but reports what it would replace", () => {
  const dir = makeRepo();
  write(dir, SKILL, "edited\n");
  const plan = init(dir, { dryRun: true });
  assert.ok(plan.replaced.length > 0);
  assert.equal(read(dir, SKILL), "edited\n", "a dry run must not write");
});

test("init picks up a skill added by a later release", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, ".agents/skills/cg-plan"), { recursive: true });
  init(dir, {});
  sync(dir);
  assert.ok(fs.existsSync(path.join(dir, SKILL)));
  assert.deepEqual(verify(dir).failures, []);
});

test("the manifest records the new hash of a replaced file, not the original", () => {
  const dir = makeRepo();
  write(dir, SKILL, "edited\n");
  init(dir, {});
  assert.equal(
    JSON.parse(read(dir, MANIFEST)).files[SKILL].sha256,
    sha(read(dir, SKILL)),
    "a replaced file's baseline must describe what is on disk",
  );
});

test("the manifest keeps the original baseline for preserved context", () => {
  const dir = makeRepo();
  const seed = ".agents/cg/contract.md";
  const before = JSON.parse(read(dir, MANIFEST)).files[seed].sha256;
  write(dir, seed, "# our graph\n");
  init(dir, {});
  assert.equal(
    JSON.parse(read(dir, MANIFEST)).files[seed].sha256,
    before,
    "a preserved file's baseline is evidence of what shipped, and must not drift",
  );
});

test("the shipped rule pointer matches what cg sync generates", () => {
  // They drifted once. Nothing caught it, because sync overwrites the file on the first run
  // and the stale template was only ever read by someone opening the package.
  assert.equal(
    fs.readFileSync(path.join(SOURCE_ROOT, "scaffold/rules/cg.md"), "utf8"),
    renderAgentRule(),
  );
});

// ---------------------------------------------------------------------------
// cg next — the independent answer that makes cg-auto-run enforceable
// ---------------------------------------------------------------------------

const brief = (n, { status, priority = n, depends = "None", blocked = "None" }) =>
  `# Phase 1 Step ${n}: step ${n}\n\nWeight: Build\nPriority: ${priority}\n` +
  `Depends on: ${depends}\nBlocked by: ${blocked}\nStatus: ${status}\n\n## Goal\nx\n`;

function queue(dir, steps) {
  const root = path.join(dir, "docs/plans/phase-1");
  fs.mkdirSync(root, { recursive: true });
  for (const [n, opts] of Object.entries(steps)) {
    fs.writeFileSync(path.join(root, `step-0${n}.md`), brief(n, opts), "utf8");
  }
}

test("next reports cg-prepare when no queue exists", () => {
  const dir = makeRepo();
  const result = next(dir);
  assert.equal(result.state, "no-queue");
  assert.equal(result.stage, "cg-prepare");
});

test("next selects the earliest Ready Step by priority", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" }, 2: { status: "Ready", depends: "Step 1" }, 3: { status: "Ready" } });
  const result = next(dir);
  assert.equal(result.stage, "cg-produce");
  assert.match(result.step.file, /step-02/);
});

test("next does not select a Ready Step whose dependency is unfinished", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Waiting" }, 2: { status: "Ready", depends: "Step 1" } });
  assert.equal(next(dir).state, "blocked");
});

test("next routes to sign-off only when every Step is Complete", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" }, 2: { status: "Complete" } });
  assert.equal(next(dir).stage, "cg-sign-off");
});

test("next routes to unblock when a Step names a blocker", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Blocked", blocked: "DL-02-004" } });
  const result = next(dir);
  assert.equal(result.stage, "cg-unblock");
  assert.match(result.reason, /DL-02-004/);
});

test("next ignores archived phases", () => {
  const dir = makeRepo();
  const root = path.join(dir, "docs/plans/archive/phase-0");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "step-01.md"), brief(1, { status: "Ready" }), "utf8");
  assert.equal(next(dir).state, "no-queue");
});

test("next refuses to answer from a brief it cannot parse", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Ready" } });
  write(dir, "docs/plans/phase-1/step-01.md", "# Phase 1 Step 1: x\n\nStatus: Sortof\nPriority: 1\n");
  const result = next(dir);
  assert.equal(result.state, "unreadable");
  assert.match(result.problems[0], /unknown Status/);
});

test("an In progress Step wins over any Ready one", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "In progress" }, 2: { status: "Ready" } });
  assert.match(next(dir).step.file, /step-01/);
});

test("permits denies a stage the queue does not support, and allows the one it does", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" } });
  const result = next(dir);
  assert.equal(permits(result, "cg-produce").allowed, false);
  assert.equal(permits(result, "cg-sign-off").allowed, true);
});

test("unblock, plan, warmup and the adapter itself are never gated", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Blocked", blocked: "DL-02-001" } });
  const result = next(dir);
  for (const skill of ["cg-unblock", "cg-plan", "cg-warmup", "cg-auto-run"]) {
    assert.equal(permits(result, skill).allowed, true, skill);
  }
});

test("an unreadable queue denies every gated stage", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Ready" } });
  write(dir, "docs/plans/phase-1/step-01.md", "no header at all\n");
  const result = next(dir);
  assert.equal(permits(result, "cg-produce").allowed, false);
});

test("init ignores the auto-run ledger without disturbing an existing .gitignore", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-ignore-"));
  fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\ndist/\n", "utf8");
  init(dir, {});
  const text = read(dir, ".gitignore");
  assert.match(text, /^\.auto-run\.md$/m);
  assert.match(text, /^node_modules\/$/m, "existing rules must survive");

  init(dir, {});
  assert.equal(
    text.split("\n").filter((l) => l.trim() === ".auto-run.md").length,
    1,
    "re-running init must not append the rule twice",
  );
});
