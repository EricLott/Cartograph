---
id: feature-015
title: Semantic Cluster View
type: feature
status: in_progress
priority: P2
owner: ai-specialist
depends_on:
  - epic-005
acceptance_criteria:
  - Decisions are grouped on a 2D spatial canvas based on semantic similarity.
  - Integration with LLM embeddings (e.g., text-embedding-3-small) to generate "proximity" scores.
  - Hovering a cluster parent node highlights its constituent decisions across pillars.
last_updated: 2026-03-23
---

# Feature: Semantic Cluster View

## Problem Statement
Standard hierarchy (Pillars) doesn't capture lateral themes like "Security," "Performance," or "State Management" that cut across Frontend, Backend, and Infrastructure. These themes must be discovered semantically to identify redundant or conflicting decisions.

## User/System Behavior
- Users can toggle between "Hierarchical Graph" and "Semantic Cluster" modes.
- Nodes cluster together based on similarity scores.
- Spatial "clouds" identify emerging topics with clear labels.

## Dependencies
- feat-007 (Server Proxy)
- task-034 (Vector Store Seed)

## Child Task IDs
- task-039
- task-040
- task-041

## Notes
The goal is "Discovery Layer" as per the vision.md. "Vectors tell you 'these feel related,' but graph edges tell you 'this blocks that.'"
