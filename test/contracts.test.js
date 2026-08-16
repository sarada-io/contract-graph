import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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

const REPO = path.resolve(import.meta.dirname, "..");
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

test("contracts must identify the canonical Sarada-hosted schema", () => {
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
