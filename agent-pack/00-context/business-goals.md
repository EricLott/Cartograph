# Business Goals

## Purpose
Define concrete outcomes for evolving Cartograph from a working prototype into an agent-ready, open-source delivery platform.

## Inputs
- Current implementation in `frontend/` and `backend/`
- Product vision in `./vision.md`
- Contributor workflow requirements in `../03-agent-ops/AGENTS.md`

## Outputs
- Prioritized goals with measurable outcomes
- Time-bound objectives that map to implementation tasks

## Required Sections
- Goal Catalog
- Success Metrics
- Priority Ordering
- Time Horizon

## Goal Catalog
| goal_id | objective | metric | baseline (2026-03-19) | target | target_date | priority |
|---|---|---|---|---|---|---|
| bg-001 | Make blueprint output agent-ready (not just summary) | Exported zip includes full structured pack and required key files | Export currently writes only `agents.md` + basic per-pillar task files | Export generates complete `00-07` pack with structured core docs and task scaffolding | 2026-05-01 | P0 |
| bg-002 | Eliminate destructive persistence behavior | Percent of saves that preserve prior project history/state integrity | `POST /api/save-state` currently deletes all projects before save | Non-destructive save path with retrieval endpoint and transactional safety | 2026-04-15 | P0 |
| bg-003 | Increase autonomous execution reliability | Agent runs that complete without manual clarification in first hour | No production task backlog exists; docs were placeholders | >= 80% first-hour autonomous progress using seeded tasks + AGENTS contract | 2026-05-15 | P1 |
| bg-004 | Improve contributor throughput and reduce overlap | PRs linked to task file + no conflicting duplicate work on same task | No claim lifecycle existed before current docs update | 100% behavior PRs include task file; claim expiry workflow consistently used | 2026-04-20 | P1 |
| bg-005 | Establish enforceable quality gates | CI pass rate across lint/build/tests | Frontend lint currently fails; no automated backend tests | Lint/build green by default + baseline frontend/backend automated tests in CI | 2026-05-10 | P0 |
| bg-006 | Enable Architectural Observability | Interactive Decision Graph available in UX with semantic relationship metadata | Currently only basic Mermaid tree of pillars exists | First-class "node-based" decision graph with visual conflict/dependency indicators | 2026-05-25 | P1 |


## Success Metrics
- Every `P0` goal maps to at least one feature file and multiple atomic tasks.
- Every merged behavior PR references at least one task ID.
- `progress-log.md` and `change-log.md` stay aligned with task status transitions.

## Priority Ordering
- `P0`: export contract completion, persistence safety, quality automation.
- `P1`: contributor throughput and autonomous-run reliability.
- `P2/P3`: polish and optimization work after `P0/P1` milestones.

## Time Horizon
- Near term (next 2-4 weeks): persistence hardening, lint/test baseline, task backlog execution model.
- Mid term (1-2 release cycles): full export compiler and robust provider/error handling.
- Long term (2+ cycles): enterprise-grade governance and broader integration features.

## Update Cadence
Update when goals or release priorities change, and at each milestone completion.

## Source of Truth References
- `./vision.md`
- `./constraints.md`
- `../01-architecture/functional-requirements.md`
- `../02-execution/milestone-plan.md`