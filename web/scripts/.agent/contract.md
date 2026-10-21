# Website operations contract

Parent: [Website application](../../.agent/contract.md). Owns the website's local commands, generated-file checks and preview/build entry points.

## Implementation and public entry points

- [paths.mjs](../paths.mjs) exports the web target root (named `repositoryRoot` for compatibility), `getPublicRoot`, live URL, site name and default port. Root npm dependencies live one directory above that web root.
- [urun.mjs](../urun.mjs) owns `parseArgs`, help/menu selection, `invokeRepoCommand`, `invokeMenuItem` and `startRepositoryMenu`. Existing exports re-export preview/maintenance for compatibility; new callers import the responsible module directly.
- [preview/server.mjs](../preview/server.mjs) exports `resolvePublicFile`, `handleStaticRequest`, `createStaticServer`, `openUrl` and `startLocalServer`. Page navigation/reload calls Publication's build API before serving generated assets; asset requests consume the finished build.
- [maintenance/assets.mjs](../maintenance/assets.mjs) exports `getRequiredPaths` and `checkSiteFiles`, reporting missing required generated paths through a non-zero result.
- [build-site.mjs](../build-site.mjs) assembles, checks required files, runs all website tests and checks output freshness; any failure blocks the later CI deployment step.
- [urun](../../urun), [urun.cmd](../../urun.cmd) and [run-dev.sh](../../run-dev.sh) enter the same implementation while preserving platform/caller-directory behaviour. Root `npm run web:build`, `web:check` and `web:serve` remain the contributor entry points.

## Boundary promises

Consume [Publication](../../site/.agent/contract.md)'s existing assembly/build APIs; never introduce another source map or schema-copy operation. Serve only the generated public tree through the existing resolver. Build failure returns a preview error rather than silently serving an apparently current page. Reload handles source changes; module implementation edits require restarting the preview. Reuse an existing server and do not stop a user's server as routine cleanup.

Keep noninteractive help/serve behaviour, TTY restoration, argument/exit semantics, Windows launchers and the existing menu exports. Build, preview, schema refresh and the deployment-help menu item never publish or install the CLI. Cleanup owns local Wrangler state only through the existing menu choice. Actual production publication belongs to the [Website application](../../.agent/contract.md) boundary and [DEPLOY.md](../../DEPLOY.md); npm package tooling belongs to [Distribution](../../../src/runtime/distribution/.agent/contract.md).

Verification: [urun.test.mjs](../../test/urun.test.mjs) covers commands, launchers, cwd restoration, HTTP serving and failure propagation. Run `npm run web:build`, `npm run web:check` and `npm run check:maintainer`. Keep scripts compatible with Node.js 18.17+.
