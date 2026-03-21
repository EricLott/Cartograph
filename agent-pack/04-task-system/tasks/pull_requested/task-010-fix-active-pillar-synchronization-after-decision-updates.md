---
id: task-010
title: Fix active pillar synchronization after decision updates
type: task
status: pull_requested
priority: P2
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T14:12:07.183Z"
sla_due_at: "2026-04-12T23:59:00Z"
depends_on:
  - task-006
acceptance_criteria:
  - Decision updates do not leave stale or incorrect active pillar state.
  - Nested pillar workflows remain usable without forced navigation resets.
last_updated: 2026-03-21
---


# Task: Fix active pillar synchronization after decision updates

## Task Goal
Eliminate stale pillar-selection behavior after nested decision updates.

## Parent Feature
- feature-002

## Implementation Steps
- Refactor decision update flow to keep active pillar reference in sync.
- Preserve UX context where possible instead of always resetting to null.
- Verify nested subcategory selections remain coherent after updates.

## Dependencies
- task-006

## Acceptance Criteria
- Decision updates do not leave stale or incorrect active pillar state.
- Nested pillar workflows remain usable without forced navigation resets.

## Evidence Plan
- State update logic diff.
- Manual nested decision update walkthrough notes.
- Progress log entry with UX verification summary.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.