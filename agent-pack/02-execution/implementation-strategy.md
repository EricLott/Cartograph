# Implementation Strategy

## Purpose
Translate current Cartograph architecture into an execution path that autonomous contributors can follow with low ambiguity and high reliability.

## Inputs
- `../01-architecture/*`
- `../00-context/*`
- Current baseline checks (`frontend` lint/build status)

## Outputs
- Sequenced execution approach
- Risk-first priorities and gating rules

## Required Sections
- Execution Principles
- Sequencing Heuristics
- Task Decomposition Rules
- Risk-First Delivery Pattern
- Validation Gates

## Execution Principles
- Stabilize correctness before adding breadth.
- Prioritize data integrity, export contract fidelity, and contributor workflow reliability.
- Keep tasks atomic and evidence-driven.
- Prefer incremental refactors over large rewrites.

## Sequencing Heuristics
1. Fix blocking quality issues (lint/runtime reliability) to unlock safe iteration.
2. Harden persistence and retrieval API (non-destructive + transactional).
3. Improve frontend resilience (safe rendering, explicit error UX, hydration).
4. Build full export compiler aligned with agent-pack contract.
5. Add automated tests and CI enforcement.

## Task Decomposition Rules
- One atomic task = one principal deliverable.
- Each task must include direct acceptance criteria tied to commands or observable behavior.
- Dependencies must be explicit and minimal.

## Risk-First Delivery Pattern
- `Risk A`: data loss from destructive save path.
  - Mitigate via tasks `task-001` to `task-004`.
- `Risk B`: unsafe content rendering and weak error handling.
  - Mitigate via tasks `task-007` to `task-010`.
- `Risk C`: export contract mismatch.
  - Mitigate via tasks `task-013` and `task-014`.
- `Risk D`: low regression confidence.
  - Mitigate via tasks `task-015` to `task-017`.

## Validation Gates
- Gate 1: `frontend` lint/build are green.
- Gate 2: backend save/retrieve behavior validated through integration tests.
- Gate 3: export output includes required pack structure and key files.
- Gate 4: CI workflow enforces lint/build/test checks on PRs.

## Update Cadence
Update when execution priorities, dependencies, or risk posture change.

## Source of Truth References
- `./workstreams.md`
- `./dependency-map.md`
- `./definition-of-done.md`
- `../03-agent-ops/AGENTS.md`