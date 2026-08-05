#!/usr/bin/env node
/** Contract Graph command line. `cg init | sync | verify | modules | harvest | profiles`. */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

import { DEFAULT_DOCS_ROOT } from "./model.js";
import { init } from "./init.js";
import { HarvestError, checkHarvest } from "./harvest.js";
import { moduleCoverage } from "./modules.js";
import { inheritancePath, loadInheritance } from "./model.js";
import { availableProfiles, loadProfileSelection } from "./profiles.js";
import { sync } from "./sync.js";
import { verify } from "./verify.js";

const USAGE = `cg — Contract Graph

Usage:
  cg init [dir] [--profile a,b] [--docs dir]       scaffold governance
  cg sync [dir] [--check]                         regenerate derived artifacts
  cg verify [dir] [--warn]                        verify governance
  cg modules [dir]                                list detected module roots and their coverage
  cg harvest <manifest> [--stage close]           check a decision-harvest manifest
  cg profiles                                     list editor profiles

Options:
  --profile <list>  comma-separated editor profiles to install (init only; default: all)
  --docs <dir>      directory to hold plans/, design/, and guides/ (init only; default: docs)
  --stage <name>    harvest stage: classify (default) or close
  --decision-log <path>  decision log to check cohort eligibility against (harvest only)
  --preparation <path>   prepared drain route to validate at --stage close (harvest only)
  --check           report what sync would rewrite; change nothing
  --warn            report findings and exit 0 (verify only)
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
  "warn",
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
    } else if (arg === "--docs") {
      flags.docs = argv[++i] ?? "";
    } else if (arg.startsWith("--docs=")) {
      flags.docs = arg.slice("--docs=".length);
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

/**
 * Decide where `plans/`, `design/`, and `guides/` go.
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
      `  Contract Graph adds ${DEFAULT_DOCS_ROOT}/plans/, ${DEFAULT_DOCS_ROOT}/design/, and ` +
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

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "-h" || command === "--help" || command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }

  const { positional, flags } = parseArgs(rest);
  if (flags.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  // All repository commands accept an optional directory as their first positional argument.
  const repoRoot = path.resolve(positional[0] ?? ".");

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
    let folders = {};
    try {
      folders = loadInheritance(inheritancePath(repoRoot));
    } catch {
      // No map yet is the normal state before warmup; report detection anyway.
    }
    const { detected, unmapped } = moduleCoverage(repoRoot, folders);
    if (!detected.length) {
      process.stdout.write("no module roots detected — no build manifest found\n");
      return 0;
    }
    const gap = new Set(unmapped.map((m) => m.path));
    for (const module of detected) {
      const state = gap.has(module.path) ? "UNMAPPED" : "governed";
      process.stdout.write(`${state.padEnd(9)} ${module.path}  (${module.manifest})\n`);
    }
    process.stdout.write(
      `\n${detected.length} detected, ${unmapped.length} unmapped\n` +
        (unmapped.length
          ? "run the `cg-warmup` skill once to write their contracts and map them\n"
          : ""),
    );
    return unmapped.length ? 1 : 0;
  }

  if (command === "profiles") {
    const profiles = availableProfiles();
    process.stdout.write(profiles.length ? `${profiles.join("\n")}\n` : "no editor profiles bundled\n");
    return 0;
  }

  if (command === "init") {
    const profiles = flags.profile
      ? flags.profile.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const docs = await chooseDocsRoot(repoRoot, flags);

    // One command, whatever the repository. Copying without generating leaves a scaffold
    // that fails its own verifier — no root pointers, no wrappers, a stale inherited block —
    // and every later `init` (a changed profile, a restored file) has the same gap. Sync is
    // not a second concern; it produces half the scaffold.
    const result = init(repoRoot, { profiles, docs });
    const { changed } = sync(repoRoot);
    const { failures, advisories, counts } = verify(repoRoot);

    process.stdout.write(
      `cg init: ${result.written.length} file(s) written` +
        (result.skipped.length ? `, ${result.skipped.length} already present` : "") +
        `, ${changed.length} generated` +
        `\n  profiles: ${result.profiles.join(", ")} · docs: ${result.docs}/\n`,
    );

    for (const message of advisories) process.stdout.write(`  ${message}\n`);
    if (failures.length) {
      process.stderr.write(`cg init: FAIL — ${failures.length} problem(s) after scaffolding\n`);
      for (const message of failures) process.stderr.write(`  ${message}\n`);
      return 1;
    }

    process.stdout.write(
      `  verified: ${counts.folders} contract(s), ${counts.roots} root entry file(s), ` +
        `${counts.skills} skill(s), ${counts.design} fork-loaded principle(s)\n`,
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
        "\n  next: fill in Project Identity in .agents/cg/contract.md, then start with `cg-plan`.\n",
      );
    }
    return 0;
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
        `cg verify: OK — ${counts.folders} folder contract(s), ${counts.roots} root entry file(s), ` +
          `${counts.skills} skill(s), and ${counts.design} fork-loaded principle(s) verified\n`,
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
