---
id: task-043
title: Add Conflict View Mode for Unresolved Decision Edges
type: task
status: todo
priority: P1
owner: frontend-specialist
claim_owner: null
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-01
depends_on:
  - task-035
  - task-036
acceptance_criteria:
  - "A new `conflict` workspace mode is available alongside existing graph/details modes."
  - "Conflict mode lists unresolved conflict edges with source and target decision labels."
  - "Selecting a conflict focuses and highlights both nodes and the connecting red edge in the canvas."
  - "Frontend tests cover mode switching and conflict focus behavior."
last_updated: 2026-03-23
---

# Task: Add Conflict View Mode for Unresolved Decision Edges

## Description
Implement the focused conflict lens required by the Multi-View interface so users can quickly triage architectural contradictions.

## Execution Guidance
1. Add a conflict mode toggle in `frontend/src/App.jsx`.
2. Extend `frontend/src/components/GraphView.jsx` to accept a conflict-focused rendering mode.
3. Build a conflict list panel sourced from decision relationship metadata.
4. Ensure click-through synchronization to decision detail context.

## Expected Output
- A dedicated conflict-focused view that reduces time-to-triage for unresolved architectural conflicts.

