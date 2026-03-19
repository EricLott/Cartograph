---
id: task-004
title: Add latest project retrieval endpoint for frontend hydration
type: task
status: in_progress
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-20T21:06:51.622Z"
sla_due_at: "2026-04-08T23:59:00Z"
depends_on:
  - task-001
  - task-002
  - task-003
acceptance_criteria:
  - Endpoint returns latest project graph in frontend-compatible schema.
  - No-project case returns deterministic empty payload.
  - Endpoint errors use structured error format.
last_updated: 2026-03-19
---


# Task: Add latest project retrieval endpoint for frontend hydration

## Task Goal
Enable app startup restore by exposing latest saved project with nested pillars and decisions.

## Parent Feature
- feature-001

## Implementation Steps
- Create `GET /api/projects/latest` endpoint.
- Query and serialize project with recursive pillar and decision shape expected by frontend.
- Return empty-state response when no project exists.

## Dependencies
- task-001
- task-002
- task-003

## Acceptance Criteria
- Endpoint returns latest project graph in frontend-compatible schema.
- No-project case returns deterministic empty payload.
- Endpoint errors use structured error format.

## Evidence Plan
- API route diff and response examples.
- Manual fetch/curl output for populated and empty states.
- Progress log entry with endpoint verification notes.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.