# AGENTS Operating Contract

## Purpose
Define how a first-time coding agent can quickly and safely contribute to Cartograph with minimal context and high quality.

## Inputs
- Pack strategy and architecture docs
- Task system files with YAML metadata
- Current repository code and build scripts
- State logs for progress, blockers, and decisions
- Mistake history and prevention patterns (`./mistakes-framework.md`)
- Workflow manifest (`../../.cartograph/workflow.json`)

## Outputs
- New or updated work items aligned to implementation strategy
- High-quality code contributions with validation evidence
- Traceable progress, decisions, and escalation records
- Preventive improvements derived from prior mistakes

## Mission
Contribute reliably to Cartograph by either:
1. Creating high-quality, dependency-aware tasks when the backlog is missing or unclear.
2. Executing outstanding tasks in priority order with evidence-backed completion.

## Prerequisites
- **GitHub CLI (`gh`)**: Required for automated PR creation and status checks.
  - Install via `winget install --id GitHub.cli` (Windows) or `brew install gh` (macOS).

## First-Time Agent Quickstart
### Step 1: Read Source of Truth in Order
1. `../00-context/vision.md`
2. `../00-context/roadmap.md`
3. `../00-context/personas.md`
4. `../00-context/business-goals.md`
5. `../00-context/constraints.md`
6. `../01-architecture/*`
7. `../02-execution/implementation-strategy.md`
8. `../02-execution/workstreams.md`
9. `../02-execution/dependency-map.md`
10. `../02-execution/definition-of-done.md`
11. `../04-task-system/README.md` and all bucket `README.md` files
12. `../07-artifacts/design-system.md` (if working on UI)
13. `../07-artifacts/user-flows.md`
14. `../05-state/*` for current execution state
15. `./mistakes-framework.md` for known failure patterns and safeguards

### Step 2: Familiarize With Codebase
Read these files before coding:
- `../../README.md`
- `../../docker-compose.yml`
- `../../backend/server.js`
- `../../frontend/src/App.jsx`
- `../../frontend/src/services/agentService.js`
- `../../frontend/src/services/exportService.js`
- `../../frontend/src/services/apiService.js`

Then inspect related modules for your target task scope.

> [!IMPORTANT]
> **Safety First**: Before coding, read the latest 5 entries in `./mistakes-framework.md` and apply any relevant prevention actions to your current task scope. If your task involves a known failure pattern, explicitly mention the safeguard you are applying in your first progress entry.

Before coding, read the latest 5 entries in `./mistakes-framework.md` and apply any relevant prevention actions.

### Step 3: Choose Contribution Mode
- Mode A: Create new tasks if outstanding tasks are missing, stale, or under-specified.
- Mode B: Begin work on eligible outstanding tasks.

### Step 4: Use Cartograph Contribute Bootstrap
When invoked from root prompt styles like:
- `Read AGENTS.md and work on tasks`
- `Read AGENTS.md and create new tasks`

Preferred setup command:
- `node scripts/cartograph-contribute.mjs`
- Non-interactive auto-pick:
  - `node scripts/cartograph-contribute.mjs --auto`
- Resume existing task branch:
  - `node scripts/cartograph-contribute.mjs --task task-### --resume`

Bootstrap responsibilities:
- validates required docs and task contracts
- selects one eligible `task-*` item
- creates task-linked branch name (`task/task-###-slug`)
- claims selected task
- generates context bundle for manual or AI-assisted execution

### Step 5: Use Cartograph Closeout
Before opening a PR, run:
- `node scripts/cartograph-closeout.mjs`
- Non-interactive validation and status-move:
  - `node scripts/cartograph-closeout.mjs --task task-###`
- **Automated PR creation**:
  - `node scripts/cartograph-closeout.mjs --task task-### --create-pr`

This command runs manifest and PR validation checks, moves the task to the `completed/` folder, and stages all changes for commit.

## Operating Modes
Agents operate in one of four primary modes. **"Work Mode"** is the default persona unless otherwise steered by the user.

1. 🛠️ **Work Mode**: Knocking out `@agent-pack/04-task-system/tasks`, `@agent-pack/04-task-system/bugs`, etc.
2. 📝 **Task Mode**: Creating tasks and organizing the `@agent-pack/04-task-system` folder in accordance with the vision and roadmap.
3. 🗺️ **Roadmap Mode**: Aligning product and tasks with the `@agent-pack/00-context/roadmap.md` and `@agent-pack/00-context/vision.md`.
4. 📂 **Repo Mode**: Ensuring the repo is well-structured and follows `@AGENTS.md` and `@agent-pack/02-execution/implementation-strategy.md`.

## Contribution Modes
### Mode A: Create New Tasks
Use this mode when no executable task exists for current priorities.

1. Start from `../02-execution/implementation-strategy.md` and `../02-execution/dependency-map.md`.
2. Create or refine `epic` and `feature` files first if needed.
3. Create atomic `task` files in `../04-task-system/tasks/` (one principal deliverable each).
4. Ensure each task includes complete YAML frontmatter and explicit acceptance criteria.
5. Link dependencies using stable IDs (`depends_on`).
6. Log rationale in `../05-state/decisions-log.md` when creating non-obvious decomposition.

### Mode B: Work Outstanding Tasks
Use this mode when executable tasks already exist.

Eligibility rules:
- `status` is `todo` or `backlog`.
- All `depends_on` items are `completed` (or legacy `done`) or not required.
- No active blocker prevents safe execution.
- `claim_status` is `unclaimed` or `expired`.

Selection rules:
1. Highest priority first (`P0` then `P1`, `P2`, `P3`).
2. Then least dependency depth.
3. Then oldest `last_updated`.

Execution rules:
1. Update selected task to `in_progress`.
2. Set claim metadata (`claim_owner`, `claim_status: claimed`, `claim_expires_at`) before coding.
3. Implement only what is required by task acceptance criteria.
4. Apply any relevant safeguards documented in `./mistakes-framework.md`.
5. Validate per quality docs.
6. Record evidence in `../05-state/progress-log.md`.
7. Use `node scripts/cartograph-closeout.mjs` to prepare for completion.
8. Move task to `pull_requested` when PR is submitted, then `completed` after PR approval.
9. Release claim (`claim_status: released`, `claim_expires_at: null`) when task is `completed`.

### Task PR Boundary
- A single PR may address one or more primary task IDs.
- All primary task IDs in the PR must be included in the branch name and PR title.
- Do not modify other backlog item files (`task-*`, `bug-*`, etc.) outside the selected primary item(s).
- Do not update claim/status metadata or move status folders for any non-primary backlog item in the same PR.
- If state logs are updated (`progress`, `blockers`, `decisions`), entries must reference at least one of the primary task IDs.
- Run local preflight validation before opening PR:
  - `node scripts/cartograph-closeout.mjs`
  - Manual validation:
    - `node scripts/check-manifest-path-usage.mjs`
    - `node scripts/validate-task-pr.mjs --self-check --task-id task-###`
    - `node scripts/validate-task-pr.mjs --self-check --task-id task-### --strict-task-paths`

## Source-of-Truth Precedence
When instructions conflict, resolve in this order:
1. `../00-context/*`
2. `../01-architecture/*` and `../02-execution/*`
3. `../04-task-system/*`
4. `../05-state/*`
5. `../../.cartograph/workflow.json` for workflow path and policy values used by scripts

State logs track execution history and must not silently override context or architecture intent unless explicitly logged in `../05-state/decisions-log.md`.

## Operating Mode: High Autonomy
Default behavior is assume-and-log for non-critical ambiguity.

### Assume-and-Log Rules
- Proceed with the safest reasonable assumption when ambiguity is non-critical.
- Log assumptions in `../00-context/assumptions.md` and link affected task IDs.
- If assumption alters architecture intent, create a decision entry before continuing.

### Mandatory Stop Rules (Critical Risk)
Stop and escalate if any of the following is true:
- Security control for sensitive paths is unknown.
- Compliance or legal interpretation is ambiguous.
- Data integrity or migration safety is uncertain.
- Irreversible destructive change is possible.
- Conflicting requirements block a safe implementation path.

When stopped:
1. Add blocker entry to `../05-state/blockers.md`.
2. Add open question to `../05-state/open-questions.md`.
3. Follow escalation workflow in `./escalation-rules.md`.

## Task and State Metadata Contract
All work-item files must include YAML frontmatter keys:
- `id`
- `title`
- `type`
- `status`
- `priority`
- `owner`
- `depends_on`
- `acceptance_criteria`
- `last_updated`
- `claim_owner`
- `claim_status`
- `claim_expires_at`
- `sla_due_at`

Enums:
- `type`: `epic | feature | task | bug | spike`
- `status`: `backlog | todo | in_progress | pull_requested | blocked | completed | cancelled`
- `priority`: `P0 | P1 | P2 | P3`

State log entry schemas:
- Progress: `timestamp`, `task_id`, `summary`, `evidence`, `next_step`
- Blocker: `blocker_id`, `impact`, `unblock_condition`, `owner`, `escalation_status`
- Decision: `decision_id`, `context`, `options`, `chosen_option`, `rationale`, `date`

State log reference rule:
- Added lines must reference at least one of the primary task IDs.
- References to additional task IDs are allowed only inside a dedicated `related_items:` line.

## Validation and Definition of Done Gates
A task can move to `completed` only when:
1. Acceptance criteria are fully satisfied.
2. Required checks pass per `../06-quality/testing-strategy.md`.
3. Security and reliability requirements for scope are met.
4. Evidence is recorded in `../05-state/progress-log.md`.
5. No unresolved blocker remains linked to the task.

### Continuous Integration
The following checks are automated in GitHub Actions on all PRs to `main`:
- **Frontend Quality**: ESLint, build success, and Vitest coverage.
- **Backend Quality**: Jest API coverage.
- **Contract Enforcement**: Task ID consistency across branch, PR title, body, and backlog moves.

## Contribution Quality Checklist
Before closing a task, ensure:
- Changes are scoped to the task goal and dependencies.
- Relevant docs in `agent-pack` are updated when behavior changes.
- Decisions, assumptions, blockers, and progress are all logged.
- New mistakes are logged in `./mistakes-framework.md` when applicable, with prevention actions.
- Handoff details are written to `../05-state/handoff-notes.md` if work is incomplete.

## Guardrails: What Not To Do
- Do not code before reading implementation strategy and dependency map.
- Do not skip dependency order or invent hidden requirements.
- Do not close tasks without evidence.
- Do not ignore blockers that meet critical-risk stop criteria.
- Do not rewrite source-of-truth intent without a logged decision.
- Do not hardcode workflow paths in scripts; resolve them through `.cartograph/workflow.json`.

## Update Cadence
- Update this file when contribution workflow, risk posture, or metadata schema changes.
- Review before major open-source onboarding pushes and autonomous execution cycles.

## Source of Truth References
- `../00-context/vision.md`
- `../00-context/roadmap.md`
- `../00-context/personas.md`
- `../02-execution/implementation-strategy.md`
- `../02-execution/dependency-map.md`
- `../02-execution/definition-of-done.md`
- `../04-task-system/README.md`
- `../07-artifacts/design-system.md`
- `../07-artifacts/user-flows.md`
- `../05-state/*`
- `./agent-rules.md`
- `./decision-making-framework.md`
- `./escalation-rules.md`
- `./mistakes-framework.md`
