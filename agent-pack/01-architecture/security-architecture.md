# Security Architecture

## Purpose
Establish practical security controls for current local-first architecture and near-term hardening work.

## Inputs
- Current frontend/backend code paths
- Constraint register and known risks

## Outputs
- Security baseline and mitigation priorities

## Required Sections
- Trust Boundaries
- Identity and Access Control
- Data Protection Controls
- Threat Scenarios and Mitigations
- Security Validation Requirements

## Trust Boundaries
1. Browser runtime (user input, rendered chat content, local storage keys).
2. Backend API (save/retrieve endpoints, DB access).
3. MySQL container (persistent state).
4. External LLM provider APIs.

## Identity and Access Control
- Current system is local-first and does not implement user auth.
- Near-term rule: limit backend scope to local/dev trusted usage; document this explicitly.
- Future: add auth boundary before multi-user or hosted deployment.

## Data Protection Controls
- Do not persist provider keys in backend database.
- Sanitize/escape user and model content before rendering.
- Restrict CORS for non-local deployments.
- Avoid logging sensitive request content in production.

## Threat Scenarios and Mitigations
- `Threat`: XSS via `dangerouslySetInnerHTML` in chat rendering.
  - `Mitigation`: replace with safe text rendering.
- `Threat`: partial writes corrupting architecture graph.
  - `Mitigation`: transaction wrapping and validation.
- `Threat`: malformed provider responses causing unsafe state updates.
  - `Mitigation`: strict schema checks and guarded parsing.

## Security Validation Requirements
- Security checklist review for each PR touching input handling or persistence.
- Regression tests for unsafe rendering paths and invalid payload handling.
- Mandatory blocker escalation for unresolved critical security ambiguity.

## Update Cadence
Update on every security-relevant architecture or implementation change.

## Source of Truth References
- `../06-quality/security-checklist.md`
- `../03-agent-ops/escalation-rules.md`
- `../05-state/blockers.md`