# Website operations contract

Parent: [Website application](../../.agent/contract.md). Owns the website's local commands, generated-file checks and preview/build entry points.

## Implementation and public entry points

- [paths.mjs](../paths.mjs) exports the web target root (named `repositoryRoot` for compatibility), `getPublicRoot`, live URL, site name and default port. Root npm dependencies live one directory above that web root.
- [preview/server.mjs](../preview/server.mjs) exports `resolvePublicFile`, `handleStaticRequest`, `createStaticServer`, `openUrl` and `startLocalServer`. Page navigation/reload calls Publication's build API before serving generated assets; asset requests consume the finished build.
- [maintenance/assets.mjs](../maintenance/assets.mjs) exports `getRequiredPaths` and `checkSiteFiles`, reporting missing required generated paths through a non-zero result.
- [build-site.mjs](../build-site.mjs) assembles, checks required files, runs all website tests and checks output freshness; any failure blocks the later CI deployment step.
- The root [urun.mjs](../../../scripts/urun.mjs), [urun](../../../urun) and [urun.cmd](../../../urun.cmd) are the sole menu/launchers, owned by [Distribution](../../../src/runtime/distribution/.agent/contract.md). Root `npm run web:build`, `web:check` and `web:serve`, and `./urun web build|check|serve [--port N]` reuse these website operations. There is no website-specific menu or launcher.


## Boundary promises

Consume [Publication](../../site/.agent/contract.md)'s existing assembly/build APIs; never introduce another source map or schema-copy operation. Serve only the generated public tree through the existing resolver. Build failure returns a preview error rather than silently serving an apparently current page. Reload handles source changes; module implementation edits require restarting the preview. Reuse an existing server and do not stop a user's server as routine cleanup.

Build and preview never publish or install the CLI. Root menu cleanup asks before removing only `web/.wrangler`; npm tooling and terminal/menu semantics belong to Distribution. Production publication belongs to the [Website application](../../.agent/contract.md) boundary and [DEPLOY.md](../../DEPLOY.md).

Verification: [preview.test.mjs](../../test/preview.test.mjs) covers generated-file presence, HTTP serving, root launcher integration and failure propagation. Root [urun.test.js](../../../test/urun.test.js) covers shared menu commands, cancellation, terminal entry and cleanup boundaries. Run `npm run web:build`, `npm run web:check` and `npm run check:maintainer`. Keep scripts compatible with Node.js 18.17+.
