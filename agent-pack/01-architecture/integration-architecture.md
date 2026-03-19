# Integration Architecture

## Purpose
Define how Cartograph integrates with external LLM providers and internal persistence services.

## Inputs
- Frontend provider service implementation
- Backend API contract

## Outputs
- Integration inventory and reliability rules

## Required Sections
- Integration Inventory
- Communication Patterns
- Idempotency and Retry Rules
- Failure Isolation and Recovery
- Contract Ownership

## Integration Inventory
- Browser -> OpenAI Chat Completions.
- Browser -> Anthropic Messages.
- Browser -> Gemini GenerateContent.
- Frontend -> Backend save-state and future retrieval/health endpoints.

## Communication Patterns
- LLM provider calls are synchronous HTTP requests from browser service layer.
- Save-state persistence is asynchronous HTTP POST to backend.
- Export path is local file generation with JSZip.

## Idempotency and Retry Rules
- Save-state endpoint should be safe for repeated calls with same payload.
- Provider requests should adopt bounded retries with timeout and explicit user feedback.
- Do not retry non-idempotent operations without safeguards.

## Failure Isolation and Recovery
- Provider failures should not crash UI state; surface actionable error banners.
- Persistence failures should not clear local state; allow retry.
- Export failures should preserve session context and provide remediation steps.

## Contract Ownership
- Frontend owns provider request orchestration.
- Backend owns persistence/retrieval API semantics.
- Task-system docs own contribution workflow rules.

## Update Cadence
Update whenever provider contracts or API routes change.

## Source of Truth References
- `./api-strategy.md`
- `../02-execution/dependency-map.md`
- `../05-state/open-questions.md`