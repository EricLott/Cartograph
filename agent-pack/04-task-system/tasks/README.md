---
doc_type: task_contract
schema_version: 1
last_updated: 2026-03-19
---

# Tasks Contract (Atomic Default)

## Purpose
Define the default unit of execution for autonomous agents.

## Inputs
- Parent feature
- Current dependency map and quality requirements

## Outputs
- Atomic implementation task with objective completion evidence

## Workflow Manifest Contract
- Script workflow paths are resolved from `../../../.cartograph/workflow.json`.
- Workflow scripts must not hardcode task-system path literals.
- Enforce with:
  - `node scripts/check-manifest-path-usage.mjs`

## Required Sections
- Task Goal
- Implementation Steps
- Dependencies
- Acceptance Criteria
- Evidence Plan
- Claim and SLA

## Metadata Schema
```yaml
id: task-001
title: Example Atomic Task
type: task
status: todo
priority: P1
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-03-26T17:00:00Z
depends_on:
  - feature-001
acceptance_criteria:
  - Single verifiable deliverable
last_updated: 2026-03-19
```

## Claim and SLA Rules
- Contributors must claim a task before starting implementation.
- Claiming a task requires updating the task file metadata:
  - `claim_owner`: contributor/agent identifier.
  - `claim_status`: `claimed`.
  - `claim_expires_at`: ISO-8601 timestamp.
  - `status`: `in_progress`.
- Default claim window is 24 hours unless a task explicitly requires a different window.
- `claim_expires_at` must not exceed `sla_due_at`.
- Renewal is allowed only with explicit metadata update before expiry and must include reason in the task body.
- If claim time expires, set `claim_status` to `expired`, return `status` to `todo` (or `backlog`), and the task becomes claimable by others.
- To prevent overlap, do not implement a task while another active claim is unexpired.

## Pull Request Requirement
- Every pull request must include the task file under `agent-pack/04-task-system/tasks/<status>/` for each task ID it implements.
- If code changes do not map to an existing task file, create the task file in the same PR.
- Before marking task `done`, release claim ownership by setting `claim_status` to `released` and `claim_expires_at` to `null`.
- PR title must include the same task ID as the selected task file.
- Use PR template fields for task linkage, evidence, and out-of-scope disclosure.

## Bootstrap Command
- Preferred one-command setup:
  - `node scripts/cartograph-contribute.mjs`
- Non-interactive auto-pick:
  - `node scripts/cartograph-contribute.mjs --auto`
- Resume an existing task branch:
  - `node scripts/cartograph-contribute.mjs --task task-### --resume`
- This command claims one eligible task and prepares branch/context for single-task execution.

## Atomic Transition Helper
- Use `node scripts/task-transition.mjs --task-id task-### --to <state>` for metadata + folder moves in one command.
- Supported targets:
  - `claimed`, `in_progress`, `done`, `blocked`, `expired`, `cancelled`
- This helper enforces legal status/claim transitions before writing files.

## Atomicity Rules
- One task should represent one principal deliverable.
- Target effort is approximately 0.5 to 1 day.
- If a task needs multiple independent deliverables, split it.

## Status Folder Placement
Store task files in one of these folders under `agent-pack/04-task-system/tasks/`:
- `todo/`: `status` is `backlog|todo` and `claim_status` is `unclaimed|released`.
- `claimed/`: `status` is `backlog|todo` and `claim_status` is `claimed`.
- `in_progress/`: `status` is `in_progress` and claim is active.
- `claim_expired/`: `claim_status` is `expired`.
- `blocked/`: `status` is `blocked`.
- `complete/`: `status` is `done` and `claim_status` is `released`.
- `cancelled/`: `status` is `cancelled`.

When metadata changes, move the file to the matching folder in the same commit.

## Status Lifecycle
`todo -> claimed -> in_progress -> blocked -> in_progress -> complete`
`claimed|in_progress -> claim_expired -> todo`
`todo|claimed|in_progress|blocked -> cancelled`

## Claim Lifecycle
`unclaimed -> claimed -> released`
`claimed -> expired -> unclaimed`

## Branch Pattern (Task Work)
- `task/task-###(-slug)?`

## Validation Commands
- Local preflight:
  - `node scripts/check-manifest-path-usage.mjs`
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-###`
- Optional strict path enforcement:
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-### --strict-task-paths`
- CI enforcement:
  - `.github/workflows/task-pr-validation.yml`

## State Log Convention
- State log updates must include the primary task ID in added lines.
- If additional task IDs are needed, include them only in a `related_items:` line.

## Task Path Migration Policy
- Default validator behavior warns on legacy flat task paths (`agent-pack/04-task-system/tasks/task-###-*.md`).
- Strict mode (`--strict-task-paths` or `VALIDATE_TASK_PATH_POLICY=strict`) fails validation for flat paths.

## Naming Rules
- File name: `task-###-short-name.md`
- Directory: `agent-pack/04-task-system/tasks/<status>/`
- Task IDs remain stable even if title changes.

## Update Cadence
Update as state transitions or acceptance criteria change.

## Source of Truth References
- `../../03-agent-ops/AGENTS.md`
- `../../02-execution/dependency-map.md`
- `../../05-state/progress-log.md`
