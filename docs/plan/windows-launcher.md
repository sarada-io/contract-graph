# Windows npm command launching

Status: plan ready for Windows implementation; no implementation authorized in this session. Updated: 2026-10-10. Context: Windows usability feedback for the 1.0.0 baseline; no version bump or release is authorized.

## Executive Summary

### 1. Problem/Opportunity

On some Windows machines, typing `cg` in PowerShell selects npm’s generated `cg.ps1`, and script policy blocks it before Contract Graph starts. Asking users to change policy, create aliases or type `cg.cmd` adds unnecessary setup burden. The reported machine runs `npm` successfully, but its exact policy and command resolution have not been measured.

The agreed outcome is that users install through `npm install --global contract-graph` and then type bare `cg`, without additional setup commands. Agents must retain required framework checks and continue through the same installed CLI.

### 2. Solution Overview

Investigate a Windows-only npm install hook that removes only the generated `cg.ps1` proven to belong to the installed Contract Graph package. Keep npm’s existing `cg.cmd` and other launchers. With the competing PowerShell script absent, PowerShell should resolve bare `cg` to the batch launcher and start the existing Node.js CLI. Actual Windows tests must confirm this before the behavior becomes a release promise.

This approach needs no `cg.exe`, native compiler, separate installer, bundled Node.js, PATH edits, aliases or execution-policy changes. npm does not provide a package setting to omit just the PowerShell wrapper, so automatic cleanup must run after npm creates it. The hook must handle upgrades safely, preserve unrelated files, and account for installations that disable lifecycle scripts.

### 3. Plan Overview

The first phase verifies npm lifecycle ordering and Windows command selection. The next phases implement bounded wrapper cleanup and validate the complete npm installation lifecycle. The user has selected npm as the main path and removed the native launcher from scope because the existing batch launcher is sufficient if bare `cg` reaches it.

- **Windows feasibility:** Inspect npm wrapper creation, prove the install hook runs after linking, and test bare command selection without the PowerShell wrapper in Windows PowerShell 5.1 and PowerShell 7.
- **Owned wrapper cleanup:** Add a Windows-only package install hook that verifies the wrapper’s ownership and removes only the matching `cg.ps1`. Preserve other launchers and unrelated installations.
- **npm lifecycle and release validation:** Exercise fresh install, upgrade, rebuild and uninstall in disposable Windows environments; inspect the packed package and update setup guidance around bare `cg`.

---

## Details (Agent Version)

### Agreed scope and authority

The user explicitly paused implementation to finish this plan here and intends to request implementation on a Windows machine. They require bare `cg` after npm installation and clarified that dropping the generated PowerShell wrapper makes a native executable unnecessary. The implementation request on Windows may execute the phases below; this planning session does not resume framework implementation. Phase 1 is the first bounded feasibility task, not an omitted prerequisite or a claim of established Windows behavior.

In scope: a Windows-only install-time correction for CG-owned npm wrappers, lifecycle tests, existing package build integration and canonical setup/upgrade guidance. Out of scope: `cg.exe`, native launcher source, a separate installer, bundling Node.js, a CLI rewrite, execution-policy changes, aliases, PATH modifications, publishing, a version bump, global installation on the maintainer machine, or adopter updates.

Earlier uncommitted chat-link and `cg.cmd` guidance edits remain preserved. They are not evidence of a completed npm install fix. The short-lived native launcher skeleton was removed when implementation was paused; no executable or installer was produced. Earlier native-launcher approaches are superseded by this plan. Any downloaded toolchain remains ignored scratch and is not required by the proposed design.

### Ownership and existing entry points

| Responsibility | Owner and existing seam |
| --- | --- |
| npm release layout and permitted install hook metadata | [Distribution](../../.agent/distribution/contract.md); `src/scripts/build.js`, `package.json` and existing package tests. |
| Package installation hook and Windows wrapper cleanup | Distribution; add one bounded package-install helper only after recording its owner and packaged entry point. |
| Repository adoption and upgrades | [Installation](../../.agent/installation/contract.md); `cg init` remains the sole repository initialization/upgrade entry point. |
| User setup and agent launcher guidance | [Authoring](../../.agent/authoring/contract.md); README, upgrade guide, shared agent entry and relevant skills. |
| Windows lifecycle checks | `.github/workflows/ci.yml`, package tests and focused hook tests. |

The npm hook installs no governance files and does not run init, sync or verification against a discovered repository. npm distribution setup and repository adoption remain separate responsibilities.

### Mechanism and evidence

npm’s [cmd-shim implementation](https://raw.githubusercontent.com/npm/cmd-shim/main/lib/index.js) generates the extensionless shell launcher, `.cmd` and `.ps1`, including for targets without a shebang. Adding a compiled target to `bin` would still create wrappers. There is no per-package switch in this implementation to omit only `.ps1`.

The [npm wrapper specification](https://github.com/npm/rfcs/blob/main/implemented/0032-powershell-bins.md) describes PowerShell selecting `.ps1` ahead of `.cmd`. Windows PowerShell 5.1’s default Restricted policy prohibits scripts; see [Microsoft’s execution-policy documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-5.1). Removing only the generated CG PowerShell wrapper is therefore a plausible way to let bare `cg` reach `cg.cmd`. It is a hypothesis to validate on Windows, not a measured result from the reported machine.

npm supports package install lifecycle hooks, including for global installs, and normally runs scripts through `cmd.exe` on Windows. Thus the hook can be JavaScript started by Node rather than a PowerShell script. npm does not support uninstall lifecycle hooks in modern releases; see [npm lifecycle documentation](https://docs.npmjs.com/cli/v11/using-npm/scripts/). Prefer removing an existing npm-owned wrapper over creating global files that need custom uninstall cleanup.

npm’s [bin-path implementation](https://raw.githubusercontent.com/npm/bin-links/main/lib/get-paths.js) associates declared command names with their Windows wrapper paths. Its [wrapper ownership checks](https://raw.githubusercontent.com/npm/bin-links/main/lib/shim-bin.js) inspect targets when linking. Confirm actual install, upgrade and uninstall behavior for the supported npm versions; do not assume current upstream source describes every installed version.

### Proposed design

Keep `bin.cg` pointed at the current JavaScript CLI. Add a packaged Windows-only `postinstall` helper, provided feasibility testing establishes that the generated wrappers already exist at this stage for supported npm versions. The existing build currently removes package scripts from release metadata; extend that seam to retain only the explicitly required install hook, without publishing maintainer build/test scripts.

The helper resolves its own installed package and npm’s actual bin directory for the supported install mode. It reads the existing `cg.ps1` and verifies that its target belongs to this exact package’s declared CLI before removal. Do not delete an arbitrary file because it has the same basename. Refuse symlinks/reparse-point redirection, unrelated wrappers, unexpected layouts or uncertain ownership. Use a conservative recognizer for supported npm-generated wrapper forms and require both `cg.ps1` and `cg.cmd` to resolve to this exact installed CLI. Check canonical package containment and normal file types. Cover each accepted form with independently authored fixtures. Prefer no new dependency; if correct ownership parsing cannot be supported without one, report that finding before changing the dependency scope. A filename, generic package-name substring or matching prefix alone does not establish ownership.

Remove only the verified `cg.ps1`, leaving `cg.cmd` and the extensionless launcher intact. Do nothing on non-Windows systems. Do nothing when the wrapper is already absent. Detect changed content or ownership immediately before removal; do not claim an earlier read guarantees safety against concurrent installs. Global installation is the acceptance path. Support custom global prefixes and global rebuilds after confirming the package and bin layout. Local installs, the source checkout and development links are explicit no-ops for this first change; never infer permission to edit a global prefix from one of those modes. Record this bounded support policy in tests and documentation.

Do not invoke a shell to change policy, write profiles, persist aliases, elevate privileges, alter PATH or download extra tooling. The helper must not update another package version’s wrappers or modify adopter repositories. Error handling must distinguish a safe no-op from a correction failure. For an already absent wrapper or an intentionally unsupported install mode, return success without claiming a correction. For uncertain ownership or unexpected content, preserve the file and issue a concise warning that automatic launch correction could not be applied. If the verified CG-owned wrapper cannot be removed, fail the hook with an actionable error; do not let a known correction failure appear successful. Do not introduce an interactive install prompt.

Install hooks can be disabled through `--ignore-scripts` or environment policy, and custom script-shell settings can affect execution. No lifecycle-hook design guarantees automatic cleanup when hooks are prohibited. Specify that limit honestly: retain `cg.cmd` as the environment fallback without asking ordinary users to run extra commands. If script-disabled npm installation must also guarantee bare `cg`, this approach is insufficient and the design must be revisited before implementation.

### Phase 1 — Windows feasibility

Record Node/npm versions, actual install prefix, `Get-Command cg -All`, `Get-Command npm -All` and effective execution policy on disposable Windows environments. Observe PowerShell 5.1 and PowerShell 7 separately. Inspect the npm code/version actually used, rather than relying solely on upstream main.

Use a minimal disposable fixture to verify bin linking happens before the proposed hook and cleanup is not overwritten later in the same installation. Test default and custom prefixes, fresh global install, replacement of an older CG version and `npm rebuild`. Record how npm uninstalls a command whose `.ps1` wrapper is already absent. Make no maintainer/global or adopter changes during this investigation.

Prove that bare `cg` resolves to the batch launcher after its own `.ps1` is removed, in fresh and already-open shells, including `-NoProfile`. Identify aliases, functions, other PATH entries and missing `.CMD` in PATHEXT as separate environment conflicts; the package hook must not silently modify them. Validate npm versions bundled with the existing CI Node matrix (18.17, 20, 22 and 24) in compatible runtime combinations, and record exact versions. At minimum prove the Node 18.17/npm combination and a current supported Node/npm combination before broadening the claimed range. Do not raise the Node minimum to simplify this hook.

Stop condition: supported npm versions, hook ordering, safe wrapper ownership detection and the command-resolution path are demonstrated. Record the measured results in this master plan during implementation. If the central mechanism fails, report the finding and revise the plan before implementing a substitute. Do not pivot to native executables, a separate installer or policy changes without a new scope decision.

### Phase 2 — Owned wrapper cleanup

Implement the bounded package helper and release-metadata change through Distribution’s existing build. Update ownership contracts in the same implementation change. Retain Node.js 18.17+ compatibility and avoid adding an external dependency unless its concrete ownership-parsing benefit justifies its maintenance and package cost.

Focused tests cover non-Windows no-op, absent wrapper, exact owned wrapper, unrelated wrapper, stale/changed target, symlink redirection, custom prefixes, paths with spaces/Unicode, permission failure, repeat invocation and development/local install behavior. Keep negative fixtures independently authored and verify that unrelated files remain byte-for-byte unchanged.

Existing CLI argument handling, stdin/stdout/stderr, working directory, runtime identity and exit behavior remain delegated through npm’s unchanged batch launcher. Test real PowerShell invocation with representative arguments and nonzero CLI results; source-text assertions cannot establish shell behavior.

### Phase 3 — npm lifecycle and release validation

| Scenario | Required result |
| --- | --- |
| Standard global npm install with lifecycle scripts enabled | Bare `cg --version --json` and `cg init` work under Restricted Windows PowerShell without aliases, policy commands or renamed command instructions. |
| PowerShell 7 and `-NoProfile` agent shells | Bare `cg` selects the intended CLI; no profile dependency. |
| Existing CG npm installation and upgrade | New wrappers are corrected, the selected CLI identity matches the installed release and unrelated files survive. |
| Rebuild and repeated installation | No accumulation, extra global artifacts or unexpected regeneration of blocked `cg.ps1`. |
| npm uninstall | CG-owned package/wrappers are removed normally; no native executable or custom cleanup is needed. |
| Custom global prefix and paths with spaces/Unicode | Only the actual owned wrapper is corrected; command behavior remains accurate. |
| Local install, development link or uncertain wrapper owner | Follow the settled bounded behavior without modifying an unrelated global installation. |
| Hooks disabled or prohibited | Record that automatic correction did not run; preserve explicit `.cmd` fallback and avoid a false bare-command guarantee. |
| Wrapper removal denied or concurrent modification | Preserve unrelated data and report actual failure; installation does not falsely claim correction. |
| Non-Windows npm installation | Existing commands and package behavior remain unchanged. |
| CLI validation failure after launch | Preserve the application error and exit status; never retry a mutating command as a launcher repair. |

Minimum implementation checks: focused build/package/hook tests, full `npm test`, `npm run pack`, tarball inspection and extracted-package smoke tests. Resolve global `cg` before builds and use a disposable copy when it points into this checkout or resolution is uncertain. Windows lifecycle tests must use disposable prefixes/environments. Record a real Windows user-flow check separately from fixture success.

Update canonical README/upgrade guidance to keep `npm` and `cg` as normal commands once behavior is demonstrated. Reconcile the earlier draft’s unconditional `cg.cmd` instructions: it becomes a fallback for uncorrected or restricted installations, rather than the normal user command. Agent recovery retains required checks, actual version identity and reported limitations.

Example accepted experience: a user with supported Node.js runs `npm install --global contract-graph`, then `cg init` in a disposable project under Restricted PowerShell and sees normal initialization. They do not run `Set-ExecutionPolicy`, define an alias, type `cg.cmd` or install another tool. This experience requires lifecycle scripts to be allowed under the proposed design.

### Windows handoff and completion

Design choices for the initial implementation are settled: npm global installation remains the main path; use the existing batch launcher; remove only the verified package-owned PowerShell wrapper through a Windows-only postinstall hook; add no native executable, policy change or dependency by default; retain explicit fallback guidance when lifecycle scripts are disabled. Phase 1 must establish actual Windows feasibility before the helper is implemented.

1. Transfer this master plan and any relevant uncommitted changes deliberately. This active plan has a narrow Git ignore exception; commit and push it before switching machines, then pull it into the Windows checkout. Other temporary plans remain ignored. Do not rely on private local paths or a previous chat’s filesystem.
2. Read `AGENTS.md`, the repository contract, product context and Distribution/Authoring contracts in the Windows checkout. Inspect its actual working tree; preserve unrelated changes and do not assume the prior chat’s draft edits are present.
3. Resolve global `cg` and record Windows/PowerShell/Node/npm versions. Use disposable prefixes or a disposable repository copy for install/build tests. The real user global package and adopting repositories remain untouched.
4. Execute phases 1–3 under the new implementation request. Use this same master plan for measured feasibility findings and progress. No companion diary or second lifecycle ledger is required.
5. Report exact checks, the demonstrated standard npm install experience, remaining limitations and changed files. Keep publishing, version changes, live global installation and adopter upgrades outside this implementation scope.

Completion means that the release tarball includes the bounded hook, standard global npm installation with scripts enabled demonstrably supports bare `cg` under Restricted Windows PowerShell, upgrades/rebuild/uninstall pass, ownership-negative tests preserve unrelated files, non-Windows behavior stays intact, and canonical guidance no longer tells ordinary users to rename the command. Existing batch argument/exit behavior must be exercised rather than assumed. If blocked-hook installs cannot receive automatic correction, state that limit rather than adding a user setup script to the normal path.

Use this prompt in the Windows implementation chat after pulling the plan:

```text
Implement docs/plan/windows-launcher.md in this Windows checkout. Keep npm installation as the main path. Start with the disposable Windows feasibility checks, then add a Windows-only npm postinstall hook that removes only this installed package’s verified cg.ps1 and leaves cg.cmd intact, so users can type bare cg. Do not add cg.exe, an installer, aliases, PATH edits, execution-policy changes or a new dependency by default. Preserve unrelated work. Reconcile any earlier unconditional cg.cmd guidance and complete the plan’s package, Windows lifecycle and repository checks. Do not publish, bump the version, change my live global installation or update adopting repositories. If the proposed mechanism fails, report the evidence before changing scope.
```

This is a temporary maintainer plan. Durable implemented behavior belongs in the existing ownership contracts, setup/upgrade guidance and contributor validation instructions. Retire this plan after completion when no active handoff depends on it; do not package it as product documentation.
