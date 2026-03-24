---
id: task-041
title: Add Semantic Cluster View to Frontend
type: task
status: in_progress
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-25T21:04:47.834Z"
sla_due_at: 2026-03-28
depends_on:
  - task-040
  - task-036
acceptance_criteria:
  - "New 'Cluster View' mode toggle in the `GraphView` component."
  - "Nodes reposition themselves on a 2D canvas based on the `/api/projects/:id/clusters` data."
  - "Cluster labels or colored 'clouds' appear around groups of similar decisions."
  - Hovering a node highlights others in the same cluster.
last_updated: 2026-03-24
---

# Task: Add Semantic Cluster View to Frontend

## Description
This task brings the semantic intelligence to the user. It adds a whole new way to visualize the architecture beyond the standard hierarchy, allowing users to discover hidden themes and risks.

## Execution Guidance
1.  Update `frontend/src/components/GraphView.jsx` to support a `mode` prop (Hierarchical vs. Cluster).
2.  Implement an animated transition between modes using React Flow's `fitView` and node position updates.
3.  Add visual decorators (background shapes or labels) for clusters.
4.  Ensure interactivity (click to select) is preserved in both modes.

## Expected Output
- A toggle in the UI that transforms the rigid tree into a spatial "semantic map."
