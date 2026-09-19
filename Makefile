# Everyday commands. Everything runs inside the containers defined in
# compose.yaml; only Docker needs to be installed on the host.

SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE := docker compose
RUN := $(COMPOSE) run --rm node
RUN_PORTS := $(COMPOSE) run --rm --service-ports node

TEMPLATE ?= html

.PHONY: help build-image install new dev build preview lint format typecheck test check shell clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-12s %s\n", $$1, $$2}'

build-image: ## Build the Node image (done automatically by targets that need it)
	$(COMPOSE) build --quiet node

install: ## pnpm install for the whole workspace
	$(RUN) pnpm install

new: ## Scaffold an experiment: make new NAME=<name> [TEMPLATE=html|vite-react|hono]
	@test -n "$(NAME)" || { echo "usage: make new NAME=<name> [TEMPLATE=html|vite-react|hono]"; exit 2; }
	$(RUN) node tools/new.ts "$(NAME)" "$(TEMPLATE)"
	@test ! -f "experiments/$(NAME)/package.json" || $(RUN) pnpm install

dev: ## Run one experiment's dev server at http://localhost:5173/<name>/ (NAME=<name>)
	@test -n "$(NAME)" || { echo "usage: make dev NAME=<name>"; exit 2; }
	@test -d "experiments/$(NAME)" || { echo "experiments/$(NAME) does not exist"; exit 2; }
	@if [ -f "experiments/$(NAME)/package.json" ]; then \
	  $(RUN_PORTS) pnpm --filter "./experiments/$(NAME)" dev; \
	else \
	  $(RUN_PORTS) node tools/serve.ts "experiments/$(NAME)" --prefix "/$(NAME)/"; \
	fi

build: ## Build every experiment and assemble dist/
	$(RUN) pnpm build

preview: ## Serve dist/ at http://localhost:4173/ with production URL rules (run build first)
	$(RUN_PORTS) pnpm preview

lint: ## ESLint and Prettier
	$(RUN) pnpm lint

format: ## Prettier --write
	$(RUN) pnpm format

typecheck: ## tsc for tools/ and every experiment that has a typecheck script
	$(RUN) pnpm typecheck

test: ## Playwright smoke tests against dist/ (run build first)
	$(COMPOSE) run --rm e2e

check: lint typecheck build test ## Everything CI runs

shell: ## A shell inside the Node container
	$(RUN) bash

clean: ## Remove containers, the pnpm store volume, dist/ and node_modules/
	$(COMPOSE) down --volumes --remove-orphans
	rm -rf dist node_modules experiments/*/node_modules experiments/*/dist e2e/node_modules
