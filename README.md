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
1. Fork this repo and create a branch.
2. Read [AGENTS.md](AGENTS.md) for contributor workflow.
3. Pick one path:
   - Create new tasks in `agent-pack/04-task-system/` if the backlog is missing work.
   - Work an outstanding task from `agent-pack/04-task-system/tasks/`.
4. Claim your task in its task file before coding (claims expire, so expired tasks are claimable again).
5. Make your changes and keep them focused.
6. Run the app with `docker-compose up --build` and verify it still works.
7. Open a PR with a short summary and include the related `agent-pack/04-task-system/tasks/*.md` file(s).

### Using a Coding Agent
Point your coding agent to [AGENTS.md](AGENTS.md) at repo root. It contains first-time onboarding steps, contribution rules, quality gates, and logging expectations.
