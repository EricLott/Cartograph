# Coding Standards

## Purpose
Define implementation standards agents must follow when executing technical tasks.

## Inputs
- Repository language and framework conventions
- Quality and security requirements

## Outputs
- Consistent, maintainable, and reviewable code changes

## Required Sections
- Style and Structure Rules
- Testing Expectations
- Security Baseline
- Documentation Expectations

## Style and Structure Rules
- Follow existing repository patterns unless a logged decision authorizes change.
- Keep modules cohesive and avoid hidden side effects.

## Testing Expectations
- Add or update tests for behavior changes.
- Include negative-path validation for risky logic.

## Security Baseline
- No hard-coded secrets.
- Validate all external inputs.
- Apply least-privilege defaults.

## Documentation Expectations
- Update related architecture or task docs when behavior changes.
- Include migration or rollout notes when relevant.

## Update Cadence
Update when stack conventions or quality requirements change.

## Source of Truth References
- `./AGENTS.md`
- `../06-quality/testing-strategy.md`
- `../06-quality/security-checklist.md`