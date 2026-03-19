# API Strategy

## Purpose
Define current and target API contracts for persistence, retrieval, and operational health.

## Inputs
- Current API implementation in `backend/server.js`
- Functional requirements and execution milestones

## Outputs
- API contract evolution plan

## Required Sections
- API Style and Boundaries
- Versioning Policy
- Compatibility Rules
- Error Handling Conventions
- Contract Testing Expectations

## API Style and Boundaries
Current endpoints:
- `POST /api/save-state` (exists today)

Near-term target endpoints:
- `GET /api/projects/latest` (or `/api/project/latest`) for frontend hydration.
- `GET /api/health` for container/readiness checks.

Boundary rules:
- Backend handles persistence and retrieval only.
- LLM provider calls remain frontend-owned in short term.

## Versioning Policy
- Keep current unversioned routes for compatibility during hardening.
- Introduce `/api/v1` prefix for newly added endpoints where practical.
- Document route deprecation before removal.

## Compatibility Rules
- Preserve request shape `{ idea, pillars }` for existing save-state calls.
- Add fields in backward-compatible way.
- Avoid breaking frontend serialization assumptions without coordinated task updates.

## Error Handling Conventions
- Return JSON errors with stable structure:
  - `error`: short message
  - `details`: optional diagnostics
  - `code`: optional machine-readable error code
- Use `4xx` for validation issues and `5xx` for server failures.

## Contract Testing Expectations
- Add integration tests for save, retrieve, transaction rollback, and invalid payloads.
- Validate route behavior against representative nested pillar payloads.

## Update Cadence
Update when routes, request/response schemas, or ownership boundaries change.

## Source of Truth References
- `./integration-architecture.md`
- `../06-quality/testing-strategy.md`
- `../04-task-system/tasks/`