# web-playground

[![CI](https://github.com/yamat47/web-playground/actions/workflows/ci.yml/badge.svg)](https://github.com/yamat47/web-playground/actions/workflows/ci.yml)

Small, independent experiments with web technologies: an article to try, a browser feature to poke
at, a framework to compare. Each experiment is one directory, one stack of its own choosing, and one
URL under https://playground.yamat47.me/.

## Layout

| Path                                  | Contents                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `experiments/<name>/`                 | one experiment, published at `/<name>/`                                                                          |
| `templates/`                          | starting points for `make new` (`html`, `vite-react`, `hono`)                                                    |
| `site/`                               | the index page at `/`, rendered from every `experiment.json`                                                     |
| `tools/`                              | `assemble.ts` collects the outputs into `dist/`; `serve.ts` serves with production URL rules; `new.ts` scaffolds |
| `e2e/`                                | Playwright smoke tests against `dist/`                                                                           |
| `docker/`, `compose.yaml`, `Makefile` | the containers and the commands (everything runs in Docker)                                                      |
| `.github/workflows/`                  | CI, deploy, and the weekly skill update, built on [github-toolkit](https://github.com/yamat47/github-toolkit)    |
| `.claude/skills/`                     | Agent Skills installed from github-toolkit                                                                       |

## Running

The host needs Docker only. Ports can be changed with `PORT` and `PREVIEW_PORT`.

| Command                                    | Effect                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `make install`                             | `pnpm install` for the workspace (first time, and after editing a `package.json`) |
| `make new NAME=foo TEMPLATE=vite-react`    | scaffold `experiments/foo` (`TEMPLATE` defaults to `html`)                        |
| `make dev NAME=foo`                        | run one experiment at http://localhost:5173/foo/                                  |
| `make build`                               | build every experiment and assemble `dist/`                                       |
| `make preview`                             | serve `dist/` at http://localhost:4173/ with the production URL rules             |
| `make lint`, `make typecheck`, `make test` | the checks; `make check` runs all of them plus the build, like CI                 |
| `make shell`                               | a shell in the Node container                                                     |
| `make clean`                               | remove containers, the pnpm store volume, `dist/` and `node_modules/`             |

## Adding an experiment

1. `make new NAME=<name> TEMPLATE=<html|vite-react|hono>`. The name is the URL path: lowercase
   words joined by hyphens.
2. Fill in `experiments/<name>/experiment.json` (below).
3. `make dev NAME=<name>` while working; `make build && make preview` to see it mounted on the
   site the way production serves it.
4. Open a pull request. CI lints, typechecks, builds, and opens every experiment in Chromium.
   Merging to `main` deploys.

### The experiment contract

`experiment.json` is the only thing every experiment must have:

```json
{
  "title": "Japanese phonetic name autofill",
  "description": "One sentence shown on the index page.",
  "date": "2026-09-19",
  "source": "https://developer.chrome.com/blog/japanese-phonetic-name-autofill",
  "tags": ["autofill", "forms"],
  "deploy": true
}
```

| Field                          | Meaning                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`, `description`, `date` | required; the index page sorts by `date` (YYYY-MM-DD), newest first                                                                                                    |
| `source`                       | optional URL of the article or spec being tried                                                                                                                        |
| `tags`                         | optional list of strings                                                                                                                                               |
| `deploy`                       | default `true`; `false` keeps the experiment local-only (servers, for example) and lists it as such                                                                    |
| `output`                       | optional; the directory to publish, relative to the experiment. Defaults to `dist` when the experiment has a `package.json`, otherwise the experiment directory itself |

How the files get published:

- **Plain experiment** (no `package.json`): the directory is copied as is, minus `experiment.json`
  and `README.md`. Relative URLs work because the page is served under `/<name>/`.
- **Built experiment**: `pnpm build` in that directory must write `dist/index.html`. Asset URLs
  must be relative to `/<name>/`; the Vite template sets `base` from the directory name.
- **Server experiment**: set `"deploy": false`. It runs with `make dev`, is listed on the index
  page as local-only, and is never uploaded.

Experiments are deliberately independent: each has its own dependencies and its own lint and
typecheck scripts (the root runs `pnpm -r`), and nothing is shared between them.

### URL rules

The site is static files on S3 behind CloudFront. A CloudFront Function applies these rules, and
`tools/serve.ts` applies the same ones locally:

| Request                              | Served                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| `/`                                  | `/index.html`                                                    |
| `/<name>/`                           | `/<name>/index.html`                                             |
| `/<name>`                            | 301 to `/<name>/`                                                |
| `/<name>/anything/without/extension` | `/<name>/index.html` (client-side routing inside one experiment) |
| anything else that does not exist    | `404.html`                                                       |

A React app with a router therefore mounts it with `basename={import.meta.env.BASE_URL}`.

## Deploying

`.github/workflows/deploy.yml` runs on every push to `main`: build, `aws s3 sync --delete` into
the bucket, invalidate the distribution. The role it assumes through OIDC, the bucket, the
distribution, its Function and the DNS record are managed in the private repository
yamat47/infra-yamat47 (`terraform/accounts/yamat47/aws`). The workflow reads three Actions
Variables: `AWS_DEPLOY_ROLE_ARN`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DISTRIBUTION_ID`.

## Skills and workflows from github-toolkit

The actions and the reusable workflow are referenced with `@main`. The skills under
`.claude/skills` were installed with `gh skill install yamat47/github-toolkit <name>` and are kept
current by `.github/workflows/update-skills.yml`, which opens a pull request every Monday when a
new release changes any of them. Installed: `create-pr`, `writing-conventions`, `review-pr`,
`review-dependency-bump`, `grill-me`, `frontend-design`, `typescript-idioms`, `react-patterns`,
`vue-patterns`, `github-actions-workflows`, `api-design`, `skill-creator`, `gh-stack`.

## License

[MIT](LICENSE). Installed skills keep their own license lines.
