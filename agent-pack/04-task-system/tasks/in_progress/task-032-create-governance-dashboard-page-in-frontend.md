---
id: task-032
title: Create Governance Dashboard Page in Frontend
type: task
status: in_progress
priority: P2
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-23T02:17:35.770Z"
sla_due_at: 2026-03-24
depends_on:
  - feature-009
acceptance_criteria:
  - "New route `/governance` in the frontend application."
  - "Table or graph view displaying all project tasks, their status, and their current claim owner."
  - Visual indicator for tasks with expired claims.
  - Filter by Feature or Workstream.
last_updated: 2026-03-22
---

# Task: Create Governance Dashboard Page in Frontend

## Description
Build the foundational UI for task governance. This dashboard will allow human operators to monitor the health of the mission's execution and manage agent claims at scale.

## Execution Guidance
1. Register a new component `GovernanceDashboard.jsx`.
2. Fetch task data from the backend (may require new `GET /api/tasks` endpoint).
3. Implement basic claim release functionality (e.g., "Clear Stale Claim" button).
