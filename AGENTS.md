# Cartograph Contributor Agent Entry Point

If you are a coding agent contributing to this repository, use this file as your starting point.

## Canonical Operating Contract
Follow the full contributor and execution rules in:
- `agent-pack/03-agent-ops/AGENTS.md`

Workflow path source of truth:
- `.cartograph/workflow.json`
- Workflow scripts must resolve repository workflow paths via manifest-backed helpers only.

## Contribution Modes
After reading the canonical contract, do one of the following:
1. Create new tasks when backlog coverage is insufficient.
2. Execute eligible outstanding tasks in priority/dependency order.

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

## Local Preflight Validation
Before opening a PR, run:
- `node scripts/check-manifest-path-usage.mjs`
- `node scripts/validate-task-pr.mjs --self-check --task-id task-###`
- Optional strict task-path enforcement:
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-### --strict-task-paths`

PR enforcement is strict:
- one primary task per PR
- branch, PR title, and PR template must link the same task ID
- unrelated backlog item file changes are rejected

## First Read
Before coding, read in order:
1. `agent-pack/00-context/vision.md`
2. `agent-pack/02-execution/implementation-strategy.md`
3. `agent-pack/02-execution/dependency-map.md`
4. `agent-pack/04-task-system/README.md`
5. `agent-pack/05-state/*`

All quality gates, logging rules, escalation rules, and done criteria are defined in the canonical file.
