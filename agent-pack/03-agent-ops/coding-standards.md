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
- **Follow existing patterns**: Adhere to repository conventions unless a logged decision authorizes a change.
- **Separation of Concerns**: 
  - Keep route handlers, business logic, and data access layers distinct.
  - Decompose large React components into smaller, focused sub-components.
  - Move complex logic into utility functions or specialized services.
- **Naming Conventions**: 
  - Use descriptive, intention-revealing names for variables, functions, and files (e.g., `fetchActiveProjects` instead of `getData`).
  - Follow camelCase for JavaScript and PascalCase for React components.
- **Function/Method Size**: 
  - Aim for short, focused functions that perform a single responsibility. 
  - If a function exceeds ~50 lines, it is a candidate for decomposition.
- **DRY (Don't Repeat Yourself)**: 
  - Extract reusable logic into shared utilities or custom hooks. 
  - Avoid duplicate code; refactor into shared abstractions when the logic is truly shared.
- **YAGNI (You Ain't Gonna Need It)**: 
  - Implement only what is required for the current task. 
  - Avoid over-engineering or building generic abstractions for hypothetical future needs.
- **Self-Documenting Code**: 
  - Prioritize code clarity over excessive comments. 
  - Use comments to explain "why" (rationale) rather than "what" (implementation detail).
- **Consistency**: Maintain local consistency within the file or module you are editing.

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
- ../../AGENTS.md
- `../06-quality/testing-strategy.md`
- `../06-quality/security-checklist.md`