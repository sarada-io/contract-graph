#!/usr/bin/env node
/** Contract Graph command line. `cg build | init | next | residue | sync | verify | modules | harvest | profiles`. */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

import { BINDING_FILENAME, loadBindingCatalog } from "./binding.js";
import { DEFAULT_DOCS_ROOT, loadBindingPrinciples, renderRootReference } from "./model.js";
import {
  contractContext,
  findContract,
  graphTree,
  loadContractGraph,
  parentChain,
  renderContext,
  renderContract,
  renderGraph,
  renderMermaid,
  routeContracts,
} from "./contracts.js";
import { build, BuildError } from "./build.js";
import { init } from "./init.js";
import { HarvestError, checkHarvest } from "./harvest.js";
import { moduleCoverage, openDescent } from "./modules.js";
import { next, permits } from "./next.js";
import { residue } from "./residue.js";
import { multiSelect } from "./picker.js";
import {
  expandProfileAliases,
  loadProfileSelection,
  profileChoices,
  resolveProfiles,
  selectableProfiles,
} from "./profiles.js";
import { sync } from "./sync.js";
import { verify } from "./verify.js";

const PACKAGE_JSON = [
  new URL("../package.json", import.meta.url),
  new URL("../../package.json", import.meta.url),
].find((candidate) => fs.existsSync(candidate));

const VERSION = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")).version;

const USAGE = `cg — Contract Graph

Usage:
  cg build [dir] [--check]                         assemble the package target under build/
  cg init [dir] [--profile a,b] [--docs dir]       scaffold governance
  cg next [dir] [--json] [--for skill]            what runs next, computed from the Step queue
  cg residue [dir] [--json]                       plan documents nothing points at any more
  cg sync [dir] [--check]                         regenerate derived artifacts
  cg verify [dir] [--warn]                        verify governance
  cg modules [dir]                                list detected module roots, coverage, and unfinished descent
  cg contract show [dir] [--id id] [--json]       render one canonical contract
  cg contract context [dir] [--id id] [--json]    resolve ancestors, relations, and rule text
  cg contract children [dir] [--id id]            list direct child contracts
  cg contract parents [dir] [--id id]             list the path from root to the selected contract
  cg contract surface [dir] [--id id]             show the boundary's public surface
  cg contract route [dir] --task "request"         route a task through contract-owned routes
  cg contract verify [dir]                        verify schema, references, and graph closure
  cg graph show [dir] [--format tree|json|mermaid] project the whole composition graph
  cg graph verify [dir]                           verify schema, references, and graph closure
  cg harvest <manifest> [--stage close]           check a decision-harvest manifest
  cg profiles                                     list editor profiles

Options:
  --profile <list>  add comma-separated editor profiles without the interactive picker (init only)
  --docs <dir>      directory to hold plans/, decisions/, and guides/ (init only; default: docs)
  --stage <name>    harvest stage: classify (default) or close
  --decision-log <path>  decision log to check cohort eligibility against (harvest only)
  --preparation <path>   prepared drain route to validate at --stage close (harvest only)
  --json            machine-readable output (next, residue, contract, graph)
  --id <id>         contract id, governed unit, or repository-relative contract path
  --task <text>     task description to match against contract routes
  --format <name>   output format: markdown, tree, json, or mermaid
  --for <skill>     exit 0 only if dispatching that skill agrees with the queue (next only)
  --check           verify build/init/sync output without changing it
  --yes             accept replacing framework core without being asked (init only)
  --warn            report findings and exit 0 (verify only)
  --quiet           suppress successful build output
  --version         print the installed package version
  -h, --help        show this message
`;

/**
 * Every option the CLI accepts. An unrecognised `--flag` is refused rather than ignored:
 * a retired flag that is silently swallowed scaffolds a repository missing whatever it
 * asked for, and its value is then read as a positional argument. `--packs saas` doing
 * nothing quietly is exactly the upgrade failure this tool should not have.
 */
const KNOWN_FLAGS = new Set([
  "profile",
  "docs",
  "stage",
  "decision-log",
  "preparation",
  "check",
  "json",
  "id",
  "task",
  "format",
  "for",
  "yes",
  "warn",
  "quiet",
  "help",
]);

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  // Keep parsing deliberately small: commands share boolean flags, while the init selection
  // options consume values (in either `--name x` or `--name=x` form).
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--profile") {
      flags.profile = argv[++i] ?? "";
    } else if (arg.startsWith("--profile=")) {
      flags.profile = arg.slice("--profile=".length);
    } else if (arg === "--stage") {
      flags.stage = argv[++i] ?? "";
    } else if (arg.startsWith("--stage=")) {
      flags.stage = arg.slice("--stage=".length);
    } else if (arg === "--decision-log") {
      flags["decision-log"] = argv[++i] ?? "";
    } else if (arg.startsWith("--decision-log=")) {
      flags["decision-log"] = arg.slice("--decision-log=".length);
    } else if (arg === "--preparation") {
      flags.preparation = argv[++i] ?? "";
    } else if (arg.startsWith("--preparation=")) {
      flags.preparation = arg.slice("--preparation=".length);
    } else if (arg === "--for") {
      flags.for = argv[++i] ?? "";
    } else if (arg.startsWith("--for=")) {
      flags.for = arg.slice("--for=".length);
    } else if (arg === "--docs") {
      flags.docs = argv[++i] ?? "";
    } else if (arg.startsWith("--docs=")) {
      flags.docs = arg.slice("--docs=".length);
    } else if (arg === "--id") {
      flags.id = argv[++i] ?? "";
    } else if (arg.startsWith("--id=")) {
      flags.id = arg.slice("--id=".length);
    } else if (arg === "--task") {
      flags.task = argv[++i] ?? "";
    } else if (arg.startsWith("--task=")) {
      flags.task = arg.slice("--task=".length);
    } else if (arg === "--format") {
      flags.format = argv[++i] ?? "";
    } else if (arg.startsWith("--format=")) {
      flags.format = arg.slice("--format=".length);
    } else if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (!KNOWN_FLAGS.has(name)) {
        throw new Error(
          `unknown option \`${arg}\`. Valid options: ` +
            `${[...KNOWN_FLAGS].filter((f) => f !== "help").map((f) => `--${f}`).join(", ")}`,
        );
      }
      flags[name] = true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

/**
 * One readline interface for a whole exchange. Opening a fresh one per question closes
 * stdin after the first answer, so any follow-up question reads EOF immediately.
 */
function prompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Pulling lines from the async iterator rather than using `rl.question` keeps answers
  // that were already buffered readable, and turns end-of-input into an ordinary error
  // instead of an await that never settles.
  const lines = rl[Symbol.asyncIterator]();
  return {
    async ask(question) {
      process.stdout.write(question);
      const { value, done } = await lines.next();
      if (done) throw new Error("no answer received before input closed");
      return value.trim();
    },
    close: () => rl.close(),
  };
}

const isUsableRootName = (name) =>
  Boolean(name) && !name.startsWith(".") && name.split(/[\\/]/).length === 1;

const DOCS_SUBTREES = ["plans", "decisions", "guides"];
const LEGACY_DOCS_SUBTREES = ["design"];

/**
 * Find documentation trees this repository already keeps under a *split* convention —
 * `docs-plans/`, `doc-decisions/` — rather than nested inside one root.
 *
 * `chooseDocsRoot` cannot adopt these: the model is one root holding three subdirectories,
 * and there is no single directory to point at. But saying nothing is worse. A repository
 * with populated `docs-plans/` silently gains an empty `docs/plans/`, and now two files
 * both look like the decision log — which is exactly the finding that came back from the
 * first brownfield run. Naming it at init costs one line and saves that discovery.
 */
function detectRivalDocTrees(repoRoot, chosenRoot) {
  let entries;
  try {
    entries = fs.readdirSync(repoRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== chosenRoot)
    .map((entry) => entry.name)
    .filter((name) => {
      const match = /^[a-z]+[-_](plans?|design|decisions?|guides?)$/.exec(name);
      if (!match) return false;
      const subtree = match[1].replace(/s$/, "");
      return [...DOCS_SUBTREES, ...LEGACY_DOCS_SUBTREES].some(
        (known) => known.replace(/s$/, "") === subtree,
      );
    })
    .filter((name) => {
      try {
        return fs.readdirSync(path.join(repoRoot, name)).length > 0;
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * Decide where `plans/`, `decisions/`, and `guides/` go.
 *
 * A repository that already owns `docs/` is asked rather than merged into silently. `init`
 * never overwrites, so the merge would in fact be safe — but "safe" and "expected" are
 * different things, and quietly adding three directories to a tree someone else curates is
 * the kind of surprise this tool exists to avoid.
 */
async function chooseDocsRoot(repoRoot, flags) {
  if (flags.docs !== undefined) {
    if (!isUsableRootName(flags.docs)) {
      throw new Error(`invalid --docs value \`${flags.docs}\`: expected a single directory name`);
    }
    return flags.docs;
  }

  const recorded = loadProfileSelection(repoRoot, { allowMissing: true })?.docs;
  if (recorded) return recorded;

  const candidate = path.join(repoRoot, DEFAULT_DOCS_ROOT);
  const occupied = fs.existsSync(candidate) && fs.readdirSync(candidate).length > 0;
  if (!occupied) return DEFAULT_DOCS_ROOT;

  if (!process.stdin.isTTY) {
    throw new Error(
      `\`${DEFAULT_DOCS_ROOT}/\` already exists and this is not an interactive terminal. ` +
        `Re-run with \`--docs ${DEFAULT_DOCS_ROOT}\` to use it, or \`--docs <dir>\` to pick another.`,
    );
  }

  process.stdout.write(
    `cg init: \`${DEFAULT_DOCS_ROOT}/\` already exists here.\n` +
      `  Contract Graph adds ${DEFAULT_DOCS_ROOT}/plans/, ${DEFAULT_DOCS_ROOT}/decisions/, and ` +
      `${DEFAULT_DOCS_ROOT}/guides/.\n` +
      "  Nothing existing is replaced — init never overwrites a file.\n",
  );

  const prompt = prompter();
  try {
    const reuse = (await prompt.ask(`  Use \`${DEFAULT_DOCS_ROOT}/\` for these? [Y/n] `)).toLowerCase();
    if (reuse === "" || reuse === "y" || reuse === "yes") return DEFAULT_DOCS_ROOT;

    const chosen = await prompt.ask("  Directory to bootstrap instead: ");
    if (!isUsableRootName(chosen)) {
      throw new Error(`invalid directory name \`${chosen}\`: expected a single directory name`);
    }
    return chosen;
  } catch (error) {
    throw new Error(
      `${error.message}. Re-run with \`--docs <dir>\` to choose without being asked.`,
    );
  } finally {
    prompt.close();
  }
}

/**
 * Pick concrete harnesses and preserve every recorded selection. Re-running init is additive:
 * removing a profile would leave discovery files whose ownership is ambiguous, so that remains
 * a deliberate repository edit rather than a side effect of revisiting the installer.
 */
async function chooseProfiles(repoRoot, flags) {
  const recorded = loadProfileSelection(repoRoot, { allowMissing: true });
  const installed = recorded ? expandProfileAliases(recorded.profiles) : [];

  if (flags.profile !== undefined) {
    const requested = flags.profile.split(",").map((name) => name.trim()).filter(Boolean);
    const additions = expandProfileAliases(requested);
    return [...new Set([...installed, ...additions])];
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    return multiSelect(profileChoices(), {
      selectedValues: installed,
      lockedValues: installed,
      title: installed.length
        ? "Add IDEs and agent harnesses (installed selections stay enabled)"
        : "Select IDEs and agent harnesses for Contract Graph",
    });
  }

  return installed.length ? installed : selectableProfiles();
}

/** Existing root guidance is never overwritten, but adding its first-line entry is visible. */
function rootInstructionNotices(repoRoot, profiles) {
  const { rootPointers } = resolveProfiles(profiles);
  return Object.entries(rootPointers).flatMap(([relative, prefix]) => {
    const file = path.join(repoRoot, relative);
    if (!fs.existsSync(file)) return [];
    const current = fs.readFileSync(file, "utf8");
    const firstLine = current.split(/\r?\n/, 1)[0];
    return firstLine === renderRootReference(relative, prefix) ? [] : [relative];
  });
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "-h" || command === "--help" || command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (command === "--version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const { positional, flags } = parseArgs(rest);
  if (flags.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  if (command === "contract" || command === "graph") {
    const action = positional[0] ?? "show";
    const graphActions = command === "graph" ? ["show", "verify"] : ["show", "context", "children", "parents", "surface", "route", "verify"];
    if (!graphActions.includes(action)) {
      throw new Error(`unknown ${command} action \`${action}\`; expected ${graphActions.join(", ")}`);
    }
    const graphRoot = path.resolve(positional[1] ?? ".");
    const binding = loadBindingCatalog(path.join(graphRoot, BINDING_FILENAME), { repoRoot: graphRoot });
    const graph = loadContractGraph(graphRoot, { hierarchy: binding.hierarchy.transitions });
    const reportFailures = () => {
      if (!graph.failures.length) return false;
      process.stderr.write(`cg ${command} ${action}: FAIL — ${graph.failures.length} problem(s)\n`);
      for (const failure of graph.failures) process.stderr.write(`  ${failure}\n`);
      return true;
    };

    if (action === "verify") {
      if (reportFailures()) return 1;
      process.stdout.write(`cg ${command} verify: OK — ${graph.records.length} contract(s), one closed composition graph\n`);
      return 0;
    }
    if (reportFailures()) return 1;

    if (command === "graph") {
      const format = flags.json ? "json" : flags.format ?? "tree";
      if (format === "json") process.stdout.write(`${JSON.stringify(graphTree(graph), null, 2)}\n`);
      else if (format === "mermaid") process.stdout.write(renderMermaid(graph));
      else if (format === "tree") process.stdout.write(renderGraph(graph));
      else throw new Error(`unknown graph format \`${format}\`; expected tree, json, or mermaid`);
      return 0;
    }

    if (action === "route") {
      if (!flags.task) throw new Error("usage: cg contract route [dir] --task \"request\"");
      const matches = routeContracts(graph, flags.task);
      if (flags.json || flags.format === "json") {
        process.stdout.write(`${JSON.stringify(matches.map((match) => ({
          owner: match.owner,
          route: match.route,
          matched: match.matched,
          contracts: match.contracts.map((record) => ({ id: record.contract.id, unit: record.contract.unit, contract: record.relative })),
        })), null, 2)}\n`);
      } else if (!matches.length) {
        process.stdout.write("no contract route matched — inspect the root contract and add a precise route if this task recurs\n");
      } else {
        for (const match of matches) {
          process.stdout.write(`${match.owner}/${match.route} (matched: ${match.matched.join(", ")})\n`);
          for (const record of match.contracts) process.stdout.write(`  ${record.contract.id}\t${record.relative}\n`);
        }
      }
      return matches.length ? 0 : 1;
    }

    const record = findContract(graph, flags.id || null);
    if (!record) throw new Error(`contract not found: ${flags.id}`);
    if (action === "show") {
      if (flags.json || flags.format === "json") process.stdout.write(`${JSON.stringify(record.contract, null, 2)}\n`);
      else process.stdout.write(renderContract(record));
      return 0;
    }
    if (action === "context") {
      const context = contractContext(graph, record, loadBindingPrinciples(graphRoot));
      if (flags.json || flags.format === "json") {
        process.stdout.write(`${JSON.stringify({
          contract: record.contract,
          ancestors: context.ancestors.map((item) => item.contract),
          children: context.children.map((item) => item.contract),
          dependencies: context.dependencies.map((item) => item.contract),
          rules: context.rules,
        }, null, 2)}\n`);
      } else process.stdout.write(renderContext(context));
      return 0;
    }
    if (action === "children") {
      const children = record.contract.relations.children.map((ref) => graph.byFile.get(ref.contract)).filter(Boolean);
      if (flags.json || flags.format === "json") process.stdout.write(`${JSON.stringify(children.map((item) => item.contract), null, 2)}\n`);
      else for (const item of children) process.stdout.write(`${item.contract.id}\t${item.relative}\t${item.contract.summary}\n`);
      return 0;
    }
    if (action === "parents") {
      const parents = parentChain(graph, record);
      if (flags.json || flags.format === "json") process.stdout.write(`${JSON.stringify(parents.map((item) => item.contract), null, 2)}\n`);
      else for (const item of parents) process.stdout.write(`${item.contract.id}\t${item.relative}\n`);
      return 0;
    }
    if (action === "surface") {
      if (flags.json || flags.format === "json") process.stdout.write(`${JSON.stringify(record.contract.surface, null, 2)}\n`);
      else if (!record.contract.surface.length) process.stdout.write("no public surface declared\n");
      else for (const item of record.contract.surface) process.stdout.write(`${item.id}\t${item.kind}\t${item.path}\t${item.summary}\n`);
      return 0;
    }
  }

  // All repository commands accept an optional directory as their first positional argument.
  const repoRoot = path.resolve(positional[0] ?? ".");

  if (command === "build") {
    let result;
    try {
      result = build(repoRoot, { write: !flags.check });
    } catch (error) {
      if (error instanceof BuildError) throw new Error(error.message);
      throw error;
    }
    if (flags.check) {
      if (result.changed.length || result.removed.length) {
        process.stderr.write(
          `cg build --check: FAIL — build/ differs from its package sources\n`,
        );
        for (const file of result.changed) process.stderr.write(`  stale or missing ${file}\n`);
        for (const file of result.removed) process.stderr.write(`  unexpected ${file}\n`);
        return 1;
      }
      if (!flags.quiet) process.stdout.write(`cg build --check: OK — ${result.files.length} file(s) verified\n`);
      return 0;
    }
    if (!flags.quiet) {
      process.stdout.write(
        `cg build: ${result.files.length} file(s) from ` +
          `${result.compilers.length} compiler(s) in ${path.relative(repoRoot, result.root)}/\n`,
      );
      for (const file of result.changed) process.stdout.write(`  wrote ${file}\n`);
      for (const file of result.removed) process.stdout.write(`  removed ${file}\n`);
      if (!result.changed.length && !result.removed.length) process.stdout.write("  output is reproducible and up to date\n");
    }
    return 0;
  }

  if (command === "harvest") {
    const manifest = positional[0];
    if (!manifest) throw new Error("usage: cg harvest <manifest> [--stage close]");
    const stage = flags.stage ?? "classify";
    if (!["classify", "close"].includes(stage)) {
      throw new Error(`unknown --stage \`${stage}\`; expected classify or close`);
    }
    let result;
    try {
      result = checkHarvest(path.resolve(manifest), {
        decisionLog: flags["decision-log"] ? path.resolve(flags["decision-log"]) : null,
        stage,
        preparation: flags.preparation ? path.resolve(flags.preparation) : null,
      });
    } catch (error) {
      if (error instanceof HarvestError) throw new Error(error.message);
      throw error;
    }
    if (result.failures.length) {
      process.stderr.write(`cg harvest: FAIL — ${result.failures.length} problem(s)\n`);
      for (const message of result.failures) process.stderr.write(`  ${message}\n`);
      return 1;
    }
    process.stdout.write(
      `cg harvest: OK — cohort \`${result.cohort}\` at stage ${stage}: ` +
        `${result.counts.eligible} decision(s), ${result.counts.promoted} promoted, ` +
        `${result.counts.dropped} dropped\n  classification digest: ${result.digest}\n`,
    );
    return 0;
  }

  if (command === "modules") {
    const graph = loadContractGraph(repoRoot);
    const governed = graph.records.map((record) => record.contract.unit);
    const { detected, unmapped } = moduleCoverage(repoRoot, governed);
    const descent = graph.failures.length ? [] : openDescent(repoRoot, graph.records);
    if (!detected.length && !descent.length) {
      process.stdout.write("no module roots detected — no build manifest found\n");
      return 0;
    }
    const gap = new Set(unmapped.map((m) => m.path));
    for (const module of detected) {
      const state = gap.has(module.path) ? "UNMAPPED" : "governed";
      process.stdout.write(`${state.padEnd(9)} ${module.path}  (${module.manifest})\n`);
    }
    for (const row of descent) {
      process.stdout.write(
        `DESCEND   ${row.unit}  (${row.count} undeclared packages — apply graph.recurse or record Leaf rationale)\n`,
      );
    }
    process.stdout.write(
      `\n${detected.length} detected, ${unmapped.length} unmapped, ${descent.length} need descent\n` +
        (unmapped.length || descent.length
          ? "run the `cg-warmup` skill: UNMAPPED rows still need a contract; DESCEND rows need graph.recurse\n"
          : ""),
    );
    return unmapped.length || descent.length ? 1 : 0;
  }

  if (command === "profiles") {
    const profiles = profileChoices();
    process.stdout.write(
      profiles.length
        ? `${profiles.map(({ value, label }) => `${value}\t${label}`).join("\n")}\n`
        : "no editor profiles bundled\n",
    );
    return 0;
  }

  if (command === "init") {
    const profiles = await chooseProfiles(repoRoot, flags);
    const docs = await chooseDocsRoot(repoRoot, flags);

    const instructionNotices = rootInstructionNotices(repoRoot, profiles);
    if (instructionNotices.length) {
      process.stdout.write(
        "cg init: existing agent instruction file(s) will receive a first-line Contract Graph entry\n",
      );
      for (const relative of instructionNotices) {
        process.stdout.write(`  ${relative} — existing content will be preserved\n`);
      }
    }

    // One command, whatever the repository. Copying without generating leaves a scaffold
    // that fails its own verifier — no root pointers, no wrappers, and no graph validation —
    // and every later `init` (a changed profile, a restored file) has the same gap. Sync is
    // not a second concern; it produces half the scaffold.
    // Framework core is replaced, so a re-run can discard local edits to a skill. Nothing is
    // written until the plan has been shown and accepted: `cg init` is the one verb a user is
    // likely to type from memory, and typing it must never be how they find out.
    const plan = init(repoRoot, { profiles, docs, dryRun: true });
    if (plan.replaced.length) {
      process.stdout.write(
        `cg init: ${plan.replaced.length} framework file(s) will be replaced with this version\n`,
      );
      for (const file of plan.replaced) {
        process.stdout.write(`  ${path.relative(repoRoot, file)}\n`);
      }
      process.stdout.write(
        `  Your own context under \`.agents/cg/\`, \`${plan.docs}/\`, and any module contracts is not touched.\n`,
      );
      if (flags.check) return 1;
      if (!flags.yes) {
        if (!process.stdin.isTTY) {
          throw new Error("refusing to replace framework files without confirmation — re-run with --yes");
        }
        const rl = prompter();
        try {
          const answer = await rl.ask("  Replace them? [y/N] ");
          if (!/^y(es)?$/i.test(answer)) {
            process.stdout.write("cg init: cancelled, nothing was written\n");
            return 1;
          }
        } finally {
          rl.close();
        }
      }
    } else if (flags.check) {
      process.stdout.write(
        `cg init: ${plan.written.length} file(s) would be written, 0 replaced\n`,
      );
      return plan.written.length ? 1 : 0;
    }

    const result = init(repoRoot, { profiles, docs });
    const { changed } = sync(repoRoot);
    const { failures, advisories, counts } = verify(repoRoot);

    process.stdout.write(
      `cg init: ${result.written.length} file(s) written` +
        (result.replaced.length ? `, ${result.replaced.length} replaced` : "") +
        (result.skipped.length ? `, ${result.skipped.length} already present` : "") +
        `, ${changed.length} generated` +
        `\n  profiles: ${result.profiles.join(", ")} · cg ${result.cgVersion} · docs: ${result.docs}/\n`,
    );

    if (result.profiles.includes("zcode")) {
      process.stdout.write(
        "  ZCode: import the project skills in Settings → Skills → Import → Codex CLI.\n",
      );
    }

    for (const message of advisories) process.stdout.write(`  ${message}\n`);

    const rivals = detectRivalDocTrees(repoRoot, result.docs);
    if (rivals.length) {
      process.stdout.write(
        `\n  note: this repository already documents under ${rivals.map((n) => `\`${n}/\``).join(", ")}.\n` +
          `        Contract Graph keeps plans, decisions, and guides inside one root, so it\n` +
          `        created \`${result.docs}/\` beside them — you now have two documentation trees.\n` +
          `        Re-run with \`--docs <dir>\` to choose another root, or migrate the existing\n` +
          `        trees into \`${result.docs}/\`. \`cg-warmup\` will raise this as a decision if you\n` +
          `        leave it.\n`,
      );
    }

    if (failures.length) {
      process.stderr.write(`cg init: FAIL — ${failures.length} problem(s) after scaffolding\n`);
      for (const message of failures) process.stderr.write(`  ${message}\n`);
      return 1;
    }

    process.stdout.write(
      `  verified: ${counts.folders} contract(s), ${counts.roots} root entry file(s), ` +
        `${counts.skills} skill(s), ${counts.engineering} engineering guideline(s)\n`,
    );
    if (result.brownfield) {
      const unmapped = counts.modules?.unmapped ?? 0;
      process.stdout.write(
        `\n  next: run the \`cg-warmup\` skill once` +
          (unmapped ? ` — ${unmapped} module root(s) are not governed yet` : "") +
          "\n        until then `cg verify: OK` means the scaffold is well-formed,\n" +
          "        not that this repository is governed.\n",
      );
    } else {
      process.stdout.write(
        "\n  next: fill in purpose and responsibilities in .agents/cg/contract.yaml, then start with `cg-plan`.\n",
      );
    }
    return 0;
  }

  if (command === "next") {
    const result = next(repoRoot);
    if (flags.json) {
      process.stdout.write(`${JSON.stringify(
        {
          state: result.state,
          stage: result.stage,
          reason: result.reason ?? null,
          step: result.step ? { file: result.step.file, title: result.step.title } : null,
          problems: result.problems,
          ...(flags.for ? { for: flags.for, ...permits(result, flags.for) } : {}),
        },
        null,
        2,
      )}\n`);
    } else {
      process.stdout.write(`cg next: ${result.state} — ${result.stage ?? "nothing dispatchable"}\n`);
      if (result.reason) process.stdout.write(`  ${result.reason}\n`);
      for (const problem of result.problems) process.stderr.write(`  ${problem}\n`);
    }

    if (flags.for) {
      const verdict = permits(result, flags.for);
      if (!flags.json) {
        process.stdout.write(`  ${verdict.allowed ? "allow" : "deny"} ${flags.for}: ${verdict.reason}\n`);
      }
      return verdict.allowed ? 0 : 1;
    }
    return result.state === "unreadable" ? 1 : 0;
  }

  if (command === "residue") {
    const result = residue(repoRoot);
    if (flags.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (!result.residue.length) {
      process.stdout.write(
        `cg residue: none — ${result.claimed} document(s) under ${result.docs}/plans/ are all reachable\n`,
      );
    } else {
      process.stdout.write(`cg residue: ${result.residue.length} unclaimed under ${result.docs}/plans/\n`);
      for (const item of result.residue) process.stdout.write(`  ${item.path}\n    ${item.why}\n`);
      process.stdout.write(
        `  roots: ${result.roots.join(", ") || "none"}\n` +
          "  Each of these is consumed work, superseded, or was never claimed. Archive what a reader\n" +
          "  may audit, delete the rest — `archive/` is not a place to move things to avoid deciding.\n",
      );
    }
    return result.residue.length ? 1 : 0;
  }

  if (command === "sync") {
    const { changed, counts } = sync(repoRoot, { dryRun: Boolean(flags.check) });
    const verb = flags.check ? "would rewrite" : "rewrote";
    if (!changed.length) {
      process.stdout.write(
        `cg sync: up to date — ${counts.folders} contract(s), ${counts.roots} root entry file(s), ` +
          `${counts.wrappers} wrapper(s)\n`,
      );
      return 0;
    }
    process.stdout.write(`cg sync: ${verb} ${changed.length} file(s)\n`);
    for (const file of changed) process.stdout.write(`  ${path.relative(repoRoot, file)}\n`);
    return flags.check ? 1 : 0;
  }

  if (command === "verify") {
    const { failures, advisories, counts } = verify(repoRoot);
    for (const message of advisories) process.stderr.write(`  ${message}\n`);
    if (!failures.length) {
      process.stdout.write(
        `cg verify: OK — ${counts.folders} boundary contract(s), ${counts.roots} root entry file(s), ` +
          `${counts.skills} skill(s), and ${counts.engineering} engineering guideline(s) verified\n`,
      );
      return 0;
    }
    const label = flags.warn ? "WARN" : "FAIL";
    process.stderr.write(`cg verify: ${label} — ${failures.length} problem(s)\n`);
    for (const message of failures) process.stderr.write(`  ${message}\n`);
    return flags.warn ? 0 : 1;
  }

  process.stderr.write(`cg: unknown command \`${command}\`\n\n${USAGE}`);
  return 2;
}

try {
  process.exit(await main(process.argv.slice(2)));
} catch (error) {
  process.stderr.write(`cg: ${error.message}\n`);
  process.exit(1);
}
