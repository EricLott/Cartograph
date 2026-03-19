# Security Checklist

## Purpose
Provide a practical checklist for verifying baseline security controls before completion.

## Inputs
- Security architecture decisions
- Compliance and governance constraints

## Outputs
- Repeatable control validation checklist
- Risk visibility during delivery

## Required Sections
- Identity and Access Controls
- Data Protection Controls
- Dependency and Supply Chain Checks
- Operational Security Checks

## Identity and Access Controls
- Authentication and authorization controls reviewed.
- Least privilege applied to services and data paths.

## Data Protection Controls
- Sensitive data classification documented.
- Encryption and key handling approach validated.

## Dependency and Supply Chain Checks
- Dependency risk scan approach defined.
- Critical vulnerabilities triaged and tracked.

## Operational Security Checks
- Audit trails available for privileged actions.
- Incident escalation path confirmed.

## Update Cadence
Update when threat model, compliance scope, or platform dependencies change.

## Source of Truth References
- `../01-architecture/security-architecture.md`
- `../03-agent-ops/AGENTS.md`
- `../05-state/blockers.md`