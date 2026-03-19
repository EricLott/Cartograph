# Constraints

## Purpose
Capture current hard boundaries that materially affect Cartograph architecture and delivery sequencing.

## Inputs
- Existing repository implementation
- Runtime setup in `docker-compose.yml`
- Open-source contribution model and AGENTS workflow

## Outputs
- Constraint register used for planning, implementation, and risk decisions

## Required Sections
- Constraint Register
- Impact Analysis
- Constraint Owners
- Expiration or Review Dates

## Constraint Register
| constraint_id | category | statement | impact | owner | review_date | status |
|---|---|---|---|---|---|---|
| cst-001 | technical | Frontend currently calls OpenAI/Anthropic/Gemini directly from the browser with BYOK keys in local storage. | Limits server-side control, retry governance, and auditing; raises key-handling risk if browser context is compromised. | architecture | 2026-04-15 | active |
| cst-002 | technical | Backend persistence is prototype-grade (`Project.destroy({ where: {} })` on each save). | Prevents multi-project history and risks destructive data loss if save path fails mid-flight. | backend | 2026-04-01 | active |
| cst-003 | operational | No automated test suite currently enforces backend API behavior; frontend lint currently reports errors. | Low confidence for autonomous refactors without regression protection. | quality | 2026-04-05 | active |
| cst-004 | platform | Local-first development currently depends on Docker Compose and MySQL availability. | Contributor onboarding requires container tooling; CI must mirror environment assumptions. | devops | 2026-04-20 | active |
| cst-005 | product | Export output is still minimal and does not yet match the full agent-pack promise. | Core value proposition not yet realized in runnable product behavior. | product | 2026-04-10 | active |
| cst-006 | governance | Open-source contributors may act concurrently via coding agents. | Requires strict task claim and expiry workflow to avoid overlap and stale ownership. | maintainer | 2026-04-15 | active |

## Impact Analysis
- `cst-001` and `cst-002` are critical-path constraints for reliability and trust.
- `cst-003` blocks safe autonomous velocity and increases regression risk.
- `cst-005` blocks delivery of the project's central differentiator.
- `cst-006` affects process quality and contributor SLA predictability.

## Constraint Owners
- `architecture`: maintains API, provider, and system boundary decisions.
- `backend`: owns persistence model and data integrity controls.
- `quality`: owns validation gates and testing strategy rollout.
- `devops`: owns reproducible local/CI execution.
- `product`: owns scope and pack-contract priorities.
- `maintainer`: owns contributor workflow and claim governance.

## Expiration or Review Dates
Review active constraints at each milestone (`M1-M4`) and whenever a blocking task is completed.

## Update Cadence
Update immediately when a constraint is removed, downgraded, or replaced.

## Source of Truth References
- `./business-goals.md`
- `../01-architecture/non-functional-requirements.md`
- `../03-agent-ops/escalation-rules.md`
- `../05-state/blockers.md`