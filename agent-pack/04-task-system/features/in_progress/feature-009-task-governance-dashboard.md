---
id: feature-009
title: Task Governance Dashboard
type: feature
status: in_progress
priority: P2
owner: product-ops
depends_on:
  - epic-003
acceptance_criteria:
  - New UI view displaying the status and owner of all tasks across the system.
  - Explicit visualization of task dependencies (Gantt or Kanban-style graph).
  - Ability to manually release claims or reassign tasks from the UI.
last_updated: 2026-03-21
---

# Feature: Task Governance Dashboard

## Problem Statement
As the number of tasks and agents grows, it becomes difficult to track work-in-progress and identify bottlenecks without manually inspecting markdown files.

## User/System Behavior
- Administrators can see an overview of the entire mission state.
- Expired claims are visually flagged for reclaim.
- Dependency chains are clearly mapped.

## Dependencies
- feat-007

