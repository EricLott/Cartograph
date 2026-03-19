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
- `./tasks/complete/`: `status: done` and claim released
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
- Every pull request that changes behavior must include the primary backlog item file(s) in `./<type>/<status>/` associated with that change.
- If no matching task exists, create one in the same PR before or alongside implementation changes.
- If a PR spans multiple tasks, include all corresponding task files and keep dependency links accurate.
- PR summaries should reference task IDs directly for traceability and review speed.

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
  - `node scripts/validate-task-pr.mjs --self-check --task-id task-###`

## Update Cadence
Update when workflow contracts or metadata schema change.

## Source of Truth References
- `./epics/README.md`
- `./features/README.md`
- `./tasks/README.md`
- `./bugs/README.md`
- `./spikes/README.md`
