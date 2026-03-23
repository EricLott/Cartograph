---
id: task-045
title: Add Mind Map Hierarchy Mode to Main Canvas
type: task
status: todo
priority: P1
owner: frontend-specialist
claim_owner: null
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-03
depends_on:
  - task-036
acceptance_criteria:
  - "A `mindmap` workspace mode renders a hierarchy-first tree rooted by pillar and decision branches."
  - "Users can expand/collapse branches and keep active decision selection synchronized with details."
  - "The hierarchy view is responsive on desktop and mobile layouts."
  - "Frontend tests cover branch expansion behavior and cross-view selection sync."
last_updated: 2026-03-23
---

# Task: Add Mind Map Hierarchy Mode to Main Canvas

## Description
Implement the planning-layer view promised in the vision so stakeholders can reason about structure without graph complexity.

## Execution Guidance
1. Add a new mind-map mode toggle in the workspace header.
2. Implement a hierarchy canvas component sourced from existing pillar/decision tree data.
3. Add branch expansion and focus interactions.
4. Preserve selection state across graph, cluster, dependency, and hierarchy modes.

## Expected Output
- A mind-map/hierarchy planning mode integrated into the Multi-View workspace.

