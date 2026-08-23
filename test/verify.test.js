/**
 * Fail-on-demand coverage for the verifier.
 *
 * Every negative case here is load-bearing. A verifier suite that only proves the green
 * path passes is indistinguishable from a verifier that checks nothing — which is the exact
 * failure mode `enforcement.yaml` warns about. Each test mutates one thing in an
 * otherwise-green repository and asserts the specific check fires.
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { init, SCAFFOLD_MAPPING, SOURCE_ROOT } from "../src/scripts/init.js";
import {
  BINDING_FILENAME,
  BUILT_IN_DETECTORS,
  loadBindingCatalog,
} from "../src/scripts/binding.js";
import { checkHarvest } from "../src/scripts/harvest.js";
import { detectModuleRoots, moduleCoverage, subBoundaryCount } from "../src/scripts/modules.js";
import { renderAgentRule, renderModulePointer } from "../src/scripts/model.js";
import { next, permits } from "../src/scripts/next.js";
import { residue } from "../src/scripts/residue.js";
import { sync } from "../src/scripts/sync.js";
import { CORE_CG_SKILLS, verify } from "../src/scripts/verify.js";
import {
  parsePrinciples,
  loadBindingPrinciples,
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
import {
  CONTRACT_FILENAME,
  contractContext,
  findContract,
  graphTree,
  loadContract,
  loadContractGraph,
  parseContractYaml,
  renderContract,
  renderGraph,
  renderMermaid,
  routeContracts,
  stringifyContractYaml,
  validateContract,
} from "../src/scripts/contracts.js";

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
/** Parse a YAML contract or a JSON map and write it back in that file's authored format. */
const readObject = (dir, rel) => rel.endsWith(".yaml")
  ? loadContract(path.join(dir, rel), { repoRoot: dir, validate: false })
  : JSON.parse(read(dir, rel));
const editObject = (dir, rel, fn) => {
  const value = readObject(dir, rel);
  fn(value);
  write(dir, rel, rel.endsWith(".yaml") ? stringifyContractYaml(value) : `${JSON.stringify(value, null, 2)}\n`);
};
const addEnforcement = (dir, rules, detector) => {
  editObject(dir, ENFORCEMENT, (map) => {
    map.entries.push({ rules: Array.isArray(rules) ? rules : [rules], detector });
  });
};
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

const CONTRACT = "src/.agents/cg/contract.yaml";
const ROOT_CONTRACT = ".agents/cg/contract.yaml";
const PROFILE = ".agents/cg/profile.json";
const MANIFEST = ".agents/cg/manifest.json";
const ENFORCEMENT = ".agents/cg/enforcement.yaml";
const PRODUCT = ".agents/cg/guidelines/product.yaml";
const ENGINEERING = ".agents/cg/guidelines/engineering.yaml";
const BINDING = BINDING_FILENAME;

function setProductEntries(dir, principleId, title, entries) {
  const entryYaml = entries
    .map(({ id, text }) => `      - id: ${id}\n        text: ${JSON.stringify(text)}`)
    .join("\n");
  edit(
    dir,
    PRODUCT,
    (text) => text.replace(
      "principles: []",
      `principles:\n  - id: ${principleId}\n    title: ${title}\n    entries:\n${entryYaml}`,
    ),
  );
}

function addRootChildren(dir, names, mutate = () => {}) {
  const base = readObject(dir, CONTRACT);
  const root = readObject(dir, ROOT_CONTRACT);
  for (const name of names) {
    const contract = structuredClone(base);
    contract.id = name;
    contract.name = name;
    contract.unit = name;
    contract.summary = `${name} owns its distinct repository capability.`;
    contract.purpose = `The repository delegates the ${name} capability to this module.`;
    contract.relations.parent.uses = `Delegates the ${name} capability.`;
    mutate(contract, name);
    fs.mkdirSync(path.join(dir, name, ".agents", "cg"), { recursive: true });
    write(dir, `${name}/.agents/cg/contract.yaml`, stringifyContractYaml(contract));
    for (const pointer of ["CLAUDE.md", "AGENTS.md"]) {
      fs.copyFileSync(path.join(dir, "src", pointer), path.join(dir, name, pointer));
    }
    root.relations.children.push({
      contract: `${name}/.agents/cg/contract.yaml`,
      uses: `Delegates the ${name} capability.`,
    });
  }
  write(dir, ROOT_CONTRACT, stringifyContractYaml(root));
}

// ---------------------------------------------------------------- green path

test("a freshly initialised repository verifies green", () => {
  const dir = makeRepo();
  const { failures, counts } = verify(dir);
  assert.deepEqual(failures, []);
  assert.equal(counts.folders, 1);
  assert.equal(counts.roots, 3);
  assert.equal(counts.skills, CORE_CG_SKILLS.length);
  assert.ok(counts.engineering > 0);
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
  assert.deepEqual(availableProfiles(), ["all", "antigravity", "claude", "codex", "copilot", "cursor"]);
  const all = resolveProfiles(["all"]);
  assert.deepEqual(all.rootPointers, {
    "CLAUDE.md": "",
    "AGENTS.md": "",
    ".github/copilot-instructions.md": "../",
  });
  assert.deepEqual(resolveProfiles(["cursor"]).rootPointers, { "AGENTS.md": "" });
  assert.equal(resolveProfiles(["cursor"]).skillWrappers, null);
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
  cursor: ["AGENTS.md"],
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
 * with `profile.json` the one file that records the selection and so must differ.
 *
 * Without this, a profile that started writing its own governance would pass every other
 * test — each profile's own artifacts would still be exactly what it declares — while the
 * profile boundary quietly stopped being true.
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
    () => init(dir, { profiles: ["unknown-editor"] }),
    /unknown profile\(s\): unknown-editor\. Available: all, antigravity, claude, codex, copilot, cursor/,
  );
  assert.deepEqual(filesUnder(dir), []);
});

/**
 * Cursor reads AGENTS.md and `.agents/skills/` natively. The profile is therefore a named
 * alias of Codex's pointer: it must not invent `.cursor/rules` or `.cursor/skills` copies.
 */
test("a Cursor-only selection reuses AGENTS.md and does not create a .cursor/ surface", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-cursor-only-"));
  init(dir, { profiles: ["cursor"] });
  sync(dir);
  assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")));
  assert.ok(!fs.existsSync(path.join(dir, "CLAUDE.md")));
  assert.ok(!fs.existsSync(path.join(dir, ".claude")));
  assert.ok(!fs.existsSync(path.join(dir, ".cursor")));
  assert.ok(fs.existsSync(path.join(dir, ".agents", "skills", "cg-plan", "SKILL.md")));
  const result = verify(dir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.counts.roots, 1);
});

// ---------------------------------------------------------- structured contracts

test("[2] an unknown contract field fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.responsibilites = contract.responsibilities; });
  assertFails(dir, 2, "misspelled structured field");
});

test("a contract stored outside its declared unit fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.unit = "elsewhere"; });
  assertFails(dir, 2, "unit and canonical file disagree");
});

test("[6] a contract P rule id absent from product guidelines fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.rules.push("P99-99"); });
  assertFails(dir, 6, "dangling rule reference");
});

test("a non-root contract without a public surface fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.surface = []; });
  assertFails(dir, 2, "public surface omitted");
});

test("[2] a missing required contract property fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { delete contract.verification; });
  assertFails(dir, 2, "missing verification property");
});

test("[2] a contract with no invariants property fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { delete contract.invariants; });
  assertFails(dir, 2, "missing invariants property");
});

// ------------------------------------------------------- self-sufficiency

test("[5] a contract citing a transient plan path fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.purpose += " See docs/plans/whatever-v1.md for the rule."; });
  assertFails(dir, 5, "cites a plan path");
});

test("[5] a contract citing a plan ticket id fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.purpose += " Defined by CS-4.2 elsewhere."; });
  assertFails(dir, 5, "cites a plan ticket id");
});

test("[5] a rule ID is not mistaken for a plan ticket id", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.purpose += " This boundary is bound by E01-01."; });
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
  edit(dir, "src/AGENTS.md", (t) => t.replace("../.agents/cg/guidelines/", "somewhere"));
  assertFails(dir, 1, "pointer missing principles reference");
});

// ---------------------------------------------------------- root indexes

test("[8] a stale canonical principle index fails", () => {
  const dir = makeRepo();
  edit(dir, ".agents/cg/AGENTS.md", (t) => t.replace(/\(\d+ rules\)/, "(999 rules)"));
  assertFails(dir, 8, "stale generated principle index");
});

test("[8] a selected root file must point to the canonical instructions on its first line", () => {
  const dir = makeRepo();
  edit(dir, "AGENTS.md", (t) => `# moved the pointer\n\n${t}`);
  assertFails(dir, 8, "root pointer moved below repository-authored content");
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
  editObject(dir, ROOT_CONTRACT, (contract) => {
    contract.extensions.contractGraph.skills = contract.extensions.contractGraph.skills.filter(
      (skill) => skill.name !== "cg-unblock",
    );
  });
  assertFails(dir, 9, "skill absent from catalog");
});

test("[9] a missing core skill fails", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, ".agents", "skills", "cg-sign-off"), { recursive: true });
  fs.rmSync(path.join(dir, ".claude", "skills", "cg-sign-off"), { recursive: true });
  assertFails(dir, 9, "core skill removed");
});

test("the public lifecycle guide catalogs every core skill", () => {
  const lifecycle = fs.readFileSync(
    path.join(SOURCE_ROOT, "..", "docs", "lifecycle.md"),
    "utf8",
  );
  const rows = lifecycle.match(/^\| `cg-[^`]+` \|/gm) ?? [];
  assert.equal(rows.length, CORE_CG_SKILLS.length, "the public catalog must have one row per core skill");
  for (const name of CORE_CG_SKILLS) {
    assert.ok(lifecycle.includes(`| \`${name}\` |`), `${name} must have a catalog row`);
  }
});

test("the public lifecycle guide documents the graph walk", () => {
  const lifecycle = fs.readFileSync(
    path.join(SOURCE_ROOT, "..", "docs", "lifecycle.md"),
    "utf8",
  );
  assert.match(lifecycle, /## The graph walk/);
  for (const key of ["node", "recurse", "selfSufficient", "surface", "decide", "compose", "stop", "forbid", "adapters"]) {
    assert.ok(lifecycle.includes(`| \`${key}\` |`), `graph walk must include ${key}`);
  }
});

// ----------------------------------------------------- architecture principles

test("a rule filed under the wrong principle heading fails", () => {
  const dir = makeRepo();
  edit(dir, ENGINEERING, (t) => t.replace("id: E16-01", "id: E99-01"));
  assert.match(
    verify(dir).failures.join("\n"),
    /`E99-01` does not belong under `E16`/,
  );
});

test("[10] an empty cost clause fails", () => {
  const dir = makeRepo();
  edit(dir, ENGINEERING, (t) => t.replace(/\n(\s+)cost: .+\n/, "\n$1cost: \"\"\n"));
  assertFails(dir, 10, "cost: expected a non-empty string");
});

test("[2] an engineering guideline cannot become a binding contract rule", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.rules[0] = "E12-01"; });
  assertFails(dir, 2, "invalid binding rule ID");
});

test("[2] a contract cannot repeat an ambient structural binding", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => { contract.rules[0] = "A01"; });
  assertFails(dir, 2, "A rules apply globally and never need copying into a contract");
});

test("[10] the structural binding catalog is required", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, BINDING));
  assertFails(dir, 10, "there is no structural authority without the binding catalog");
});

test("[10] a binding catalog without the graph node decision fails", () => {
  const dir = makeRepo();
  edit(dir, BINDING, (text) => text.replace(/\ngraph:\n[\s\S]*?\nrules:\n/, "\nrules:\n"));
  assertFails(dir, 10, "node decision is part of the binding catalog, not the delivery workflow");
});

test("[10] a binding catalog missing graph.recurse names the stale-install recovery", () => {
  const dir = makeRepo();
  edit(dir, BINDING, (text) => text.replace(/\n  recurse: .*\n/, "\n"));
  const { failures } = verify(dir);
  assert.ok(
    failures.some((item) => /older than this verifier/.test(item)),
    `expected the stale-catalog recovery, got:\n${failures.join("\n")}`,
  );
});

test("[10] a binding catalog missing graph.surface names the stale-install recovery", () => {
  const dir = makeRepo();
  edit(dir, BINDING, (text) =>
    text.replace(/\n  surface:\n    enter: .*\n    service: .*\n    promise: .*\n    encapsulate: .*\n    bypass: .*\n/, "\n"),
  );
  const { failures } = verify(dir);
  assert.ok(
    failures.some((item) => /older than this verifier/.test(item)),
    `expected the stale-catalog recovery, got:\n${failures.join("\n")}`,
  );
});

test("[10] a binding catalog missing graph.surface.service names the stale-install recovery", () => {
  const dir = makeRepo();
  edit(dir, BINDING, (text) => text.replace(/\n    service: .*\n/, "\n"));
  const { failures } = verify(dir);
  assert.ok(
    failures.some((item) => /older than this verifier/.test(item)),
    `expected the stale-catalog recovery, got:\n${failures.join("\n")}`,
  );
});

test("[10] a binding catalog missing graph.adapters names the stale-install recovery", () => {
  const dir = makeRepo();
  edit(dir, BINDING, (text) =>
    text.replace(/\n  adapters:\n    port: .*\n    option: .*\n    mix: .*\n/, "\n"),
  );
  const { failures } = verify(dir);
  assert.ok(
    failures.some((item) => /older than this verifier/.test(item)),
    `expected the stale-catalog recovery, got:\n${failures.join("\n")}`,
  );
});

test("an unregistered binding detector fails verification", () => {
  const dir = makeRepo();
  edit(dir, BINDING, (text) =>
    text.replace("cg.verify.binding-enforcement", "cg.verify.unregistered"),
  );
  assertFails(dir, 10, "binding prose cannot claim enforcement the verifier does not provide");
});

test("every registered binding detector names a real negative fixture", () => {
  const fixtureSources = ["contracts.test.js", "verify.test.js"]
    .map((filename) => fs.readFileSync(path.join(import.meta.dirname, filename), "utf8"))
    .join("\n");
  for (const [, fixture] of Object.values(BUILT_IN_DETECTORS)) {
    assert.ok(
      fixtureSources.includes(`test("${fixture}"`),
      `registered detector fixture is absent: ${fixture}`,
    );
  }
});

test("[10] an enforcement row for an unknown product id fails", () => {
  const dir = makeRepo();
  addEnforcement(dir, "P99-99", "ghost detector");
  assertFails(dir, 10, "enforcement map references a nonexistent rule");
});

// ------------------------------------------- architecture principle coverage

test("[10] a non-binding engineering guideline cannot carry an enforcement-map row", () => {
  const dir = makeRepo();
  addEnforcement(dir, "E01-01", "a detector would imply binding authority");
  assertFails(dir, 10, "E remains advice until deliberately promoted to A");
});

test("a new engineering guideline remains non-binding without a detector", () => {
  const dir = makeRepo();
  edit(dir, ENGINEERING, (t) =>
    t.replace(
      "        rule: A declared-surface change preserves compatibility or updates every affected caller in the same change.\n        reason: Compatibility debt lives in callers the changed node does not name. An agent that edits only the surface leaves those callers broken and the graph lying.\n",
      "        rule: A declared-surface change preserves compatibility or updates every affected caller in the same change.\n        reason: Compatibility debt lives in callers the changed node does not name. An agent that edits only the surface leaves those callers broken and the graph lying.\n      - id: E01-03\n        rule: A newly observed practice remains repository choice.\n        reason: Advice without a reason is indistinguishable from a preference.\n",
    ),
  );
  assert.deepEqual(verify(dir).failures, []);
});

test("loadBindingPrinciples includes ambient A rules without copying them into contracts", () => {
  const dir = makeRepo();
  assert.ok(loadBindingPrinciples(dir).has("A01"));
  assert.ok(!loadPrinciples(dir).has("A01"));
  assert.ok(!readObject(dir, CONTRACT).rules.includes("A01"));
  assert.ok(!readObject(dir, ROOT_CONTRACT).rules.includes("A01"));
  assert.match(read(dir, ".agents/cg/AGENTS.md"), /\*\*A\*\* Structural integrity/);
});

test("deleting architecture.yaml cannot silently remove the non-binding decision catalog", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, ENGINEERING));
  assert.match(verify(dir).failures.join("\n"), /missing non-binding engineering catalog.*engineering\.yaml/);
});

test("[10] an enforcement row for an unknown architecture id fails", () => {
  const dir = makeRepo();
  addEnforcement(dir, "E99-99", "ghost detector");
  assertFails(dir, 10, "enforcement map references a nonexistent principle");
});

test("[10] a leftover compiled architecture file fails", () => {
  const dir = makeRepo();
  write(dir, path.join(".agents", "cg", "guidelines", "engineering.json"), "{}\n");
  assertFails(dir, 10, "compiled JSON is not a fallback for the authored YAML catalog");
});

test("[10] a leftover architecture Markdown file fails", () => {
  const dir = makeRepo();
  write(dir, path.join(".agents", "cg", "guidelines", "engineering.md"), "# leftover\n");
  assertFails(dir, 10, "Markdown is not a fallback for the authored YAML catalog");
});

test("[10] a leftover compiled product file fails", () => {
  const dir = makeRepo();
  write(dir, path.join(".agents", "cg", "guidelines", "product.json"), "{}\n");
  assertFails(dir, 10, "compiled JSON is not a fallback for the authored YAML catalog");
});

test("[10] a leftover product Markdown file fails", () => {
  const dir = makeRepo();
  write(dir, path.join(".agents", "cg", "guidelines", "product.md"), "# leftover\n");
  assertFails(dir, 10, "Markdown is not a fallback for the authored YAML catalog");
});

test("[10] a leftover compiled enforcement file fails", () => {
  const dir = makeRepo();
  write(dir, path.join(".agents", "cg", "enforcement.json"), "{}\n");
  assertFails(dir, 10, "compiled JSON is not a fallback for the authored YAML map");
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
  eligibleDecisionIds: ["DA-01", "DU-03"],
  classifications: [
    {
      id: "DA-01",
      destination: "E",
      rule: "Every request entering the system carries a trace id.",
    },
    { id: "DU-03", destination: "drop", reason: "superseded by the tenancy contract" },
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
      "### DA-01 — trace ids\nanswered.\n\n### DU-03 — tenancy\nanswered.\n",
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
    /DU-03 is dropped without a reason/,
  );
});

test("cohort membership must be exact in both directions", () => {
  assert.match(harvestFailures((m) => m.classifications.pop()), /not classified: DU-03/);
  assert.match(
    harvestFailures((m) =>
      m.classifications.push({ id: "DU-99", destination: "drop", reason: "x" }),
    ),
    /not in the cohort: DU-99/,
  );
});

test("a promoted rule may not take its authority from a transient source", () => {
  assert.match(
    harvestFailures((m) => (m.classifications[0].rule = "Per DA-01, carry a trace id.")),
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
  assert.match(
    harvestFailures((m) => { m.classifications[0].destination = "P"; }),
    /owes a detector/,
  );
  assert.match(
    harvestFailures((m) => { m.classifications[0].destination = "A"; }),
    /owes a deterministic measure[\s\S]*owes a blocking detector[\s\S]*owes a fail-on-demand fixture/,
  );
  assert.match(
    harvestFailures((m) => {
      m.classifications[0].destination = "Z";
    }),
    /expected one of/,
  );
});

test("a decision that is not Resolved is never eligible", () => {
  assert.match(
    harvestFailures((m) => {
      m.eligibleDecisionIds = ["DA-01", "DU-99"];
      m.classifications[1] = { id: "DU-99", destination: "drop", reason: "x" };
    }),
    /not in the log's Resolved section: DU-99/,
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
    harvestFailures((m) => accept(m, ["DA-01"]), { stage: "close" }),
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

test("harvest rejects the retired hyphenated decision grammar", () => {
  const retired = ["DL", "01", "01"].join("-");
  assert.match(
    harvestFailures((m) => {
      m.eligibleDecisionIds = [retired];
      m.classifications = [{ id: retired, destination: "drop", reason: "x" }];
    }),
    /must be DA-NN or DU-NN/,
  );
});

test("the decision log is a ledger; the entry template lives with cg-unblock", () => {
  const log = fs.readFileSync(
    path.join(SOURCE_ROOT, "install/templates/docs/plans/decision-log.md"),
    "utf8",
  );
  assert.doesNotMatch(log, /\*\*Unblocks when:\*\*/);
  assert.doesNotMatch(log, /\*\*Your answer:\*\*/);
  assert.match(log, /DA-NN/);
  assert.match(log, /DU-NN/);
  const template = fs.readFileSync(
    path.join(SOURCE_ROOT, "skills/cg-unblock/assets/decision-entry.template.md"),
    "utf8",
  );
  assert.match(template, /\*\*Unblocks when:\*\*/);
  assert.match(template, /### DU-NN/);
  assert.match(template, /### DA-NN/);
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

  fs.writeFileSync(prep, `# Preparation\n\ndigest ${digest}\ndrain: DA-01\n`);
  assert.match(
    checkHarvest(file, { stage: "close", preparation: prep }).failures.join("\n"),
    /omits drain id\(s\): DU-03/,
  );

  fs.writeFileSync(prep, `# Preparation\n\ndigest ${digest}\ndrain: DA-01, DU-03\n`);
  assert.deepEqual(checkHarvest(file, { stage: "close", preparation: prep }).failures, []);
});

// ------------------------------------------------------ module discovery

/**
 * The gap warmup exists to close, made visible.
 *
 * A freshly initialised brownfield repository verifies green while governing none of its
 * real modules — the starter graph is unmapped, so the verifier checks the root contract
 * and nothing else. Detection reads build manifests, so it is a heuristic and reports as
 * an advisory rather than a failure; a heuristic that fails the build is one everyone
 * learns to bypass.
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

test("a brownfield init leaves an explicitly unmapped root with no invented child", () => {
  const dir = brownfieldRepo({ "go.mod": "module x\n", "api/handler.go": "// code\n" });
  init(dir, {});
  const root = readObject(dir, ROOT_CONTRACT);
  assert.equal(root.relations.composition, "unmapped");
  assert.deepEqual(root.relations.children, []);
  assert.deepEqual(root.routes, []);
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
  assert.ok(fs.existsSync(path.join(greenfield, "src", ".agents", "cg", "contract.yaml")));

  const brown = fs.mkdtempSync(path.join(os.tmpdir(), "cg-brown-module-"));
  fs.mkdirSync(path.join(brown, "api"));
  fs.writeFileSync(path.join(brown, "api", "handler.go"), "// existing\n");
  const result = init(brown, {});
  assert.equal(result.brownfield, true);
  assert.ok(!fs.existsSync(path.join(brown, "src")), "must not invent a module that does not exist");
  assert.ok(fs.existsSync(path.join(brown, ".agents", "cg", "contract.yaml")), "governance still lands");
});

test("a repository holding only README, LICENSE and git metadata still counts as empty", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-nearly-empty-"));
  fs.writeFileSync(path.join(dir, "README.md"), "# new project\n");
  fs.writeFileSync(path.join(dir, "LICENSE"), "Apache-2.0\n");
  fs.mkdirSync(path.join(dir, ".git"));
  assert.equal(init(dir, {}).brownfield, false);
  assert.ok(fs.existsSync(path.join(dir, "src", ".agents", "cg", "contract.yaml")));
});

/**
 * `sync` owns the region between its markers, never the whole file.
 *
 * A repository adopting Contract Graph usually already has a root `CLAUDE.md`. Replacing it
 * wholesale destroys hand-written instructions with no recovery but git — and `sync` is the
 * very next command `init` tells you to run.
 */
test("sync preserves a hand-written root file and prepends its canonical pointer", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-brownfield-"));
  init(dir, {});
  const mine = "# Our house rules\n\nAlways run `make lint` before pushing.\n";
  write(dir, "CLAUDE.md", mine);

  sync(dir);
  const after = read(dir, "CLAUDE.md");
  assert.equal(after.split("\n")[0], "@.agents/cg/AGENTS.md");
  assert.match(after, /# Our house rules/);
  assert.match(after, /make lint/, "hand-written guidance must survive");
  assert.match(read(dir, ".agents/cg/AGENTS.md"), /BEGIN PRINCIPLES INDEX/);
  assert.deepEqual(verify(dir).failures, []);
  assert.deepEqual(sync(dir).changed, [], "a second sync must rewrite nothing");
});

test("sync preserves existing AGENTS, CLAUDE, and Copilot instructions", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-existing-agent-files-"));
  fs.mkdirSync(path.join(dir, ".github"));
  write(dir, "AGENTS.md", "# Existing AGENTS\n\nKeep agent guidance.\n");
  write(dir, "CLAUDE.md", "# Existing CLAUDE\n\nKeep Claude guidance.\n");
  write(dir, ".github/copilot-instructions.md", "# Existing Copilot\n\nKeep Copilot guidance.\n");

  init(dir, {});
  sync(dir);

  assert.equal(read(dir, "AGENTS.md").split("\n")[0],
    "Read [`.agents/cg/AGENTS.md`](.agents/cg/AGENTS.md) before planning or changing code.");
  assert.equal(read(dir, "CLAUDE.md").split("\n")[0], "@.agents/cg/AGENTS.md");
  assert.equal(read(dir, ".github/copilot-instructions.md").split("\n")[0],
    "Read [`../.agents/cg/AGENTS.md`](../.agents/cg/AGENTS.md) before planning or changing code.");
  assert.match(read(dir, "AGENTS.md"), /Keep agent guidance/);
  assert.match(read(dir, "CLAUDE.md"), /Keep Claude guidance/);
  assert.match(read(dir, ".github/copilot-instructions.md"), /Keep Copilot guidance/);
  assert.deepEqual(verify(dir).failures, []);
});

test("sync preserves a root file with no H1 because the pointer needs no anchor", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-brownfield-noh1-"));
  init(dir, {});
  write(dir, "CLAUDE.md", "just some prose with no heading at all\n");
  sync(dir);
  assert.equal(read(dir, "CLAUDE.md").split("\n")[0], "@.agents/cg/AGENTS.md");
  assert.match(read(dir, "CLAUDE.md"), /just some prose/, "repository guidance must survive");
  assert.deepEqual(verify(dir).failures, []);
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

test("the CLI reports the installed package version", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(SOURCE_ROOT, "..", "package.json"), "utf8"),
  );
  const output = execFileSync(
    process.execPath,
    [path.join(SOURCE_ROOT, "..", "bin", "cg.js"), "--version"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  assert.equal(output, `${packageJson.version}\n`);
});

/**
 * A retired flag must fail, not be ignored.
 *
 * Selection moved into `phases.json` in 0.1.0 and `--packs` was retired. Swallowed as an
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
 * `DU-NN` entry discovering that. `init` never overwrites, so creating the tree is correct;
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
  // A predecessor product.md is a checklist against the code, not the source of the survey.
  assert.match(
    skill,
    /predecessor product rule only when the code still obeys it/,
    "predecessor product rules must be carried over only when the tree still holds them",
  );
  assert.match(
    skill,
    /\.agents\/cg\/guidelines\/product\.yaml/,
    "those surviving rules land in the product catalog, not left to re-accrue through harvest",
  );
  assert.match(
    skill,
    /## 2a\. Snapshot the product from the code/,
    "brownfield context (SaaS vs enterprise, composition, surface kind) comes from the tree, not product.md",
  );
  assert.match(
    skill,
    /no existing Contract Graph contracts/,
    "brownfield warmup is a clean start; predecessor markdown is not a graph to copy",
  );
  assert.match(
    skill,
    /Depth is not capped/,
    "mixed two-level leaves and deeper nests are expected; three is not a cap",
  );
  assert.match(
    skill,
    /cg sync/,
    "a newly written module contract is not openable until sync writes its pointers",
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
test("cg-warmup harvests enforced code rules into the correct authority", () => {
  const skill = fs.readFileSync(
    path.join(SOURCE_ROOT, "skills", "cg-warmup", "SKILL.md"),
    "utf8",
  );
  const heading = (text) => skill.indexOf(`\n## ${text}`);

  const harvest = heading("9. Harvest the rules the code already enforces");
  assert.ok(harvest > 0, "warmup must have a harvest step");
  assert.ok(
    harvest > heading("8. Assess structural binding failures"),
    "harvest follows measurement of the binding state",
  );
  assert.ok(harvest < heading("11. Report coverage honestly"), "harvest precedes the report");

  // Family placement is the whole difficulty. A product rule filed as `E` loses its binding
  // authority; a testable rule filed as a `guide` buys silence for the price of the detector.
  assert.match(skill, /Do not file a product rule as an engineering guideline/);
  assert.match(skill, /Do not promote an `E` practice to A on wording alone/);

  // P bindings owe a repository detector row. A generic A candidate owes the complete built-in
  // measurement and negative-fixture package and must go to the verifier owner; E remains advice.
  assert.match(skill, /Every `P` rule needs exactly one repository `.agents\/cg\/enforcement\.yaml`/);
  assert.match(skill, /Every `A` candidate[\s\S]*deterministic measure[\s\S]*negative fixture/);
  assert.match(skill, /route it to the verifier-owning repository; do not assign a local ID/);
  assert.match(skill, /affected contracts' `rules` arrays/, "a harvested rule bound to nothing governs nothing");

  // A harvested rule contradicting a binding is the owner's call, never warmup's.
  assert.match(skill, /contradicts a binding/i);

  // The owner confirms local rules and advisory practices while generic structural discoveries
  // remain explicitly non-binding until verifier delivery.
  assert.match(skill, /^## Harvested rules and structural candidates — please confirm$/m);
  assert.match(skill, /Never describe a candidate as binding before its detector is registered/);
});

/**
 * The downward edge is the product. Composition edges — proving a *declared* child set is the
 * whole set — are designed and unbuilt, but the cheap half is available now: require the section
 * so a contract either names its children or says it is a leaf. Left optional, the section is
 * simply absent wherever nobody thought about it, and an agent cannot tell a leaf from an
 * omission. `docs/vision.md`: a contract that cannot say where to go next is prose, not a node.
 */
test("a composed contract with no children fails verification", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-children-"));
  init(dir, {});
  sync(dir);
  assert.equal(verify(dir).failures.length, 0, "the shipped scaffold must already satisfy this");

  editObject(dir, CONTRACT, (contract) => { contract.relations.composition = "composed"; });
  const { failures } = verify(dir);
  assert.ok(
    failures.some((message) => message.includes("composed contract must declare at least one child")),
    `expected a composition failure, got: ${failures.join(" | ") || "none"}`,
  );
});

/**
 * `cg-warmup` copies its own template rather than the scaffold's, so the two drift silently and
 * the drift only shows up in an adopted repository. It has happened once: the scaffold gained the
 * traversal fields and warmup kept writing contracts without them.
 */
test("the warmup and produce templates conform to the same YAML contract shape", () => {
  for (const file of [
    "install/templates/module/.agents/cg/contract.yaml",
    "skills/cg-warmup/assets/contract.template.yaml",
    "skills/cg-warmup/assets/component-contract.template.yaml",
    "skills/cg-produce/assets/contract.template.yaml",
  ]) {
    const contract = parseContractYaml(fs.readFileSync(path.join(SOURCE_ROOT, file), "utf8"), { source: file });
    assert.deepEqual(validateContract(contract, { source: file }), [], `${file} must satisfy the canonical shape`);
    assert.ok(contract.purpose);
    assert.ok(contract.relations.parent);
    assert.ok(contract.surface.length);
  }
});

/**
 * A skill that names a file which is not installed sends the agent looking for something that
 * cannot be found, and a weaker model will invent the contents rather than stop. `cg-unblock`
 * pointed at stale topic-specific paths after the non-product families were consolidated into
 * `architecture.yaml`.
 */
test("every governance path a skill names is a file init installs", () => {
  const installed = new Set();
  for (const file of fs.readdirSync(path.join(SOURCE_ROOT, "cg", "principles"))) {
    installed.add(`.agents/cg/principles/${file}`);
  }
  for (const file of fs.readdirSync(path.join(SOURCE_ROOT, "cg", "guidelines"))) {
    installed.add(`.agents/cg/guidelines/${file}`);
  }
  for (const file of fs.readdirSync(path.join(SOURCE_ROOT, "cg"))) {
    if (/\.(?:md|json|yaml)$/.test(file)) installed.add(`.agents/cg/${file}`);
  }
  // Written by init into the docs root, not shipped under src/cg.
  installed.add("docs/plans/decision-log.md");
  installed.add(".agents/cg/principles/architecture.yaml");

  const skills = path.join(SOURCE_ROOT, "skills");
  for (const skill of fs.readdirSync(skills)) {
    const file = path.join(skills, skill, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file, "utf8");
    for (const [index, line] of body.split("\n").entries()) {
      for (const ref of line.match(/\.agents\/cg\/[A-Za-z0-9/{},._-]+\.(?:md|json|ya?ml)/g) ?? []) {
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
  assert.match(skill, /DESCEND/, "governed is not done when recurse is unfinished");
  assert.match(skill, /test -f/, "existence checks must not pass as verification");
  assert.match(skill, /older than this skill/, "a preserved catalog from an older install must stop the run");
  assert.doesNotMatch(
    skill,
    /reports `governed` is done/,
    "the 8-node freeze treated governed as finished",
  );

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
  setProductEntries(dir, "P01", "Generated fixture", [
    { id: "P01-01", text: "Every generated unit carries its declared scope." },
  ]);
  addEnforcement(dir, "P01-01", "generated-unit scope test");
  editObject(dir, CONTRACT, (contract) => { contract.rules.push("P01-01"); });
  sync(dir);
  const shared = "Every generated module owns generic core responsibilities for dependent modules.";
  addRootChildren(dir, ["alpha", "beta", "gamma"], (contract) => {
    contract.summary = shared;
    contract.purpose = shared;
  });

  // Every section is present and every rule id resolves — a templated graph is *well-formed*.
  // It fails anyway, because a graph nobody can route with is worse than none: it looks answered.
  const { failures } = verify(dir);
  assert.ok(
    failures.some((m) => m.includes("identical rule set")),
    `expected the uniform-scope failure, got: ${failures.join(" | ")}`,
  );
  assert.ok(
    failures.some((m) => m.includes("appears verbatim")),
    `expected the boilerplate failure, got: ${failures.join(" | ")}`,
  );

  // Vary one module's scope and prose: the uniform-scope signal clears.
  editObject(dir, "gamma/.agents/cg/contract.yaml", (contract) => {
    contract.rules = [];
    contract.summary = "Gamma alone owns settlement reconciliation.";
    contract.purpose = "The repository delegates settlement reconciliation only to Gamma.";
  });
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

  // Execution delivers the contract, scoped rules, and reciprocal parent edge together.
  const produce = skill("cg-produce");
  assert.match(produce, /A new self-sufficient unit owes a contract in the Step that creates it/);
  assert.match(produce, /reciprocal relation edges/);
  assert.match(produce, /applicable repository-owned P IDs in its `rules` array/);
  assert.match(produce, /principles\/architecture\.yaml` `graph`/);
  assert.match(produce, /add-child/);

  const prepare = skill("cg-prepare");
  assert.match(prepare, /principles\/architecture\.yaml` `graph`/);
  assert.match(skill("cg-plan"), /stay, add-child, elsewhere/);

  for (const name of ["cg-auto-run", "cg-plan", "cg-prepare", "cg-produce", "cg-sign-off", "cg-unblock", "cg-warmup"]) {
    assert.match(
      skill(name),
      /principles\/architecture\.yaml/,
      `${name} must read the architecture principles catalog`,
    );
  }

  const workflow = fs.readFileSync(path.join(SOURCE_ROOT, "cg", "workflow.md"), "utf8");
  assert.match(workflow, /principles\/architecture\.yaml` `graph`/);
  assert.match(workflow, /Read implementation only after this placement is known/);

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

  fs.writeFileSync(path.join(dir, "src", "build.gradle.kts"), "plugins { java }\n");
  fs.mkdirSync(path.join(dir, "src", "lib", "core"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "lib", "core", "a.ts"), "export const a = 1;\n");
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("declares a leaf")),
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
    !failures.some((m) => m.includes("declares a leaf")),
    "an undeclared boundary must not fail the build — the verifier cannot decide it",
  );
  const asked = advisories.find((m) => m.includes("undeclared code-bearing packages"));
  assert.ok(asked, `expected the advisory, got: ${advisories.join(" | ")}`);
  assert.match(asked, /5 undeclared code-bearing packages/);

  // An explicit leaf rationale clears it; the contract carries the judgement as data.
  editObject(dir, CONTRACT, (contract) => {
    contract.assumptions.push(
      "Leaf rationale: core, billing, identity, search, and reporting form one storefront pipeline and never change independently.",
    );
  });
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("undeclared code-bearing packages")),
    "a stated reason must clear the advisory",
  );
});

test("a composed node with undeclared packages still needs descent", () => {
  const dir = makeRepo();
  for (const pkg of ["core", "billing", "identity", "search", "reporting"]) {
    fs.mkdirSync(path.join(dir, "src", "lib", pkg), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "lib", pkg, "index.ts"), "export const x = 1;\n");
  }
  const child = structuredClone(readObject(dir, CONTRACT));
  child.id = "src-core";
  child.name = "src core";
  child.kind = "component";
  child.unit = "src/lib/core";
  child.summary = "The core package inside the starter module.";
  child.purpose = "The starter module delegates core types here.";
  child.responsibilities.owns = ["Starter core types used by the other lib packages."];
  child.relations.parent = {
    contract: "src/.agents/cg/contract.yaml",
    uses: "Delegates the core package.",
  };
  child.relations.composition = "leaf";
  child.relations.children = [];
  fs.mkdirSync(path.join(dir, "src", "lib", "core", ".agents", "cg"), { recursive: true });
  write(dir, "src/lib/core/.agents/cg/contract.yaml", stringifyContractYaml(child));
  editObject(dir, CONTRACT, (contract) => {
    contract.relations.composition = "composed";
    contract.relations.children = [{
      contract: "src/lib/core/.agents/cg/contract.yaml",
      uses: "Delegates the core package.",
    }];
  });

  const asked = verify(dir).advisories.find((m) => m.includes("undeclared code-bearing packages"));
  assert.ok(asked, "claiming one child of five must not hide the remaining four");
  assert.match(asked, /4 undeclared/);

  const modules = spawnSync(
    process.execPath,
    [path.join(SOURCE_ROOT, "..", "bin", "cg.js"), "modules", dir],
    { encoding: "utf8" },
  );
  assert.match(modules.stdout, /DESCEND\s+src/);
  assert.notEqual(modules.status, 0, "unfinished recurse must keep cg modules from exiting 0");
});

test("verification that only proves a path exists fails", () => {
  const dir = makeRepo();
  editObject(dir, CONTRACT, (contract) => {
    contract.invariants = [{
      id: "SRC_EXISTS",
      statement: "The starter module directory is present.",
      verification: ["path-exists"],
    }];
    contract.verification = [{
      id: "path-exists",
      command: "test -f src/.agents/cg/contract.yaml",
      covers: ["SRC_EXISTS"],
    }];
  });
  assertFails(dir, 12, "existence checks are not verification");
});

test("boilerplate is caught at a majority, not only at near-unanimity", () => {
  const dir = makeRepo();
  const shared = "One boundary: these share a lifecycle and are never changed independently.";
  addRootChildren(dir, Array.from({ length: 9 }, (_, index) => `m${index}`), (contract, name) => {
    const index = Number(name.slice(1));
    contract.summary = index < 6 ? shared : `Owns the ${name} ledger and nothing else.`;
    contract.rules = contract.rules.slice(0, (index % 3) + 1);
  });

  const failures = verify(dir).failures;
  assert.ok(
    failures.some((m) => m.includes("appears verbatim") && m.includes("6 of 10")),
    `expected boilerplate caught at six of ten, got: ${failures.join(" | ")}`,
  );
});

/**
 * The product catalog untouched after warmup means §9 harvested nothing — the single clearest sign the
 * step was skipped. Measured on a run that reported success: eleven modules mapped, `cg verify`
 * green, and the shipped principles file byte-for-byte unchanged. Advisory rather than a failure,
 * because a repository may honestly owe no product rule; silence is what must not happen.
 */
test("verify notices that warmup harvested no product rules", () => {
  const dir = makeRepo();
  const advisories = verify(dir).advisories;
  assert.ok(
    advisories.some((m) => m.includes("P catalog")),
    `expected a harvest advisory once folders are mapped, got: ${advisories.join(" | ")}`,
  );

  setProductEntries(dir, "P01", "Tenancy", [
    { id: "P01-01", text: "A tenant is a path prefix." },
  ]);
  addEnforcement(dir, "P01-01", "TenantPathTest");
  assert.ok(
    !verify(dir).advisories.some((m) => m.includes("P catalog")),
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

  const initial = verify(dir).advisories;
  assert.ok(
    initial.some((m) => m.includes("purpose placeholder")),
    "the shipped root contract carries the placeholder and should say so",
  );

  editObject(dir, ROOT_CONTRACT, (contract) => { contract.purpose = "A billing platform."; });
  const filled = verify(dir).advisories;
  assert.ok(!filled.some((m) => m.includes("purpose placeholder")), "a filled root clears it");

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
 * shipped as a placeholder, and the brownfield `init` message routes the user to `cg-warmup`
 * rather than telling them to write it. Warmup therefore owns it — a run that maps forty modules
 * and leaves the root a placeholder has built a graph whose first node says nothing about the
 * product.
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
  assert.match(skill, /`purpose`/);
  assert.match(skill, /responsibilities\.forbids/);

  // The scaffolded root contract really does ship those placeholders.
  const root = fs.readFileSync(
    path.join(SOURCE_ROOT, "cg", "contract.yaml"),
    "utf8",
  );
  const rootContract = parseContractYaml(root, { source: "cg/contract.yaml" });
  for (const field of [rootContract.purpose, ...rootContract.responsibilities.forbids]) {
    assert.match(field, /Replace this sentence/, "the root contract must ship explicit identity placeholders");
  }
});

test("the schema uses the stable Sarada-owned canonical identifier", () => {
  const schema = JSON.parse(read(SOURCE_ROOT, "cg/schema/contract.schema.json"));
  assert.equal(
    schema.$id,
    "https://sarada.io/contract-graph/schema/contract-v1.schema.json",
  );
});

/**
 * HTML comments do not nest: the first `-->` closes the outermost `<!--`, so the remainder of
 * the intended comment renders as visible text in the contract an agent then copies. Same shape
 * as the nested-code-fence defect, and made in the same session while fixing it.
 */
test("no shipped markdown nests an HTML comment", () => {
  const roots = [
    path.join(SOURCE_ROOT, "skills"),
    path.join(SOURCE_ROOT, "install"),
    path.join(SOURCE_ROOT, "cg"),
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
 * Architecture practices ship to every repository. A rule naming one product's roles or
 * artifacts reads as a rule about *their* product and is silently wrong everywhere else.
 * Two shipped rules had this defect — a "customer-care agent" who "does not leave the ticket
 * surface", and a "super-admin configurator" — both lifted verbatim from the repository the
 * principles were extracted from.
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
  const dirs = [
    path.join(SOURCE_ROOT, "cg", "principles"),
    path.join(SOURCE_ROOT, "cg", "guidelines"),
  ];

  for (const dir of dirs) {
    for (const file of fs.readdirSync(dir).filter((name) => /\.(?:md|ya?ml)$/.test(name))) {
      const body = fs.readFileSync(path.join(dir, file), "utf8");
      for (const [index, line] of body.split("\n").entries()) {
        for (const word of vocabulary) {
          assert.ok(
            !line.toLowerCase().includes(word),
            `${path.basename(dir)}/${file}:${index + 1}: names \`${word}\` — a principle shipped to every ` +
              "repository must state the generic lean, not one product's vocabulary",
          );
        }
      }
    }
  }
});

/**
 * The architecture catalog exists so a brownfield repository inherits something better than an
 * empty file. It was extracted from one real codebase; that extraction is only useful if it kept
 * the leans and dropped the specifics.
 */
test("the engineering catalog ships a usable starter set", () => {
  const file = "engineering.yaml";
  const body = fs.readFileSync(path.join(SOURCE_ROOT, "cg", "guidelines", file), "utf8");
  const rules = body.match(/^      - id: E\d{2}-\d{2}$/gm) ?? [];
  assert.ok(
    rules.length >= 3,
    `guidelines/${file}: ${rules.length} rule(s) — a catalog thin enough to skip is one nobody loads`,
  );
  const sections = body.match(/^  - id: E\d{2}$/gm) ?? [];
  assert.ok(sections.length >= 2, `guidelines/${file}: needs more than one guideline heading`);
});

test("architecture keeps design advice separate from enforced structural bindings", () => {
  const architecture = fs.readFileSync(path.join(SOURCE_ROOT, "cg", "guidelines", "engineering.yaml"), "utf8");
  const binding = loadBindingCatalog(path.join(SOURCE_ROOT, "cg", "principles", "architecture.yaml"), {
    repoRoot: SOURCE_ROOT,
  });
  assert.match(architecture, /contains non-binding engineering advice/);
  assert.match(architecture, /do not override repository choices/);
  assert.match(architecture, /contract\.yaml/);
  assert.match(architecture, /Each entry is id, rule, and reason/);
  assert.match(architecture, /E01-01[\s\S]*Callers use only the paths, symbols, and types/);
  assert.match(architecture, /E01-02[\s\S]*preserves compatibility/);
  assert.match(architecture, /E02-02[\s\S]*The graph cannot record what the locator conceals/);
  assert.doesNotMatch(architecture, /^        text: /m);
  assert.match(architecture, /does not prescribe a source filename/);
  assert.match(architecture, /Public and internal code may be co-located/);
  assert.match(architecture, /lives in .agents\/cg\/principles\/architecture.yaml `hierarchy` and `graph`/);
  assert.doesNotMatch(architecture, /id: E\d{2}-\d{2}\n\s+text: Every governed boundary declares exactly one named responsibility/);
  assert.equal(binding.graph.decide.map((entry) => entry.id).sort().join(","), "add-child,elsewhere,stay");
  assert.match(binding.graph.recurse, /cg modules is not a leaf/);
  assert.match(binding.graph.selfSufficient.test, /nameable function/);
  assert.match(binding.graph.selfSufficient.inbound, /named types/);
  assert.match(binding.graph.selfSufficient.outbound, /sibling/);
  assert.match(binding.graph.selfSufficient.change, /own reasons/);
  assert.deepEqual(Object.keys(binding.hierarchy.kinds).sort(), [
    "component",
    "library",
    "module",
    "repository",
    "submodule",
  ]);
  assert.match(binding.hierarchy.kinds.module, /product or domain capability/);
  assert.ok(binding.graph.compose.length >= 3);
  assert.ok(binding.graph.stop.length >= 2);
  assert.match(binding.graph.stop.join("\n"), /Depth is not capped/);
  assert.match(binding.graph.stop.join("\n"), /Mixed depth/);
  assert.match(binding.graph.surface.enter, /surface its contract declares/);
  assert.match(binding.graph.surface.service, /first way to declare that surface is a service/);
  assert.match(binding.graph.surface.service, /Many scattered functions/);
  assert.match(binding.graph.selfSufficient.inbound, /graph.surface.service/);
  assert.match(binding.graph.surface.promise, /add-child, not stay/);
  assert.match(binding.graph.surface.encapsulate, /Encapsulation behind the contract/);
  assert.match(binding.graph.surface.bypass, /Corrective Step/);
  assert.match(binding.graph.adapters.port, /parent-owned port/);
  assert.match(binding.graph.adapters.port, /graph.surface.encapsulate/);
  assert.match(binding.graph.adapters.option, /child node/);
  assert.match(binding.graph.adapters.mix, /add-child/);
  assert.equal(binding.rules.find((rule) => rule.id === "A03")?.rule,
    "Every governed boundary declares exactly one named responsibility.");
  assert.equal(binding.rules.find((rule) => rule.id === "A14")?.rule,
    "Every named responsibility is owned by exactly one contract node.");
  assert.equal(binding.rules.find((rule) => rule.id === "A15")?.rule,
    "Top-level modules represent domain or product capabilities, not horizontal technical layers.");
  assert.equal(binding.rules.find((rule) => rule.id === "A16")?.rule,
    "A contract node is named for its owned responsibility, not as a miscellaneous bag.");
  assert.ok(binding.rules.every((rule) => rule.measure && rule.enforcedBy.length));
  assert.doesNotMatch(architecture, /\*Contract|impl\//);
  const warmup = fs.readFileSync(path.join(SOURCE_ROOT, "skills", "cg-warmup", "SKILL.md"), "utf8");
  assert.match(warmup, /declares and mechanically protects an existing cohesive declared surface/);
  assert.match(warmup, /graph\.surface/);
  assert.match(warmup, /graph\.surface\.service/);
  assert.match(warmup, /graph\.adapters/);
  assert.match(warmup, /small set of services/);
  assert.match(warmup, /node per file/);
  assert.match(architecture, /E02-04[\s\S]*constructor-supplied ports/);
  assert.match(architecture, /E02-05[\s\S]*object composition/);
  assert.doesNotMatch(architecture, /do not import infrastructure implementations/);
  assert.match(architecture, /E05-01[\s\S]*closed allowlist/);
  assert.doesNotMatch(architecture, /closed registry of permitted stores/);
  assert.match(architecture, /E07-03[\s\S]*models, queries, and migrations remain internal/);
  assert.doesNotMatch(architecture, /migrations, and adapters remain internal/);
  assert.match(architecture, /E04-01[\s\S]*smallest command that exercises the invariant/);
  assert.match(architecture, /What the surface hides is graph.surface.encapsulate/);
  assert.match(architecture, /Optional vendor children are graph.adapters/);
  assert.match(architecture, /id: E12\n    title: Product shape/);
});

test("architecture catalogue classifies the complete non-product inventory", () => {
  const file = path.join(SOURCE_ROOT, "cg", "guidelines", "engineering.yaml");
  const architecture = fs.readFileSync(file, "utf8");
  const categories = [...architecture.matchAll(/^  - (Structural Best Practices|Broader Engineering Considerations)$/gm)].map(
    ([, title]) => title,
  );
  const headings = [...architecture.matchAll(/^  - id: (E\d{2})\n    title: (.+)$/gm)].map(
    ([, id, title]) => [id, title],
  );

  assert.deepEqual(categories, [
    "Structural Best Practices",
    "Broader Engineering Considerations",
  ]);
  assert.deepEqual(headings, [
    ["E01", "Declared-surface consumption"],
    ["E02", "Construction"],
    ["E03", "Boundary confinement"],
    ["E04", "Verification quality and generated artifacts"],
    ["E05", "Permitted stores and infrastructure"],
    ["E06", "Reuse and shared capabilities"],
    ["E07", "Persistence ownership and evolution"],
    ["E08", "Deployment and runtime simplicity"],
    ["E09", "Safety and authorization"],
    ["E10", "Sensitive-data lifecycle"],
    ["E11", "Runtime configuration"],
    ["E12", "Product shape"],
    ["E13", "Isolation and scope"],
    ["E14", "Doing less"],
    ["E15", "What you charge for"],
    ["E16", "Reversibility and simplicity"],
    ["E17", "Runtime degradation"],
    ["E18", "Defaults under uncertainty"],
    ["E19", "Grants and evidence"],
    ["E20", "Trust boundaries"],
    ["E21", "Guarantees owned by the application"],
    ["E22", "The surface carries the task"],
    ["E23", "Perceived responsiveness"],
  ]);

  const rules = new Map(
    [...architecture.matchAll(/^      - id: (E\d{2}-\d{2})\n        rule: "?([^\n"]+)/gm)]
      .map(([, id, text]) => [id, text]),
  );
  const expectedCounts = new Map([
    ["E01", 2],
    ["E02", 5],
    ["E03", 4],
    ["E04", 4],
    ["E05", 3],
    ["E06", 6],
    ["E07", 13],
    ["E08", 4],
    ["E09", 11],
    ["E10", 15],
    ["E11", 12],
    ["E12", 2],
    ["E13", 3],
    ["E14", 2],
    ["E15", 3],
    ["E16", 2],
    ["E17", 1],
    ["E18", 3],
    ["E19", 2],
    ["E20", 3],
    ["E21", 1],
    ["E22", 2],
    ["E23", 3],
  ]);

  for (const [prefix, expected] of expectedCounts) {
    const actual = [...rules.keys()].filter((id) => id.startsWith(`${prefix}-`)).length;
    assert.equal(actual, expected, `${prefix} should contain ${expected} atomic rules`);
  }

  const reasons = [...architecture.matchAll(/^        reason: /gm)];
  const allEntries = [...architecture.matchAll(/^      - id: E\d{2}-\d{2}$/gm)];
  assert.equal(reasons.length, allEntries.length, "every architecture entry owes a reason");

  assert.match(rules.get("E07-10"), /support.*window.*declared in code/);
  assert.match(rules.get("E10-04"), /audit record.*actor/);
  assert.match(rules.get("E10-05"), /scheduled job cannot invoke/);
  assert.match(rules.get("E10-06"), /customer-facing surface cannot invoke/);
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

  const entry = manifest.files[".agents/cg/principles/architecture.yaml"];
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
  fs.writeFileSync(path.join(dir, CONTRACT), "{\"preExisting\":true}\n");
  init(dir, {});
  const entry = JSON.parse(read(dir, MANIFEST)).files[CONTRACT];
  assert.equal(entry.adopted, true, "its contents predate this install and are not what shipped");
  assert.ok(!JSON.parse(read(dir, MANIFEST)).files[ROOT_CONTRACT].adopted);
});

// ------------------------------------------------------------ phase map

const PHASES = ".agents/cg/phases.json";

test("[11] a phase naming an unknown token fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replace('"E"', '"E", "NOSUCHSET"'));
  assertFails(dir, 11, "phase map cites a set that is not installed");
});

test("[11] a phase naming a misspelled family fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replace('"P"', '"XP"'));
  assertFails(dir, 11, "phase map cites a nonexistent rule family");
});

test("[11] an installed family no phase loads fails", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replaceAll('"E",', "").replaceAll('"E"', '""'));
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
  edit(dir, PHASES, (t) => t.replace('"A", "P"', '"A", "A", "P"'));
  assertFails(dir, 11, "a duplicated token in one phase");
});

test("[11] every phase always loads structural bindings", () => {
  const dir = makeRepo();
  edit(dir, PHASES, (t) => t.replace('"always": ["A", "P"]', '"always": ["P"]'));
  assertFails(dir, 11, "A is ambient binding for every phase");
});

// ---------------------------------------------------------------- model

test("parsePrinciples reads a folded YAML product rule as one line", () => {
  const dir = makeRepo();
  edit(
    dir,
    PRODUCT,
    (text) => text.replace(
      "principles: []",
      `principles:
  - id: P01
    title: Wrapped
    entries:
      - id: P01-01
        text: >-
          Every quoted amount uses the repository's declared
          billing unit.`,
    ),
  );
  const rules = parsePrinciples(path.join(dir, PRODUCT));
  const text = rules.get("P01-01");
  assert.equal(text, "Every quoted amount uses the repository's declared billing unit.");
  assert.ok(!text.includes("\n"), "a parsed rule must occupy exactly one line");
  assert.ok(!/ {2}/.test(text), "continuation whitespace must be collapsed");
});

test("parsePrinciples rejects a duplicate rule id", () => {
  const dir = makeRepo();
  edit(
    dir,
    PRODUCT,
    (text) => text.replace(
      "principles: []",
      `principles:
  - id: P01
    title: First
    entries:
      - id: P01-01
        text: first.
      - id: P01-01
        text: second.`,
    ),
  );
  assert.throws(() => parsePrinciples(path.join(dir, PRODUCT)), ContractError);
});

/**
 * The check that replaces the filename correspondence lost by collapsing each family into
 * one file. A rule under the wrong heading parses and inherits cleanly, so nothing else
 * catches it.
 */
test("verify rejects a non-binding rule sitting under the wrong principle heading", () => {
  const dir = makeRepo();
  edit(dir, ENGINEERING, (text) => text.replace("id: E01-01", "id: E99-02"));
  assert.match(verify(dir).failures.join("\n"), /`E99-02` does not belong under `E01`/);
});

test("verify rejects a duplicated non-binding principle heading", () => {
  const dir = makeRepo();
  edit(dir, ENGINEERING, (text) => text.replace("id: E02\n    title: Construction", "id: E01\n    title: Construction"));
  assert.match(verify(dir).failures.join("\n"), /defines `E01\.` more than once/);
});

test("verify rejects a non-binding rule appearing before any heading", () => {
  const dir = makeRepo();
  edit(dir, ENGINEERING, (text) => text.replace(
    "principles:\n",
    "principles:\n  - entries:\n      - id: E99-01\n        rule: Stray.\n        reason: Stray.\n",
  ));
  assert.match(verify(dir).failures.join("\n"), /missing `id`|E99-01/);
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
    "the shipped empty catalog and its commented example must remain inert",
  );
  assert.deepEqual(verify(dir).failures, []);
});

test("a product rule is loaded and resolved from a contract rule reference", () => {
  const dir = makeRepo();
  setProductEntries(dir, "P01", "Billing shape", [
    { id: "P01-01", text: "Every price is quoted in minor units." },
  ]);
  addEnforcement(dir, "P01-01", "no price field is a float");
  editObject(dir, CONTRACT, (contract) => { contract.rules.push("P01-01"); });
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  const graph = loadContractGraph(dir, { throwOnError: true });
  const context = contractContext(graph, findContract(graph, "src"), loadBindingPrinciples(dir));
  assert.deepEqual(context.rules.find((rule) => rule.id === "P01-01"), {
    id: "P01-01",
    text: "Every price is quoted in minor units.",
  });
});

test("an architecture rule filed in the product file is refused by name", () => {
  const dir = makeRepo();
  setProductEntries(dir, "P01", "Wrong family", [
    { id: "E01-01", text: "a second, conflicting definition." },
  ]);
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /E01-01/.test(f) && /product\.yaml/.test(f)),
    `the misplaced rule and wrong file must be named; got:\n${failures.join("\n") || "  (none)"}`,
  );
});

test("a product rule filed in the architecture file is refused by name", () => {
  const dir = makeRepo();
  edit(dir, ENGINEERING, (t) => `${t}\n  - id: P09\n    title: Wrong family\n    category: Broader Engineering Considerations\n    entries:\n      - id: P09-09\n        rule: wrong file for this family.\n        reason: wrong file for this family.\n`);
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /P09/.test(f) && /engineering\.yaml/.test(f)),
    `expected a correspondence failure naming engineering.yaml; got:\n${failures.join("\n") || "  (none)"}`,
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
  if (rule.select === "file") return relative === rule.source;
  if (rule.select === "tree") {
    return relative.startsWith(`${rule.source}/`);
  }
  if (rule.select === "top-level-principles") {
    return path.posix.dirname(relative) === rule.source && relative.endsWith(".yaml");
  }
  return false;
}

test("scaffold mapping covers every eligible src file exactly once", () => {
  const eligible = filesUnder(SOURCE_ROOT).filter(
    (file) => !file.startsWith("scripts/") && !file.startsWith("install/profiles/"),
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
    { source: "cg/principles", target: ".agents/cg/principles", mode: "always", select: "tree" },
    {
      source: "cg/guidelines",
      target: ".agents/cg/guidelines",
      mode: "always",
      select: "top-level-principles",
    },
    { source: "cg/contract.yaml", target: ".agents/cg/contract.yaml", mode: "always", select: "file" },
    { source: "cg/workflow.md", target: ".agents/cg/workflow.md", mode: "always", select: "file" },
    { source: "cg/phases.json", target: ".agents/cg/phases.json", mode: "always", select: "file" },
    { source: "cg/enforcement.yaml", target: ".agents/cg/enforcement.yaml", mode: "always", select: "file" },
    { source: "cg/schema", target: ".agents/cg/schema", mode: "always", select: "tree" },
    { source: "skills", target: ".agents/skills", mode: "always", select: "tree" },
    { source: "install/rules", target: ".agents/rules", mode: "always", select: "tree" },
    { source: "install/hooks", target: ".agents/hooks", mode: "always", select: "tree" },
    { source: "install/templates/module", target: "src", mode: "always", select: "tree" },
    { source: "install/templates/docs", target: "docs", mode: "always", select: "tree" },
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
    if (!relative.endsWith(".md") || relative.startsWith("install/templates/docs/")) continue;
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
  assert.ok(fs.existsSync(path.join(dir, "handbook", "decisions", "README.md")));
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
  editObject(dir, CONTRACT, (contract) => { contract.purpose += " See handbook/plans/roadmap.md for the rule."; });
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
    /src\/cg\/enforcement\.md/,
    /agent\/cg\/enforcement\.json/,
    /\.agents\/cg\/enforcement\.md/,
    /\.agents\/cg\/enforcement\.json/,
    /src\/cg\/principles\/architecture\.md/,
    /agent\/cg\/principles\/architecture\.json/,
    /\.agents\/cg\/principles\/architecture\.md/,
    /\.agents\/cg\/principles\/architecture\.json/,
    /\.agents\/cg\/MAP\.md/,
    /\.agents\/cg\/inheritance\.json/,
    /\.agents\/cg\/CONTRACT\.md/,
    /\.agents\/cg\/contract\.md/,
    /src\/cg\/map(?:\/|$)/,
    /agent\/cg\/maps(?:\/|$)/,
    /\.agents\/cg\/map\//,
    /\.agents\/cg\/WORKFLOW\.md/,
    /\.agents\/cg\/design\//,
    /module-CONTRACT\.template\.md/,
    /module-contract\.template\.md/,
    /submodule-contract\.template\.md/,
    /src\/governance(?:\/|$)/,
    /src\/scaffold(?:\/|$)/,
    /(?:^|[^\w/])src\/cg\/binding(?:\/|$)/,
    /\.agents\/cg\/binding\//,
    /agent\/cg\/binding(?:\/|$)/,
    /guidelines\/design\.yaml/,
    /schema\/design\.schema\.json/,
    /design-v1\.schema\.json/,
    /docs\/design(?:\/|$)/,
    /(?:^|[^\w/])src\/principles(?:\/|$)/,
    /(?:^|[^\w/])src\/schema(?:\/|$)/,
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
    // Pre-0.3.0 decision-log grammar (`DA-NN` / `DU-NN` replaced it). Escaped so this
    // list does not match itself.
    /\bDL\-0[12](?:\-\d+)?\b/,
    // The harvest check the skills used to name but nothing shipped. `cg harvest` replaces it.
    // A plain word has nothing to escape, so the character class is what stops this pattern
    // from matching its own source line.
    /verify_decision_[h]arvest/,
    /(?:^|[^\w])compiled\//,
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
  const hits = [];

  const walk = (target) => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(target)) walk(path.join(target, name));
      return;
    }
    if (!/\.(js|md|json|ya?ml)$/.test(target)) return;
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

/** The tarball is assembled from one closed target, not collected from authoring directories. */
test("the published tarball ships consumer sources and no maintainer tooling", () => {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(process.execPath, [path.join(path.resolve(import.meta.dirname, ".."), "bin", "cg.js"), "build"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    stdio: "ignore",
  });
  const output = execFileSync(npm, ["pack", "./build", "--ignore-scripts", "--dry-run", "--json"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: path.join(os.tmpdir(), "cg-npm-cache") },
    stdio: ["ignore", "pipe", "ignore"],
  });
  // The tarball is produced solely from the already verified build/ target.
  const shipped = JSON.parse(output.slice(output.indexOf("[")))[0].files.map((entry) => entry.path);
  const targetManifest = JSON.parse(
    fs.readFileSync(path.join(path.resolve(import.meta.dirname, ".."), "build", "manifest.json"), "utf8"),
  );
  const targetFiles = [...Object.keys(targetManifest.files), "manifest.json"].sort();

  assert.ok(!shipped.includes("script/dev.js"), "dev tooling must not ship");
  assert.ok(!shipped.some((file) => file.startsWith("src/")), "authoring source layout must not ship");
  assert.ok(!shipped.some((file) => /^agent\/cg\/principles\/.*\.md$/.test(file)), "principle Markdown sources must not ship");
  assert.deepEqual(shipped.sort(), targetFiles, "the tarball must contain exactly the verified target");
  for (const required of [
    "script/cli.js",
    "script/contracts.js",
    "agent/cg/contract.yaml",
    "agent/cg/principles/architecture.yaml",
    "agent/cg/workflow.md",
    "agent/cg/enforcement.yaml",
    "agent/cg/phases.json",
    "agent/cg/schema/contract.schema.json",
    "agent/cg/guidelines/engineering.yaml",
    "agent/cg/guidelines/product.yaml",
    "agent/cg/schema/architecture.schema.json",
    "agent/cg/schema/engineering.schema.json",
    "agent/cg/schema/product.schema.json",
    "agent/profiles/all.scaffolding.conf.json",
    "agent/profiles/cursor.scaffolding.conf.json",
    "agent/templates/module/CLAUDE.md",
    "agent/skills/cg-plan/SKILL.md",
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
    ".agents/cg/contract.yaml": "{\"ourGraph\":true}\n",
    "src/.agents/cg/contract.yaml": "{\"ourModule\":true}\n",
    ".agents/cg/principles/architecture.yaml": "our architecture rules\n",
    ".agents/cg/guidelines/product.yaml": "our product rules\n",
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
  const seed = ROOT_CONTRACT;
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
    fs.readFileSync(path.join(SOURCE_ROOT, "install/rules/cg.md"), "utf8"),
    renderAgentRule(),
  );
});

test("the shipped module pointer matches what cg sync generates", () => {
  const expected = renderModulePointer("src", "src");
  assert.equal(
    fs.readFileSync(path.join(SOURCE_ROOT, "install/templates/module/AGENTS.md"), "utf8"),
    expected,
  );
  assert.equal(
    fs.readFileSync(path.join(SOURCE_ROOT, "install/templates/module/CLAUDE.md"), "utf8"),
    expected,
  );
});

test("sync rewrites a module pointer that still names contract.md", () => {
  const dir = makeRepo();
  addRootChildren(dir, ["billing"], (contract) => {
    contract.responsibilities.owns = ["Customer billing lifecycle."];
  });
  write(dir, "billing/AGENTS.md", "# billing\n\nSee `contract.md`.\n");
  write(dir, "billing/CLAUDE.md", "# billing\n\nSee `contract.md`.\n");
  const result = sync(dir);
  assert.ok(result.changed.some((file) => file.endsWith(path.join("billing", "AGENTS.md"))));
  assert.match(read(dir, "billing/AGENTS.md"), /\.agents\/cg\/contract\.yaml/);
  assert.match(read(dir, "billing/AGENTS.md"), /principles\/architecture\.yaml/);
  assert.doesNotMatch(read(dir, "billing/AGENTS.md"), /contract\.md/);
  assert.deepEqual(verify(dir).failures, []);
});

// ---------------------------------------------------------------------------
// cg next — the independent answer that makes cg-auto-run enforceable
// ---------------------------------------------------------------------------

const brief = (n, { status, priority = n, depends = "None", blocked = "None" }) =>
  `## Step ${n}: step ${n}\nWeight: Build\nPriority: ${priority}\n` +
  `Depends on: ${depends}\nBlocked by: ${blocked}\nStatus: ${status}\n\n### Goal\nx\n`;

/** One document per phase, every Step a section inside it. */
function queue(dir, steps, name = "phase-1") {
  const root = path.join(dir, "docs/plans/prog");
  fs.mkdirSync(root, { recursive: true });
  const body = Object.entries(steps).map(([n, opts]) => brief(n, opts)).join("\n");
  fs.writeFileSync(path.join(root, `${name}_detailed_preparation.md`), `# ${name}\n\n${body}`, "utf8");
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
  assert.equal(result.step.number, 2);
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
  queue(dir, { 1: { status: "Blocked", blocked: "DU-04" } });
  const result = next(dir);
  assert.equal(result.stage, "cg-unblock");
  assert.match(result.reason, /DU-04/);
});

test("next ignores archived phases", () => {
  const dir = makeRepo();
  const root = path.join(dir, "docs/plans/archive/phase-0");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "phase-0_detailed_preparation.md"), brief(1, { status: "Ready" }), "utf8");
  assert.equal(next(dir).state, "no-queue");
});

test("next refuses to answer from a brief it cannot parse", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Ready" } });
  write(dir, "docs/plans/prog/phase-1_detailed_preparation.md", "## Step 1: x\nStatus: Sortof\nPriority: 1\n");
  const result = next(dir);
  assert.equal(result.state, "unreadable");
  assert.match(result.problems[0], /unknown Status/);
});

test("an In progress Step wins over any Ready one", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "In progress" }, 2: { status: "Ready" } });
  assert.equal(next(dir).step.number, 1);
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
  queue(dir, { 1: { status: "Blocked", blocked: "DU-01" } });
  const result = next(dir);
  for (const skill of ["cg-unblock", "cg-plan", "cg-warmup", "cg-auto-run"]) {
    assert.equal(permits(result, skill).allowed, true, skill);
  }
});

test("an unreadable queue denies every gated stage", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Ready" } });
  write(dir, "docs/plans/prog/phase-1_detailed_preparation.md", "no step sections at all\n");
  const result = next(dir);
  assert.equal(permits(result, "cg-produce").allowed, false);
});

test("init ignores the auto-run ledger without disturbing an existing .gitignore", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-ignore-"));
  fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\ndist/\n", "utf8");
  init(dir, {});
  const text = read(dir, ".gitignore");
  assert.match(text, /^auto-run\/$/m);
  assert.match(text, /^\*\.auto-run\.md$/m);
  assert.match(text, /^node_modules\/$/m, "existing rules must survive");

  init(dir, {});
  assert.equal(
    read(dir, ".gitignore").split("\n").filter((l) => l.trim() === "*.auto-run.md").length,
    1,
    "re-running init must not append the rule twice",
  );
});

test("a finished warmup is advised to remove its resume log", () => {
  const dir = makeRepo();
  const findings = path.join(dir, "docs", "plans", "warmup-findings.md");
  fs.mkdirSync(path.dirname(findings), { recursive: true });
  fs.writeFileSync(findings, "# findings\n");

  // Not yet finished: product rules are unharvested, so the log still has a job.
  assert.ok(!verify(dir).advisories.some((m) => m.includes("survives a finished warmup")));

  // Harvested as a real P entry. The shipped catalog's only P example is a YAML comment.
  setProductEntries(dir, "P09", "Harvested", [
    { id: "P09-01", text: "a harvested rule." },
  ]);
  addEnforcement(dir, "P09-01", "Manual review *(not yet built)*");
  assert.ok(
    verify(dir).advisories.some((m) => m.includes("survives a finished warmup")),
    "a harvested repo with every contract written should be told the log is residue",
  );

  fs.rmSync(findings);
  const after = verify(dir).advisories;
  assert.ok(!after.some((m) => m.includes("warmup-findings.md")), "deleting it clears both sides");
});

// ---------------------------------------------------------------------------
// cg residue — the disposable stack, checked instead of trusted
// ---------------------------------------------------------------------------

const plan = (dir, rel, text) => {
  const file = path.join(dir, "docs", "plans", rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
};

/** Drive the repo to "warmup finished", which is what makes warmup's own files residue. */
function finishWarmup(dir) {
  setProductEntries(dir, "P09", "Harvested", [
    { id: "P09-01", text: "a harvested rule." },
  ]);
  addEnforcement(dir, "P09-01", "Manual review *(not yet built)*");
}

test("a document reachable from the roadmap is not residue", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n\n- [Phase 1](phase-1/preparation.md)\n");
  plan(dir, "phase-1/preparation.md", "# Prep\n\n- [Step 1](step-01.md)\n");
  plan(dir, "phase-1/step-01.md", "# Phase 1 Step 1: x\n");

  const result = residue(dir);
  assert.deepEqual(result.residue.map((r) => r.path), []);
  assert.ok(result.roots.includes("docs/plans/a-roadmap.md"));
});

test("a document no root links to is residue", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n");
  plan(dir, "legacy/old-plan.md", "# Predates adoption\n");
  assert.deepEqual(
    residue(dir).residue.map((r) => r.path),
    ["docs/plans/legacy/old-plan.md"],
  );
});

test("an empty directory is residue even though git cannot see it", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n");
  fs.mkdirSync(path.join(dir, "docs", "plans", "moved-away"), { recursive: true });
  const found = residue(dir).residue;
  assert.deepEqual(found.map((r) => r.path), ["docs/plans/moved-away"]);
  assert.match(found[0].why, /empty directory/);
});

test("archived and ignored subtrees are never residue", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n");
  plan(dir, "archive/phase-0/step-01.md", "# closed\n");
  plan(dir, "auto-run/phase-1.auto-run.md", "# ledger\n");
  assert.deepEqual(residue(dir).residue.map((r) => r.path), []);
});

test("warmup's files are live during warmup and residue after it", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n");
  for (const name of ["warmup-findings.md", "warmup-report.md", "warmup-corrective-set.md"]) {
    plan(dir, name, `# ${name}\n`);
  }
  assert.deepEqual(residue(dir).residue.map((r) => r.path), [], "unfinished warmup: still working state");

  finishWarmup(dir);
  const found = residue(dir).residue;
  assert.equal(found.length, 3);
  assert.match(found[0].why, /warmup finished/);
});

test("the decision log and README are always claimed", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n");
  const paths = residue(dir).residue.map((r) => r.path);
  assert.ok(!paths.includes("docs/plans/decision-log.md"));
  assert.ok(!paths.includes("docs/plans/README.md"));
});

test("linking a directory claims everything under it", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n\n- [Phase 2](phase-2/)\n");
  plan(dir, "phase-2/step-01.md", "# Phase 2 Step 1: x\n");
  plan(dir, "phase-2/step-02.md", "# Phase 2 Step 2: y\n");
  assert.deepEqual(residue(dir).residue.map((r) => r.path), []);
});

test("residue follows a chosen docs root", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-residue-docs-"));
  init(dir, { docs: "handbook" });
  sync(dir);
  const file = path.join(dir, "handbook", "plans", "orphan.md");
  fs.writeFileSync(file, "# orphan\n", "utf8");
  const result = residue(dir);
  assert.equal(result.docs, "handbook");
  assert.deepEqual(result.residue.map((r) => r.path), ["handbook/plans/orphan.md"]);
});

test("a roadmap inside its own programme folder is a root", () => {
  const dir = makeRepo();
  plan(dir, "billing/roadmap.md", "# Billing\n\n- [Phase 1](phase-1/)\n");
  plan(dir, "billing/phase-1/preparation.md", "# Prep\n");
  assert.deepEqual(residue(dir).residue.map((r) => r.path), []);
  assert.ok(residue(dir).roots.includes("docs/plans/billing/roadmap.md"));
});

test("a roadmap buried two levels down is not a root", () => {
  const dir = makeRepo();
  plan(dir, "a-roadmap.md", "# Roadmap\n");
  plan(dir, "billing/old/roadmap.md", "# stale\n");
  assert.deepEqual(
    residue(dir).residue.map((r) => r.path),
    ["docs/plans/billing/old/roadmap.md"],
  );
});

test("next reads every Step from one phase document", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" }, 2: { status: "Ready" }, 3: { status: "Waiting" } });
  const result = next(dir);
  assert.equal(result.briefs.length, 3, "all three sections parse from one file");
  assert.equal(result.step.number, 2);
  assert.match(result.step.file, /phase-1_detailed_preparation\.md:\d+/, "reports the source line");
});

test("a Status written inside a Step's body is not the Step's state", () => {
  const dir = makeRepo();
  plan(
    dir,
    "prog/phase-1_detailed_preparation.md",
    "# phase\n\n## Step 1: x\nPriority: 1\nDepends on: None\nBlocked by: None\nStatus: Ready\n\n" +
      "### Expected starting state\nStatus: Complete — this line is prose, not the header\n",
  );
  assert.equal(next(dir).step.status, "Ready");
});

test("two phase documents form one queue", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" } }, "phase-1");
  queue(dir, { 2: { status: "Ready", priority: 2 } }, "phase-2");
  const result = next(dir);
  assert.equal(result.briefs.length, 2);
  assert.equal(result.step.number, 2);
});

test("a phase document with no Step sections is reported, not silently empty", () => {
  const dir = makeRepo();
  plan(dir, "prog/phase-9_detailed_preparation.md", "# phase 9\n\nprose only\n");
  const result = next(dir);
  assert.equal(result.state, "unreadable");
  assert.match(result.problems[0], /no `## Step <n>` section/);
});

// ---------------------------------------------------------------------------
// cg-gate — the stage boundary, enforced rather than asked for
// ---------------------------------------------------------------------------

const GATE = path.join(SOURCE_ROOT, "install", "hooks", "cg-gate.mjs");
const CG = path.join(SOURCE_ROOT, "..", "bin", "cg.js");

/** Run the hook the way Claude Code does: JSON on stdin, a permission decision on stdout. */
function gate(dir, skill, session) {
  const out = execFileSync(process.execPath, [GATE], {
    input: JSON.stringify({ cwd: dir, session_id: session, tool_input: { skill } }),
    encoding: "utf8",
    env: { ...process.env, CG_BIN: CG, CG_GATE_CHAIN: "" },
  });
  return JSON.parse(out).hookSpecificOutput;
}

test("the gate allows the stage the queue names and denies the others", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" } });
  assert.equal(gate(dir, "cg-sign-off", `s${Date.now()}a`).permissionDecision, "allow");
  assert.equal(gate(dir, "cg-produce", `s${Date.now()}b`).permissionDecision, "deny");
});

test("the gate denies a second, different stage in the same session", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" } });
  const session = `s${Date.now()}c`;
  assert.equal(gate(dir, "cg-sign-off", session).permissionDecision, "allow");

  const second = gate(dir, "cg-prepare", session);
  assert.equal(second.permissionDecision, "deny");
  assert.match(second.permissionDecisionReason, /crosses a stage boundary/);
});

test("re-dispatching the same stage is not a boundary crossing", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Ready" } });
  const session = `s${Date.now()}d`;
  assert.equal(gate(dir, "cg-produce", session).permissionDecision, "allow");
  assert.equal(gate(dir, "cg-produce", session).permissionDecision, "allow", "same stage, still fine");
});

test("cg-auto-run in the session lifts the boundary, and is never itself gated", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" } });
  const session = `s${Date.now()}e`;
  assert.equal(gate(dir, "cg-auto-run", session).permissionDecision, "allow");
  assert.equal(gate(dir, "cg-sign-off", session).permissionDecision, "allow");

  // Still gated on queue state — lifting the boundary is not lifting the queue check.
  const wrong = gate(dir, "cg-produce", session);
  assert.equal(wrong.permissionDecision, "deny");
  assert.match(wrong.permissionDecisionReason, /does not support dispatching/);
});

test("every stage skill states the yield rule", () => {
  for (const name of ["cg-plan", "cg-prepare", "cg-produce", "cg-sign-off"]) {
    const text = fs.readFileSync(path.join(SOURCE_ROOT, "skills", name, "SKILL.md"), "utf8");
    assert.match(text, /## Stage boundary — yield here/, `${name} must tell the model to stop`);
    assert.match(text, /Do not invoke the next skill yourself/, name);
  }
});

/** The UserPromptSubmit half: a new instruction clears what the last one dispatched. */
function userTurn(dir, session) {
  execFileSync(process.execPath, [GATE], {
    input: JSON.stringify({ cwd: dir, session_id: session, hook_event_name: "UserPromptSubmit" }),
    encoding: "utf8",
    env: { ...process.env, CG_BIN: CG },
  });
}

test("a new user turn clears the boundary without abandoning the session", () => {
  const dir = makeRepo();
  queue(dir, { 1: { status: "Complete" } });
  const session = `s${Date.now()}f`;

  assert.equal(gate(dir, "cg-sign-off", session).permissionDecision, "allow");
  assert.equal(
    gate(dir, "cg-prepare", session).permissionDecision,
    "deny",
    "chaining inside one instruction is the thing being stopped",
  );

  userTurn(dir, session);
  const afterAsking = gate(dir, "cg-sign-off", session);
  assert.equal(afterAsking.permissionDecision, "allow", "the user asking again must not be blocked");
  assert.match(afterAsking.permissionDecisionReason, /queue agrees/);
});

test("a Step status may carry a date without breaking the queue", () => {
  const dir = makeRepo();
  plan(
    dir,
    "prog/phase-1_detailed_preparation.md",
    "# p\n\n## Step 1: x\nPriority: 1\nDepends on: None\nBlocked by: None\nStatus: Complete — 2026-08-09\n",
  );
  const result = next(dir);
  assert.equal(result.state, "queue-complete", JSON.stringify(result.problems));
  assert.equal(result.briefs[0].status, "Complete");
});

test("an unknown status is still refused", () => {
  const dir = makeRepo();
  plan(dir, "prog/phase-1_detailed_preparation.md", "# p\n\n## Step 1: x\nPriority: 1\nStatus: Sortof\n");
  assert.equal(next(dir).state, "unreadable");
});

test("verify advises a signed-off phase left in the active tree", () => {
  const dir = makeRepo();
  plan(dir, "prog/phase-1_detailed_preparation.md", "# p\n\n## Step 1: x\nPriority: 1\nStatus: Complete\n");
  assert.ok(!verify(dir).advisories.some((m) => m.includes("never archived")));

  plan(dir, "prog/phase-1_sign-off.md", "# closed\n");
  const advised = verify(dir).advisories.filter((m) => m.includes("never archived"));
  assert.equal(advised.length, 1, JSON.stringify(verify(dir).advisories));
  assert.match(advised[0], /phase `phase-1`/);
});

test("verify advises a programme sign-off left unarchived", () => {
  const dir = makeRepo();
  plan(dir, "prog/programme-sign-off.md", "# done\n");
  assert.ok(verify(dir).advisories.some((m) => m.includes("the programme is")));
});

test("an archived closure is not advised", () => {
  const dir = makeRepo();
  plan(dir, "archive/prog/phase-1_sign-off.md", "# closed\n");
  plan(dir, "archive/prog/phase-1_detailed_preparation.md", "# p\n\n## Step 1: x\nPriority: 1\nStatus: Complete\n");
  assert.ok(!verify(dir).advisories.some((m) => m.includes("never archived")));
});
