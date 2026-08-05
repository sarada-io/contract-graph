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
import { sync } from "../src/scripts/sync.js";
import { verify } from "../src/scripts/verify.js";
import {
  parsePrinciples,
  loadPrinciples,
  splitLines,
  ContractError,
} from "../src/scripts/model.js";
import {
  ProfileError,
  availableProfiles,
  loadProfileConfig,
  resolveProfiles,
} from "../src/scripts/profiles.js";

/** A green repository: core template plus the named domain packs, synced. */
function makeRepo(packs = ["saas", "operations"]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-test-"));
  init(dir, { packs });
  sync(dir);
  return dir;
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), "utf8");
const write = (dir, rel, text) => fs.writeFileSync(path.join(dir, rel), text, "utf8");
const edit = (dir, rel, fn) => write(dir, rel, fn(read(dir, rel)));

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
const DOMAIN_OPS = ".agents/cg/principles/domains/operations.md";
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
  assert.equal(counts.skills, 5);
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
  const { written, skipped } = init(dir, { packs: [] });
  assert.deepEqual(written, []);
  assert.ok(skipped.length > 0);
  assert.equal(read(dir, CONTRACT), sentinel);
});

test("init rejects an unknown domain pack by name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-test-"));
  assert.throws(() => init(dir, { packs: ["not-a-pack"] }), /unknown domain pack/);
});

test("init persists the selected profiles and domain packs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-profile-record-"));
  init(dir, { profiles: ["claude"], packs: ["operations"] });
  assert.deepEqual(JSON.parse(read(dir, PROFILE)), {
    profiles: ["claude"],
    packs: ["operations"],
    docs: "docs",
  });
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
    ...["cg-plan", "cg-prepare", "cg-produce", "cg-sign-off", "cg-unblock"].map(
      (name) => `.claude/skills/${name}/SKILL.md`,
    ),
  ],
  antigravity: [],
  claude: [
    "CLAUDE.md",
    ...["cg-plan", "cg-prepare", "cg-produce", "cg-sign-off", "cg-unblock"].map(
      (name) => `.claude/skills/${name}/SKILL.md`,
    ),
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
    init(dir, { profiles: [profile], packs: ["saas", "operations"] });
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

// --------------------------------------------------- domain principles

test("[10] a guide carrying an enforcement-map row fails", () => {
  const dir = makeRepo();
  const guide = /- \*\*(DP-OPERATIONS-\d{2}-\d{2})\*\* `guide`/.exec(read(dir, DOMAIN_OPS));
  assert.ok(guide, "fixture must contain an OPS guide");
  edit(dir, ENFORCEMENT, (t) => `${t}\n| ${guide[1]} | some detector |\n`);
  assertFails(dir, 10, "guide must not be in the enforcement map");
});

test("[10] an invariant with no enforcement-map row fails", () => {
  const dir = makeRepo();
  edit(dir, DOMAIN_OPS, (t) => t.replace("`guide`", "`invariant`"));
  assertFails(dir, 10, "invariant owes exactly one detector row");
});

test("[10] a rule filed in the wrong set file fails", () => {
  const dir = makeRepo();
  edit(dir, DOMAIN_OPS, (t) => t.replace(/\*\*DP-OPERATIONS-/, "**DP-SAAS-"));
  assertFails(dir, 10, "rule set token disagrees with its file");
});

test("[10] a guide with no Cost clause fails", () => {
  const dir = makeRepo();
  edit(dir, DOMAIN_OPS, (t) =>
    splitLines(t)
      .filter((l) => !l.startsWith("  **Cost:**"))
      .join("\n") + "\n",
  );
  assertFails(dir, 10, "guide owes exactly one Cost clause");
});

test("[10] a malformed design rule line fails", () => {
  const dir = makeRepo();
  edit(dir, DOMAIN_OPS, (t) => t.replace(/`(invariant|guide)` — /, ""));
  assertFails(dir, 10, "rule missing its modality marker");
});

test("[10] an inherited domain principle fails", () => {
  const dir = makeRepo();
  edit(dir, INHERITANCE, (t) => t.replace('"AP-01-01"', '"DP-OPERATIONS-01-01"'));
  assertFails(dir, 10, "DP must be loaded explicitly, never inherited");
});

test("[10] an enforcement row for an unknown design id fails", () => {
  const dir = makeRepo();
  edit(dir, ENFORCEMENT, (t) => `${t}\n| DP-OPERATIONS-99-99 | ghost detector |\n`);
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

// ------------------------------------------------------------- manifest

/**
 * `cg upgrade` ships later, but its baseline cannot be captured later. These assert the
 * record is complete and, more importantly, that it is never refreshed — a later `init`
 * that re-hashed an edited file would adopt the user's edits as pristine and destroy the
 * only evidence that they changed anything.
 */
test("init records every file it installed, with the version that installed it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-manifest-"));
  const { written } = init(dir, { packs: ["saas", "operations"] });
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
  init(dir, { packs: ["saas"] });
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
  init(dir, { packs: [] });
  const after = JSON.parse(read(dir, MANIFEST)).files[CONTRACT].sha256;
  assert.equal(after, before, "the baseline must survive a user edit, or upgrade is blind");
});

test("a file already present when cg arrives is recorded as adopted", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-adopt-"));
  fs.mkdirSync(path.join(dir, "src", ".agents", "cg"), { recursive: true });
  fs.writeFileSync(path.join(dir, CONTRACT), "# pre-existing\n");
  init(dir, { packs: [] });
  const entry = JSON.parse(read(dir, MANIFEST)).files[CONTRACT];
  assert.equal(entry.adopted, true, "its contents predate this install and are not what shipped");
  assert.ok(!JSON.parse(read(dir, MANIFEST)).files[".agents/cg/contract.md"].adopted);
});

// ------------------------------------------------------------ phase map

const PHASES = ".agents/cg/map/phases.json";

test("init narrows the phase map to the installed domain packs", () => {
  const dir = makeRepo(["saas"]);
  const tokens = JSON.stringify(JSON.parse(read(dir, PHASES)).phases);
  assert.match(tokens, /DP-SAAS/);
  assert.ok(!tokens.includes("DP-SECURITY"), "an uninstalled set must not survive narrowing");
  assert.deepEqual(verify(dir).failures, []);
});

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

test("[11] an installed domain set no phase loads fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replaceAll('"DP-OPERATIONS",', "").replaceAll('"DP-OPERATIONS"', '""'));
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
  edit(dir, PHASES, (t) => t.replace('"always": [\n        "AP",', '"always": [\n        "AP",\n        "AP",'));
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
  if (rule.select === "tree" || rule.select === "domain-packs") {
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
    {
      source: "principles/domains",
      target: ".agents/cg/principles/domains",
      mode: "selected",
      select: "domain-packs",
    },
    { source: "governance", target: ".agents/cg", mode: "always", select: "tree" },
    { source: "skills", target: ".agents/skills", mode: "always", select: "tree" },
    { source: "scaffold/rules", target: ".agents/rules", mode: "always", select: "tree" },
    { source: "scaffold/module", target: "src", mode: "always", select: "tree" },
    { source: "scaffold/docs/plans", target: "docs/plans", mode: "always", select: "tree" },
    { source: "scaffold/docs/design", target: "docs/design", mode: "always", select: "tree" },
    { source: "scaffold/docs/guides", target: "docs/guides", mode: "always", select: "tree" },
  ];
  const packs = ["operations", "saas"];
  const sourceFiles = filesUnder(SOURCE_ROOT);
  const expected = [];
  for (const rule of canonical) {
    for (const file of sourceFiles.filter((candidate) => ruleMatchesSource(rule, candidate))) {
      if (rule.mode === "selected") {
        const pack = path.posix.basename(file, ".md");
        if (!packs.includes(pack)) continue;
      }
      const within = path.posix.relative(rule.source, file);
      expected.push(path.posix.join(rule.target, within));
    }
  }
  expected.push(PROFILE, MANIFEST);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-round-trip-"));
  init(dir, { packs });
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
  init(dir, { packs: [] });
  const missing = [...referenced]
    .sort()
    .filter((tree) => !fs.existsSync(path.join(dir, "docs", tree)));
  assert.deepEqual(missing, [], `document tree(s) referenced but never scaffolded: ${missing}`);

  // The decision log is cited by exact filename, so its existence is part of the contract.
  assert.ok(fs.existsSync(path.join(dir, "docs", "plans", "decision-log.md")));
});

test("a chosen docs root relocates the trees and is recorded", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-root-"));
  init(dir, { packs: [], docs: "handbook" });
  sync(dir);
  assert.ok(fs.existsSync(path.join(dir, "handbook", "plans", "decision-log.md")));
  assert.ok(fs.existsSync(path.join(dir, "handbook", "design", "README.md")));
  assert.ok(!fs.existsSync(path.join(dir, "docs")));
  assert.equal(JSON.parse(read(dir, PROFILE)).docs, "handbook");
  assert.deepEqual(verify(dir).failures, []);
});

test("a recorded docs root survives a re-run that does not name one", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-sticky-"));
  init(dir, { packs: [], docs: "handbook" });
  const second = init(dir, { packs: [] });
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
  init(dir, { packs: ["saas", "operations"], docs: "handbook" });
  sync(dir);
  edit(dir, CONTRACT, (t) => `${t}\nSee handbook/plans/roadmap.md for the rule.\n`);
  assertFails(dir, 5, "relocated transient plan path");
});

test("init rejects a docs root that is not a single directory name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-docs-invalid-"));
  assert.throws(() => init(dir, { packs: [], docs: "a/b" }), /invalid docs root/);
  assert.throws(() => init(dir, { packs: [], docs: ".hidden" }), /invalid docs root/);
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
  ];
  const repo = path.resolve(import.meta.dirname, "..");
  const roots = ["src", "bin", "docs", "test", "README.md", "CONTRIBUTING.md", "package.json"];
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
    if (!/\.(js|md|json|yaml)$/.test(target)) return;
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
