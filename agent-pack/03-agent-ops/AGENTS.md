# AGENTS Operating Contract

## Purpose
Define how a first-time coding agent can quickly and safely contribute to Cartograph with minimal context and high quality.

## Inputs
- Pack strategy and architecture docs
- Task system files with YAML metadata
- Current repository code and build scripts
- State logs for progress, blockers, and decisions

## Outputs
- New or updated work items aligned to implementation strategy
- High-quality code contributions with validation evidence
- Traceable progress, decisions, and escalation records

## Mission
Contribute reliably to Cartograph by either:
1. Creating high-quality, dependency-aware tasks when the backlog is missing or unclear.
2. Executing outstanding tasks in priority order with evidence-backed completion.

## First-Time Agent Quickstart
### Step 1: Read Source of Truth in Order
1. `../00-context/vision.md`
2. `../00-context/business-goals.md`
3. `../00-context/constraints.md`
4. `../01-architecture/*`
5. `../02-execution/implementation-strategy.md`
6. `../02-execution/workstreams.md`
7. `../02-execution/dependency-map.md`
8. `../02-execution/definition-of-done.md`
9. `../04-task-system/README.md` and all bucket `README.md` files
10. `../05-state/*` for current execution state

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

### Step 3: Choose Contribution Mode
- Mode A: Create new tasks if outstanding tasks are missing, stale, or under-specified.
- Mode B: Begin work on eligible outstanding tasks.

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
- All `depends_on` items are `done` or not required.
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
4. Validate per quality docs.
5. Record evidence in `../05-state/progress-log.md`.
6. Move task to `done` only after Definition of Done gates pass.
7. Release claim (`claim_status: released`, `claim_expires_at: null`) when task is done.

## Source-of-Truth Precedence
When instructions conflict, resolve in this order:
1. `../00-context/*`
2. `../01-architecture/*` and `../02-execution/*`
3. `../04-task-system/*`
4. `../05-state/*`

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
- `status`: `backlog | todo | in_progress | blocked | done | cancelled`
- `priority`: `P0 | P1 | P2 | P3`

State log entry schemas:
- Progress: `timestamp`, `task_id`, `summary`, `evidence`, `next_step`
- Blocker: `blocker_id`, `impact`, `unblock_condition`, `owner`, `escalation_status`
- Decision: `decision_id`, `context`, `options`, `chosen_option`, `rationale`, `date`

## Validation and Definition of Done Gates
A task can move to `done` only when:
1. Acceptance criteria are fully satisfied.
2. Required checks pass per `../06-quality/testing-strategy.md`.
3. Security and reliability requirements for scope are met.
4. Evidence is recorded in `../05-state/progress-log.md`.
5. No unresolved blocker remains linked to the task.

## Contribution Quality Checklist
Before closing a task, ensure:
- Changes are scoped to the task goal and dependencies.
- Relevant docs in `agent-pack` are updated when behavior changes.
- Decisions, assumptions, blockers, and progress are all logged.
- Handoff details are written to `../05-state/handoff-notes.md` if work is incomplete.

## Guardrails: What Not To Do
- Do not code before reading implementation strategy and dependency map.
- Do not skip dependency order or invent hidden requirements.
- Do not close tasks without evidence.
- Do not ignore blockers that meet critical-risk stop criteria.
- Do not rewrite source-of-truth intent without a logged decision.

## Update Cadence
- Update this file when contribution workflow, risk posture, or metadata schema changes.
- Review before major open-source onboarding pushes and autonomous execution cycles.

## Source of Truth References
- `../00-context/vision.md`
- `../02-execution/implementation-strategy.md`
- `../02-execution/dependency-map.md`
- `../02-execution/definition-of-done.md`
- `../04-task-system/README.md`
- `../05-state/*`
- `./agent-rules.md`
- `./decision-making-framework.md`
- `./escalation-rules.md`
