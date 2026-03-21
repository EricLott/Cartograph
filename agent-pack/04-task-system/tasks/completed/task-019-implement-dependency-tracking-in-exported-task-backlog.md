---
id: task-019
title: Implement dependency tracking in exported task backlog
type: task
status: completed
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: released
claim_expires_at: null
sla_due_at: "2026-05-15T23:59:00Z"
depends_on:
  - task-014
acceptance_criteria:
  - "Exported tasks reflect hierarchy-based dependencies (e.g., sub-pillars depend on parent pillars)."
  - "The `depends_on` metadata field in task markdown is populated correctly."
  - "The exported `dependency-map.md` is consistent with the `depends_on` tags in task files."
last_updated: 2026-03-21
---

# Task: Implement dependency tracking in exported task backlog

## Task Goal
Provide autonomous agents with clear execution order by including dependency metadata in the exported blueprint.

## Parent Feature
- feature-004

## Implementation Steps
- Update `exportService.js` to track pillar and subcategory relationships as dependencies.
- Map parent/child hierarchy to task IDs within the `processPillarTasks` recursion.
- Update task markdown template to inject the identified dependency IDs into the `depends_on` frontmatter.

## Dependencies
- task-014

## Acceptance Criteria
- Exported tasks reflect hierarchy-based dependencies (e.g., sub-pillars depend on parent pillars).
- The `depends_on` metadata field in task markdown is populated correctly.
- The exported `dependency-map.md` is consistent with the `depends_on` tags in task files.

## Evidence Plan
- Sample exported zip showing tasks with populated `depends_on` fields.
- Verified consistency between `dependency-map.md` and individual task files.
- Integration test confirming dependency resolution in `exportService.js`.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to todo, and allow re-claim.
- Any PR implementing this task must include this task file.
