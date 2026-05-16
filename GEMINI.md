# Push_ Project Context

Push_ is a GitHub repository attention dashboard designed to surface operational signals like open alerts, degraded health, and failed workflows.

## Project Overview

- **Core Mission:** Focus on actionable signals over vanity metrics for personal GitHub repository management.
- **Main Technologies:**
    - **Frontend:** React 18, TypeScript, Vite.
    - **Styling:** Tailwind CSS, Radix UI, Lucide Icons.
    - **Data Fetching:** `@octokit/rest`, TanStack Query (React Query).
    - **Testing:** Vitest (unit/integration), Playwright (E2E).
    - **Internationalization:** Custom i18n system supporting `en`, `pt-BR`, and `es`.

## Architecture & Runtime Modes

The application uses a dual-runtime architecture controlled via the `@runtime-app` alias in `vite.config.ts`:

1.  **Local Secure Mode (`LocalApp.tsx`):**
    - Active during `npm run dev` or development builds.
    - Supports repository discovery and richer diagnostics.
    - Accepts a GitHub token (memory-only, non-persistent) for authenticated API calls.
2.  **Public Snapshot Mode (`PublicApp.tsx`):**
    - Active in the production build (`npm run build`).
    - Designed for GitHub Pages.
    - Uses static JSON snapshots fetched ahead of time.
    - Never accepts or handles GitHub tokens.

### Data Flow
- Snapshot data is generated via `scripts/sync-snapshots.mjs` (triggered by `npm run data:sync`).
- Data is stored in `data/repositories.json` and served from `public/data/`.

## Building and Running

### Prerequisites
- Node.js (prefer `npm` over `bun`).
- A GitHub Personal Access Token (for local mode data syncing).

### Key Commands
- `npm ci`: Install dependencies.
- `npm run hooks:install`: Install git hooks (specifically `pre-push`).
- `npm run dev`: Start the local development server (Local Mode).
- `npm run dev:snapshot`: Sync data and start dev server.
- `npm run data:sync`: Manually sync snapshot data from GitHub.
- `npm run build`: Build for production (Public Snapshot Mode).
- `npm run validate`: Run all quality gates (Lint, Type-check, Tests, and custom scripts).
- `npm run test`: Run Vitest suite.
- `npm run audit`: Full build-time audit for CI/CD.

## Development Conventions

### Strict Validation Gates
The project enforces high quality standards via `npm run validate`, which includes:
- **I18n Integrity:** No hardcoded labels in `src/config/site.ts`; strict import rules for locale files.
- **English-Only Source:** All source code copy must be in English (excluding translations).
- **Security & Patterns:** No Bun references allowed in docs or workflows; secure coding patterns for token handling.
- **Docs Consistency:** Ensures documentation remains in sync.

### Coding Standards
- **Styling:** Use Tailwind CSS utility classes. Prefer Vanilla CSS for complex animations or terminal-themed UI.
- **Types:** Strict TypeScript usage. Avoid `any`.
- **Testing:** All new features should include Vitest tests. E2E tests are located in `test/`.
- **Hooks:** Use custom hooks (e.g., `useGitHub`, `useApp`) to encapsulate logic.

### Security Model
- **Token Handling:** Never persist tokens in `localStorage` or `sessionStorage`. Keep them in memory only.
- **Public Safety:** The production build must be completely static and safe for public deployment without secrets.
