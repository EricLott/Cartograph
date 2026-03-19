# Task System Contract

## Purpose
Define how work items are represented, named, and progressed across epics, features, tasks, bugs, and spikes.

## Inputs
- `../03-agent-ops/AGENTS.md`
- `../02-execution/implementation-strategy.md`

## Outputs
- Uniform task metadata contract
- Consistent status flow and dependency handling
- PR-to-task traceability
- Claim ownership rules that prevent overlapping execution

## Workflow Manifest Contract
- Workflow path and policy source of truth is `../../.cartograph/workflow.json`.
- Workflow scripts must resolve task-system paths through manifest-backed helpers.
- Direct hardcoded workflow paths in scripts are disallowed and checked by:
  - `node scripts/check-manifest-path-usage.mjs`

## Required Sections
- Metadata Schema
- ID and Naming Rules
- Status Lifecycle
- Dependency Rules
- File Placement Rules
- Claim Rules
- PR Contribution Rules
- Branch Naming Rules
- Validation Rules

## Status Folder System (All Backlog Types)
Backlog item files now live under status buckets and must be moved when `status` (or task claim state) changes.

### Tasks
- Base path: `./tasks/<status>/`
- `./tasks/todo/`: `status: backlog|todo` and `claim_status: unclaimed|released`
- `./tasks/claimed/`: `status: backlog|todo` and `claim_status: claimed`
- `./tasks/in_progress/`: `status: in_progress` with active claim
- `./tasks/claim_expired/`: `claim_status: expired`
- `./tasks/blocked/`: `status: blocked`
- `./tasks/pull_requested/`: `status: pull_requested` with active claim while PR review is pending
- `./tasks/completed/`: `status: completed` and claim released
- `./tasks/cancelled/`: `status: cancelled`

### Epics, Features, Bugs, Spikes
- Base paths:
  - `./epics/<status>/`
  - `./features/<status>/`
  - `./bugs/<status>/`
  - `./spikes/<status>/`
- Standard status buckets:
  - `backlog/`
  - `todo/`
  - `in_progress/`
  - `blocked/`
  - `complete/` (`status: done`)
  - `cancelled/`

For all item types, file name remains stable (`<type>-###-slug.md`); only the containing status folder changes.

## Claim Rules
- Tasks are claimable work items. A contributor must claim a task before implementation begins.
- Claims are recorded in the task file metadata and expire automatically.
- A task with an active, unexpired claim is not available for another contributor.
- If a claim expires, the task becomes claimable again and work can be reassigned without overlap.

## PR Contribution Rules
- Every pull request that changes behavior must include exactly one primary backlog item file in `./<type>/<status>/` associated with that change.
- If no matching task exists, create one in the same PR before or alongside implementation changes.
- Do not span multiple primary task IDs in one PR.
- PR summaries should reference task IDs directly for traceability and review speed.
- Task files move to `tasks/pull_requested/` when a PR is submitted and to `tasks/completed/` when that PR is approved.

## Branch Naming Rules
- Branch names must encode one primary item ID.
- Accepted patterns:
  - `task/task-###(-slug)?`
  - `bug/bug-###(-slug)?`
  - `spike/spike-###(-slug)?`
  - `feature/feature-###(-slug)?`
- V1 bootstrap command creates `task/...` branches for task execution.

## Validation Rules
- Automated validation is enforced in PR CI.
- Validation fails if branch, PR title, and primary item linkage do not match.
- Validation fails if multiple backlog item files are modified.
- Local preflight command:
  - `node scripts/check-manifest-path-usage.mjs`
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-###`
- Optional strict task-path mode:
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-### --strict-task-paths`

## State Log Cross-References
- Added state-log lines must include the primary task ID for the PR.
- Additional task IDs are allowed only in a dedicated `related_items:` line.

## Update Cadence
Update when workflow contracts or metadata schema change.

## Source of Truth References
- `./epics/README.md`
- `./features/README.md`
- `./tasks/README.md`
- `./bugs/README.md`
- `./spikes/README.md`
