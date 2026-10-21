/**
 * @file Render shared agent instructions, editor discovery pointers and skill wrappers.
 * @see .agent/contract.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BINDING_FILENAME, loadCoreBindingRules } from "../verification/binding.js";
import {
  ContractError,
  FAMILY_BLURB,
  RULE_FAMILIES,
  familyOf,
  loadPrincipleIndex,
  splitLines,
} from "../verification/policy.js";

const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);
const readIfPresent = (file) => (exists(file) ? read(file) : "");

export const ROOT_BEGIN_MARKER = "<!-- BEGIN PRINCIPLES INDEX";
export const ROOT_END_MARKER = "<!-- END PRINCIPLES INDEX -->";
export const ROOT_BEGIN_LINE =
  "<!-- BEGIN PRINCIPLES INDEX — generated from architecture and product rules · do not edit -->";

/** Root entry file -> prefix that reaches `.agents/cg/` from that file's directory. */
export const ROOT_POINTERS = {
  "AGENTS.md": "",
  "CLAUDE.md": "",
  ".github/copilot-instructions.md": "../",
};

/** Canonical Contract Graph instructions shared by every editor-specific root pointer. */
export const CG_AGENT_ENTRY = ".agents/cg/contract-graph-agent.md";
export const LEGACY_CG_AGENT_ENTRY = ".agents/cg/AGENTS.md";

const RUNTIME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PACKAGED_CG_AGENT_TEMPLATE = path.join(
  RUNTIME_ROOT,
  "agent",
  "cg",
  "contract-graph-agent.md",
);
const CG_AGENT_TEMPLATE = fs.existsSync(PACKAGED_CG_AGENT_TEMPLATE)
  ? PACKAGED_CG_AGENT_TEMPLATE
  : path.join(RUNTIME_ROOT, "cg", "contract-graph-agent.md");

export const skillsRoot = (repoRoot) => path.join(repoRoot, ".agents", "skills");

/** Render the principle index for a root entry file, without trailing newline. */
export function renderRootIndex(repoRoot, prefix, { local = false } = {}) {
  const principles = loadPrincipleIndex(repoRoot);
  const core = loadCoreBindingRules(repoRoot);
  const total = core.size + principles.reduce((sum, e) => sum + e.count, 0);
  const target = `${prefix}.agents/cg/guidelines/`;
  const bindingTarget = `${prefix}${BINDING_FILENAME}`;
  const targetHref = local ? "guidelines/" : target;
  const bindingHref = local ? "principles/architecture.yaml" : bindingTarget;

  const lines = [
    ROOT_BEGIN_LINE,
    "## Binding rules — index",
    "",
    `**You MUST read [\`${bindingTarget}\`](${bindingHref}) before planning any change.** It is binding: where ` +
      "your code and the architecture catalog disagree, **the catalog wins and the code is wrong.** Its `graph` " +
      "section is the recursive mapping: kinds, self-sufficiency, stay, add-child, or elsewhere; " +
      "the delivery workflow does not replace that decision. The index " +
      `below lists the binding context (${total} rules) — the index is not the rule; cite rules by ID ` +
      "(`A01`), never by position.",
  ];
  lines.push("", `**${FAMILY_BLURB.A}**`, "");
  lines.push(`- [**A** Structural integrity](${bindingHref}) — ${core.size} rules`);
  for (const family of RULE_FAMILIES) {
    const rows = principles.filter((e) => familyOf(e.id) === family);
    if (!rows.length) continue;
    lines.push("", `**${FAMILY_BLURB[family]}**`, "");
    for (const { id, title, count, filename } of rows) {
      const file = `${targetHref}${filename}`;
      lines.push(
        `- [**${id}** ${title}](${file}) — ${count} rule${count === 1 ? "" : "s"}`,
      );
    }
  }
  lines.push(ROOT_END_MARKER);
  return lines.join("\n");
}

/** Return {path, current, desired} for the canonical shared instructions. */
export function generateCgAgent(repoRoot) {
  const file = path.join(repoRoot, CG_AGENT_ENTRY);
  const current = readIfPresent(file);
  const legacyFile = path.join(repoRoot, LEGACY_CG_AGENT_ENTRY);
  const legacyPath = !current && exists(legacyFile) ? legacyFile : null;
  const template = read(CG_AGENT_TEMPLATE);
  const source = reconcileLegacyEntry(legacyPath ? read(legacyFile) : current || template, { shared: true });
  const bootstrapBegin = "<!-- BEGIN CG BOOTSTRAP";
  const bootstrapEnd = "<!-- END CG BOOTSTRAP -->";
  const start = template.indexOf(bootstrapBegin);
  const finish = template.indexOf(bootstrapEnd, start);
  if (start < 0 || finish < start) throw new ContractError(`${CG_AGENT_TEMPLATE}: missing bootstrap block`);
  const bootstrap = template.slice(start, finish + bootstrapEnd.length);
  const unmarked = bootstrap.slice(bootstrap.indexOf("\n") + 1, bootstrap.lastIndexOf("\n"));
  const refreshBootstrap = text => {
    // Early 1.1 entries contain this exact release text without ownership markers.
    // Adopt only byte-identical text; preserve other prose outside the managed block.
    if (!text.includes(bootstrapBegin) && text.includes(unmarked)) text = text.replace(unmarked, bootstrap);
    return applyBlock(text, bootstrap, file, bootstrapBegin, bootstrapEnd);
  };

  if (source.includes(ROOT_BEGIN_MARKER)) {
    return {
      path: file,
      current,
      legacyPath,
      desired: refreshBootstrap(applyBlock(
        source,
        renderRootIndex(repoRoot, "", { local: true }),
        file,
        ROOT_BEGIN_MARKER,
        ROOT_END_MARKER,
      )),
    };
  }

  if (source.trim()) {
    if (!splitLines(source).some((line) => line.startsWith("# "))) {
      throw new ContractError(
        `${CG_AGENT_ENTRY}: existing file has no H1 to anchor the generated principle index. ` +
          "Add a top-level heading, or move this file aside and re-run `cg sync`.",
      );
    }
    return {
      path: file,
      current,
      legacyPath,
      desired: refreshBootstrap(applyBlock(
        source,
        renderRootIndex(repoRoot, "", { local: true }),
        file,
        ROOT_BEGIN_MARKER,
        ROOT_END_MARKER,
      )),
    };
  }
  throw new ContractError(
    `${CG_AGENT_TEMPLATE}: canonical agent template is empty`,
  );
}

// Frozen legacy root wording; only these complete sections may be retired automatically.
function legacyRootReadingOrder(prefix) {
  const contract = `${prefix}.agents/cg/contract.yaml`;
  return [
    "## Required reading order",
    "",
    `1. [\`${prefix}.agents/cg/contract.yaml\`](${contract}) — repository contract and graph root.`,
    `2. [\`${prefix}${BINDING_FILENAME}\`](${prefix}${BINDING_FILENAME}) — architecture principles: \`hierarchy.kinds\` and \`graph\` (recurse, selfSufficient, stay / add-child / elsewhere), then A detectors.`,
    `3. [\`${prefix}.agents/cg/guidelines/\`](${prefix}.agents/cg/guidelines/) — non-binding engineering guidelines and repository-owned product guidelines.`,
    `4. [\`${prefix}.agents/cg/workflow.md\`](${prefix}.agents/cg/workflow.md) — the repository-owned ` +
      "agent workflow.",
    "5. Run `cg contract route --task \"<request>\"` — resolve the first task-to-contract edge " +
      "from routes owned by contracts.",
    "6. `<module>/.agents/cg/contract.yaml`, then its relevant child contracts — traverse until " +
      "the responsible boundary is clear; only then read implementation. Use `cg contract context` " +
      "to resolve the rules that bind the selected boundary.",
    "",
    "Do not put instructions in this file — the index above is generated, and everything " +
      "else belongs under `.agents/cg/`. Regenerate with `cg sync`.",
    "",
  ].join("\n").trimEnd();
}

/** Render a complete root entry file: static preamble plus the generated index. */
export function renderRootPointer(repoRoot, prefix, projectName) {
  const contract = `${prefix}.agents/cg/contract.yaml`;
  return [
    `# ${projectName} — agent entry point`,
    "",
    `**Start here: [\`${contract}\`](${contract})** — the root of the project's context graph. ` +
      "It explains the system, sets the reading order, and routes work into module and sub-module " +
      "contracts before implementation code is read.",
    "",
    "`.agents/cg/` is a dot-directory. If your tool's indexer skips hidden paths, open " +
      "these files by exact path rather than relying on search.",
    "",
    renderRootIndex(repoRoot, prefix),
    "",
    legacyRootReadingOrder(prefix),
    "",
  ].join("\n");
}

/** The one-line discovery pointer each supported root file carries before repository guidance. */
export function renderRootReference(relPath, prefix, entry = CG_AGENT_ENTRY) {
  if (relPath === "CLAUDE.md") return `@${prefix}${entry}`;
  return `Read [\`${prefix}${entry}\`](${prefix}${entry}) before planning or changing code.`;
}

// Independent historical shared-entry wording, including its original line wrapping.
const LEGACY_SHARED_READING = `## Required reading order

1. [\`.agents/cg/contract.yaml\`](contract.yaml) — repository contract and graph root.
2. [\`.agents/cg/principles/architecture.yaml\`](principles/architecture.yaml) — architecture
   principles: \`hierarchy.kinds\` and \`graph\` (recurse, selfSufficient, stay / add-child / elsewhere),
   then A detectors.
3. [\`.agents/cg/guidelines/\`](guidelines/) — non-binding engineering guidelines and
   repository-owned product guidelines.
4. [\`.agents/cg/workflow.md\`](workflow.md) — the repository-owned agent workflow.
5. Run \`cg contract route --task "<request>"\` — resolve the first task-to-contract edge from routes
   owned by contracts.
6. \`<module>/.agents/cg/contract.yaml\`, then its relevant child contracts — traverse until the
   responsible boundary is clear; only then read implementation. Use \`cg contract context\` to
   resolve the rules that bind the selected boundary.

The principle index in this file is generated. Keep repository-specific instructions in the root
entry files or other repository-owned context. Regenerate with \`cg sync\`.`;

/** Retire known framework text only; additions or changed wording make the section local policy. */
function reconcileLegacyEntry(text, { shared = false, prefix = "" } = {}) {
  const legacy = shared ? LEGACY_SHARED_READING : legacyRootReadingOrder(prefix);
  const replacement = shared
    ? "## Task reading\n\nFollow [Lifecycle bootstrap](#lifecycle-bootstrap) for recovery selection and the reading order for the selected action."
    : "## Task entry\n\nFollow the shared entry above for recovery selection and task context before implementation.";
  for (const match of [...text.matchAll(/^## Required reading order\r?$/gm)].reverse()) {
    const start = match.index;
    const next = /\n#{1,2} /.exec(text.slice(start));
    const end = next ? start + next.index + 1 : text.length;
    const section = text.slice(start, end);
    if (section.replaceAll("\r\n", "\n").trimEnd() !== legacy) continue;
    const newline = section.includes("\r\n") ? "\r\n" : "\n";
    text = text.slice(0, start) + replacement.replaceAll("\n", newline) +
      section.slice(section.trimEnd().length) + text.slice(end);
  }

  const contract = shared ? ".agents/cg/contract.yaml" : `${prefix}.agents/cg/contract.yaml`;
  const target = shared ? "contract.yaml" : contract;
  const lead = `**Start here: [\`${contract}\`](${target})** — the root of the project's context`;
  const intro = shared
    ? `${lead}\ngraph. It explains the system, sets the reading order, and routes work into module and sub-module\ncontracts before implementation code is read.`
    : `${lead} graph. It explains the system, sets the reading order, and routes work into module and sub-module contracts before implementation code is read.`;
  // Require an entire paragraph, preserving custom text attached to the old lead-in.
  for (const old of [intro, intro.replaceAll("\n", "\r\n")]) {
    const start = text.indexOf(old), end = start + old.length;
    const before = text.slice(0, start), after = text.slice(end);
    if (start < 0 || (start && !/\r?\n\r?\n$/.test(before)) ||
      (after && !/^\r?\n\r?\n/.test(after))) continue;
    text = before + (shared ? old.replace("**Start here:", "**For selected work, start here:") : "") + after;
    break;
  }
  return text;
}

/** Remove a legacy generated index while retaining repository-authored text around it. */
function removeRootIndex(text, file) {
  const lines = splitLines(text);
  const begin = lines.findIndex((line) => line.startsWith(ROOT_BEGIN_MARKER));
  const end = lines.findIndex((line) => line.trim() === ROOT_END_MARKER);
  if (begin < 0 && end < 0) return text;
  if (begin < 0 || end < 0 || end < begin) {
    throw new ContractError(`${file}: unbalanced or reversed PRINCIPLES INDEX markers`);
  }
  return [...lines.slice(0, begin), ...lines.slice(end + 1)].join("\n").replace(/^\n+|\n+$/g, "");
}

/**
 * Return {path, current, desired} for one root discovery file.
 *
 * Existing content belongs to the repository. Contract Graph owns only the first line, which
 * points at its canonical instructions. A legacy generated index is removed during migration;
 * exact legacy framework reading sections are reconciled separately. Custom wording survives,
 * including files with no H1.
 */
export function generateRoot(repoRoot, relPath, prefix, projectName) {
  const file = path.join(repoRoot, relPath);
  const current = readIfPresent(file);
  const reference = renderRootReference(relPath, prefix);
  const legacyReference = renderRootReference(relPath, prefix, LEGACY_CG_AGENT_ENTRY);
  let remainder = current;

  // A pristine legacy entry file contains no repository content to retain.
  if (current === renderRootPointer(repoRoot, prefix, projectName)) remainder = "";
  else if (current.includes(ROOT_BEGIN_MARKER) || current.includes(ROOT_END_MARKER)) {
    remainder = removeRootIndex(current, file);
  }

  const lines = splitLines(remainder).filter(
    (line) => line.trim() !== reference && line.trim() !== legacyReference,
  );
  const body = reconcileLegacyEntry(lines.join("\n"), { prefix }).replace(/^\n+|\n+$/g, "");
  const desired = `${reference}${body ? `\n\n${body}` : ""}\n`;
  return { path: file, current, desired };
}

/**
 * Workspace-root pointer filenames a module may carry. Copilot's
 * `.github/copilot-instructions.md` is repository-root only — opening a module folder as a
 * workspace is an AGENTS.md / CLAUDE.md concern.
 */
export const MODULE_POINTERS = Object.freeze(["AGENTS.md", "CLAUDE.md"]);

/** The subset of `MODULE_POINTERS` the selected profiles actually install. */
export function selectedModulePointers(rootPointers) {
  return MODULE_POINTERS.filter((name) => Object.hasOwn(rootPointers, name));
}

/** True when the file is a Contract Graph module pointer, not the repository's own notes. */
export function isGeneratedModulePointer(text) {
  return (
    text.includes("This folder is openable as a workspace root on its own.") &&
    text.includes(".agents/cg/contract.yaml") &&
    text.includes("Do not put instructions in this file.")
  );
}

/** Prefix from `<unit>/AGENTS.md` to the repository `.agents/cg/` tree. */
export function modulePointerPrefix(unit) {
  const depth = String(unit).split("/").filter(Boolean).length;
  return "../".repeat(Math.max(depth, 1));
}

/** Render every module pointer from the single starter template. */
export function renderModulePointer(unit, name = unit) {
  const template = path.join(RUNTIME_ROOT, fs.existsSync(PACKAGED_CG_AGENT_TEMPLATE) ? "agent/templates/module/AGENTS.md" : "install/templates/module/AGENTS.md");
  return read(template)
    .replace(/^# src — agent entry point/, () => `# ${name} — agent entry point`)
    .replaceAll("../.agents/cg/", modulePointerPrefix(unit) + ".agents/cg/");
}

/** Return {path, current, desired} for one module pointer file. */
export function generateModulePointer(repoRoot, contract, relPath) {
  const file = path.join(repoRoot, contract.unit, relPath);
  return {
    path: file,
    current: readIfPresent(file),
    desired: renderModulePointer(contract.unit, contract.name || contract.id),
  };
}

/** Return the exact name/description frontmatter used by generated wrappers. */
export function parseSkillMetadata(file) {
  const text = read(file).replaceAll("\r\n", "\n");
  if (!text.startsWith("---\n")) throw new ContractError(`${file}: missing YAML frontmatter`);
  const closing = text.indexOf("\n---\n", 4);
  if (closing < 0) throw new ContractError(`${file}: frontmatter has no closing \`---\``);

  const metadata = {};
  for (const line of splitLines(text.slice(4, closing))) {
    const match = /^(name|description):[ \t]+(.+)$/.exec(line);
    if (!match) {
      throw new ContractError(
        `${file}: canonical skill frontmatter must contain name/description only`,
      );
    }
    const [, key, value] = match;
    if (key in metadata) {
      throw new ContractError(`${file}: duplicate canonical skill frontmatter field \`${key}\``);
    }
    if (/^[[{|>&*!]/.test(value) || value.includes(": ") || value.includes(" #")) {
      throw new ContractError(`${file}: \`${key}\` must be a non-empty one-line plain scalar`);
    }
    metadata[key] = value;
  }

  const missing = ["name", "description"].filter((k) => !(k in metadata));
  if (missing.length) {
    throw new ContractError(
      `${file}: missing canonical skill frontmatter field(s): ${missing.join(", ")}`,
    );
  }
  const folder = path.basename(path.dirname(file));
  if (metadata.name !== folder) {
    throw new ContractError(
      `${file}: frontmatter name \`${metadata.name}\` does not match folder \`${folder}\``,
    );
  }
  return metadata;
}

/** Render one small Claude discovery wrapper around a canonical shared skill. */
export function renderClaudeSkillWrapper(canonicalSkill, wrapperPath) {
  const metadata = parseSkillMetadata(canonicalSkill);
  const target = path
    .relative(path.dirname(wrapperPath), canonicalSkill)
    .split(path.sep)
    .join("/");
  return [
    "---",
    `name: ${metadata.name}`,
    `description: ${metadata.description}`,
    "---",
    "",
    "# Contract Graph Skill Discovery",
    "",
    `Read and follow [\`${target}\`](${target}).`,
    "",
  ].join("\n");
}

/** Return {path, current, desired} for one Claude skill wrapper. */
export function generateClaudeSkillWrapper(repoRoot, canonicalSkill) {
  const wrapper = path.join(
    repoRoot,
    ".claude",
    "skills",
    path.basename(path.dirname(canonicalSkill)),
    "SKILL.md",
  );
  return {
    path: wrapper,
    current: readIfPresent(wrapper),
    desired: renderClaudeSkillWrapper(canonicalSkill, wrapper),
  };
}

/** Return Markdown with one generated discovery block replaced or inserted after the H1. */
export function applyBlock(text, block, file, beginMarker, endMarker) {
  const label = beginMarker.replace("<!-- BEGIN ", "").trim();
  const lines = splitLines(text);
  let begin = null;
  let end = null;

  lines.forEach((line, index) => {
    if (line.startsWith(beginMarker)) {
      if (begin !== null) {
        throw new ContractError(`${file}: more than one BEGIN ${label} marker`);
      }
      begin = index;
    } else if (line.trim() === endMarker) {
      if (end !== null) {
        throw new ContractError(`${file}: more than one END ${label} marker`);
      }
      end = index;
    }
  });

  if ((begin === null) !== (end === null)) {
    throw new ContractError(`${file}: unbalanced ${label} markers`);
  }

  if (begin !== null) {
    if (end < begin) {
      throw new ContractError(`${file}: END ${label} precedes BEGIN ${label}`);
    }
    return [...lines.slice(0, begin), ...splitLines(block), ...lines.slice(end + 1)].join("\n") + "\n";
  }

  const heading = lines.findIndex((line) => line.startsWith("# "));
  if (heading < 0) {
    throw new ContractError(`${file}: no H1 to anchor the generated block`);
  }
  return (
    [...lines.slice(0, heading + 1), "", ...splitLines(block), ...lines.slice(heading + 1)].join(
      "\n",
    ) + "\n"
  );
}
