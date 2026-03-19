# Workstreams

## Purpose
Define parallel delivery lanes for turning the current prototype into an execution-grade platform.

## Inputs
- `../01-architecture/*`
- `./implementation-strategy.md`
- Current repository baseline

## Outputs
- Workstream list with scope and dependencies

## Required Sections
- Workstream List (WS-###)
- Scope and Entry Criteria
- Exit Criteria
- Dependencies and Interfaces
- Coordination Rhythm

## Workstream List (WS-###)
- `WS-001`: Backend Persistence and API Hardening
- `WS-002`: Frontend Reliability and Security Hardening
- `WS-003`: Provider Integration Reliability
- `WS-004`: Agent-Pack Export Compiler
- `WS-005`: Quality Automation and CI

## Scope and Entry Criteria
- `WS-001` entry: task backlog seeded, backend constraints accepted.
- `WS-002` entry: baseline lint errors and UX risks documented.
- `WS-003` entry: provider failure modes identified.
- `WS-004` entry: export contract docs stabilized.
- `WS-005` entry: command matrix and test scaffolding plan drafted.

## Exit Criteria
- `WS-001`: non-destructive save + retrieval + health endpoint validated.
- `WS-002`: safe rendering and robust UI error handling shipped.
- `WS-003`: provider helper abstraction with timeout/retry in place.
- `WS-004`: full `00-07` export pack generated with schema checks.
- `WS-005`: automated lint/build/tests run in CI with PR gating.

## Dependencies and Interfaces
- `WS-002` depends on retrieval contract from `WS-001`.
- `WS-004` depends on stable task/doc contracts and partially on `WS-001` output shape.
- `WS-005` depends on deliverables from `WS-001..WS-004` for meaningful test coverage.

## Coordination Rhythm
- Daily status updates in `../05-state/progress-log.md`.
- Blocker and decision updates same day when encountered.
- Milestone review at each `M1-M4` checkpoint.

## Update Cadence
Update when workstream boundaries or handoffs change.

## Source of Truth References
- `./dependency-map.md`
- `../04-task-system/epics/`
- `../05-state/progress-log.md`