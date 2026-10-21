# Deploying contractgraph.dev

Cloudflare Workers Static Assets hosts the existing `contract-graph-web` Worker at `contractgraph.dev` and `www.contractgraph.dev`. Keep the Worker name, domains, routing, canonical apex, analytics and redirect rules unchanged. GitHub Actions in this repository is the production publisher after the one-time setup below. No npm publication is performed by this workflow.

## Automatic publication from main

[CI](../.github/workflows/ci.yml) runs on pull requests and pushes to `main`. Its `deploy-website` job runs only on a push to `main`, including a merged pull request, after all Linux and Windows matrix jobs and the reusable [public-source safety workflow](../.github/workflows/security.yml) pass. Pull requests and other branches never receive deployment credentials or publish hosted previews.

The deployment job checks out that commit, uses Node.js 24, runs `npm ci --include=dev`, `npm run web:build` and `npm run web:check`, then validates the configuration with Wrangler's `deploy --dry-run`. Wrangler is pinned to `4.151.3` and installed under the runner's temporary directory, outside the checkout and npm package. Review updates to that pin deliberately.

The final step runs:

```sh
wrangler deploy --config web/wrangler.jsonc
```

With that configuration, `assets.directory: ./public` resolves to `web/public/`. Only generated website assets are uploaded. The workflow uses the existing Worker identity, not a second Worker or Cloudflare Pages project. Deployment secrets are available only to the final deployment step. Production deployments are serialised without cancelling an active upload; a queued job checks the current remote `main` and skips publication if its commit has been superseded. If newer checks fail, the previous successful deployment remains live.

All `main` changes run the complete checks; there are no path filters that could miss shared documentation or schema changes. Builds, tests and local preview commands never deploy on their own.

## One-time GitHub and Cloudflare setup

Complete this setup before merging the deployment workflow into `main`. Until activation, the old repository's Cloudflare integration remains the production publisher. Changing these settings does not itself deploy the new source.

1. Create a Cloudflare API token using the **Edit Cloudflare Workers** template. Scope it to the existing Worker's account and the `contractgraph.dev` zone, including the permissions needed for its configured routes and custom domains. Follow Cloudflare's [GitHub Actions authentication instructions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/). Do not commit or paste credentials into source, issues or build output.
2. In `sarada-io/contract-graph`, create the GitHub Actions environment **website-production**. Restrict its deployment branches to **main**. Leave required-reviewer and wait-timer rules off if publication should proceed automatically after CI. Add these environment secrets (repository Actions secrets with the same names also work):

   | Secret | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | The scoped deployment token |
   | `CLOUDFLARE_ACCOUNT_ID` | The account ID containing `contract-graph-web` |

3. Protect `main` with pull-request review and the Linux, Windows and public-source checks. Merging to `main` is the website publication decision; branch protection prevents unreviewed production changes. Do not require the deployment job itself as a pull-request check, because it intentionally skips pull requests.
4. Disable the existing Worker's Git-triggered **Workers Builds** deployment from `sarada-io/contract-graph-web` before enabling the new publisher. Retain the Worker, domains and previous successful deployment. Do not reconnect Workers Builds to the combined repository as well: GitHub Actions is the single deployment path and waits for CI and security checks. Keep hosted Preview URLs off and non-production builds disabled; `preview_urls: false` remains in Wrangler configuration.
5. Merge the reviewed branch into `main`. In GitHub Actions, verify that all checks pass and **Deploy contractgraph.dev** succeeds. Missing or invalid credentials fail publication while leaving the previous deployment live. A push to this feature branch cannot deploy. If setup is repaired after a failed run, rerun the failed jobs for the current `main` commit.
6. Verify the production homepage, documentation routes, both schema URL families, redirects and old anchors. Compare deployed schemas with the intended npm release and check both apex and www domains. Confirm the old repository cannot deploy, then consider making it read-only. Preserve its public history for provenance and existing links; do not import it wholesale.

No new Cloudflare Git connection, build command or watch-path setting is needed for this GitHub Actions approach. Store private platform outcomes outside public source. Local implementation and dry-run validation do not prove the external secrets, permissions or live deployment are working.

## Release alignment

Every successful current `main` merge can publish the website, including technical guides and schemas. Reviewers must therefore ensure those public instructions describe the released npm package, or clearly mark an upcoming capability. Publish a required npm release before merging guidance that assumes it is already available. A passing website build does not verify npm release availability. Presentation and copy corrections can ship independently, and this workflow never runs `npm publish` or creates a release tag.

## Rollback

Select the previous successful deployment in the existing Cloudflare Worker for an immediate rollback. Revert the offending source change on `main` so the next successful pipeline preserves the correction. Remember that later successful `main` deployments replace a manual rollback. If the workflow itself is faulty, disable its production job while repairing it; restoring the old repository's publisher is a deliberate fallback, and must not leave two active deployment paths. Recheck schemas and compatibility URLs after rollback.
