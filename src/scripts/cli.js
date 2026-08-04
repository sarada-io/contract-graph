#!/usr/bin/env node
/** Contract Graph command line. `cg init | sync | verify | packs`. */

import path from "node:path";
import process from "node:process";

import { init, availableDesignPacks } from "./init.js";
import { sync } from "./sync.js";
import { verify } from "./verify.js";

const USAGE = `cg — Contract Graph

Usage:
  cg init [dir] [--design a,b]   scaffold governance into a repository
  cg sync [dir] [--check]        regenerate derived blocks, indexes, and wrappers
  cg verify [dir] [--warn]       verify contracts, skills, and design principles
  cg packs                       list available design-principle packs

Options:
  --design <list>   comma-separated design packs to install (init only)
  --check           report what sync would rewrite; change nothing
  --warn            report findings and exit 0 (verify only)
  -h, --help        show this message
`;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  // Keep parsing deliberately small: commands share boolean flags, while --design is the
  // only option that consumes a value (in either `--design x` or `--design=x` form).
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--design") {
      flags.design = argv[++i] ?? "";
    } else if (arg.startsWith("--design=")) {
      flags.design = arg.slice("--design=".length);
    } else if (arg.startsWith("--")) {
      flags[arg.slice(2)] = true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "-h" || command === "--help" || command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }

  const { positional, flags } = parseArgs(rest);
  // All repository commands accept an optional directory as their first positional argument.
  const repoRoot = path.resolve(positional[0] ?? ".");

  if (command === "packs") {
    const packs = availableDesignPacks();
    process.stdout.write(packs.length ? `${packs.join("\n")}\n` : "no design packs bundled\n");
    return 0;
  }

  if (command === "init") {
    const packs = (flags.design ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { written, skipped } = init(repoRoot, { packs });
    process.stdout.write(
      `cg init: ${written.length} file(s) written` +
        (skipped.length ? `, ${skipped.length} left untouched (already present)` : "") +
        `${packs.length ? `, design packs: ${packs.join(", ")}` : ", no design packs selected"}\n`,
    );
    if (!packs.length) {
      process.stdout.write("  add one later with `cg packs`, then re-run `cg init --design <pack>`\n");
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
          `${counts.skills} skill(s), and ${counts.design} design principle(s) verified\n`,
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
  process.exit(main(process.argv.slice(2)));
} catch (error) {
  process.stderr.write(`cg: ${error.message}\n`);
  process.exit(1);
}
