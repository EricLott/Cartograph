---
id: task-029
title: Populate full 00-07 directory structure in export
type: task
status: pull_requested
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T18:56:42.633Z"
sla_due_at: "2026-04-20T23:59:00Z"
depends_on:
  - task-013
  - task-021
acceptance_criteria:
  - "Exported zip contains all folders: 00-context, 01-architecture, 02-execution, 03-agent-ops, 04-task-system, 05-state, 06-quality, 07-artifacts."
  - "Every folder contains at least a `README.md` or a core manifest."
  - "`03-agent-ops/AGENTS.md` is correctly seeded with the repository's contributor contract."
last_updated: 2026-03-21
---


# Task: Populate full 00-07 directory structure in export

## Task Goal
Deliver on the "Execution-Grade Blueprint" promise by ensuring the export isn't just a list of tasks, but a complete operating environment for an agent.

## Parent Feature
- feature-004 (Agent-Pack Compiler)

## Implementation Steps
- Expand `exportService` to include templates for all 8 directories.
- Dynamically populate:
    - `00-context/vision.md` (from project description).
    - `01-architecture/*` (from Pillar/Decision tree).
    - `03-agent-ops/AGENTS.md` (standard contract).
    - `06-quality/DefinitionOfDone.md` (standard template).
- Map all project Pillars to `01-architecture` documents.

## Dependencies
- task-013
- task-021

## Acceptance Criteria
- Exported zip contains all folders: 00-context, 01-architecture, 02-execution, 03-agent-ops, 04-task-system, 05-state, 06-quality, 07-artifacts.
- Every folder contains at least a `README.md` or a core manifest.
- `03-agent-ops/AGENTS.md` is correctly seeded.

## Evidence Plan
- Manual folder traversal of an exported zip.
- Verification that `vision.md` in the export reflects the actual project idea.
