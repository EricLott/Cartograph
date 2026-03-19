# Cartograph

An open-ended agentic platform that guides users through architecting an application by dynamically generating architecture Pillars and interactive Decision Points.

## Features
- **Interactive UI**: Responsive chat and decision workspace powered by React.
- **BYOK AI Integration**: Provide your own API keys (OpenAI, Anthropic, Gemini) to generate real, dynamic application architectures.
- **Automated Blueprint Export**: Click 'Export .zip' to download an organized set of markdown files representing your app's architecture.
- **Dockerized Full-Stack & Persisted State**: Instantly boot up the frontend React app, the Node.js backend API, and a MySQL database for persistent storage using Docker Compose. All user ideas, pillars, and decisions are continuously backed up to the database.

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
2. Run one command from repo root:
   - `node scripts/cartograph-contribute.mjs`
3. Select one eligible `task-###` when prompted (or pass `--task task-###`).
4. Implement only that one primary task and required related files.
5. Run local scope check before opening PR:
   - `node scripts/validate-task-pr.mjs --self-check --task-id task-###`
6. Open a PR with title format `[task-###] ...` and complete the PR template fields.

### Single-Task PR Contract
- Every PR is scoped to exactly one primary task.
- The PR must include the primary task file under `agent-pack/04-task-system/tasks/<status>/`.
- PRs that drift into multiple backlog items fail automated validation.
- Progress/blocker/decision log updates must reference the same primary task ID.

### Using a Coding Agent
Point your coding agent to [AGENTS.md](AGENTS.md) at repo root. It contains first-time onboarding steps, contribution rules, quality gates, and logging expectations.
