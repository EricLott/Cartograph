# 🗺️ Cartograph

### **The Translation Layer Between Architecture Intent & Autonomous Execution**

**Cartograph** is an open-source platform that transforms evolving product ideas into **execution-grade blueprint packs** designed for long-running autonomous coding agents.

It is not just a documentation tool—it is a **durable, machine-consumable mission system** that bridges the gap between high-level architectural thinking and deterministic agent execution.

---

## 🎯 **Core Mission**
Most autonomous agent execution fails because inputs are fragmented, ambiguous, or stateless. Cartograph solves this by converting architecture into a **stateful, dependency-aware task system**.

- **Structure for Machines**: Artifacts are shaped for deterministic interpretation first, human reading second.
- **Living Decisions**: Every architectural choice is treated as a node in a living graph, preserving tradeoffs and surfacing conflicts.
- **Agent-Ready Output**: Exports a standardized **Agent-Pack** (00-07 structure) that provides everything an agent needs to implement, validate, and track progress without human intervention.

---

## ✨ **Key Features**
- 🤖 **Agent-Guided Architecting**: Dynamically generate architecture **Pillars** and interactive **Decision Points** based on your product ideas.
- 🔗 **Dependency Graph**: Visualize relationships, conflicts, and dependency paths across your entire architecture.
- 🔑 **BYOK AI Integration**: Securely provide your own API keys (OpenAI, Anthropic, Gemini) to drive the reasoning engine.
- 📦 **Automated Blueprint Export**: One-click generation of the full **Agent-Pack** file structure.
- 🗄️ **Persistent State & Hydration**: Full-stack synchronization with a MySQL/SQLite backend, ensuring your architecture evolves over time.

---

## 🛠️ **Technical Stack**

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, React Flow, React Icons |
| **Backend** | Node.js (Express), Sequelize ORM |
| **Database** | MySQL (Containerized), SQLite (Local/Testing) |
| **AI Strategy** | Multi-Provider (OpenAI, Anthropic, Gemini), Mock Provider for Testing |
| **Workflow** | Custom ESM CLI Scripts (`.mjs`), Task-Status File Hub |
| **Testing** | Vitest (Frontend), Jest (Backend), ESLint |

---

## 🚀 **Quick Start**

### **1. Prerequisites**
- Node.js 22+
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop)

### **2. Launch the Suite**
Clone the repository and spin up the containerized environment:
```powershell
# Clone the repository
git clone https://github.com/EricLott/Cartograph.git
cd Cartograph

# Start the full stack (Frontend, Backend, Database)
docker-compose up --build -d
```
- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: `http://localhost:3000`

### **3. BYOK Setup**
Access the **Settings (⚙️)** icon in the sidebar to configure your LLM provider. Keys are stored safely in `localStorage` and never transmitted to the Cartograph backend—only to the AI provider.

---

## 🤖 **The Agentic Workflow (How we build Cartograph)**

Cartograph is built using the same **Agent-Pack** principles it generates. To contribute, you should leverage the project's autonomous loop.

### **1. Onboarding**
Read **[AGENTS.md](AGENTS.md)** at the repository root. This is your primary operating contract.

### **2. The Autonomous Loop**
Use the CLI scripts to automate your task lifecycle:
```powershell
# Auto-pick and claim the next available task
node scripts/cartograph-contribute.mjs --auto

# Resume work on an existing task branch
node scripts/cartograph-contribute.mjs --task task-### --resume

# Fully autonomous execution loop (Autonomous Conductor)
node scripts/cartograph-loop.mjs
```

### **3. Closing Out a Task**
Once implementation is complete and verified locally, run the closeout script to prepare for PR:
```powershell
# Prepare task metadata and stage changes
node scripts/cartograph-closeout.mjs --task task-###

# Automated validation & direct GitHub PR creation (for agents)
node scripts/cartograph-closeout.mjs --task task-### --create-pr --non-interactive
```

---

## ⚖️ **Single-Task PR Contract**
To maintain architectural integrity, we enforce a strict **Single-Task PR Contract**:
- **One PR = One Primary Task**: Each Pull Request must address exactly one task from `agent-pack/04-task-system/tasks/`.
- **Traceability**: PR titles must follow the `[task-###] description` format.
- **Evidence-First**: All behavior changes must includes updates to the `progress-log.md` with verifiable evidence (test results, CLI output).
- **Quality Gates**: PRs must pass linting, building, and validation through `node scripts/validate-task-pr.mjs`.

---

## 🧪 **Quality & CI**
Automated quality gates are enforced on all PRs to `main`:
- **Static Analysis**: ESLint checks for code quality and consistency.
- **Build Integrity**: Vite build must succeed for the frontend.
- **Logic Validation**: All Vitest and Jest test suites must pass.
- **Task Integrity**: The `validate-task-pr.mjs` script verifies that no out-of-scope files were modified.

---
*Built for the era of autonomous coding agents. Designed by architects, for executors.*
