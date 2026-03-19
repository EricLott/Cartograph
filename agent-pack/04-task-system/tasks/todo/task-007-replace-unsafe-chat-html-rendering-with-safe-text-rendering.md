---
id: task-007
title: Replace unsafe chat HTML rendering with safe text rendering
type: task
status: todo
priority: P0
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-09T23:59:00Z
depends_on: []
acceptance_criteria:
  - Chat rendering no longer uses `dangerouslySetInnerHTML`.
  - Messages still support multiline display in both roles.
  - No visual regression for basic chat history display.
last_updated: 2026-03-19
---

# Task: Replace unsafe chat HTML rendering with safe text rendering

## Task Goal
Remove XSS-prone rendering path from chat messages.

## Parent Feature
- feature-002

## Implementation Steps
- Remove `dangerouslySetInnerHTML` from chat bubble rendering.
- Render line breaks safely using text nodes and React mapping.
- Verify agent and user messages display correctly after change.

## Dependencies
- None.

## Acceptance Criteria
- Chat rendering no longer uses `dangerouslySetInnerHTML`.
- Messages still support multiline display in both roles.
- No visual regression for basic chat history display.

## Evidence Plan
- Component diff for rendering path.
- Manual UI validation screenshots or notes.
- Progress log entry documenting security improvement.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.