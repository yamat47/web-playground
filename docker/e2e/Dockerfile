# Playwright image with pnpm added, for `make test`. The tag must match the
# @playwright/test version in e2e/package.json, or the browsers do not match
# the library; Dependabot bumps both, merge them together.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

ARG PNPM_VERSION=12.4.2

ENV LANG=C.UTF-8 \
    npm_config_store_dir=/pnpm/store

RUN npm install -g "pnpm@${PNPM_VERSION}"

WORKDIR /repo
