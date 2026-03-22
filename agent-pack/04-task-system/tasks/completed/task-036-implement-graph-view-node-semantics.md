---
id: task-036
title: Implement Decision Graph Node Semantics (High Fidelity)
type: task
status: completed
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: released
claim_expires_at: null
depends_on:
  - task-035
acceptance_criteria:
  - "Replace the current static Mermaid `DependencyGraph` with an interactive D3 or React Flow canvas."
  - Nodes sized and colored by status (Resolved vs. Pending).
  - "Edges visually styled by relationship type (solid, dashed, red)."
  - "Synchronize \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"Active Decision\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\" between the graph selection and the workspace detail pane."
last_updated: 2026-03-22
---

# Task: Implement Decision Graph Node Semantics

## Description
This task moves the frontend from a hierarchical Mermaid tree into a true node-graph. This is the first step toward the "Operational Core" of the UI.

## Execution Guidance
1.  **Library Selection**: React Flow recommended for "interactive diagramming" or X6.
2.  **Implementation**:
    - Build a `DecisionGraphEngine` component.
    - Map the `pillars.decisions` tree into a flat node list for the graph.
    - Connect nodes based on the `links` model from task-035.
3.  **Visual Language**:
    - **Neutral**: Pending decisions.
    - **Blue**: Resolved decisions.
    - **Red/Glow**: Conflict nodes.
    - **Arrows**: `depends_on` direction.

## Expected Output
- A new `GraphView` component that is dynamic, not just a SVG string.
- Drag-and-drop node positioning.
- Real-time updates when a decision is answered in the workspace.

## Completion Criteria
- [ ] Nodes correctly show relationship edges.
- [ ] Selecting a node in the graph opens the corresponding pillar detail.
- [ ] Conflict nodes are visually prominent with a red glow or badge.
