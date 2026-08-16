import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_DOCS_ROOT } from "./model.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_ROOT = path.join(HERE, "..");
export const PROFILE_CONFIG_ROOT = fs.existsSync(path.join(RUNTIME_ROOT, "agent", "profiles"))
  ? path.join(RUNTIME_ROOT, "agent", "profiles")
  : path.join(RUNTIME_ROOT, "install", "profiles");
const CONFIG_SUFFIX = ".scaffolding.conf.json";
const CONFIG_FIELDS = new Set([
  "name",
  "displayName",
  "rootPointers",
  "skillWrappers",
  "extends",
]);

export class ProfileError extends Error {}

const safeRelativePath = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !path.isAbsolute(value) &&
  !value.split(/[\\/]/).includes("..");

export function availableProfiles(root = PROFILE_CONFIG_ROOT) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((name) => name.endsWith(CONFIG_SUFFIX))
    .map((name) => name.slice(0, -CONFIG_SUFFIX.length))
    .sort();
}

export const profilePath = (repoRoot) =>
  path.join(repoRoot, ".agents", "cg", "profile.json");

function fieldError(file, field, message) {
  throw new ProfileError(`${file}: field \`${field}\` ${message}`);
}

export function loadProfileConfig(name, { root = PROFILE_CONFIG_ROOT } = {}) {
  const file = path.join(root, `${name}${CONFIG_SUFFIX}`);
  if (!fs.existsSync(file)) {
    throw new ProfileError(
      `unknown profile \`${name}\`. Available: ${availableProfiles(root).join(", ")}`,
    );
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new ProfileError(`${file}: invalid JSON: ${error.message}`);
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new ProfileError(`${file}: expected a JSON object`);
  }
  const unknownFields = Object.keys(config).filter((field) => !CONFIG_FIELDS.has(field));
  if (unknownFields.length) fieldError(file, unknownFields[0], "is not supported");
  if (config.name !== name) fieldError(file, "name", `must equal \`${name}\``);
  if (typeof config.displayName !== "string" || !config.displayName.trim()) {
    fieldError(file, "displayName", "must be a non-empty string");
  }
  if (
    !config.rootPointers ||
    typeof config.rootPointers !== "object" ||
    Array.isArray(config.rootPointers)
  ) {
    fieldError(file, "rootPointers", "must be an object");
  }
  for (const [relative, prefix] of Object.entries(config.rootPointers)) {
    if (!safeRelativePath(relative)) {
      fieldError(file, "rootPointers", `contains unsafe path \`${relative}\``);
    }
    if (typeof prefix !== "string") {
      fieldError(file, "rootPointers", `prefix for \`${relative}\` must be a string`);
    }
  }
  if (!Array.isArray(config.extends) || config.extends.some((value) => typeof value !== "string")) {
    fieldError(file, "extends", "must be an array of profile names");
  }
  if (config.skillWrappers !== undefined) {
    const wrappers = config.skillWrappers;
    if (!wrappers || typeof wrappers !== "object" || Array.isArray(wrappers)) {
      fieldError(file, "skillWrappers", "must be an object");
    }
    const wrapperFields = Object.keys(wrappers).filter(
      (field) => !["dir", "template"].includes(field),
    );
    if (wrapperFields.length) {
      fieldError(file, `skillWrappers.${wrapperFields[0]}`, "is not supported");
    }
    if (!safeRelativePath(wrappers.dir)) {
      fieldError(file, "skillWrappers.dir", "must be a safe relative path");
    }
    if (wrappers.template !== "claude-wrapper") {
      fieldError(file, "skillWrappers.template", "must be `claude-wrapper`");
    }
  }
  return { ...config, file };
}

export function normalizeProfiles(profiles, { root = PROFILE_CONFIG_ROOT } = {}) {
  if (!Array.isArray(profiles) || profiles.length === 0 || profiles.some((name) => !name)) {
    throw new ProfileError("profiles must be a non-empty array of names");
  }
  const normalized = [...new Set(profiles)];
  const available = availableProfiles(root);
  const unknown = normalized.filter((name) => !available.includes(name));
  if (unknown.length) {
    throw new ProfileError(
      `unknown profile(s): ${unknown.join(", ")}. Available: ${available.join(", ")}`,
    );
  }
  return normalized;
}

export function resolveProfiles(names, { root = PROFILE_CONFIG_ROOT } = {}) {
  const selected = normalizeProfiles(names, { root });
  const resolved = { rootPointers: {}, skillWrappers: null };
  const visited = new Set();

  const visit = (name, stack) => {
    if (stack.includes(name)) {
      throw new ProfileError(`profile extends cycle: ${[...stack, name].join(" -> ")}`);
    }
    if (visited.has(name)) return;
    const config = loadProfileConfig(name, { root });
    const nextStack = [...stack, name];
    for (const parent of config.extends) visit(parent, nextStack);
    for (const [relative, prefix] of Object.entries(config.rootPointers)) {
      const existing = resolved.rootPointers[relative];
      if (existing !== undefined && existing !== prefix) {
        throw new ProfileError(
          `${config.file}: field \`rootPointers.${relative}\` conflicts with inherited prefix`,
        );
      }
      resolved.rootPointers[relative] = prefix;
    }
    if (config.skillWrappers) {
      if (
        resolved.skillWrappers &&
        JSON.stringify(resolved.skillWrappers) !== JSON.stringify(config.skillWrappers)
      ) {
        throw new ProfileError(`${config.file}: field \`skillWrappers\` conflicts with inheritance`);
      }
      resolved.skillWrappers = config.skillWrappers;
    }
    visited.add(name);
  };

  for (const name of selected) visit(name, []);
  return { profiles: selected, ...resolved };
}

export function loadProfileSelection(repoRoot, { allowMissing = false } = {}) {
  const file = profilePath(repoRoot);
  if (!fs.existsSync(file)) {
    if (allowMissing) return null;
    throw new ProfileError(`missing scaffold profile record: ${file}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new ProfileError(`${file}: invalid JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ProfileError(`${file}: expected a JSON object`);
  }
  const profiles = normalizeProfiles(parsed.profiles);
  // `docs` is optional on read so a repository scaffolded before it existed still loads;
  // `cg init` writes it, so it becomes present on the next run.
  const docs = parsed.docs ?? DEFAULT_DOCS_ROOT;
  if (!safeRelativePath(docs) || docs.split(/[\\/]/).length !== 1) {
    throw new ProfileError(`${file}: docs must be a single safe directory name`);
  }
  return { profiles, docs };
}

export function resolveProfileSelection(repoRoot) {
  const selection = loadProfileSelection(repoRoot);
  return { ...selection, ...resolveProfiles(selection.profiles) };
}
