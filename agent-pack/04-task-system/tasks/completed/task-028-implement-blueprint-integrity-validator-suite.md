---
id: task-028
title: Implement blueprint integrity validator suite
type: task
status: completed
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: released
claim_expires_at: null
sla_due_at: "2026-04-10T23:59:00Z"
depends_on:
  - task-014
acceptance_criteria:
  - Export is blocked if critical pillars (Frontend/Backend/Data) are missing or empty.
  - "Validator checks for \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"pending decisions\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\" and warns user before export."
  - "Validator outputs a structured report of \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"missing metadata\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\" (descriptions, context)."
last_updated: 2026-03-21
---


# Task: Implement blueprint integrity validator suite

## Task Goal
Ensure that exported mission packs are of high quality and actually "agent-ready" by validating the blueprint against the vision contract.

## Parent Feature
- feature-004 (Agent-Pack Compiler)

## Implementation Steps
- Create a `ValidationService` that traverses the project tree.
- Implement rules for:
    - Mandatory Pillars (at least 3 from the standard set).
    - Description word count (minimum 10 words per pillar).
    - Unresolved Decisions (warning/blocking).
- Integrate validator into the Export flow to provide immediate feedback in the UI.

## Dependencies
- task-014

## Acceptance Criteria
- Export is blocked if critical pillars (Frontend/Backend/Data) are missing or empty.
- Validator checks for "pending decisions" and warns user before export.
- Validator outputs a structured report of missing metadata.

## Evidence Plan
- Unit tests for the validation logic with mock project states.
- UI screenshot showing the validation error/warning modal during export.
