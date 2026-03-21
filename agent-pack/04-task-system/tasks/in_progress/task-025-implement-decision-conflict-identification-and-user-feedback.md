---
id: task-025
title: Implement decision conflict identification and user feedback
type: task
status: in_progress
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T14:36:57.810Z"
sla_due_at: "2026-06-15T23:59:00Z"
depends_on:
  - task-010
acceptance_criteria:
  - The UI highlights conflicting or logically inconsistent decisions within a pillar.
  - Users receive actionable feedback/suggestions to resolve identified conflicts.
  - Conflict hints are persisted and included in the exported pack metadata.
last_updated: 2026-03-21
---


# Task: Implement decision conflict identification and user feedback

## Task Goal
Improve the "agent-guided" part of the architecture platform by proactively identifying design conflicts.

## Parent Feature
- feature-002

## Implementation Steps
- Add a new "Conflict Detection" logic to `agentService.js` or a new specialized service.
- Update `PillarWorkspace.jsx` to display warning icons or banners when conflicts are detected.
- Capture LLM-provided conflict descriptions and persist them to the `Decision` model.
- Include these conflict hints in the exported task file AC or goal sections.

## Dependencies
- task-010

## Acceptance Criteria
- The UI highlights conflicting or logically inconsistent decisions within a pillar.
- Users receive actionable feedback/suggestions to resolve identified conflicts.
- Conflict hints are persisted and included in the exported pack metadata.

## Evidence Plan
- Screencast or walkthrough of a "conflicting" scenario in the UI.
- Verified persistence of conflict hints in the database.
- Export results showing conflict hints in task files.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to todo, and allow re-claim.
- Any PR implementing this task must include this task file.
