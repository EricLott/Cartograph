---
id: epic-004
title: Multi-Mode Architectural UI
type: epic
status: backlog
priority: P1
owner: unassigned
depends_on:
  - epic-003
acceptance_criteria:
  - Users can toggle between Graph, Semantic Cluster, and Mind Map views.
  - The UI remains performant with >100 decision nodes.
  - Interactive elements (drag-and-drop, zoom, focus) are fluid.
last_updated: 2026-03-20
---

# Epic: Multi-Mode Architectural UI

## Epic Summary
Deliver the multi-view lens promised in the vision. Architecture isn't one-dimensional; different stakeholders need different abstractions. This epic implements the specialized visualizations required for discovery, planning, and execution.

## Outcome Metrics
- Switch time between views < 500ms.
- Positive user feedback on "Cluster View" for identifying emerging patterns.

## In Scope
- Decision Graph View (the operational core).
- Semantic Cluster View (spatial 2D canvas).
- Mind Map / Hierarchy View (executive planning).
- Dependency Path View (agent execution guide).

## Out of Scope
- VR/AR visualization.
- High-fidelity SVG/PDF exports of every specialized view (initially).

## Child Feature IDs
- feature-009
- feature-010

## Risks
- Frontend performance issues with complex graph layouts.
- Data visualization library selection and learning curve.
