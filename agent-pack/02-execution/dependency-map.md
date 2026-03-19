# Dependency Map

## Purpose
Define execution order across atomic tasks so contributors can work autonomously without unsafe overlap.

## Inputs
- `./workstreams.md`
- Seeded task backlog in `../04-task-system/tasks/`

## Outputs
- Directed task dependency graph and critical path

## Required Sections
- Dependency Nodes
- Dependency Edges
- Critical Path
- Parallel-Safe Segments
- Blocking Risks

## Dependency Nodes
- Backend hardening: `task-001`, `task-002`, `task-003`, `task-004`, `task-005`, `task-006`.
- Frontend reliability: `task-007`, `task-008`, `task-009`, `task-010`.
- Provider reliability: `task-011`, `task-012`.
- Export compiler: `task-013`, `task-014`.
- Quality/CI: `task-015`, `task-016`, `task-017`.

## Dependency Edges
- `task-002` depends on `task-001`.
- `task-004` depends on `task-001`, `task-002`, `task-003`.
- `task-006` depends on `task-004`.
- `task-012` depends on `task-011`.
- `task-014` depends on `task-013`.
- `task-015` depends on `task-007`, `task-013`.
- `task-016` depends on `task-002`, `task-004`.
- `task-017` depends on `task-015`, `task-016`.

## Critical Path
`task-001 -> task-002 -> task-004 -> task-006 -> task-013 -> task-014 -> task-015 -> task-017`

## Parallel-Safe Segments
- `task-003`, `task-005`, `task-007`, `task-008`, `task-009`, `task-010`, `task-011` can begin after `task-001` kickoff as capacity allows.

## Blocking Risks
- If `task-002` stalls, data integrity improvements and retrieval readiness stall.
- If `task-013` stalls, export value proposition and downstream export tests stall.
- If `task-015/016` stall, CI gating (`task-017`) cannot complete safely.

## Update Cadence
Update whenever task dependencies or IDs change.

## Source of Truth References
- `../04-task-system/tasks/`
- `../05-state/blockers.md`
- `../05-state/open-questions.md`