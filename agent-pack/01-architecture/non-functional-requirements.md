# Non-Functional Requirements

## Purpose
Define quality and operational targets needed for reliable autonomous contribution and delivery.

## Inputs
- `../00-context/constraints.md`
- Current runtime and lint/build baselines

## Outputs
- NFR catalog with measurable targets

## Required Sections
- Availability and Resilience
- Performance and Scale
- Security and Compliance
- Operability and Observability
- Cost and Governance Constraints

## Availability and Resilience
- `NFR-001`: Local stack startup via Docker Compose should succeed within 5 minutes on a typical dev machine.
- `NFR-002`: Persistence path must be transaction-safe so partial saves do not corrupt active project state.
- `NFR-003`: Critical endpoints return structured error payloads (`error`, `details`) for failure triage.

## Performance and Scale
- `NFR-004`: First paint in frontend should stay under 3 seconds on local dev hardware after warm start.
- `NFR-005`: Save-state endpoint should persist typical payload (<300 decisions) in <2 seconds locally.
- `NFR-006`: Export generation should complete in <5 seconds for typical project sizes.

## Security and Compliance
- `NFR-007`: Prevent script injection in chat display and generated content rendering.
- `NFR-008`: Do not persist BYOK secrets to backend or repository.
- `NFR-009`: Do not proceed through critical-risk ambiguity without blocker/escalation logs.

## Operability and Observability
- `NFR-010`: Provide health endpoint for readiness checks.
- `NFR-011`: Maintain progress, decision, and blocker logs in agent-pack state files.
- `NFR-012`: CI should enforce lint/build/tests for merge readiness once tests exist.

## Cost and Governance Constraints
- Keep core stack open-source and low operational complexity.
- Prefer incremental hardening over large rewrites to preserve contributor momentum.

## Update Cadence
Review during each milestone planning cycle and whenever constraints shift.

## Source of Truth References
- `../06-quality/testing-strategy.md`
- `../06-quality/performance-budget.md`
- `./security-architecture.md`