# Development image: Node and pnpm, nothing else. The repository is bind-mounted
# at /repo by compose; dependencies are installed there by `make install`.
ARG NODE_VERSION=24
FROM docker.io/library/node:${NODE_VERSION}-bookworm-slim

ARG PNPM_VERSION=12.4.2

ENV LANG=C.UTF-8 \
    # The pnpm store lives in a named volume (compose.yaml) so reinstalls are fast.
    npm_config_store_dir=/pnpm/store

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g "pnpm@${PNPM_VERSION}"

WORKDIR /repo

# 5173: dev servers. 4173: preview of the assembled site.
EXPOSE 5173 4173
