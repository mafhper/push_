# Push_Underline

**Command your GitHub code frontier.**

Push_Underline (`Push_`) is a high-performance, personal dashboard for GitHub, designed to run statically on GitHub Pages. It consolidates the health signals of your most important repositories into a single, scanable interface.

## 🚀 Key Features

- **Personal Dashboard**: A unified view of all your monitored repositories.
- **Active Development Focus**: Highlight your primary project with deep insights.
- **Health Scoring**: Heuristic scoring based on CI status, security alerts, and activity.
- **CI/CD Failure Reports**: Visual history of GitHub Actions and job failure grouping.
- **Security First**: Native Dependabot integration to highlight vulnerabilities by severity.
- **Compiled Metrics**: Estimated Lines of Code, language breakdown, and contributor activity.
- **Privacy Centric**: Your GitHub PAT is stored locally in your browser and never leaves it.

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
3. **Run locally**: `bun dev` or `npm run dev`
4. **Deploy**: Build and push the `dist` folder to your GitHub Pages branch.

## 🔑 Permissions

To function correctly, your fine-grained Personal Access Token needs the following **read** permissions:
- `Metadata` (Repositories)
- `Actions`
- `Dependabot alerts`
- `Contents`

---
*Built as a personal command center for the modern developer.*
