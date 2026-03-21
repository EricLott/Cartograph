---
id: task-020
title: Refine task template with evidence-driven acceptance criteria
type: task
status: in_progress
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T03:07:16.434Z"
sla_due_at: "2026-05-15T23:59:00Z"
depends_on:
  - task-014
acceptance_criteria:
  - "Exported tasks include a structured `## Acceptance Criteria` section."
  - Acceptance criteria are automatically derived from decision answers and pillar goals.
  - "Include an `## Evidence Required` section in every task markdown."
last_updated: 2026-03-21
---


# Task: Refine task template with evidence-driven acceptance criteria

## Task Goal
Standardize task quality within the exported pack so agents have clear, observable objectives.

## Parent Feature
- feature-004

## Implementation Steps
- Enhance `exportService.js` to dynamically build individual AC items based on pillar/decision context.
- Update the markdown generation template to include "Evidence Required" block for each task.
- Verify that "Pending Resolution" decisions are tagged as blockers or risks in task AC.

## Dependencies
- task-014

## Acceptance Criteria
- Exported tasks include a structured `## Acceptance Criteria` section.
- Acceptance criteria are automatically derived from decision answers and pillar goals.
- Include an `## Evidence Required` section in every task markdown.

## Evidence Plan
- Sample exported zip showing tasks with detailed AC and evidence-driven placeholders.
- Progress log confirms completion of task goal.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to todo, and allow re-claim.
- Any PR implementing this task must include this task file.
