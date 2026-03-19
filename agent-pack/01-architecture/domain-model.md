# Domain Model

## Purpose
Define the canonical entities and relationships that power architecture capture, persistence, and export.

## Inputs
- Current Sequelize models in `backend/server.js`
- Frontend pillar/decision state shape

## Outputs
- Entity definitions and behavioral invariants

## Required Sections
- Domain Boundaries
- Core Entities
- Relationships and Invariants
- Lifecycle Events
- Data Ownership Rules

## Domain Boundaries
- Architecture authoring domain: ideas, pillars, decisions.
- Execution-pack domain: docs, tasks, and state logs.
- Contributor operations domain: claims, statuses, and PR traceability.

## Core Entities
- `Project`: top-level idea and persisted snapshot owner.
- `Pillar`: architecture node with recursive hierarchy support.
- `Decision`: question/context/answer attached to pillar.
- `Task Artifact` (markdown): atomic work unit with metadata and claim fields.

## Relationships and Invariants
- One `Project` has many root `Pillar` records.
- One `Pillar` has many child `Pillar` records (`parentId` adjacency model).
- One `Pillar` has many `Decision` records.
- `Decision.answer` may be null until resolved.
- Task IDs are immutable once created.

## Lifecycle Events
- `project_initialized`
- `pillars_generated`
- `subcategories_generated`
- `decision_answered`
- `state_persisted`
- `blueprint_exported`
- `task_claimed` / `task_claim_expired` / `task_completed`

## Data Ownership Rules
- Frontend owns BYOK provider keys in browser local storage.
- Backend owns persisted architecture snapshots and related metadata.
- Agent-pack markdown owns execution/task/state records for contributor workflows.

## Update Cadence
Update when entities or invariants change.

## Source of Truth References
- `../07-artifacts/glossary.md`
- `./data-architecture.md`
- `./api-strategy.md`