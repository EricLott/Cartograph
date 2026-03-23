---
id: feature-017
title: Dependency Path and Hierarchy Views
type: feature
status: backlog
priority: P1
owner: frontend-specialist
depends_on:
  - epic-005
  - feature-014
acceptance_criteria:
  - Dependency Path mode visualizes upstream prerequisites and downstream impact for a selected decision.
  - Mind Map/Hierarchy mode presents a planning-first tree rooted in product and feature branches.
  - Selection state is synchronized across Graph, Cluster, Dependency, and Hierarchy modes.
last_updated: 2026-03-23
---

# Feature: Dependency Path and Hierarchy Views

## Problem Statement
The current UI provides a graph and details view but does not provide the planning and execution lenses explicitly required by the vision: a dependency path view and a hierarchy-first mind map.

## User/System Behavior
- Users can switch to Dependency Path mode to inspect execution-critical chains.
- Users can switch to Hierarchy mode for executive planning and communication.
- Mode changes preserve selected decision context and details panel continuity.

## Dependencies
- Decision relationship graph API (`/api/decisions/:id/graph`).
- Existing React Flow graph infrastructure.

## Child Task IDs
- task-044
- task-045

