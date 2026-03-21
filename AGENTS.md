# Cartograph Contributor Agent Entry Point

If you are a coding agent contributing to this repository, use this file as your starting point.

## Canonical Operating Contract
Follow the full contributor and execution rules in:
- `agent-pack/03-agent-ops/AGENTS.md`

Workflow path source of truth:
- `.cartograph/workflow.json`
- Workflow scripts must resolve repository workflow paths via manifest-backed helpers only.

## Task Scope Boundary
- The task system under `agent-pack/04-task-system/tasks/` is for **Cartograph product work only** (frontend/backend/exported product behavior).
- Changes to contributor workflow, agent workflow scripts, or `agent-pack` process/docs should be implemented directly in those files and validated, **not** introduced as new product backlog tasks.

## Prerequisites
- **GitHub CLI (`gh`)**: Required for automated PR creation and status checks.
  - Install via `winget install --id GitHub.cli` (Windows) or `brew install gh` (macOS).

## Operating Modes
Agents operate in one of four primary modes. **"Work Mode"** is the default persona unless otherwise steered by the user.

1. 🛠️ **Work Mode**: Knocking out `@agent-pack/04-task-system/tasks`, `@agent-pack/04-task-system/bugs`, etc.
2. 📝 **Task Mode**: Creating tasks and organizing the `@agent-pack/04-task-system` folder in accordance with the vision and roadmap.
3. 🗺️ **Roadmap Mode**: Aligning product and tasks with the `@agent-pack/00-context/roadmap.md` and `@agent-pack/00-context/vision.md`.
4. 📂 **Repo Mode**: Ensuring the repo is well-structured and follows `@AGENTS.md` and `@agent-pack/02-execution/implementation-strategy.md`.

## One-Command Contributor Flow
If a human asks you to contribute, they should prompt you with:
- `Read AGENTS.md and work on tasks`
- `Read AGENTS.md and create new tasks`

Your first execution step is to run:
- `node scripts/cartograph-contribute.mjs`
- Non-interactive automation:
  - `node scripts/cartograph-contribute.mjs --auto`
- Resume existing task branch:
  - `node scripts/cartograph-contribute.mjs --task task-### --resume`

This command validates docs, selects one eligible task, prepares a task-linked branch, claims the task, and outputs an agent-ready context bundle.

## Task Closeout
When work is complete, run:
- `node scripts/cartograph-closeout.mjs`
- Non-interactive validation and status-move:
  - `node scripts/cartograph-closeout.mjs --task task-###`
- **Automated PR creation**:
  - `node scripts/cartograph-closeout.mjs --task task-### --create-pr`

This command runs manifest and PR validation checks, moves the task to the `completed/` folder, and stages all changes for commit.


## Local Preflight Validation
Before opening a PR, use the closeout script to run:
- `node scripts/cartograph-closeout.mjs`
- Preferred unified preflight:
  - `node scripts/cartograph-preflight.mjs --task task-###`
- Manual validation commands:
  - `node scripts/check-manifest-path-usage.mjs`
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-###`
- Optional strict task-path enforcement:
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-### --strict-task-paths`

## Continuous Integration
All PRs to `main` must pass automated checks:
- **Quality**: `npm run lint`, `npm run build`, and `npm run test` (frontend/backend).
- **Contract**: `scripts/validate-task-pr.mjs` enforces the task-to-PR boundary.
- **Diagnostics**: Check GitHub Action run outputs for failures.

PR enforcement is flexible:
- one or more primary tasks per PR
- branch, PR title, and PR template must link the same task ID(s)
- unrelated backlog item file changes are rejected
- status-folder moves and claim/status metadata updates are allowed only for the linked task IDs

## First Read
Before coding, read in order:
1. `agent-pack/00-context/vision.md`
2. `agent-pack/02-execution/implementation-strategy.md`
3. `agent-pack/02-execution/dependency-map.md`
4. `agent-pack/04-task-system/README.md`
5. `agent-pack/05-state/*`

All quality gates, logging rules, escalation rules, and done criteria are defined in the canonical file.
