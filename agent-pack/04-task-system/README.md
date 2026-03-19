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

## Claim Rules
- Tasks are claimable work items. A contributor must claim a task before implementation begins.
- Claims are recorded in the task file metadata and expire automatically.
- A task with an active, unexpired claim is not available for another contributor.
- If a claim expires, the task becomes claimable again and work can be reassigned without overlap.

## PR Contribution Rules
- Every pull request that changes behavior must include the task file(s) in `./tasks/` associated with that change.
- If no matching task exists, create one in the same PR before or alongside implementation changes.
- If a PR spans multiple tasks, include all corresponding task files and keep dependency links accurate.
- PR summaries should reference task IDs directly for traceability and review speed.

## Update Cadence
Update when workflow contracts or metadata schema change.

## Source of Truth References
- `./epics/README.md`
- `./features/README.md`
- `./tasks/README.md`
- `./bugs/README.md`
- `./spikes/README.md`
