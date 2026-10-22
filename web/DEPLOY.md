# Deploying contractgraph.dev

Cloudflare Workers Static Assets hosts the existing `contract-graph-web` Worker at `contractgraph.dev` and `www.contractgraph.dev`. Keep the Worker name, domains, routing, canonical apex, analytics and redirect rules unchanged. GitHub Actions in `sarada-io/contract-graph` is the sole production publisher. Cloudflare Git-triggered Workers Builds is disconnected; keep it disconnected. No npm publication is performed by this workflow.

## Automatic publication from main

[CI](../.github/workflows/ci.yml) runs on pull requests and pushes to `main`. Its `deploy-website` job runs only on a push to `main`, including a merged pull request, after all Linux and Windows matrix jobs and the reusable [public-source safety workflow](../.github/workflows/security.yml) pass. Pull requests and other branches never receive deployment credentials or publish hosted previews.

The deployment job checks out that commit, uses Node.js 24, runs `npm ci --include=dev`, `npm run web:build` and `npm run web:check`, then validates the configuration with Wrangler's `deploy --dry-run`. Wrangler is pinned to `4.151.3` and installed under the runner's temporary directory, outside the checkout and npm package. Review updates to that pin deliberately.

The final step runs:

```sh
wrangler deploy --config web/wrangler.jsonc
```

With that configuration, `assets.directory: ./public` resolves to `web/public/`. Only generated website assets are uploaded. The workflow uses the existing Worker identity, not a second Worker or Cloudflare Pages project. Deployment secrets are available only to the final deployment step. Production deployments are serialised without cancelling an active upload; a queued job checks the current remote `main` and skips publication if its commit has been superseded. If newer checks fail, the previous successful deployment remains live.

All `main` changes run the complete checks; there are no path filters that could miss shared documentation or schema changes. Builds, tests and local preview commands never deploy on their own.

## Maintained platform configuration

These settings support the active deployment path. Check them when changing access, rotating credentials or recovering a failed deployment; they are not an outstanding repository-migration checklist. Platform access and credentials are managed outside this public repository.

- **Cloudflare:** retain the existing `contract-graph-web` Worker, its custom domains and routing in [wrangler.jsonc](wrangler.jsonc). Keep Workers Builds Git integration disconnected, hosted Preview URLs off and `preview_urls: false`. No Cloudflare Git connection, build command or watch-path configuration is required for GitHub Actions.
- **Deployment token:** use an account-owned API token with **Specified Workers → contract-graph-web → Editor** and a separate **Specified Domains → contractgraph.dev** policy granting **Workers Routes Write** and **Zone Read**. Keep unrelated permissions out and rotate the token before its configured expiration. Follow Cloudflare's [individual Worker permissions](https://developers.cloudflare.com/changelog/post/2026-09-15-granular-worker-permissions/) and [GitHub Actions authentication instructions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).
- **GitHub environment:** `website-production` permits deployments from `main` only. Automatic publication currently uses no required environment reviewer or wait timer. Store the following as encrypted environment secrets; repository Actions secrets with the same names are also accepted by the workflow.

  | Secret | Value |
  | --- | --- |
  | `CLOUDFLARE_API_TOKEN` | The scoped deployment token |
  | `CLOUDFLARE_ACCOUNT_ID` | The account ID containing `contract-graph-web` |

- **Main protection:** require a pull request, resolved conversations and the up-to-date Linux, Windows and public-source checks, including for administrators. The current configuration requires no additional approving reviewer. Merging is the website publication decision. Do not require the deployment job as a pull-request check: it intentionally skips pull requests.
- **Single publisher:** neither the old website repository nor a Cloudflare Git build publishes this site. Preserve the previous repository's history for provenance and existing links; its retirement is separate from normal deployment.

Never commit token values, account exports or private platform records, or paste credentials into issues or build output. Local implementation and dry-run validation do not prove that platform permissions, encrypted secrets or live publication work.

## Verify a production deployment

After a reviewed change merges, open its `main` workflow run and confirm **Deploy contractgraph.dev** succeeds. A pull-request run validates the change and skips deployment. Check whether a superseded commit was deliberately skipped before diagnosing a missing upload. Missing or invalid credentials fail publication while leaving the previous deployment live. After repairing setup, rerun the failed jobs for the current `main` commit.

Check the homepage, documentation hub and affected guides on both apex and www. Verify old anchors and redirects, including `/whats-included/#skills` and legacy community URLs. Compare all three schema files at both `/schema/` and `/contract-graph/schema/` with `src/cg/schema/`; the aliases must retain identical bytes and canonical `$id` values. Review compatibility with the published npm release separately from website delivery. Verify the host's redirects on production: the local server serves fallback HTML instead of applying Cloudflare host rules.

## Release alignment

Every successful current `main` merge can publish the website, including technical guides and schemas. Reviewers must therefore ensure those public instructions describe the released npm package, or clearly mark an upcoming capability. Publish a required npm release before merging guidance that assumes it is already available. A passing website build does not verify npm release availability. Presentation and copy corrections can ship independently, and this workflow never runs `npm publish` or creates a release tag.

## Rollback

Select the previous successful deployment in the existing Cloudflare Worker for an immediate rollback. Revert the offending source change on `main` so the next successful pipeline preserves the correction. Remember that later successful `main` deployments replace a manual rollback. If the workflow itself is faulty, disable its production job while repairing it. Keep the Cloudflare Git integration disconnected; switching publishers requires an explicit operational decision and a single active publisher. Recheck schemas and compatibility URLs after rollback.
