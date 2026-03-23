---
doc_type: state_log
schema_version: 1
last_updated: 2026-03-19
---

# Decisions Log

## Purpose
Record decision context, alternatives, selection rationale, and effective date.

## Inputs
- Architectural tradeoffs
- Escalated questions requiring explicit resolution

## Outputs
- Durable decision ledger linked to execution artifacts

## Required Sections
- Decision Entry Schema
- Active Decisions
- Superseded Decisions

## Decision Entry Schema
```yaml
decision_id: dec-001
date: 2026-03-19
context: Why this decision is needed.
options:
  - Option A
  - Option B
chosen_option: Option A
rationale: Why Option A was selected.
linked_items:
  - task-001
  - blkr-001
status: active
```

## Active Decisions
- `dec-009` (2026-03-23): Adopted Sequelize-based AuditLog table for project state change tracking.
  - Options considered: file-based logs vs database-backed audit table.
  - Chosen: database-backed table (`AuditLog`).
  - Rationale: Provides structured, queryable, and durable evidence of state changes. Integrates naturally into existing project persistence transactions, ensuring atomicity (audit entry and project save succeed or fail together).
  - Linked items: `task-034`.

- `dec-008` (2026-03-21): Adopted self-referential many-to-many junction for Decision relationships.
  - Options considered: flat array of IDs in Decision model vs explicit junction table.
  - Chosen: junction table (`DecisionRelationship`).
  - Rationale: Supports arbitrary graph edges (depends_on, conflicts, supersedes) with stability and type-safety. Allows decisions to communicate across pillars without linear hierarchy constraints.
  - Linked items: `task-035`.

- `dec-007` (2026-03-21): Implement multi-tiered blueprint integrity validation.
  - Options considered: strict "all-pass" export vs multi-tiered error/warning system.
  - Chosen: multi-tiered system.
  - Rationale: Ensures baseline "agent-ready" quality (blocking on missing critical pillars) while allowing "draft" exports with quality warnings (short descriptions, pending decisions). This balances safety with developer flexibility.
  - Linked items: `task-028`.

- `dec-006` (2026-03-21): Implement ID-based upsert synchronization for Pillar and Decision persistence.
  - Options considered: complete reconstruction (destroy/recreate) vs ID-based synchronization.
  - Chosen: ID-based synchronization.
  - Rationale: Preserves historical metadata (e.g., `createdAt` timestamps, system IDs) and maintains stable references for external integrations or future versioning. Replaces the destructive "clear and rebuild" pattern while ensuring atomicity via transactions.
  - Linked items: `task-026`.

- `dec-005` (2026-03-20): Relax `exportService` guard to allow "in-progress" blueprint exports with automated blocker tagging.
  - Options considered: strict "all-answered" export vs permissive "blocker-tagged" export.
  - Chosen: permissive "blocker-tagged" export.
  - Rationale: Standardizes task quality and provides clear, observable objectives for agents even when some decisions are still pending. This allows for incremental architecture planning and execution.
  - Linked items: `task-020`.

- `dec-004` (2026-03-21): Enforce automated quality gates (lint/build/test) and task metadata contracts via GitHub Actions.
  - Options considered: manual pre-merge checks vs mandatory CI enforcement.
  - Chosen: mandatory CI enforcement.
  - Rationale: Ensures baseline quality, prevents regressions, and automates task-to-PR consistency validation.
  - Linked items: `task-017`.

- `dec-001` (2026-03-19): Prioritize non-destructive persistence and retrieval hardening before export expansion.
  - Options considered: keep prototype overwrite behavior vs targeted snapshot persistence.
  - Chosen: targeted persistence with transaction guarantees.
  - Linked items: `task-001`, `task-002`, `task-004`.

- `dec-002` (2026-03-19): Standardize claimable task workflow with claim expiry metadata.
  - Options considered: status-only task ownership vs explicit claim fields.
  - Chosen: explicit fields (`claim_owner`, `claim_status`, `claim_expires_at`, `sla_due_at`).
  - Linked items: `task-017`, task-system READMEs.

- `dec-003` (2026-03-19): Keep browser-side BYOK provider calls in near term while hardening reliability.
  - Options considered: immediate backend proxy rewrite vs incremental hardening.
  - Chosen: incremental hardening first; revisit proxy migration post-M2.
  - Linked items: `task-011`, `task-012`, `q-001`.

## Superseded Decisions
- None yet.

## Update Cadence
Update whenever a non-trivial decision is made, changed, or retired.

## Source of Truth References
- `../03-agent-ops/decision-making-framework.md`
- `./open-questions.md`
- `../01-architecture/*`