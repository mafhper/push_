# Push_Underline

**Command your GitHub code frontier.**

Push_Underline (`Push_`) is a personal dashboard for GitHub with two distinct runtimes:
- `GitHub Pages`: public, static, snapshot-only
- `localhost`: local secure mode with memory-only GitHub token access for repository discovery and selection

## 🚀 Key Features

- **Personal Dashboard**: A unified view of all your monitored repositories.
- **Active Development Focus**: Highlight your primary project with deep insights.
- **Health Scoring**: Heuristic scoring based on CI status, security alerts, and activity.
- **CI/CD Failure Reports**: Visual history of GitHub Actions and job failure grouping.
- **Security First**: Native Dependabot integration to highlight vulnerabilities by severity.
- **Compiled Metrics**: Estimated Lines of Code, language breakdown, and contributor activity.
- **Pages-safe**: the published site consumes only generated snapshot JSON and never asks for a token.
- **Local secure mode**: on `localhost`, the token lives only in tab memory and is cleared on reload/disconnect.

## 🛠️ Technical Stack

- **Vite + React + TypeScript**
- **Tailwind CSS**: Modern UI with fluid typography.
- **TanStack Query**: Efficient caching and background polling.
- **Octokit**: Official GitHub REST & GraphQL client.
- **Recharts**: Visual data representation for CI history.
- **Framer Motion**: Smooth, high-fidelity interactions.

## 📦 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `bun install` or `npm install`
3. **Run locally**: `npm run dev`
4. **Optional local auth**: open `/app/settings`, paste a GitHub token, inspect only your public repositories, and choose which ones should be observed locally
5. **Deploy**: GitHub Actions generates snapshots and publishes the static bundle to GitHub Pages

## 🔑 Permissions

For local secure mode or authenticated snapshot generation, your fine-grained Personal Access Token needs the following **read** permissions:
- `Metadata` (Repositories)
- `Actions`
- `Dependabot alerts`
- `Contents`

## Security model

- No token, cookie, or authenticated session is used in the published GitHub Pages runtime.
- Local authentication exists only on `localhost` and the token stays in memory for the current tab.
- Only public repositories are eligible for discovery and observation.
- Deep links on Pages use a redirect helper, but it stores only the target route in `sessionStorage`, never credentials.

---
*Built as a personal command center for the modern developer.*
