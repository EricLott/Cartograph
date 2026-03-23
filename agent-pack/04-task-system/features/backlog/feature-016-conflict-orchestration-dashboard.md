---
id: feature-016
title: Conflict Orchestration Dashboard
type: feature
status: backlog
priority: P1
owner: product-architect
depends_on:
  - epic-005
  - feature-014
acceptance_criteria:
  - A dedicated Conflict View mode lists unresolved conflicts with impacted decisions and relationship type.
  - Selecting a conflict focuses the related nodes and edges in the canvas.
  - Conflict-specific actions guide users toward a resolution workflow (inspect, compare, resolve).
last_updated: 2026-03-23
---

# Feature: Conflict Orchestration Dashboard

## Problem Statement
Conflicts are currently visible only as red edges in the graph, which is insufficient for triage at scale. Users need a focused lens that surfaces unresolved conflict hotspots and actionable next steps.

## User/System Behavior
- Users can open a Conflict View that filters the workspace to unresolved conflicts.
- Each conflict record includes source decision, target decision, and relationship metadata.
- Clicking a conflict synchronizes graph focus and decision details.

## Dependencies
- Relationship modeling from `task-035`.
- Interactive graph foundation from `task-036`.

## Child Task IDs
- task-043

