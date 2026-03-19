# Data Architecture

## Purpose
Define current data model behavior and the hardening path for safe persistence.

## Inputs
- Sequelize model definitions in backend
- Persistence behavior observed in code review

## Outputs
- Data storage strategy and integrity requirements

## Required Sections
- Data Stores and Ownership
- Access Patterns
- Consistency and Integrity Rules
- Retention and Archival
- Migration and Backfill Strategy

## Data Stores and Ownership
- Primary store: MySQL 8 (`cartograph_db`) via Docker Compose.
- ORM: Sequelize models (`Project`, `Pillar`, `Decision`).
- Ownership:
  - Backend owns DB writes/reads.
  - Frontend owns transient UI state and local provider settings.

## Access Patterns
- Current: full snapshot write on each save event.
- Needed: non-destructive snapshot strategy that supports latest-project retrieval and optional history.
- Read pattern target: single endpoint to retrieve most recent project with nested pillars/decisions.

## Consistency and Integrity Rules
- Save operations must execute in a transaction.
- Recursive pillar and decision creation must rollback on any child failure.
- `Project.destroy({ where: {} })` behavior must be removed.
- Payload validation must reject malformed graph structures.

## Retention and Archival
- Near-term: retain at least latest successful project snapshot.
- Mid-term: retain last N snapshots (configurable) for recovery and history.

## Migration and Backfill Strategy
- Prefer additive migrations over destructive schema changes.
- Replace `sequelize.sync({ alter: true })` in production paths with explicit migrations when project matures.
- Backfill existing data only when introducing new non-null columns.

## Update Cadence
Update with every schema or persistence-behavior change.

## Source of Truth References
- `./security-architecture.md`
- `../06-quality/security-checklist.md`
- `../05-state/decisions-log.md`