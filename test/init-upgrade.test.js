/**
 * @file Check init preview, preservation, catalog recovery and refreshed discovery.
 * @see ../src/runtime/installation/.agent/contract.md
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { init } from "../src/runtime/installation/init.js";
import { sync } from "../src/runtime/installation/sync.js";
import { verify } from "../src/runtime/verification/verify.js";
import { parseContractYaml } from "../src/runtime/graph/contracts.js";
import { planInitCatalogs, applyInitCatalogs } from "../src/runtime/installation/init-catalogs.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const paths = {
  architecture: ".agents/cg/principles/architecture.yaml",
  engineering: ".agents/cg/guidelines/engineering.yaml",
  product: ".agents/cg/guidelines/product.yaml",
};
const read = (dir, file) => fs.readFileSync(path.join(dir, file), "utf8");
const write = (dir, file, text) => fs.writeFileSync(path.join(dir, file), text);
const reasons = { "P01-01": "The payment provider receives integer minor units." };
function snapshot(dir) {
  const result = {};
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(dir, relative), { withFileTypes: true })) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) walk(file);
      else result[file] = fs.readFileSync(path.join(dir, file)).toString("base64");
    }
  }
  walk("");
  return result;
}
function fixture(t, { emptyProduct = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-init-upgrade-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  init(dir, { profiles: ["agents"] });
  sync(dir);
  for (const [family, file] of Object.entries(paths)) {
    // Same legacy schema host and field shape observed in gamome-core; no product code copied.
    const text = read(root, `test/fixtures/principles-legacy/${family}.yaml`)
      .replace("https://contractgraph.dev/schema/", "https://sarada.io/contract-graph/schema/");
    write(dir, file, text);
  }
  if (emptyProduct) write(dir, paths.product, '$schema: https://sarada.io/contract-graph/schema/product-v1.schema.json\nproductVersion: "1.0"\nprinciples: []\n');
  else {
    const enforcement = JSON.parse(JSON.stringify(parseContractYaml(read(dir, ".agents/cg/enforcement.yaml"))));
    enforcement.entries = [{ rules: ["P01-01"], detector: "npm test" }];
    write(dir, ".agents/cg/enforcement.yaml", JSON.stringify(enforcement));
  }
  write(dir, ".agents/skills/cg-plan/SKILL.md", "Old installed skill\n");
  return dir;
}

test("init refreshes A/E and skills, converts legacy P, and preserves owned context and backups", t => {
  const dir = fixture(t);
  const owned = [".agents/cg/contract.yaml", "src/.agents/cg/contract.yaml", ".agents/cg/enforcement.yaml", ".agents/cg/workflow.md", ".agents/cg/phases.json"];
  const originals = Object.fromEntries([...Object.values(paths), ...owned].map(file => [file, read(dir, file)]));
  const before = snapshot(dir);
  const preview = init(dir, { dryRun: true, reasons });
  assert.equal(preview.catalogUpdates.length, 3);
  assert.deepEqual(snapshot(dir), before);
  const result = init(dir, { reasons });
  for (const family of ["architecture", "engineering"]) {
    assert.equal(read(dir, paths[family]), read(root, `src/cg/${family === "architecture" ? "principles" : "guidelines"}/${family}.yaml`));
  }
  const product = parseContractYaml(read(dir, paths.product));
  assert.equal(product.$schema, "https://contractgraph.dev/schema/principles-v1.schema.json");
  assert.equal(product.family, "product");
  assert.equal(product.principles[0].entries[0].id, "P01-01");
  assert.equal(product.principles[0].entries[0].reason, reasons["P01-01"]);
  assert.match(read(dir, paths.product), /# Repository pricing contract/);
  for (const file of owned) assert.equal(read(dir, file), originals[file]);
  for (const item of result.catalogUpdates) assert.equal(read(dir, item.backup), originals[path.relative(dir, item.file).split(path.sep).join("/")]);
  const manifest = JSON.parse(read(dir, ".agents/cg/manifest.json"));
  assert.equal(manifest.files[paths.product].adopted, true, "migrated product rules are still repository-authored");
  assert.notEqual(read(dir, ".agents/skills/cg-plan/SKILL.md"), "Old installed skill\n");
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  assert.deepEqual(init(dir).replaced, []);
});

function policyFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-retained-policy-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  init(dir, { profiles: ["agents"] });
  sync(dir);
  return dir;
}

test("init installs one reachable responsibility review and a parseable warmup cue catalog", t => {
  const dir = policyFixture(t);
  const review = ".agents/skills/cg-warmup/references/responsibility-review.md";
  assert.equal(read(dir, review), read(root, "src/skills/cg-warmup/references/responsibility-review.md"));
  for (const relative of [
    ".agents/skills/cg-warmup/SKILL.md",
    ".agents/skills/cg-plan/SKILL.md",
    ".agents/skills/cg-produce/SKILL.md",
    ".agents/skills/cg-prototype/SKILL.md",
    ".agents/skills/cg-sign-off/references/closure-checks.md",
  ]) {
    const link = read(dir, relative).match(/\]\(([^)]+responsibility-review\.md)\)/)?.[1];
    assert.ok(link, `missing review route from ${relative}`);
    assert.equal(path.resolve(dir, path.dirname(relative), link), path.join(dir, review));
  }
  const catalog = parseContractYaml(read(dir, ".agents/skills/cg-warmup/assets/warmup.yaml"));
  assert.equal(new Set(catalog.cues.map(cue => cue.id)).size, catalog.cues.length);
  for (const cue of catalog.cues) {
    assert.equal(typeof cue.look, "string");
    assert.equal(typeof cue.then, "string");
  }
});

test("init reports historical phase policy during preview and apply without rewriting it", t => {
  const dir = policyFixture(t);
  // Independently authored historical policy: E was conditional and prepare was a stage.
  const historical = {
    _comment: "Local policy remains owned here.",
    phases: Object.fromEntries(["plan", "prepare", "produce", "sign-off", "unblock"].map(name =>
      [name, { always: ["A", "P"], conditional: ["E"] }])),
  };
  const file = ".agents/cg/phases.json";
  const original = JSON.stringify(historical, null, 2) + "\n";
  write(dir, file, original);
  const before = snapshot(dir);
  const preview = init(dir, { dryRun: true });
  assert.deepEqual(snapshot(dir), before);
  assert.equal(preview.policyNotices.length, 2);
  assert.match(preview.policyNotices.join("\n"), /retired prepare/);
  assert.match(preview.policyNotices.join("\n"), /no prototype entry/);
  assert.doesNotMatch(preview.policyNotices.join("\n"), /loads E on every pass/);
  const applied = init(dir);
  assert.deepEqual(applied.policyNotices, preview.policyNotices);
  assert.equal(read(dir, file), original);
  assert.deepEqual(verify(dir).failures, [], "retained advisory policy is not a new binding failure");
});

test("init CLI displays policy notices even with no file updates and preserves check exit semantics", t => {
  const dir = policyFixture(t);
  const file = ".agents/cg/phases.json";
  const policy = JSON.parse(read(dir, file));
  policy.phases["sign-off"] = { always: ["A", "P", "E"], conditional: [] };
  write(dir, file, JSON.stringify(policy));
  const before = snapshot(dir);
  const run = extra => spawnSync(process.execPath, [path.join(root, "bin/cg.js"), "init", dir, ...extra], { encoding: "utf8" });
  const preview = run(["--check"]);
  assert.equal(preview.status, 0, preview.stdout + preview.stderr);
  assert.match(preview.stdout, /loads E on every pass for sign-off/);
  assert.match(preview.stdout, /not automatically reconciled/);
  assert.deepEqual(snapshot(dir), before);
  const applied = run(["--yes"]);
  assert.equal(applied.status, 0, applied.stdout + applied.stderr);
  assert.match(applied.stdout, /loads E on every pass for sign-off/);
  assert.equal(read(dir, file), Buffer.from(before[path.normalize(file)], "base64").toString());
});

test("init notices distinguish omitted guidance and malformed policy from current defaults", t => {
  const dir = policyFixture(t);
  assert.deepEqual(init(dir, { dryRun: true }).policyNotices, []);
  const file = ".agents/cg/phases.json";
  const policy = JSON.parse(read(dir, file));
  policy.phases.produce = { always: ["A", "P"], conditional: [] };
  write(dir, file, JSON.stringify(policy));
  assert.match(init(dir, { dryRun: true }).policyNotices.join("\n"), /does not load E for produce/);
  write(dir, file, "{ broken local policy\n");
  const before = snapshot(dir);
  assert.match(init(dir, { dryRun: true }).policyNotices.join("\n"), /needs correction:.*invalid JSON/);
  assert.deepEqual(snapshot(dir), before);
  assert.notDeepEqual(verify(dir).failures, [], "notices do not conceal invalid policy");
});

test("invalid rationale blocks writes; absent rationale hands off without changing product", t => {
  const dir = fixture(t);
  const before = snapshot(dir);
  for (const dryRun of [true, false]) {

    assert.throws(() => init(dir, { dryRun, reasons: { ...reasons, unused: "Not a rule" } }), /unused/);
    assert.deepEqual(snapshot(dir), before);
  }
});

test("pending rationale installs warmup, preserves product, and resumes to verified upgrade", t => {
  const dir = fixture(t);
  const original = read(dir, paths.product);
  const before = snapshot(dir);
  assert.equal(init(dir, { dryRun: true }).pendingReasons[0].id, "P01-01");
  assert.deepEqual(snapshot(dir), before);
  const run = () => spawnSync(process.execPath, [path.join(root, "bin/cg.js"), "init", dir, "--yes"], { encoding: "utf8" });
  const applied = run();
  assert.equal(applied.status, 1);
  assert.match(applied.stdout, /installation updated[\s\S]*Next:.*\/cg-warmup/);
  assert.equal(read(dir, paths.product), original);
  assert.match(read(dir, ".agents/skills/cg-warmup/SKILL.md"), /Finish any pending product upgrade first/);
  assert.match(run().stdout, /product migration remains incomplete/);
  init(dir, { reasons });
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
  assert.deepEqual(init(dir).pendingReasons, []);
});

test("missing rationale does not hide malformed product content", t => {
  const dir = fixture(t);
  write(dir, paths.product, read(dir, paths.product) + "unexpected: true\n");
  const before = snapshot(dir);
  assert.throws(() => init(dir), /migration blocked/);
  assert.deepEqual(snapshot(dir), before);
});

test("empty legacy product migrates with no extra user input", t => {
  const dir = fixture(t, { emptyProduct: true });
  init(dir);
  assert.deepEqual(parseContractYaml(read(dir, paths.product)).principles, []);
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
});

test("init CLI previews without writes and upgrades with reasons in one command", t => {
  const dir = fixture(t);
  const reasonsFile = path.join(dir, "reasons.json");
  fs.writeFileSync(reasonsFile, JSON.stringify(reasons));
  const before = snapshot(dir);
  const run = args => spawnSync(process.execPath, [path.join(root, "bin/cg.js"), "init", dir, "--docs", "docs", "--reasons", reasonsFile, ...args], { encoding: "utf8" });
  const preview = run(["--check"]);
  assert.equal(preview.status, 1);
  assert.match(preview.stdout, /migrate product format/);
  assert.match(preview.stdout, /backup:/);
  assert.deepEqual(snapshot(dir), before);
  const refused = run([]);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /confirmation/);
  assert.deepEqual(snapshot(dir), before);
  const applied = run(["--yes"]);
  assert.equal(applied.status, 0, applied.stdout + applied.stderr);
  assert.match(applied.stdout, /upgrade backup:/);
});

test("catalog replacement failure rolls back earlier replacements before skills change", t => {
  const dir = fixture(t);
  const before = Object.fromEntries(Object.values(paths).map(file => [file, read(dir, file)]));
  const originalRename = fs.renameSync;
  t.mock.method(fs, "renameSync", (source, destination) => {
    if (destination === path.join(dir, paths.engineering)) throw new Error("controlled rename failure");
    return originalRename(source, destination);
  });
  assert.throws(() => init(dir, { reasons }), /controlled rename failure/);
  for (const [file, text] of Object.entries(before)) assert.equal(read(dir, file), text);
  assert.equal(read(dir, ".agents/skills/cg-plan/SKILL.md"), "Old installed skill\n");
});

test("backup collisions and concurrent edits are preserved and stop the update", t => {
  const dir = fixture(t);
  const defaults = ["architecture", "engineering"].map(family => ({ relative: paths[family], text: `new ${family}\n` }));
  const plan = planInitCatalogs(dir, defaults, reasons);
  const backup = path.join(dir, plan[0].backup);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, "existing different backup\n");
  const before = snapshot(dir);
  assert.throws(() => planInitCatalogs(dir, defaults, reasons), /existing backup differs/);
  assert.deepEqual(snapshot(dir), before);
  fs.rmSync(backup);
  write(dir, paths.architecture, "concurrent owner edit\n");
  assert.throws(() => applyInitCatalogs(dir, plan), /changed since preview/);
  assert.equal(read(dir, paths.architecture), "concurrent owner edit\n");
});

test("init --check against a missing directory does not create it", t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cg-init-preview-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const dir = path.join(parent, "not-created");
  init(dir, { dryRun: true });
  assert.equal(fs.existsSync(dir), false);
});

test("init updates historical contract/enforcement schema scalars without changing authored content", t => {
  const dir = fixture(t, { emptyProduct: true });
  const files = [".agents/cg/contract.yaml", "src/.agents/cg/contract.yaml", ".agents/cg/enforcement.yaml"];
  const before = new Map();
  for (const file of files) {
    const text = read(dir, file).replace("https://contractgraph.dev/schema/", "https://sarada.io/contract-graph/schema/");
    write(dir, file, text);
    before.set(file, text);
  }
  const result = init(dir);
  for (const file of files) {
    const expected = before.get(file).replace(/https:\/\/sarada\.io\/contract-graph\/schema\/([a-z0-9-]+\.schema\.json)/, '"https://contractgraph.dev/schema/$1"');
    assert.equal(read(dir, file), expected);
    const item = result.catalogUpdates.find(item => item.file === path.join(dir, file));
    assert.equal(read(dir, item.backup), before.get(file));
  }
  sync(dir);
  assert.deepEqual(verify(dir).failures, []);
});

test('sync upgrades historical shared entries with the required bootstrap and preserves local guidance', t => {
  const dir = policyFixture(t);
  const entry = '.agents/cg/contract-graph-agent.md';
  // Independent older entry: the release only generated its principles index.
  const historical = '# Existing repository instructions\n\nKeep this local prerequisite.\n\n<!-- BEGIN PRINCIPLES INDEX -->\n<!-- END PRINCIPLES INDEX -->\n\n## Team workflow\n\nRun the team gate before completion.\n';
  write(dir, entry, historical);
  const workflow = read(dir, '.agents/cg/workflow.md');
  const phases = read(dir, '.agents/cg/phases.json');
  assert.ok(sync(dir, { dryRun: true }).changed.includes(path.join(dir, entry)));
  assert.equal(read(dir, entry), historical);
  sync(dir);
  const updated = read(dir, entry);
  assert.match(updated, /## Lifecycle bootstrap/);
  assert.match(updated, /## Run the installed CLI/);
  assert.match(updated, /Keep this local prerequisite/);
  assert.match(updated, /Run the team gate before completion/);
  assert.equal(read(dir, '.agents/cg/workflow.md'), workflow);
  assert.equal(read(dir, '.agents/cg/phases.json'), phases);
  assert.deepEqual(sync(dir).changed, []);
  assert.deepEqual(verify(dir).failures, []);
});

test('sync adopts exact unmarked bootstrap once and refreshes only its managed block', t => {
  const dir = policyFixture(t), entry = '.agents/cg/contract-graph-agent.md';
  const original = read(dir, entry);
  const unmarked = original.replace(/^<!-- BEGIN CG BOOTSTRAP.*\n/m, '').replace(/^<!-- END CG BOOTSTRAP -->\n/m, '');
  write(dir, entry, unmarked + '\n## Local note\n\nPreserve custom review policy.\n');
  sync(dir);
  let updated = read(dir, entry);
  assert.equal([...updated.matchAll(/## Lifecycle bootstrap/g)].length, 1);
  assert.match(updated, /Preserve custom review policy/);
  write(dir, entry, updated.replace('## Lifecycle bootstrap', '## Obsolete generated instructions'));
  sync(dir);
  updated = read(dir, entry);
  assert.match(updated, /## Lifecycle bootstrap/);
  assert.doesNotMatch(updated, /Obsolete generated instructions/);
  assert.match(updated, /Preserve custom review policy/);
  assert.deepEqual(sync(dir).changed, []);
  const malformed = updated.replace('<!-- END CG BOOTSTRAP -->', '');
  write(dir, entry, malformed);
  assert.throws(() => sync(dir), /unbalanced CG BOOTSTRAP/);
  assert.equal(read(dir, entry), malformed);
});

test('upgrade refreshes bounded skill entry instructions without changing retained loading policy', t => {
  const dir = policyFixture(t), entry = '.agents/cg/contract-graph-agent.md';
  // An older release's managed block and repository-authored reading order coexist.
  write(dir, entry, '# Team entry\n\nRead our release prerequisites.\n\n<!-- BEGIN PRINCIPLES INDEX -->\n<!-- END PRINCIPLES INDEX -->\n\n<!-- BEGIN CG BOOTSTRAP -->\nLoad every roadmap before starting a skill.\n<!-- END CG BOOTSTRAP -->\n');
  const policy = JSON.parse(read(dir, '.agents/cg/phases.json'));
  policy.phases.produce = { always: ['A', 'P', 'E'], conditional: [] };
  write(dir, '.agents/cg/phases.json', JSON.stringify(policy, null, 2) + '\n');
  const retained = read(dir, '.agents/cg/phases.json');
  const workflow = read(dir, '.agents/cg/workflow.md');
  // Init replaces release-owned skills; sync also refreshes preserved shared entries.
  write(dir, '.agents/skills/cg-prototype/SKILL.md', 'Obsolete prototype instructions.\n');
  init(dir);
  sync(dir);
  const updated = read(dir, entry);
  assert.match(updated, /Read our release prerequisites/);
  assert.doesNotMatch(updated, /Load every roadmap/);
  assert.match(updated, /### Start with the requested action/);
  assert.match(updated, /A bare skill name is not a task description/);
  assert.match(updated, /Context reuse does not waive fresh intent/);
  assert.match(updated, /one `cg status`/);
  assert.match(updated, /\*\*Selection gate:\*\*/);
  assert.match(updated, /stop discovery and ask/);
  assert.match(updated, /Do not persist a guessed `--select`/);
  assert.match(updated, /before opening the root contract, workflow/);
  assert.match(updated, /or the owner-communication reference/);
  for (const name of ['warmup', 'plan', 'produce', 'prototype', 'sign-off', 'unblock']) {
    assert.ok(updated.includes(`| cg-${name} |`));
    assert.match(read(dir, `.agents/skills/cg-${name}/SKILL.md`), /shared Lifecycle bootstrap/);
    assert.match(read(dir, `.agents/skills/cg-${name}/SKILL.md`), /selection check immediately after this skill and the bootstrap/);
  }
  const prototype = read(dir, '.agents/skills/cg-prototype/SKILL.md');
  assert.match(prototype, /do not ask whether to launch/);
  assert.match(prototype, /If selection is required, stop and ask/);
  assert.match(prototype, /For preview-only recovery, use the recorded launch instructions/);
  assert.match(prototype, /Opening an existing preview alone needs no speculative write declaration/);
  assert.equal(read(dir, '.agents/cg/phases.json'), retained);
  assert.equal(read(dir, '.agents/cg/workflow.md'), workflow);
  assert.deepEqual(sync(dir).changed, []);
  assert.deepEqual(verify(dir).failures, []);
});

test('fresh shared entry presents recovery selection before the root task-reading links', t => {
  const dir = policyFixture(t);
  const entry = read(dir, '.agents/cg/contract-graph-agent.md');
  const selection = entry.indexOf('### Start with the requested action');
  const rootLink = entry.indexOf('**For selected work, start here:');
  const order = entry.indexOf('## Required reading order');
  assert.ok(selection >= 0 && rootLink > selection && order > selection);
  assert.equal([...entry.matchAll(/## Lifecycle bootstrap/g)].length, 1);
  assert.deepEqual(sync(dir).changed, []);
});

test('sync retires exact historical reading sections across profiles and preserves surrounding guidance', t => {
  const dir = policyFixture(t);
  init(dir, { profiles: ['all'] });
  sync(dir);
  const historical = read(root, 'test/fixtures/discovery/legacy-root.md');
  const shared = read(root, 'test/fixtures/discovery/legacy-shared.md');
  const suffix = '\n\n## Team policy\n\nKeep our release approval and deployment gate.\n';
  for (const file of ['AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md']) {
    const source = file.startsWith('.github/')
      ? historical.replaceAll('[`.agents/cg/', '[`../.agents/cg/').replaceAll('](.agents/cg/', '](../.agents/cg/')
      : file === 'CLAUDE.md' ? historical.replace(/^Read[^\n]+\n/, '@.agents/cg/contract-graph-agent.md\n') : historical;
    write(dir, file, source + suffix);
  }
  const entry = '.agents/cg/contract-graph-agent.md';
  write(dir, entry, shared + suffix);
  const before = read(dir, entry);
  const workflow = read(dir, '.agents/cg/workflow.md'), phases = read(dir, '.agents/cg/phases.json');
  assert.ok(sync(dir, { dryRun: true }).changed.includes(path.join(dir, entry)));
  assert.equal(read(dir, entry), before);
  sync(dir);
  for (const file of ['AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md', entry]) {
    const updated = read(dir, file);
    assert.doesNotMatch(updated, /## Required reading order/);
    assert.ok(updated.endsWith(suffix));
    if (file !== entry) {
      assert.doesNotMatch(updated, /contract\.yaml|workflow\.md/);
      assert.match(updated, /contract-graph-agent\.md/);
      assert.match(updated, /## Task entry/);
    } else {
      assert.match(updated, /Follow \[Lifecycle bootstrap\]\(#lifecycle-bootstrap\)/);
      assert.match(updated, /\*\*For selected work, start here:/);
    }
  }
  assert.equal(read(dir, '.agents/cg/workflow.md'), workflow);
  assert.equal(read(dir, '.agents/cg/phases.json'), phases);
  assert.deepEqual(sync(dir).changed, []);
  assert.deepEqual(verify(dir).failures, []);
});

test('changed or extended historical reading sections remain repository-owned', t => {
  const dir = policyFixture(t);
  for (const [file, fixture] of [['AGENTS.md', 'legacy-root.md'], ['.agents/cg/contract-graph-agent.md', 'legacy-shared.md']]) {
    const original = read(root, `test/fixtures/discovery/${fixture}`);
    const start = original.indexOf('## Required reading order');
    const variants = [
      original.replace('— repository contract and graph root.', '— team-specific preflight policy.'),
      original.trimEnd() + '\n\nRun the team policy check before selection.\n',
      original.replace('1. [', '0. Check the team incident first.\n1. ['),
    ];
    for (const source of variants) {
      write(dir, file, source);
      sync(dir);
      assert.ok(read(dir, file).endsWith(source.slice(start)), `${file}: custom section must survive byte-for-byte`);
    }
  }
});

test('historical CRLF sections migrate without rewriting custom CRLF guidance', t => {
  const dir = policyFixture(t);
  const source = read(root, 'test/fixtures/discovery/legacy-root.md').replaceAll('\n', '\r\n');
  const suffix = '\r\n## Local policy\r\n\r\nKeep this CRLF text.\r\n';
  write(dir, 'AGENTS.md', source + suffix);
  sync(dir);
  assert.doesNotMatch(read(dir, 'AGENTS.md'), /## Required reading order/);
  assert.ok(read(dir, 'AGENTS.md').endsWith(suffix));
  assert.deepEqual(sync(dir).changed, []);
});

test('retained workflow gets a routing notice while generated bootstrap refreshes idempotently', t => {
  const dir = fixture(t);
  const file = path.join(dir, '.agents/cg/workflow.md');
  fs.writeFileSync(file, '# Local workflow\nUse the exact route and our team gate.\n');
  const original = fs.readFileSync(file, 'utf8');
  for (let i = 0; i < 2; i++) {
    const result = init(dir, i === 0 ? { reasons } : {});
    assert.match(result.policyNotices.join('\n'), /routing recovery/);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.match(fs.readFileSync(path.join(dir, '.agents/cg/contract-graph-agent.md'), 'utf8'), /--suggest/);
  }
});
