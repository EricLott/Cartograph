# Assumptions

## Purpose
Track non-critical assumptions currently used to keep implementation moving while remaining auditable.

## Inputs
- Current repo behavior and configuration
- Known architectural gaps and open questions

## Outputs
- Explicit assumption register linked to tasks and decisions

## Required Sections
- Assumption Register
- Validation Plan
- Revisit Triggers

## Assumption Register
| assumption_id | statement | scope | linked_task | risk_level | owner | date_logged | review_by | status |
|---|---|---|---|---|---|---|---|---|
| asm-001 | It is acceptable to keep direct browser-to-LLM provider calls in short term while reliability hardening proceeds. | frontend, integration | task-011 | medium | architecture | 2026-03-19 | 2026-04-15 | active |
| asm-002 | Docker Compose remains the primary supported local runtime for the next milestone cycle. | infra | task-017 | low | devops | 2026-03-19 | 2026-04-30 | active |
| asm-003 | First production-grade tests can focus on API persistence + export correctness before broader UI automation. | quality | task-015 | low | quality | 2026-03-19 | 2026-04-20 | active |
| asm-004 | React Flow or D3-based libraries will provide sufficient performance for the initial Decision Graph deployment. | frontend | task-036 | medium | architecture | 2026-03-21 | 2026-05-15 | active |
| asm-005 | Completing Conflict, Dependency Path, and Mind Map views after Graph/Cluster foundations is acceptable if explicitly tracked as P1 backlog work. | frontend, product | task-043 | medium | product-architect | 2026-03-23 | 2026-05-15 | active |


## Validation Plan
- Validate each assumption when linked tasks complete.
- Convert invalid assumptions into blockers or formal decisions.

## Revisit Triggers
- Security/compliance requirement changes.
- Data integrity incidents or rollback failures.
- Contributor conflicts caused by assumption drift.

## Update Cadence
Update whenever assumptions are added, validated, superseded, or retired.

## Source of Truth References
- `./vision.md`
- `./constraints.md`
- `../03-agent-ops/AGENTS.md`
- `../05-state/decisions-log.md`
