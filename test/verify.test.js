/**
 * Fail-on-demand coverage for the verifier.
 *
 * Every negative case here is load-bearing. A verifier suite that only proves the green
 * path passes is indistinguishable from a verifier that checks nothing — which is the exact
 * failure mode `map/enforcement.md` warns about. Each test mutates one thing in an
 * otherwise-green repository and asserts the specific check fires.
 */

import assert from "node:assert/strict";
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

/** A green repository: core template plus the named design packs, synced. */
function makeRepo(packs = ["saas", "ops"]) {
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
const DESIGN_OPS = ".agents/cg/principles/design/ops.md";
const ENFORCEMENT = ".agents/cg/map/enforcement.md";
const PRODUCT_START = ".agents/cg/principles/PP-00-start-here.md";
const ARCHITECTURE = ".agents/cg/principles/AP-01-executable.md";

// ---------------------------------------------------------------- green path

test("a freshly initialised repository verifies green", () => {
  const dir = makeRepo();
  const { failures, counts } = verify(dir);
  assert.deepEqual(failures, []);
  assert.equal(counts.folders, 1);
  assert.equal(counts.roots, 3);
  assert.equal(counts.skills, 6);
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

test("init rejects an unknown design pack by name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-test-"));
  assert.throws(() => init(dir, { packs: ["not-a-pack"] }), /unknown design pack/);
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
  edit(dir, CONTRACT, (t) => `${t}\nSee docs-plans/whatever-v1.md for the rule.\n`);
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
  fs.rmSync(path.join(dir, ".claude", "skills", "cg-execute", "SKILL.md"));
  assertFails(dir, 9, "wrapper absent");
});

test("[9] a hand-edited Claude discovery wrapper fails", () => {
  const dir = makeRepo();
  edit(dir, ".claude/skills/cg-execute/SKILL.md", (t) => `${t}\nextra instruction\n`);
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
    t.replace("](../skills/cg-decide/SKILL.md)", "](elsewhere)"),
  );
  assertFails(dir, 9, "skill absent from catalog");
});

test("[9] a missing core skill fails", () => {
  const dir = makeRepo();
  fs.rmSync(path.join(dir, ".agents", "skills", "cg-document"), { recursive: true });
  fs.rmSync(path.join(dir, ".claude", "skills", "cg-document"), { recursive: true });
  assertFails(dir, 9, "core skill removed");
});

// --------------------------------------------------- design principles

test("[10] a guide carrying an enforcement-map row fails", () => {
  const dir = makeRepo();
  const guide = /- \*\*(DP-OPS-\d{2}-\d{2})\*\* `guide`/.exec(read(dir, DESIGN_OPS));
  assert.ok(guide, "fixture must contain an OPS guide");
  edit(dir, ENFORCEMENT, (t) => `${t}\n| ${guide[1]} | some detector |\n`);
  assertFails(dir, 10, "guide must not be in the enforcement map");
});

test("[10] an invariant with no enforcement-map row fails", () => {
  const dir = makeRepo();
  edit(dir, DESIGN_OPS, (t) => t.replace("`guide`", "`invariant`"));
  assertFails(dir, 10, "invariant owes exactly one detector row");
});

test("[10] a rule filed in the wrong set file fails", () => {
  const dir = makeRepo();
  edit(dir, DESIGN_OPS, (t) => t.replace(/\*\*DP-OPS-/, "**DP-SAAS-"));
  assertFails(dir, 10, "rule set token disagrees with its file");
});

test("[10] a guide with no Cost clause fails", () => {
  const dir = makeRepo();
  edit(dir, DESIGN_OPS, (t) =>
    splitLines(t)
      .filter((l) => !l.startsWith("  **Cost:**"))
      .join("\n") + "\n",
  );
  assertFails(dir, 10, "guide owes exactly one Cost clause");
});

test("[10] a malformed design rule line fails", () => {
  const dir = makeRepo();
  edit(dir, DESIGN_OPS, (t) => t.replace(/`(invariant|guide)` — /, ""));
  assertFails(dir, 10, "rule missing its modality marker");
});

test("[10] an inherited design principle fails", () => {
  const dir = makeRepo();
  edit(dir, INHERITANCE, (t) => t.replace('"AP-01-01"', '"DP-OPS-01-01"'));
  assertFails(dir, 10, "DP must be loaded explicitly, never inherited");
});

test("[10] an enforcement row for an unknown design id fails", () => {
  const dir = makeRepo();
  edit(dir, ENFORCEMENT, (t) => `${t}\n| DP-OPS-99-99 | ghost detector |\n`);
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
    `${t}\n- **AP-01-04** — A rule invented without its detector must not merge.\n`,
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
  fs.appendFileSync(file, "\n- **AP-01-01** — a second definition.\n");
  assert.throws(() => parsePrinciples(file), ContractError);
});

test("loadPrinciples rejects a duplicate rule id across files and names the collision", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-duplicate-"));
  const root = path.join(dir, ".agents", "cg", "principles");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "AP-01-first.md"),
    "## AP-01. First\n\n- **AP-01-01** — First definition.\n",
  );
  fs.writeFileSync(
    path.join(root, "AP-01-second.md"),
    "## AP-01. Second\n\n- **AP-01-01** — Conflicting definition.\n",
  );

  assert.throws(
    () => loadPrinciples(dir),
    /duplicate rule id AP-01-01 across AP-01-first\.md and AP-01-second\.md/,
  );
});

test("loadPrinciples rejects a rule moved into a neighbouring principle file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-correspondence-"));
  const root = path.join(dir, ".agents", "cg", "principles");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "AP-01-first.md"),
    "## AP-01. First\n\n- **AP-01-01** — First rule.\n- **AP-02-01** — Moved rule.\n",
  );
  fs.writeFileSync(
    path.join(root, "AP-02-second.md"),
    "## AP-02. Second\n\n- **AP-02-02** — Rule left behind.\n",
  );

  assert.throws(
    () => loadPrinciples(dir),
    /`AP-02-01` belongs in AP-02-\*\.md, not AP-01-first\.md/,
  );
});

test("splitLines treats a single trailing newline as a terminator", () => {
  assert.deepEqual(splitLines("a\nb\n"), ["a", "b"]);
  assert.deepEqual(splitLines("a\nb"), ["a", "b"]);
  assert.deepEqual(splitLines("a\n\n"), ["a", ""]);
});

// ------------------------------------------------- split principles files

test("the shipped PP-00 start file has no rules and is green", () => {
  const dir = makeRepo();
  assert.equal(
    parsePrinciples(path.join(dir, PRODUCT_START), { allowEmpty: true }).size,
    0,
    "the visible fenced example must remain inert",
  );
  assert.deepEqual(verify(dir).failures, []);
});

test("a product rule is loaded and inherited like an architecture one", () => {
  const dir = makeRepo();
  write(
    dir,
    ".agents/cg/principles/PP-01-billing.md",
    "## PP-01. Billing shape\n\n- **PP-01-01** — Every price is quoted in minor units.\n",
  );
  edit(dir, ENFORCEMENT, (t) => `${t}\n| PP-01-01 | <no price field is a float> |\n`);
  edit(dir, INHERITANCE, (t) => t.replace('"AP-01-01"', '"AP-01-01", "PP-01-01"'));
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  assert.match(read(dir, CONTRACT), /- \*\*PP-01-01\*\* — Every price is quoted in minor units\./);
});

test("an architecture rule filed in a product principle file is refused by name", () => {
  const dir = makeRepo();
  write(
    dir,
    ".agents/cg/principles/PP-01-wrong.md",
    "## PP-01. Wrong family\n\n- **AP-01-01** — a second, conflicting definition.\n",
  );
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /AP-01-01/.test(f) && /PP-01-wrong\.md/.test(f)),
    `the misplaced rule and wrong file must be named; got:\n${failures.join("\n") || "  (none)"}`,
  );
});

test("a product rule filed in an architecture principle file is refused by name", () => {
  const dir = makeRepo();
  edit(dir, ARCHITECTURE, (t) => `${t}\n- **PP-09-09** — wrong file for this family.\n`);
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /PP-09-09/.test(f) && /AP-01-executable\.md/.test(f)),
    `expected a correspondence failure naming AP-01-executable.md; got:\n${failures.join("\n") || "  (none)"}`,
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
  if (rule.select === "tree" || rule.select === "design-packs") {
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
      source: "principles/design",
      target: ".agents/cg/principles/design",
      mode: "selected",
      select: "design-packs",
    },
    { source: "governance", target: ".agents/cg", mode: "always", select: "tree" },
    { source: "skills", target: ".agents/skills", mode: "always", select: "tree" },
    { source: "scaffold/rules", target: ".agents/rules", mode: "always", select: "tree" },
    { source: "scaffold/module", target: "src", mode: "always", select: "tree" },
  ];
  const packs = ["ops", "saas"];
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

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-round-trip-"));
  init(dir, { packs });
  assert.deepEqual(filesUnder(dir), expected.sort());
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
    /principles\/(?:architecture|product)\.md/,
    /templates\//,
    /src\/(?:model|init|sync|verify|dev)\.js/,
    /bin\/cg\.js#L\d+/,
    /bin\/cg\.js:\d+/,
  ];
  const repo = path.resolve(import.meta.dirname, "..");
  const roots = ["src", "bin", "docs", "test", "README.md", "CONTRIBUTING.md", "package.json"];
  const hits = [];

  const walk = (target) => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(target)) walk(path.join(target, name));
      return;
    }
    if (!/\.(js|md|json|yaml)$/.test(target)) return;
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
