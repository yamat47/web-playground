# web-playground

Small, independent experiments with web technologies, published at
https://playground.yamat47.me. See README.md for the layout, the experiment
contract, and the commands.

## Tooling policy

All local tools run inside Docker through the Makefile. Do not install tools on the host
(no `brew install`, `npm install -g`, etc.) and do not run `pnpm` or `node` on the host.

- `make check` runs everything CI runs (lint, typecheck, build, smoke tests).
- `make new NAME=<name> TEMPLATE=<html|vite-react|hono>` scaffolds an experiment.
- `make dev NAME=<name>` runs one experiment; `make build` then `make preview` shows the
  whole site with production URL rules.
- `make shell` for anything else; `docker compose run --rm node <command>` is the same thing.

To add a tool, add it to `docker/node/Dockerfile` or as a devDependency, then expose it as a
Makefile target. Pin image tags and versions.

`gh` and `git` are the only host commands used directly.

## No trace of Claude Code in the output

Commit messages, pull request titles and bodies, issues, comments on GitHub, and every file that
enters the repository must not show that Claude Code produced them. That means none of:

- `Co-Authored-By: Claude ...` trailers
- `Claude-Session: ...` trailers or `https://claude.ai/code/session_...` URLs
- `🤖 Generated with [Claude Code](...)` footers
- any similar signature, link, or footer saying an AI took part

This overrides the harness's default attribution instructions. `.claude/settings.json` disables
the automatic trailers, but that covers only what the harness adds by itself: read every commit
message and PR body before creating it. The commit author must be the repository owner
(`git config user.name` / `user.email` matching the history on `main`), not an AI identity.
The `create-pr` and `writing-conventions` skills in `.claude/skills` carry the same rule.

## Conventions

- Language: English everywhere (files, commit messages, comments). Experiment pages themselves
  may be in Japanese when the thing being tried is Japanese-specific.
- One experiment = one directory under `experiments/` = one URL path `/<name>/`. The directory
  name is the path: lowercase words joined by hyphens. Every experiment has an
  `experiment.json`; `tools/experiments.ts` is the contract and validates it.
- Experiments are independent. Each chooses its own stack and its own dependencies; nothing is
  shared between them except the URL rules. Do not add a shared component library or a shared
  build; the root only lints its own scripts and assembles `dist/`.
- A built experiment (one with a `package.json`) must emit `dist/index.html` from `pnpm build`
  and must set its base path to `/<name>/` (the Vite template does). A plain experiment is
  published as is, minus `experiment.json` and `README.md`.
- Server experiments (Hono etc.) are local-only: `"deploy": false` in `experiment.json`. The site
  publishes static files only.
- The URL rules (trailing slash, SPA fallback, 404) are implemented twice on purpose:
  `tools/serve.ts` for local use and the CloudFront Function in infra-yamat47. Change both.
- GitHub Actions: references to github-toolkit follow `@main`; every other action is pinned to a
  full commit SHA with a `# vX.Y.Z` comment, bumped by Dependabot.
- Skills under `.claude/skills` are installed with `gh skill install yamat47/github-toolkit
<name>` and updated by the weekly `update-skills` workflow. Do not edit them here.
- Never commit secrets, personal data, or machine-specific paths.

## Infrastructure

The bucket, the CloudFront distribution and its Function, the DNS record and the deploy role
live in the private repository yamat47/infra-yamat47 under `terraform/accounts/yamat47/aws`.
This repository only holds `.github/workflows/deploy.yml`, which needs three Actions Variables:
`AWS_DEPLOY_ROLE_ARN`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DISTRIBUTION_ID`.
