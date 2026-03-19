# Prompts

## Purpose
Store reusable prompt patterns for guided architecture and execution interactions.

## Inputs
- Agent operating rules
- Desired output schemas and quality expectations

## Outputs
- Prompt templates linked to pack phases

## Required Sections
- Prompt Inventory
- Prompt Usage Rules
- Output Contract Checks

## Prompt Inventory
| prompt_id | phase | intent | expected_output |
|---|---|---|---|
| prm-001 | context | Capture business and constraint baseline | Structured markdown sections |
| prm-002 | execution | Generate atomic tasks from features | Task files with YAML frontmatter |

## Prompt Usage Rules
- Prompts must reference active source-of-truth files.
- Prompts should request machine-readable structure when needed.

## Output Contract Checks
Verify generated content matches metadata schema and section requirements.

## Update Cadence
Update when prompt strategy changes or output schemas evolve.

## Source of Truth References
- `../03-agent-ops/AGENTS.md`
- `../04-task-system/tasks/README.md`
- `../05-state/progress-log.md`