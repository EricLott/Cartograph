---
id: task-040
title: Implement Decision Clustering Logic and API
type: task
status: in_progress
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-25T16:23:38.468Z"
sla_due_at: 2026-03-27
depends_on:
  - task-039
  - task-035
acceptance_criteria:
  - "New service `backend/services/clusteringService.js` that calculates 2D coordinates for decisions using embeddings."
  - "Use a dimensionality reduction algorithm (e.g., PCA or t-SNE) or simple spatial grouping."
  - "New endpoint `GET /api/projects/:projectId/clusters` returning `{ decisionId, x, y, clusterLabel }` for all decisions."
  - Integration tests verify coordinate generation for a project with multiple decisions.
last_updated: 2026-03-24
---

# Task: Implement Decision Clustering Logic and API

## Description
This task implements the "Semantic Intelligence" layer. It takes the high-dimensional embeddings generated in Task 039 and maps them to a 2D space suitable for visualization in the Cluster View.

## Execution Guidance
1.  Create `backend/services/clusteringService.js`.
2.  Implement a basic 2D mapping algorithm. For initial implementation, simple K-means clustering or a JS-based t-SNE/UMAP library can be used.
3.  Ensure the coordinates are stable or Cached to prevent "jitter" on every refresh.
4.  Add the cluster data to the project retrieval flow or a dedicated endpoint.

## Expected Output
- A list of decisions with associated 2D coordinates and cluster groups.
