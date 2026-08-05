/**
 * Resident developer helper — scaffold a throwaway repository into `tmp/<target>` so you can
 * open it in the real editor and see whether discovery actually works.
 *
 * `cg verify` proves a scaffold is well-formed. It cannot prove an editor *finds* it, because
 * that depends on the editor. This closes that gap by hand: scaffold, open, look.
 *
 * Never shipped as a command — `bin/cg.js` does not route here. Run it through `npm run try`
 * (works everywhere) or `./cg try <target>` (POSIX shells).
 *
 * Destructive by design: it deletes and recreates its target directory. Every path is asserted
 * to sit inside `<repo>/tmp/` before anything is removed — see `resolveTarget`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { init } from "./init.js";
import { sync } from "./sync.js";
import { verify } from "./verify.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, "..", "..");
const TMP = path.join(REPO, "tmp");

/**
 * Editors this helper knows how to talk about, and the artifact each one actually reads.
 *
 * Each target selects its real scaffolding profile. `open` is what you check by hand once the
 * generated repository is open in that editor.
 */
const TARGETS = {
  claude: {
    label: "Claude Code",
    reads: [".claude/skills/cg-*/SKILL.md", "CLAUDE.md", ".agents/"],
    open: "claude, then run /cg-plan — the six cg-* skills should be offered",
  },
  antigravity: {
    label: "Antigravity IDE",
    reads: [".agents/rules/cg.md"],
    open: "Antigravity — the workspace rule from .agents/rules/ should be listed",
  },
  codex: {
    label: "Codex",
    reads: ["AGENTS.md", ".agents/"],
    open: "codex — AGENTS.md should be picked up as project context",
  },
  copilot: {
    label: "GitHub Copilot",
    reads: [".github/copilot-instructions.md"],
    open: "VS Code — Copilot should cite the repository instructions",
  },
};

const USAGE = `cg dev helper — scaffold a throwaway repo you can open in a real editor

Usage:
  npm run try -- <target>                scaffold tmp/<target> and verify it
  ./cg try <target>                      same, POSIX shells

Targets:
${Object.entries(TARGETS)
  .map(([name, t]) => `  ${name.padEnd(13)} ${t.label} — reads ${t.reads.join(", ")}`)
  .join("\n")}

  all           every artifact (the default scaffold)

Notes:
  tmp/ is gitignored and safe to delete at any time.
  Each target receives only its selected editor-discovery artifacts.
`;

/**
 * Resolve `tmp/<name>` and refuse anything that escapes it.
 *
 * This function deletes directories, so a traversal in `name` (`../..`) would delete the repo.
 * The containment assertion is the only thing standing between a typo and real damage; do not
 * simplify it away.
 */
function resolveTarget(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`invalid target name \`${name}\` — lowercase letters, digits, hyphens only`);
  }
  const target = path.resolve(TMP, name);
  const within = path.relative(TMP, target);
  if (within !== name || within.startsWith("..") || path.isAbsolute(within)) {
    throw new Error(`refusing to touch ${target} — outside ${TMP}`);
  }
  return target;
}

/**
 * Does an artifact pattern match anything in the scaffold?
 *
 * Patterns may contain a `*` segment (`.claude/skills/cg-*​/SKILL.md`). Truncating at the `*`
 * leaves a partial segment that never exists, so walk to the last complete directory instead
 * and check that it is non-empty.
 */
function present(target, artifact) {
  const star = artifact.indexOf("*");
  if (star < 0) return fs.existsSync(path.join(target, artifact));

  const dir = path.join(target, artifact.slice(0, artifact.lastIndexOf("/", star) + 1));
  if (!fs.existsSync(dir)) return false;
  const leaf = artifact.slice(artifact.lastIndexOf("/", star) + 1).split("/")[0];
  const matcher = new RegExp(`^${leaf.split("*").map(escapeRe).join(".*")}$`);
  return fs.readdirSync(dir).some((entry) => matcher.test(entry));
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function main(argv) {
  const args = argv.filter((a) => a !== "try");
  if (!args.length || args[0] === "-h" || args[0] === "--help") {
    process.stdout.write(USAGE);
    return 0;
  }

  const name = args[0];
  if (name !== "all" && !(name in TARGETS)) {
    process.stderr.write(
      `unknown target \`${name}\`. Known: ${["all", ...Object.keys(TARGETS)].join(", ")}\n`,
    );
    return 2;
  }


  const target = resolveTarget(name);
  const existed = fs.existsSync(target);
  if (existed) fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });

  init(target, { profiles: [name] });
  sync(target);
  const { failures, advisories, counts } = verify(target);

  const rel = path.relative(process.cwd(), target) || ".";
  process.stdout.write(`${existed ? "replaced" : "created"} ${rel}\n`);
  process.stdout.write(
    `  scaffolded: ${counts.folders} contract(s), ${counts.roots} root file(s), ` +
      `${counts.skills} skill(s), ${counts.design} design rule(s)\n`,
  );

  for (const message of advisories) process.stderr.write(`  ${message}\n`);
  if (failures.length) {
    process.stderr.write(`\ncg verify: FAIL — ${failures.length} problem(s)\n`);
    for (const message of failures) process.stderr.write(`  ${message}\n`);
    return 1;
  }
  process.stdout.write("  cg verify: OK\n");

  const spec = TARGETS[name];
  if (spec) {
    process.stdout.write(`\n${spec.label} reads:\n`);
    for (const artifact of spec.reads) {
      process.stdout.write(`  ${present(target, artifact) ? "✓" : "✗"} ${artifact}\n`);
    }
    process.stdout.write(`\nNow open ${rel} in ${spec.open}\n`);
  }
  return 0;
}

process.exit(main(process.argv.slice(2)));
