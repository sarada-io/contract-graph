/** Identify the CLI and its shipped procedures independently of the release version. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = fs.existsSync(path.join(HERE, "../package.json"))
  ? path.resolve(HERE, "..") : path.resolve(HERE, "../..");

export function runtimeIdentity(root = ROOT) {
  const packaged = fs.existsSync(path.join(root, "agent"));
  const trees = packaged
    ? [["script", "script"], ["agent/skills", "skills"], ["agent/hooks", "hooks"], ["agent/cg/schema", "schema"]]
    : [["src/scripts", "script"], ["src/skills", "skills"], ["src/install/hooks", "hooks"], ["src/cg/schema", "schema"]];
  const entries = [];
  const walk = (dir, prefix) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const key = `${prefix}/${item.name}`, file = path.join(dir, item.name);
      if (key === "script/dev.js") continue; // developer helper is deliberately not shipped
      if (item.isDirectory()) walk(file, key);
      else if (item.isFile()) entries.push([key, crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")]);
    }
  };
  for (const [dir, prefix] of trees) walk(path.join(root, dir), prefix);
  entries.sort(([a], [b]) => a.localeCompare(b, "en"));
  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const buildId = crypto.createHash("sha256").update(JSON.stringify({ version, entries })).digest("hex");
  return { version, buildId, executable: path.join(root, packaged ? "script/cli.js" : "src/scripts/cli.js") };
}

export function installationStatus(repoRoot) {
  const runtime = runtimeIdentity();
  const file = path.join(repoRoot, ".agents/cg/manifest.json");
  if (!fs.existsSync(file)) return { state: "not-initialized", runtime, installed: null, requiresInit: false };
  let installed;
  try { installed = JSON.parse(fs.readFileSync(file, "utf8")).runtime ?? null; }
  catch { installed = null; }
  const matched = installed?.buildId === runtime.buildId;
  return { state: matched ? "matched" : installed ? "mismatch" : "unrecorded", runtime, installed,
    requiresInit: !matched,
    ...(!matched ? { reason: "CLI and installed skills do not have a matching build identity. Use the intended global cg, then run cg init --yes with this repository's existing docs root and profiles before lifecycle dispatch." } : {}) };
}
