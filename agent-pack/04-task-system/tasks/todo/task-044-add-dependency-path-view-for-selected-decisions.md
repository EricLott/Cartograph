---
id: task-044
title: Add Dependency Path View for Selected Decisions
type: task
status: todo
priority: P1
owner: frontend-specialist
claim_owner: null
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-02
depends_on:
  - task-035
  - task-036
  - task-043
acceptance_criteria:
  - "A `dependency` workspace mode renders upstream and downstream paths for the selected decision."
  - "The view uses `/api/decisions/:id/graph` data to derive and display prerequisite chains."
  - "Path depth and impacted-node counts are visible in the right-side decision context panel."
  - "Frontend tests validate path rendering and selection synchronization."
last_updated: 2026-03-23
---

# Task: Add Dependency Path View for Selected Decisions

## Description
Implement the execution-oriented dependency lens so agents and architects can evaluate sequencing and impact before implementation.

## Execution Guidance
1. Add dependency mode toggle and wiring in `frontend/src/App.jsx`.
2. Fetch and cache dependency graph data for the active decision.
3. Render focused path subgraphs and emphasize critical path edges.
4. Keep node selection synchronized with `PillarWorkspace`.

## Expected Output
- A dependency-path view that supports execution planning and prerequisite validation.

