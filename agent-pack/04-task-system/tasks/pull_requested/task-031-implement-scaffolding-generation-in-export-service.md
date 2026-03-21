---
id: task-031
title: Implement Scaffolding Generation in exportService.js
type: task
status: pull_requested
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T00:00:00.000Z"
sla_due_at: 2026-03-22
depends_on:
  - feat-008
acceptance_criteria:
  - "`exportService.js` now iterates through all Decisions to create individual tasks in `04-tasks/tasks`."
  - "Task content includes `Acceptance Criteria` and `Inputs` sections by default."
  - Tasks are linked to their source Feature and parent Workstream via frontmatter.
  - New unit tests prove that an export with 5 decisions generates at least 5 discrete tasks.
last_updated: 2026-03-21
---

# Task: Implement Scaffolding Generation in exportService.js

## Description
Modify the `exportService.js` to transition from static artifact generation to dynamic task scaffolding. Every architectural decision made by the user or agent should naturally decompose into at least one actionable task in the pack export.

## Execution Guidance
1. Refactor `processPillarTasks` to handle recursive decision-to-task mapping.
2. Use the `04-task-system` schema from `AGENTS.md` for the generated files.
3. Ensure IDs are unique and stable for consecutive exports.
