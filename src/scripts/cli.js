#!/usr/bin/env node
/** Contract Graph command line. `cg init | sync | verify | packs | profiles`. */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

import { DEFAULT_DOCS_ROOT } from "./model.js";
import { init, availableDomainPacks } from "./init.js";
import { availableProfiles, loadProfileSelection } from "./profiles.js";
import { sync } from "./sync.js";
import { verify } from "./verify.js";

const USAGE = `cg — Contract Graph

Usage:
  cg init [dir] [--packs a,b] [--profile a,b] [--docs dir]    scaffold governance
  cg sync [dir] [--check]                         regenerate derived artifacts
  cg verify [dir] [--warn]                        verify governance
  cg packs                                        list domain-principle packs
  cg profiles                                     list editor profiles

Options:
  --packs <list>    comma-separated domain packs to install (init only)
  --profile <list>  comma-separated editor profiles to install (init only; default: all)
  --docs <dir>      directory to hold plans/, design/, and guides/ (init only; default: docs)
  --check           report what sync would rewrite; change nothing
  --warn            report findings and exit 0 (verify only)
  -h, --help        show this message
`;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  // Keep parsing deliberately small: commands share boolean flags, while the init selection
  // options consume values (in either `--name x` or `--name=x` form).
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--packs") {
      flags.packs = argv[++i] ?? "";
    } else if (arg.startsWith("--packs=")) {
      flags.packs = arg.slice("--packs=".length);
    } else if (arg === "--profile") {
      flags.profile = argv[++i] ?? "";
    } else if (arg.startsWith("--profile=")) {
      flags.profile = arg.slice("--profile=".length);
    } else if (arg === "--docs") {
      flags.docs = argv[++i] ?? "";
    } else if (arg.startsWith("--docs=")) {
      flags.docs = arg.slice("--docs=".length);
    } else if (arg.startsWith("--")) {
      flags[arg.slice(2)] = true;
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
  // All repository commands accept an optional directory as their first positional argument.
  const repoRoot = path.resolve(positional[0] ?? ".");

  if (command === "packs") {
    const packs = availableDomainPacks();
    process.stdout.write(packs.length ? `${packs.join("\n")}\n` : "no domain packs bundled\n");
    return 0;
  }

  if (command === "profiles") {
    const profiles = availableProfiles();
    process.stdout.write(profiles.length ? `${profiles.join("\n")}\n` : "no editor profiles bundled\n");
    return 0;
  }

  if (command === "init") {
    const packs = (flags.packs ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const profiles = flags.profile
      ? flags.profile.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const docs = await chooseDocsRoot(repoRoot, flags);
    const result = init(repoRoot, { packs, profiles, docs });
    const { written, skipped } = result;
    process.stdout.write(
      `cg init: ${written.length} file(s) written` +
        (skipped.length ? `, ${skipped.length} left untouched (already present)` : "") +
        `${result.packs.length ? `, packs: ${result.packs.join(", ")}` : ", no domain packs selected"}` +
        `, profiles: ${result.profiles.join(", ")}` +
        `, docs: ${result.docs}/\n`,
    );
    if (!result.packs.length) {
      process.stdout.write("  add one later with `cg packs`, then re-run `cg init --packs <pack>`\n");
    }
    process.stdout.write("  next: fill in Project Identity in .agents/cg/contract.md, then `cg sync`\n");
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
          `${counts.skills} skill(s), and ${counts.design} domain principle(s) verified\n`,
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
