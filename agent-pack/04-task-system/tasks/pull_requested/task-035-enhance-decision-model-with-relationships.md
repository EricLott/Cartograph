---
id: task-035
title: Enhance Decision Model with Semantic Relationships
type: task
status: pull_requested
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-23T01:57:31.195Z"
sla_due_at: 2026-03-24
depends_on:
  - task-026
acceptance_criteria:
  - "Update `Decision` model in `backend/models/index.js` to include `rationale`, `constraints`, and metadata tags."
  - "Create a new `Relationship` model to store directed edges between decisions."
  - "CRUD support for relationship types (depends_on, conflicts, supersedes)."
  - Backend migration preserves existing data.
last_updated: 2026-03-22
---

# Task: Enhance Decision Model with Semantic Relationships

## Description
To support the vision of "Decision-as-a-Node," we must move beyond a flat Pillar->Decision hierarchy. Decisions must communicate with each other across pillars.

## Execution Guidance
1.  **Model Expansion**:
    - Add `rationale: TEXT`, `constraints: TEXT`, `tags: JSON/ARRAY` to `Decision`.
2.  **Edge Modeling**:
    - Create `DecisionRelationship` table: `fromId`, `toId`, `type` (ENUM), `strength`.
3.  **API Integration**:
    - `POST /api/decisions/:id/link`
    - `GET /api/decisions/:id/graph` to fetch immediate neighbors.
4.  **Migration**:
    - Use `sequelize.sync({ alter: true })` or a dedicated migration script within the migration epic.

## Expected Output
- Decision objects in JSON include a "links" array of related decisions.
- Backend DB supports arbitrary m-to-m links between nodes.

## Completion Criteria
- [ ] Database schema updated without data loss.
- [ ] All new fields returned in the `/api/projects/latest` payload.
- [ ] Successful unit tests for cross-pillar relationship retrieval.
