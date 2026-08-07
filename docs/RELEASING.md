# Releasing

Maintainer runbook. This file is deliberately **not** in `package.json` `files`, so it never
ships to consumers.

Every command below was run for 0.1.0. The checks exist because each one caught something real
at least once — the notes say what.

## 0. Decide the version

`package.json` `version` is the single source of truth. The git tag and the npm version both
follow it, so change it first and let everything else read it.

```bash
node -e "console.log(require('./package.json').version)"
```

## 1. Green tree, green tests

```bash
git status --short          # must be empty — the tarball is built from the working tree
npm test
```

A dirty tree is the failure that bites hardest: `npm pack` reads files from disk, not from
`HEAD`, so uncommitted edits ship and committed-but-unbuilt ones do not.

## 2. Build the tarball and inspect what it contains

```bash
npm run pack
```

`files` in `package.json` is an allowlist plus one exclusion (`!src/scripts/dev.js`). Confirm
nothing private leaked and that the exclusion held:

```bash
npm pack --dry-run --json | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s)[0];
console.log('files:',j.entryCount,'size:',(j.unpackedSize/1024).toFixed(0)+'KB');
const bad=j.files.filter(f=>/^(plan|tmp|build)\//.test(f.path)||f.path.includes('dev.js'));
console.log('leaked:',bad.length?bad.map(f=>f.path).join(', '):'none');})"
```

`plan/`, `tmp/`, and `build/` are gitignored and must never appear. 0.1.0 shipped **60 files,
399 KB**; a sudden jump means something was added to `files` or a directory grew.

## 3. Smoke-test the extracted tarball, not the working tree

This is the step that matters most. Running `bin/cg.js` from the repo proves nothing about the
package, because `files` exclusions only take effect at pack time — a scaffold source left out of
`files` works locally and fails for every consumer.

```bash
rm -rf /tmp/rel && mkdir -p /tmp/rel/pkg /tmp/rel/green /tmp/rel/brown
tar -xzf build/contract-graph-*.tgz -C /tmp/rel/pkg --strip-components=1

cd /tmp/rel/green && git init -q . && node /tmp/rel/pkg/bin/cg.js init . && node /tmp/rel/pkg/bin/cg.js verify

cd /tmp/rel/brown && git init -q . && printf 'plugins { java }\n' > build.gradle.kts
node /tmp/rel/pkg/bin/cg.js init . && node /tmp/rel/pkg/bin/cg.js verify
```

Both shapes must reach `cg verify: OK`. Greenfield keeps the starter `src` module (38 files
written); brownfield skips it and reports the ungoverned module roots instead (35 files). Those
counts differing by exactly 3 files and 1 generated block is correct, not a bug.

Clean up: `rm -rf /tmp/rel`.

## 4. Check the upgrade path is documented

If governance paths, skill names, or flags changed, `docs/migration-<version>.md` must exist and
say so, and `README.md` must link it. Someone upgrading in place will otherwise overlay a new
scaffold onto an old one.

## 5. Merge and tag

Work happens on a version branch; `main` gets one squashed commit per release.

```bash
git checkout main
git merge --squash v<version>
git commit
git tag -a v<version> -m "Contract Graph <version>"
git push origin main --tags
git branch -d v<version> && git push origin --delete v<version>
```

Verify the tag reached the remote — a local-only tag is easy to miss:

```bash
git ls-remote --tags origin | grep "v<version>"
```

## 6. Publish

```bash
npm whoami          # E401 means log in first
npm login           # avi-sinha, or via the sarada-io org
npm publish
```

`publishConfig.access` is `public`, so a scoped rename later would still publish publicly.

## 7. Verify the published artifact

```bash
npm view contract-graph version
npm view contract-graph dist-tags --json
npm view contract-graph@<version> dist.fileCount dist.unpackedSize
```

`fileCount` and `unpackedSize` must match what step 2 reported. 0.1.0: 60 files, 408387 bytes.

Then install it somewhere clean and run it once more — the registry copy is the only one users
get:

```bash
npm i -g contract-graph@<version> && cg --version
```

## Known wrinkles

- **`dist-tags.next` is stale.** It points at `0.0.1`, which is now *older* than `latest`, so
  `npm i contract-graph@next` installs a version behind the release. Either repoint it at a real
  prerelease or remove it: `npm dist-tag rm contract-graph next`.
- **Local install for testing overwrites the global `cg`.** `npm i -g ./build/contract-graph-*.tgz`
  is how the brownfield trials were run; remember the global binary is then a local build, not the
  registry one, until you reinstall from npm.
- **macOS may revoke Documents access** to the terminal or editor, which surfaces as
  `EPERM ... uv_cwd` from `node`, `npm`, and `git` alike while `/tmp` still works. It is a TCC
  permission, not a repository problem: System Settings → Privacy & Security → Files and Folders.
