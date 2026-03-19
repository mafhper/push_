# Push_

Push_ is a GitHub Pages-ready promo site and snapshot dashboard for published repositories.

The public deployment is static-first:

- Promo site at `/`
- Dashboard at `/app`
- Static JSON snapshots under `public/data`
- No PAT or API key stored in the browser

## Architecture

- `src/pages/promo/*`: public marketing routes
- `src/pages/*`: dashboard routes
- `data/repositories.json`: tracked repository manifest
- `scripts/sync-snapshots.mjs`: snapshot generator for local and CI usage
- `.github/workflows/pages.yml`: Pages build + deploy workflow

## Local usage

1. Install dependencies with `bun install` or `npm install`
2. Optional: create `.env.local` from `.env.example`
3. Generate snapshot data with `npm run data:sync`
4. Start the app with `npm run dev`

Use `npm run dev:snapshot` to regenerate data before starting the Vite server.

## Security model

- Public Pages build consumes snapshot JSON only
- Authenticated GitHub metrics are fetched only by the Node sync script
- Local secure mode reads `.env.local`
- CI secure mode reads repository secrets

## Validation

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
