[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

# Push_

Push_ is a GitHub repository attention dashboard built for one job: surface what needs action first.

It ships in two runtime modes:
- `localhost`: local secure mode, with memory-only GitHub token access for repository discovery and richer diagnostics
- `GitHub Pages`: public snapshot mode, with static data only and no browser token flow

## Why it exists

Most personal dashboards waste space on vanity metrics. Push_ is built around operational signals:
- open alerts
- degraded repository health
- failed workflow runs
- stale activity
- recent movement across watched repositories

## Key capabilities

- Attention-first dashboard ordered by problem pressure and latest movement
- Repository detail pages with health, workflow, security, and recent commit context
- Public profile inspection without a token for public repositories
- Snapshot publishing for a Pages-safe public runtime
- Locale support for `en`, `pt-BR`, and `es`
- Automatic browser-language detection with manual override in settings

## Runtime modes

### Local secure mode

- Accepts a GitHub token only on `localhost`
- Keeps the token in memory for the active tab only
- Lets you discover accessible public repositories and choose what enters the dashboard

### Public snapshot mode

- Serves static JSON generated ahead of time
- Never accepts a browser token
- Preserves deep links and public repository inspection safely

## Installation

```bash
npm ci
```

Optional but recommended:

```bash
npm run hooks:install
```

That installs the tracked `.githooks/pre-push` hook so pushes run the local validation gate first.

## Local usage

Start the app:

```bash
npm run dev
```

Start with a fresh snapshot sync:

```bash
npm run dev:snapshot
```

Generate snapshot data manually:

```bash
npm run data:sync
```

## Snapshot and public mode

- The published site reads snapshot data from `data/`
- Snapshot generation is handled locally or in GitHub Actions
- Public profile mode can inspect public GitHub data directly without authentication

## Security model

- No token is accepted in the published GitHub Pages runtime
- No token is persisted to `localStorage`, `sessionStorage`, cookies, or the static bundle
- Local secure mode keeps credentials in memory only
- Sensitive validation checks block common regressions before `push`

## Validation and quality gates

Core commands:

```bash
npm run lint
npm run type-check
npm run test:ci
npm run validate
```

Validation coverage:
- lint and static typing
- tests
- locale key integrity and reserved jargon checks
- docs consistency
- secure coding pattern checks
- repo pattern checks
- public build audit

The GitHub Pages workflow uses the same audit entrypoint:

```bash
npm run audit
```
