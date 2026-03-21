---
id: task-020
title: Refine task template with evidence-driven acceptance criteria
type: task
status: pull_requested
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T03:07:16.434Z"
last_updated: 2026-03-21
---


# Task: Refine task template with evidence-driven acceptance criteria

## Task Goal
Standardize task quality within the exported pack so agents have clear, observable objectives.

## Parent Feature
- feature-004

## Implementation Steps
- [x] Enhance `exportService.js` to dynamically build individual AC items based on pillar/decision context.
- [x] Update the markdown generation template to include "Evidence Required" block for each task.
- [x] Verify that "Pending Resolution" decisions are tagged as blockers or risks in task AC.

## Dependencies
- task-014

## Acceptance Criteria
- [x] Exported tasks include a structured `## Acceptance Criteria` section.
- [x] Acceptance criteria are automatically derived from decision answers and pillar goals.
- [x] Include an `## Evidence Required` section in every task markdown.

## Evidence Plan
- [x] Unit tests in `exportService.test.js` verify AC and Evidence Required section generation.
- [x] Blockers are correctly tagged in the exported markdown.
- [x] Progress log confirms completion and architectural decision is documented.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to todo, and allow re-claim.
- Any PR implementing this task must include this task file.
