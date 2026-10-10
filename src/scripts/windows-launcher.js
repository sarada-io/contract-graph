// Repository contract: ../../.agent/distribution/contract.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TARGET = "node_modules/contract-graph/script/cli.js";
// Complete, conservative recognizers for npm 9/11's Node shebang wrappers.
const PS1 = `#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir/node$exe"  "$basedir/${TARGET}" $args
  } else {
    & "$basedir/node$exe"  "$basedir/${TARGET}" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "node$exe"  "$basedir/${TARGET}" $args
  } else {
    & "node$exe"  "$basedir/${TARGET}" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret
`;
const CMD = `@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\\node.exe" (
  SET "_prog=%dp0%\\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)

endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\${TARGET.replaceAll("/", "\\")}" %*
`;
const normalize = bytes => bytes.toString("utf8").replaceAll("\r\n", "\n");

function regular(file, io) {
  const stat = io.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("launcher or CLI is not a regular file");
  return stat;
}

function noRedirects(file, io) {
  for (let current = path.resolve(file); ; current = path.dirname(current)) {
    if (io.lstatSync(current).isSymbolicLink()) throw new Error("linked installation paths are unsupported");
    if (path.dirname(current) === current) break;
  }
  if (io.realpathSync(file).toLowerCase() !== path.resolve(file).toLowerCase()) throw new Error("installation path redirects elsewhere");
}

/** Only a verified removal failure throws; uncertain ownership preserves files. */
export function correctWindowsLauncher({ platform = process.platform, env = process.env,
  packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), io = fs } = {}) {
  if (platform !== "win32" || env.npm_config_global !== "true") return { status: "noop" };
  const root = path.resolve(packageRoot);
  if (path.basename(root) !== "contract-graph" || path.basename(path.dirname(root)) !== "node_modules") return { status: "noop" };
  const prefix = path.dirname(path.dirname(root));
  if (!env.npm_config_prefix || path.resolve(env.npm_config_prefix).toLowerCase() !== prefix.toLowerCase()) {
    return { status: "warning", reason: "npm global prefix does not match this package" };
  }
  const ps1 = path.join(prefix, "cg.ps1");
  const cmd = path.join(prefix, "cg.cmd");
  try {
    try { io.lstatSync(ps1); } catch (error) {
      if (error.code === "ENOENT") return { status: "noop" };
      throw error;
    }
    noRedirects(root, io);
    noRedirects(ps1, io);
    noRedirects(cmd, io);
    const metadata = path.join(root, "package.json");
    regular(metadata, io);
    const pkg = JSON.parse(io.readFileSync(metadata, "utf8"));
    if (pkg.name !== "contract-graph" || pkg.bin?.cg !== "script/cli.js") throw new Error("package CLI metadata is unexpected");
    const cli = path.join(root, "script", "cli.js");
    noRedirects(cli, io);
    regular(cli, io);
    const snapshots = [ps1, cmd].map(file => ({ file, stat: regular(file, io), bytes: io.readFileSync(file) }));
    if (normalize(snapshots[0].bytes) !== PS1 || normalize(snapshots[1].bytes) !== CMD) throw new Error("launchers do not match the supported npm wrappers for this CLI");
    // Recheck immediately before unlink. This cannot lock out another installer:
    // concurrent npm installs into one prefix must be serialized by the caller.
    for (const snapshot of snapshots) {
      noRedirects(snapshot.file, io);
      const stat = regular(snapshot.file, io);
      if (stat.ino !== snapshot.stat.ino || stat.dev !== snapshot.stat.dev || stat.mtimeMs !== snapshot.stat.mtimeMs ||
          !io.readFileSync(snapshot.file).equals(snapshot.bytes)) throw new Error("launchers changed during correction");
    }
    noRedirects(cli, io);
  } catch (error) {
    return { status: "warning", reason: error.message };
  }
  try { io.unlinkSync(ps1); } catch (error) {
    throw new Error(`Cannot remove verified Contract Graph cg.ps1 (${error.code || error.message}). Check write permission on the npm prefix and retry installation; cg.cmd remains the fallback.`);
  }
  return { status: "removed" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = correctWindowsLauncher();
    if (result.status === "warning") console.warn(`Contract Graph: automatic Windows launch correction could not be applied: ${result.reason}. Use cg.cmd if PowerShell blocks cg.ps1.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
