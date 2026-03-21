---
id: epic-005
title: The Multi-View Interface
status: todo
priority: P1
owner: product-architect
depends_on:
  - epic-001
  - epic-002
description: Implement the core visualization engine for Cartograph, transforming it from a static documentation tool into a living decision graph.
---

# Epic: The Multi-View Interface

## Vision Alignment
This epic directly implements the "Multi-View Interface" and "Living Decision System" sections of the Product Vision (`vision.md`). It moves the platform beyond simple pillar lists into a high-fidelity, node-based architectural workspace.

## Key Outcomes
1. **Interactive Decision Graph**: A force-directed or specialized node-link graph where edges express semantic meaning (dependency, conflict, supersedes).
2. **Semantic Discovery**: A 2D canvas of vectorized decision clusters to identify overlapping themes.
3. **Execution-Ready Paths**: Ability to view a "Dependency Path" to guide agent tasks.

## Features
- feat-0014: Interactive Decision Graph
- feat-0015: Semantic Cluster View
- feat-0016: Conflict Orchestration Dashboard

## Success Criteria
- [ ] Decision graph correctly renders relationships beyond simple hierarchy.
- [ ] Red edges appear between conflicting nodes.
- [ ] "Cluster mode" spatial layout reflects semantic similarity scores.
