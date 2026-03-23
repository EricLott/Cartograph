---
id: epic-005
title: The Multi-View Interface
type: epic
status: in_progress
priority: P1
owner: product-architect
depends_on:
  - epic-001
  - epic-002
acceptance_criteria:
  - Graph, Cluster, Conflict, Dependency Path, and Mind Map modes are available as first-class tabs.
  - Cross-view selection stays synchronized between canvas and decision details.
  - Unresolved conflicts and dependency bottlenecks are visible without leaving the workspace.
last_updated: 2026-03-23
---

# Epic: The Multi-View Interface

## Vision Alignment
This epic directly implements the "Multi-View Interface" and "Living Decision System" sections of the Product Vision (`vision.md`). It moves the platform beyond simple pillar lists into a high-fidelity, node-based architectural workspace.

## Key Outcomes
1. **Interactive Decision Graph**: A force-directed or specialized node-link graph where edges express semantic meaning (dependency, conflict, supersedes).
2. **Semantic Discovery**: A 2D canvas of vectorized decision clusters to identify overlapping themes.
3. **Execution-Ready Paths**: Ability to view a "Dependency Path" to guide agent tasks.

## Features
- feature-014: Interactive Decision Graph Engine
- feature-015: Semantic Cluster View
- feature-016: Conflict Orchestration Dashboard
- feature-017: Dependency Path and Hierarchy Views

## Success Criteria
- [ ] Decision graph correctly renders relationships beyond simple hierarchy.
- [ ] Red edges appear between conflicting nodes.
- [ ] "Cluster mode" spatial layout reflects semantic similarity scores.

