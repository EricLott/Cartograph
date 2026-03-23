---
id: feature-020
title: Semantic Clustering of Architectural Decisions
type: feature
status: cancelled
priority: P2
owner: data-viz
depends_on:
  - feature-015
acceptance_criteria:
  - A 2D spatial view groups decisions by similarity.
  - Nodes that are semantically close visually "clump" together.
  - Users can identify emerging themes (e.g., "Security Cluster") without manual tagging.
last_updated: 2026-03-23
---

# Feature: Semantic Clustering of Architectural Decisions

## Problem Statement
Standard taxonomies fail when architecture evolves rapidly. Spatial clustering reveals patterns that tags and folders miss.

## User/System Behavior
- Users navigate a "constellation" of ideas to find related tradeoffs.

## Dependencies
- Decision Vectorization (feature-018).

## Acceptance Criteria
- Integration of a spatial layout algorithm (e.g., Force-Atlas or t-SNE).
- Toggleable "Cluster View" in the UI.

## Child Task IDs
- task-039
- task-040
- task-041

## Cancellation Note
Superseded by `feature-015`, which now tracks the active semantic cluster implementation scope.
