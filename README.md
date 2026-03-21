# Cartograph

An open-ended agentic platform that guides users through architecting an application by dynamically generating architecture Pillars and interactive Decision Points.

## Features
- **Interactive UI**: Responsive chat and decision workspace powered by React.
- **BYOK AI Integration**: Provide your own API keys (OpenAI, Anthropic, Gemini) to generate real, dynamic application architectures.
- **Automated Blueprint Export**: Click 'Export .zip' to download an organized set of markdown files representing your app's architecture.
- **Dockerized Full-Stack & Persisted State**: Instantly boot up the frontend React app, the Node.js backend API, and a MySQL database for persistent storage using Docker Compose. All user ideas, pillars, and decisions are continuously backed up to the database.

## Development

1. **Prerequisites**: Node.js 22+, Docker (optional).
2. **Setup**:
   - `cd frontend && npm install`
   - `cd backend && npm install`
3. **Local Checks**:
   - Frontend: `npm run lint`, `npm run build`, `npm run test`
   - Backend: `npm run test`

## Quality & CI

Automated quality checks are enforced on all pull requests to `main`:
- **Linting**: Frontend code must pass ESLint checks.
- **Build**: Frontend must build successfully.
- **Tests**: All frontend (Vitest) and backend (Jest) tests must pass.
- **Task Validation**: PRs must follow the task/PR contract (branch names, title formats, and backlog consistency).

## Getting Started

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop) installed.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd Cartograph
   ```

2. Start the fully containerized application suite using Docker Compose:
   ```bash
   docker-compose up --build
   ```
   *This single command builds the Vite React frontend, starts the Node.js backend, and initializes the MySQL database seamlessly.*

3. Access the platform:
   - **Frontend UI**: Open [http://localhost:5173](http://localhost:5173) in your browser.
   - **Backend API**: Running asynchronously on `http://localhost:3000`.

### BYOK Setup
Click the **Settings (⚙️)** icon in the sidebar to configure your preferred LLM provider and input your API keys. Your keys are securely stored only within your local browser's storage and used to authorize requests against the models.

## Contributing (Very Simple)
1. Fork and clone this repo.
2. Workflow contract source of truth:
   - `.cartograph/workflow.json`
   - Workflow scripts may not hardcode workflow paths.
2. Prompt your coding agent with one of these:
   - `Read AGENTS.md and work on tasks`
   - `Read AGENTS.md and create new tasks`
3. The agent will run `node scripts/cartograph-contribute.mjs` to standardize task selection, claim, and branch setup.
   - Non-interactive auto-pick: `node scripts/cartograph-contribute.mjs --auto`
   - Resume existing task branch: `node scripts/cartograph-contribute.mjs --task task-### --resume`
4. Implement only that one primary task and required related files.
5. Close out the task with automated validation and status-move:
   - `node scripts/cartograph-closeout.mjs`
- Manual scope check:
  - `node scripts/check-manifest-path-usage.mjs`
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-###`
  - Optional strict task-path mode: `node scripts/validate-task-pr.mjs --self-check --task-id task-### --strict-task-paths`
6. Open a PR with title format `[task-###] ...` and complete the PR template fields.

### Single-Task PR Contract
- Every PR is scoped to exactly one primary task.
- The PR must include the primary task file under `agent-pack/04-task-system/tasks/`.
- PRs that drift into multiple backlog items fail automated validation.
- Progress/blocker/decision log updates must reference the same primary task ID.
- If a log entry must reference another task ID, include it only in a `related_items:` line.

### Using a Coding Agent
Point your coding agent to [AGENTS.md](AGENTS.md) at repo root. It contains first-time onboarding steps, contribution rules, quality gates, and logging expectations.
