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

import { init } from "../src/init.js";
import { sync } from "../src/sync.js";
import { verify } from "../src/verify.js";
import { parsePrinciples, splitLines, ContractError } from "../src/model.js";

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
const PRODUCT = ".agents/cg/principles/product.md";
const ARCHITECTURE = ".agents/cg/principles/architecture.md";

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
  edit(dir, "src/AGENTS.md", (t) => t.replace("`../.agents/cg/principles/architecture.md`", "somewhere"));
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
  edit(dir, ".agents/cg/principles/architecture.md", (t) =>
    t.replace(
      "## AP-05. Small configuration surface",
      "- **AP-01-04** — A rule invented without its detector must not merge.\n\n" +
        "## AP-05. Small configuration surface",
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

// ---------------------------------------------------------------- model

test("parsePrinciples joins wrapped continuation lines into one rule", () => {
  const dir = makeRepo();
  const rules = parsePrinciples(path.join(dir, ".agents", "cg", "principles", "architecture.md"));
  const text = rules.get("AP-01-02");
  assert.match(text, /same commit/);
  assert.ok(!text.includes("\n"), "a parsed rule must occupy exactly one line");
  assert.ok(!/ {2}/.test(text), "continuation whitespace must be collapsed");
});

test("parsePrinciples rejects a duplicate rule id", () => {
  const dir = makeRepo();
  const file = path.join(dir, ".agents", "cg", "principles", "architecture.md");
  fs.appendFileSync(file, "\n- **AP-01-01** — a second definition.\n");
  assert.throws(() => parsePrinciples(file), ContractError);
});

test("splitLines treats a single trailing newline as a terminator", () => {
  assert.deepEqual(splitLines("a\nb\n"), ["a", "b"]);
  assert.deepEqual(splitLines("a\nb"), ["a", "b"]);
  assert.deepEqual(splitLines("a\n\n"), ["a", ""]);
});

// ------------------------------------------------- split principles files

test("a shipped product.md with no rules is green, not an error", () => {
  const dir = makeRepo();
  const product = read(dir, PRODUCT);
  assert.ok(!/^- \*\*PP-\d{2}-\d{2}\*\*/m.test(product), "fixture must ship PP-free");
  assert.deepEqual(verify(dir).failures, []);
});

test("a product rule is loaded and inherited like an architecture one", () => {
  const dir = makeRepo();
  edit(dir, PRODUCT, (t) =>
    `${t}\n## PP-01. Billing shape\n\n- **PP-01-01** — Every price is quoted in minor units.\n`,
  );
  edit(dir, ENFORCEMENT, (t) => `${t}\n| PP-01-01 | <no price field is a float> |\n`);
  edit(dir, INHERITANCE, (t) => t.replace('"AP-01-01"', '"AP-01-01", "PP-01-01"'));
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  assert.match(read(dir, CONTRACT), /- \*\*PP-01-01\*\* — Every price is quoted in minor units\./);
});

test("an architecture rule redefined in product.md is refused by family", () => {
  const dir = makeRepo();
  edit(dir, PRODUCT, (t) => `${t}\n- **AP-01-01** — a second, conflicting definition.\n`);
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /AP-01-01/.test(f) && /architecture\.md/.test(f)),
    `the wrong file must be named, and the right one; got:\n${failures.join("\n") || "  (none)"}`,
  );
});

test("a product rule filed in architecture.md is refused by family", () => {
  const dir = makeRepo();
  edit(dir, ARCHITECTURE, (t) => `${t}\n- **PP-09-09** — wrong file for this family.\n`);
  const { failures } = verify(dir);
  assert.ok(
    failures.some((f) => /PP-09-09/.test(f) && /product\.md/.test(f)),
    `expected a family mismatch naming product.md; got:\n${failures.join("\n") || "  (none)"}`,
  );
});

// ------------------------------------------------------ no stale paths

/**
 * The rename that produced the current layout touched ~106 references. This is the detector
 * that proves none survived — the same standard the framework demands of any rename it
 * governs. Extend `STALE` whenever a governance path is renamed again.
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
  ];
  const repo = path.resolve(import.meta.dirname, "..");
  const roots = ["src", "bin", "templates", "docs", "test", "README.md"];
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
