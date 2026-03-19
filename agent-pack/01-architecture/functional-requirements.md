# Functional Requirements

## Purpose
Define concrete, testable behaviors Cartograph must support in the next delivery cycle.

## Inputs
- `../00-context/business-goals.md`
- Current implementation review
- `../05-state/decisions-log.md`

## Outputs
- Prioritized functional requirements tied to execution tasks

## Required Sections
- Capability Inventory
- Requirement Statements (FR-###)
- Priority and Dependencies
- Acceptance Mapping

## Capability Inventory
- Interactive architecture decomposition.
- Stateful decision evolution.
- Durable persistence and project restoration.
- Agent-ready blueprint export.
- Contributor-task governance workflow.

## Requirement Statements (FR-###)
- `FR-001`: Generate top-level pillars from a free-text app idea.
- `FR-002`: Generate per-pillar subcategories and decision prompts.
- `FR-003`: Process follow-up user messages and update decision answers.
- `FR-004`: Persist architecture state without destructive deletion of prior project data.
- `FR-005`: Retrieve and hydrate the latest project state on app startup.
- `FR-006`: Provide explicit API health/readiness endpoint.
- `FR-007`: Export a full agent-pack blueprint zip aligned with `00-07` folder contract.
- `FR-008`: Prevent export completion when required decision answers are missing.
- `FR-009`: Capture and display provider/API errors with actionable UI feedback.
- `FR-010`: Enforce claim-aware task contribution rules through docs and task metadata.

## Priority and Dependencies
- `P0`: `FR-004`, `FR-005`, `FR-007`, `FR-009`.
- `P1`: `FR-006`, `FR-010`, refactors that reduce regressions in `FR-001..FR-003`.
- `FR-005` depends on backend retrieval capability from `FR-004`/`FR-006` scope.
- `FR-007` depends on stable architecture and task metadata contracts.

## Acceptance Mapping
- `FR-004` -> tasks `task-001`, `task-002`, `task-003`.
- `FR-005` -> tasks `task-004`, `task-006`.
- `FR-007` -> tasks `task-013`, `task-014`.
- `FR-009` -> tasks `task-009`, `task-011`, `task-012`.
- `FR-010` -> tasks `task-017` and workflow docs.

## Update Cadence
Update whenever capabilities are added, deprecated, or reprioritized.

## Source of Truth References
- `../00-context/business-goals.md`
- `../04-task-system/features/`
- `../06-quality/acceptance-criteria.md`