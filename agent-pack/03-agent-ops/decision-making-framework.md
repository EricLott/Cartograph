# Decision-Making Framework

## Purpose
Provide a repeatable method for architectural and delivery decisions.

## Inputs
- Open questions
- Constraints and risks
- Goal alignment signals

## Outputs
- Clear decision records with rationale and tradeoffs

## Required Sections
- Decision Trigger Criteria
- Evaluation Process
- Tie-Breaker Rules
- Documentation Rules

## Decision Trigger Criteria
Create a decision entry when a choice affects architecture, compliance, delivery sequence, or long-term maintainability.

## Evaluation Process
1. Define context and decision scope.
2. List feasible options.
3. Evaluate tradeoffs against goals and constraints.
4. Select and document choice with rationale.

## Tie-Breaker Rules
Prefer the option that maximizes safety, reversibility, and delivery clarity under current constraints.

## Documentation Rules
Every non-trivial decision must be logged in `../05-state/decisions-log.md` with links to impacted tasks.

## Update Cadence
Update when governance model or risk posture changes.

## Source of Truth References
- `../05-state/decisions-log.md`
- ../../AGENTS.md
- `../00-context/constraints.md`