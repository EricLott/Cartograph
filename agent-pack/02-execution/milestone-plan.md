# Milestone Plan

## Purpose
Define concrete checkpoints for delivering Cartograph's near-term hardening and export goals.

## Inputs
- `./implementation-strategy.md`
- `./dependency-map.md`
- Current codebase baseline

## Outputs
- Milestone objectives with entry/exit criteria

## Required Sections
- Milestone Catalog (M-###)
- Milestone Objectives
- Entry and Exit Criteria
- Risks and Contingencies
- Reporting Expectations

## Milestone Catalog (M-###)
- `M1` (Target: 2026-04-05): Baseline Stability and Persistence Safety
- `M2` (Target: 2026-04-20): Frontend Resilience and Provider Reliability
- `M3` (Target: 2026-05-05): Full Agent-Pack Export Contract
- `M4` (Target: 2026-05-15): Test/CI Enforcement and Contributor Readiness

## Milestone Objectives
- `M1`: Complete tasks `task-001..task-006`.
- `M2`: Complete tasks `task-007..task-012`.
- `M3`: Complete tasks `task-013..task-014`.
- `M4`: Complete tasks `task-015..task-017`.

## Entry and Exit Criteria
- Entry: prerequisite dependencies complete and claims active on milestone tasks.
- Exit: all milestone tasks are `done`, evidence logged, no unresolved `sev-1` blockers.

## Risks and Contingencies
- If provider reliability tasks slip, proceed with mock-mode validations while isolating provider-specific changes.
- If backend persistence changes require schema evolution, prioritize migration safety before additional features.

## Reporting Expectations
- Update `../05-state/progress-log.md` at each task state transition.
- Add milestone completion summary to `../05-state/change-log.md`.

## Update Cadence
Update when dates, scope, or dependency graph changes.

## Source of Truth References
- `../05-state/progress-log.md`
- `../05-state/change-log.md`
- `../06-quality/acceptance-criteria.md`