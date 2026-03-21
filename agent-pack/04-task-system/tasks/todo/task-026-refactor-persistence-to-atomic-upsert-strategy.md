---
id: task-026
title: Refactor persistence to atomic upsert strategy
type: task
status: todo
priority: P0
owner: architecture
claim_owner: null
claim_status: released
claim_expires_at: null
sla_due_at: "2026-04-10T23:59:00Z"
depends_on:
  - task-001
  - task-002
acceptance_criteria:
  - Saving a project no longer involves a `destroy` call for existing Pillars or Decisions.
  - New Pillars/Decisions are created; existing ones are updated via ID match.
  - Database transactions ensure atomicity across the entire tree.
last_updated: 2026-03-20
---

# Task: Refactor persistence to atomic upsert strategy

## Task Goal
Eliminate the remaining destructive "targeted clear" behavior in the save path to ensure metadata and history are preserved.

## Parent Feature
- feature-001 (Persistence Hardening)

## Implementation Steps
- Update `POST /api/save-state` to perform a diff between the incoming JSON and the current DB state for the project.
- Implement an upsert loop for Pillars and Decisions that preserves primary keys.
- Replace `Pillar.destroy({ where: { ProjectId: project.id } })` with logical deletions or record synchronization.

## Dependencies
- task-001
- task-002

## Acceptance Criteria
- Saving a project no longer involves a `destroy` call for existing Pillars or Decisions.
- New Pillars/Decisions are created; existing ones are updated via ID match.
- Database transactions ensure atomicity across the entire tree.

## Evidence Plan
- Backend unit tests verifying that `createdAt` timestamps for existing pillars remain unchanged after a save.
- DB logs showing `UPDATE` calls instead of `DELETE` + `INSERT` for existing records.
