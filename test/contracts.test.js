import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { init } from "../src/scripts/init.js";
import { loadBindingPrinciples } from "../src/scripts/model.js";
import { sync } from "../src/scripts/sync.js";
import {
  CONTRACT_FILENAME,
  CONTRACT_SCHEMA_ID,
  contractContext,
  findContract,
  graphTree,
  loadContractGraph,
  loadContract,
  parseContractYaml,
  renderContext,
  renderContract,
  renderGraph,
  renderMermaid,
  routeContracts,
  stringifyContractYaml,
} from "../src/scripts/contracts.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(TEST_DIR, "..");
const ROOT = ".agents/cg/contract.yaml";
const MODULE = "src/.agents/cg/contract.yaml";

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-contracts-"));
  init(dir, {});
  sync(dir);
  return dir;
}

const readContract = (dir, relative) =>
  loadContract(path.join(dir, relative), { repoRoot: dir });

function editContract(dir, relative, change) {
  const value = readContract(dir, relative);
  change(value);
  fs.writeFileSync(path.join(dir, relative), stringifyContractYaml(value));
}

test("the public package export exposes the contract engine", async () => {
  const engine = await import("contract-graph/contracts");
  assert.equal(engine.CONTRACT_FILENAME, CONTRACT_FILENAME);
  assert.equal(typeof engine.loadContractGraph, "function");
  assert.equal(typeof engine.routeContracts, "function");
});

test("a fresh graph resolves the root and module by id, unit, and path", () => {
  const graph = loadContractGraph(fixture(), { throwOnError: true });
  assert.equal(graph.records.length, 2);
  assert.equal(findContract(graph).contract.id, "repository");
  assert.equal(findContract(graph, "src").relative, MODULE);
  assert.equal(findContract(graph, MODULE).contract.id, "src");
  assert.equal(findContract(graph, "repository").relative, ROOT);
});

test("contracts must identify the canonical schema identity", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.$schema = "https://contract-graph.dev/schema/contract-v1.schema.json";
  });
  assert.match(loadContractGraph(dir).failures.join("\n"), new RegExp(CONTRACT_SCHEMA_ID.replaceAll(".", "\\.")));
});

test("a dangling child reference fails and makes the former child unreachable", () => {
  const dir = fixture();
  editContract(dir, ROOT, (contract) => {
    contract.relations.children[0].contract = "ghost/.agents/cg/contract.yaml";
  });
  const failures = loadContractGraph(dir).failures.join("\n");
  assert.match(failures, /references missing contract `ghost\/.agents\/cg\/contract\.yaml`/);
  assert.match(failures, /src\/.agents\/cg\/contract\.yaml: contract is not reachable/);
});

test("parent and child declarations must be reciprocal", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.relations.parent = null;
  });
  const failures = loadContractGraph(dir).failures.join("\n");
  assert.match(failures, /every non-root contract must name its parent/);
  assert.match(failures, /child src\/.agents\/cg\/contract\.yaml names no parent instead/);
});

test("a contract with multiple owned responsibilities fails", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.responsibilities.owns.push("A second independently named responsibility.");
  });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /a boundary must own exactly one responsibility/,
  );
});

test("duplicate owned responsibilities across contracts fail", () => {
  const dir = fixture();
  const rootOwns = readContract(dir, ROOT).responsibilities.owns[0];
  editContract(dir, MODULE, (contract) => {
    contract.responsibilities.owns = [rootOwns];
  });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /owned responsibility is already declared/,
  );
});

test("a boundary named common, shared, utils, or helpers fails", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.id = "utils";
    contract.name = "utils";
  });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /named as a miscellaneous bag/,
  );
});

test("a top-level module named as a technical layer fails", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.name = "Services";
  });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /named as a horizontal technical layer/,
  );
});

test("a forbidden parent-child boundary transition fails", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => { contract.kind = "component"; });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /boundary kind `component` is not permitted beneath `repository`/,
  );
});

test("a child unit outside its parent fails", () => {
  const dir = fixture();
  const child = structuredClone(readContract(dir, MODULE));
  child.id = "peer";
  child.name = "peer";
  child.kind = "component";
  child.unit = "peer";
  child.relations.parent = {
    contract: MODULE,
    uses: "The src module delegates a deliberately misplaced fixture responsibility.",
  };
  fs.mkdirSync(path.join(dir, "peer", ".agents", "cg"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "peer", ".agents", "cg", "contract.yaml"),
    stringifyContractYaml(child),
  );
  editContract(dir, MODULE, (contract) => {
    contract.relations.composition = "composed";
    contract.relations.children.push({
      contract: "peer/.agents/cg/contract.yaml",
      uses: "Delegates the deliberately misplaced fixture responsibility.",
    });
  });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /unit `peer` is not beneath parent unit `src`/,
  );
});

test("composition cycles are rejected", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.relations.composition = "composed";
    contract.relations.children = [
      { contract: ROOT, uses: "An invalid edge back to the graph root." },
    ];
  });
  assert.match(loadContractGraph(dir).failures.join("\n"), /composition cycle detected/);
});

test("dependency cycles are rejected", () => {
  const dir = fixture();
  editContract(dir, ROOT, (contract) => {
    contract.relations.dependencies.push({
      contract: MODULE,
      uses: "Invalid dependency from the root to its module.",
    });
  });
  editContract(dir, MODULE, (contract) => {
    contract.relations.dependencies.push({
      contract: ROOT,
      uses: "Invalid dependency back to the root.",
    });
  });
  assert.match(loadContractGraph(dir).failures.join("\n"), /dependency cycle detected/);
});

test("a dangling dependency reference fails", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.relations.dependencies.push({
      contract: "ghost/.agents/cg/contract.yaml",
      uses: "A dependency whose target does not exist.",
    });
  });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /dependencies\[0\] references missing contract `ghost\/\.agents\/cg\/contract\.yaml`/,
  );
});

test("declared surface paths must exist inside their unit", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.surface[0].path = "does/not/exist.ts";
  });
  assert.match(loadContractGraph(dir).failures.join("\n"), /surface `module-api` points to missing path/);
});

test("invariant and verification references must agree in both directions", () => {
  const dir = fixture();
  editContract(dir, MODULE, (contract) => {
    contract.invariants.push({
      id: "STABLE_OUTPUT",
      statement: "The module produces a stable output.",
      verification: ["module-test"],
    });
    contract.verification.push({
      id: "module-test",
      command: "npm test",
      covers: [],
    });
  });
  assert.match(
    loadContractGraph(dir).failures.join("\n"),
    /verification `module-test` does not reciprocally cover invariant `STABLE_OUTPUT`/,
  );
});

test("contract YAML rejects ambiguous or executable YAML features", () => {
  for (const [name, source] of [
    ["duplicate keys", "id: one\nid: two\n"],
    ["anchors and aliases", "shared: &value [one]\ncopy: *value\n"],
    ["explicit tags", "value: !!str one\n"],
    ["merge keys", "base: &base { one: 1 }\nvalue: { <<: *base }\n"],
    ["multiple documents", "one: 1\n---\ntwo: 2\n"],
    ["non-string keys", "1: one\n"],
    ["non-JSON scalars", "value: .nan\n"],
  ]) {
    assert.throws(
      () => parseContractYaml(source, { source: `${name}.yaml` }),
      /invalid Contract Graph YAML|finite number|JSON-compatible data/,
      name,
    );
  }
});

test("contract context resolves ancestor rules without duplicating their text", () => {
  const dir = fixture();
  const graph = loadContractGraph(dir, { throwOnError: true });
  const context = contractContext(
    graph,
    findContract(graph, "src"),
    loadBindingPrinciples(dir),
  );
  assert.deepEqual(context.ancestors.map((record) => record.contract.id), ["repository"]);
  assert.ok(context.rules.some((rule) => rule.id === "A01" && rule.text));
  assert.ok(context.rules.some((rule) => rule.id === "A13" && rule.text));
  assert.match(renderContext(context), /Contract context: src/);
});

test("routes are deterministic data owned by contracts", () => {
  const graph = loadContractGraph(fixture(), { throwOnError: true });
  const matches = routeContracts(graph, "change the source module implementation");
  assert.equal(matches[0].owner, "repository");
  assert.equal(matches[0].route, "starter-source");
  assert.deepEqual(matches[0].contracts.map((record) => record.contract.id), ["src"]);
  assert.deepEqual(routeContracts(graph, "unrelated prose"), []);
});

test("human, tree, JSON-tree, and Mermaid projections come from the same graph", () => {
  const graph = loadContractGraph(fixture(), { throwOnError: true });
  assert.match(renderContract(findContract(graph, "src")), /^# src/m);
  assert.match(renderGraph(graph), /repository \[repository\] — \./);
  assert.match(renderGraph(graph), /src \[module\] — src/);
  assert.equal(graphTree(graph).children[0].id, "src");
  assert.match(renderMermaid(graph), /^flowchart TD/);
  assert.match(renderMermaid(graph), /n_repository --> n_src/);
});

test("the CLI exposes contract queries and graph projections", () => {
  const dir = fixture();
  const run = (...args) =>
    execFileSync(process.execPath, [path.join(REPO, "bin", "cg.js"), ...args], {
      cwd: REPO,
      encoding: "utf8",
    });

  assert.match(run("contract", "show", dir, "--id", "src"), /^# src/m);
  assert.match(run("contract", "context", dir, "--id", "src"), /Resolved rules/);
  assert.match(run("contract", "children", dir, "--id", "repository"), /src\.agents|src\/\.agents/);
  assert.match(run("contract", "parents", dir, "--id", "src"), /repository/);
  assert.match(run("contract", "surface", dir, "--id", "src"), /module-api/);
  assert.match(run("contract", "route", dir, "--task", "source implementation"), /starter-source/);
  assert.match(run("contract", "verify", dir), /OK — 2 contract\(s\)/);
  assert.match(run("graph", "show", dir), /repository \[repository\]/);
  assert.match(run("graph", "show", dir, "--format", "mermaid"), /^flowchart TD/);
  assert.match(run("graph", "verify", dir), /OK — 2 contract\(s\)/);
});

test("contract route exits non-zero when no route matches", () => {
  const dir = fixture();
  const result = spawnSync(
    process.execPath,
    [path.join(REPO, "bin", "cg.js"), "contract", "route", dir, "--task", "zzzz unmatched"],
    { cwd: REPO, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stdout, /no contract route matched/);
});

test("a graph may mix a two-level module leaf with a five-kind nest", () => {
  const dir = fixture();
  const src = readContract(dir, MODULE);
  const chain = [
    {
      id: "billing",
      kind: "module",
      unit: "billing",
      owns: "Customer billing lifecycle and invoice issuance.",
      parentUses: "The repository delegates customer billing to this module.",
      childUses: "Delegates invoice document assembly.",
    },
    {
      id: "invoicing",
      kind: "submodule",
      unit: "billing/invoicing",
      owns: "Invoice document assembly from billed events.",
      parentUses: "Billing delegates invoice document assembly to this submodule.",
      childUses: "Delegates PDF invoice rendering.",
    },
    {
      id: "pdf",
      kind: "component",
      unit: "billing/invoicing/pdf",
      owns: "PDF invoice rendering for a completed invoice.",
      parentUses: "Invoicing delegates PDF rendering to this component.",
      childUses: "Delegates PDF byte encoding.",
    },
    {
      id: "render",
      kind: "library",
      unit: "billing/invoicing/pdf/render",
      owns: "PDF byte encoding without naming a consumer.",
      parentUses: "The PDF component delegates byte encoding to this library.",
    },
  ];

  for (let index = 0; index < chain.length; index += 1) {
    const node = chain[index];
    const parentRel = index === 0 ? ROOT : `${chain[index - 1].unit}/.agents/cg/contract.yaml`;
    const contract = structuredClone(src);
    contract.id = node.id;
    contract.name = node.id;
    contract.kind = node.kind;
    contract.unit = node.unit;
    contract.summary = `${node.id} owns a distinct nested responsibility.`;
    contract.purpose = node.parentUses;
    contract.responsibilities.owns = [node.owns];
    contract.responsibilities.allows = [`Work that belongs inside ${node.id}.`];
    contract.responsibilities.forbids = [`Work owned outside ${node.id}.`];
    contract.surface[0].id = `${node.id}-api`;
    contract.relations.parent = { contract: parentRel, uses: node.parentUses };
    const next = chain[index + 1];
    if (next) {
      contract.relations.composition = "composed";
      contract.relations.children = [{
        contract: `${next.unit}/.agents/cg/contract.yaml`,
        uses: node.childUses,
      }];
    } else {
      contract.relations.composition = "leaf";
      contract.relations.children = [];
    }
    fs.mkdirSync(path.join(dir, node.unit, ".agents", "cg"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, node.unit, ".agents", "cg", "contract.yaml"),
      stringifyContractYaml(contract),
    );
  }

  editContract(dir, ROOT, (contract) => {
    contract.relations.children.push({
      contract: "billing/.agents/cg/contract.yaml",
      uses: "Delegates customer billing.",
    });
  });

  const graph = loadContractGraph(dir, { throwOnError: true });
  assert.equal(graph.records.length, 6);
  assert.equal(findContract(graph, "src").contract.relations.composition, "leaf");
  assert.deepEqual(
    ["repository", "billing", "invoicing", "pdf", "render"].map(
      (id) => findContract(graph, id).contract.kind,
    ),
    ["repository", "module", "submodule", "component", "library"],
  );
});

test('suggestions preserve exact matches, explain reordered phrases, avoid unrelated matches and bound hydration', async t => {
  const { routeSuggestions, hydratedRoutes } = await import('../src/scripts/contracts.js');
  const dir = fixture(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  editContract(dir, ROOT, c => { c.routes = [{ id: 'card-animation', when: ['fix card movement animation'], contracts: [MODULE] }]; });
  const graph = loadContractGraph(dir);
  const corpus = [
    ['fix card movement animation', true], ['animation movement card repair', true], ['cards animation movement', true],
    ['configure billing refunds', false], ['database backup restore', false], ['rename authentication provider', false],
    ['repair jitter when cards move', true],
  ];
  const observed = corpus.map(([task, relevant]) => ({ task, relevant, found: routeSuggestions(graph, task).length > 0 }));
  assert.equal(observed.filter(x => !x.relevant && x.found).length, 0);
  assert.equal(observed.filter(x => x.relevant && x.found).length, 3);
  t.diagnostic('routing-corpus-v1: 3/4 relevant queries retrieved; 0/3 unrelated queries matched; semantic miss uses explicit browse recovery');
  assert.match(hydratedRoutes(graph, []).recovery, /children --id/);
  assert.equal(routeSuggestions(graph, 'fix card movement animation')[0].method, 'exact');
  assert.equal(routeContracts(graph, 'animation movement card repair').length, 0);
  const suggested = routeSuggestions(graph, 'animation movement card repair');
  assert.equal(suggested[0].method, 'lexical');
  assert.deepEqual(suggested[0].evidence, ['card', 'movement', 'animation']);
  assert.deepEqual(routeSuggestions(graph, 'configure billing refunds'), []);
  assert.deepEqual(routeSuggestions(graph, 'repair jitter when cards move'), [], 'semantic paraphrase remains an honest unsupported lexical match');
  const context = hydratedRoutes(graph, suggested, loadBindingPrinciples(dir), { limit: 1 });
  assert.equal(context.contexts[0].id, graph.byFile.get(MODULE).contract.id);
  assert.deepEqual(context.contexts[0].rules, contractContext(graph, graph.byFile.get(MODULE), loadBindingPrinciples(dir)).rules.map(rule => rule.id));
  assert.throws(() => hydratedRoutes(graph, suggested, new Map(), { limit: 0 }), /limit/);
  const call = (...args) => spawnSync(process.execPath, [path.join(REPO, 'bin/cg.js'), ...args], { encoding: 'utf8' });
  const routed = call('contract', 'route', dir, '--task', 'animation movement card repair', '--suggest', '--hydrate', '--json');
  assert.equal(routed.status, 0, routed.stderr); assert.equal(JSON.parse(routed.stdout).candidates[0].method, 'lexical');
  const advisory = call('guidelines', 'show', dir, '--id', 'E01-01', '--json');
  assert.equal(advisory.status, 0, advisory.stderr); assert.equal(JSON.parse(advisory.stdout).binding, 'advisory');
  assert.equal(JSON.parse(advisory.stdout).entries.length, 1);
  assert.notEqual(call('guidelines', 'show', dir, '--id', 'E99-99').status, 0);
});

test('routing ties, normalised duplicate words, omissions and advisory intersections stay explicit', async t => {
  const { routeSuggestions, hydratedRoutes } = await import('../src/scripts/contracts.js');
  const dir = fixture(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  editContract(dir, ROOT, c => { c.routes = [
    { id: 'first', when: ['billing refund'], contracts: [MODULE] },
    { id: 'second', when: ['refund billing'], contracts: [MODULE] },
    { id: 'duplicate', when: ['tokens token otherword'], contracts: [MODULE] },
  ]; });
  const graph = loadContractGraph(dir);
  const ties = routeSuggestions(graph, 'billing and refund');
  assert.deepEqual(ties.map(m => m.route), ['first', 'second']);
  assert.deepEqual(routeSuggestions(graph, 'token'), []);
  const report = hydratedRoutes(graph, ties, new Map(), { limit: 1 });
  assert.equal(report.ambiguous, true); assert.equal(report.omittedCandidates, 1);
  assert.equal(report.contexts.length, 1);
  ties[0].matched = ['x'.repeat(5000)];
  graph.byFile.get(MODULE).contract.responsibilities.owns = ['x'.repeat(5000)];
  const bounded = hydratedRoutes(graph, ties);
  assert.deepEqual(bounded.candidates[0].matched, { omitted: true });
  assert.ok(bounded.omissions.every(item => item.retrieve));
  assert.ok(JSON.stringify(bounded).length < 5000);
  const call = (...args) => spawnSync(process.execPath, [path.join(REPO, 'bin/cg.js'), ...args], { encoding: 'utf8' });
  const selected = JSON.parse(call('guidelines', 'show', dir, '--id', 'E01-01').stdout).entries[0];
  const category = JSON.parse(call('guidelines', 'show', dir, '--category', selected.category).stdout);
  assert.ok(category.entries.some(entry => entry.id === selected.id));
  assert.ok(category.entries.every(entry => entry.category === selected.category));
  const both = call('guidelines', 'show', dir, '--category', selected.category, '--id', selected.id);
  assert.deepEqual(JSON.parse(both.stdout).entries, [selected]);
  for (const args of [
    ['guidelines', 'show', dir, '--category', 'unknown'],
    ['status', dir, '--summary', '--programme', 'example'],
    ['status', dir, '--select', 'example', '--clear-selection'],
    ['contract', 'route', dir, '--task', 'billing', '--limit', '2'],
    ['contract', 'route', dir, '--task', 'billing', '--suggest', '--limit', '1.5'],
    ['status', dir, '--hydrate'],
  ]) assert.notEqual(call(...args).status, 0, args.join(' '));
});

test('compact hydration shares ancestor bodies and preserves all context relationships', async t => {
  const { hydratedRoutes } = await import('../src/scripts/contracts.js');
  const dir = fixture(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const leaves = [MODULE];
  for (let i = 0; i < 3; i++) {
    const c = readContract(dir, MODULE); c.id = `leaf-${i}`; c.unit = `leaf-${i}`;
    const file = `${c.unit}/.agents/cg/contract.yaml`;
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), stringifyContractYaml(c)); leaves.push(file);
  }
  editContract(dir, ROOT, c => { c.relations.children.push(...leaves.slice(1).map(contract => ({ contract, uses: 'Fixture boundary' }))); c.routes = [{ id: 'fixture', when: ['multi context'], contracts: leaves }]; });
  const graph = loadContractGraph(dir), rules = loadBindingPrinciples(dir), matches = routeContracts(graph, 'multi context');
  const start = performance.now(); const expanded = hydratedRoutes(graph, matches, rules, { limit: 4 }); const middle = performance.now();
  const compact = hydratedRoutes(graph, matches, rules, { limit: 4, compact: true }); const end = performance.now();
  assert.deepEqual(compact.rules, expanded.rules); assert.deepEqual(compact.candidates, expanded.candidates);
  for (let i = 0; i < compact.contexts.length; i++) {
    const actual = compact.contexts[i], expected = expanded.contexts[i];
    assert.deepEqual(actual.ancestors, expected.ancestors.map(a => a.contract));
    for (const field of ['children', 'dependencies', 'rules']) assert.deepEqual(actual[field], expected[field]);
    assert.deepEqual(compact.nodes.find(n => n.contract === actual.contract).responsibilities, expected.responsibilities);
  }
  assert.equal(compact.nodes.filter(n => n.contract === ROOT).length, 1);
  assert.ok(compact.nodes.every(n => !Object.hasOwn(n, 'forbids')));
  const bytes = value => Buffer.byteLength(JSON.stringify(value, null, 2) + '\n');
  assert.ok(bytes(compact) < bytes(expanded)); assert.ok(bytes(compact) <= 65536);
  t.diagnostic(JSON.stringify({ fixture: 'four-contexts-v1', expandedBytes: bytes(expanded), compactBytes: bytes(compact), expandedMs: middle-start, compactMs: end-middle }));
  const none = hydratedRoutes(graph, [], rules, { compact: true }); assert.equal(none.matched, false); assert.deepEqual(none.contexts, []);
  const largeRules = new Map(Array.from({ length: 100 }, (_, i) => [`A${String(i).padStart(2, '0')}`, 'x'.repeat(2000)]));
  const truncated = hydratedRoutes(graph, matches, largeRules, { limit: 4, compact: true });
  assert.ok(bytes(truncated) <= 65536); assert.ok(truncated.omissions.some(item => item.field === 'context'));
  assert.ok(truncated.omissions.every(item => item.retrieve));
  for (const context of truncated.contexts) assert.ok(context.rules.every(id => truncated.rules.some(rule => rule.id === id)));

});
