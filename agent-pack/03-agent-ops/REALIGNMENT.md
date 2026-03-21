# Strategic Alignment Manual

## Purpose
Ensure that the product's execution (tasks, features, epics) is consistently driving toward the high-level **Vision** (`00-context/vision.md`) and **Roadmap** (`00-context/roadmap.md`).

## When to Use
- At the start of a new milestone or phase.
- When an agent feels "stuck" in a cycle of hygiene/maintenance tasks.
- If the current UI/UX does not match the functional requirements in the Vision.
- Upon receiving the prompt: **"Read the realignment manual and begin"**.

## Alignment Workflow

### 1. Vision Anchoring
- **Read**: `agent-pack/00-context/vision.md`.
- **Identify**: Capture the 3-5 core "Operational Core" or "Visual Language" anchors (e.g., "Decision-as-a-Node," "Multi-View Interface").

### 2. Roadmap Verification
- **Read**: `agent-pack/00-context/roadmap.md`.
- **Check**: Does the roadmap contain scheduled phases for every anchor identified in Step 1?
- **Correct**: If a vision anchor is missing from the roadmap, add a new Phase or update an existing one immediately.

### 3. Task System Audit
- **List**: All epics in `agent-pack/04-task-system/epics/todo`.
- **Compare**: Ensure there is at least one Epic for every major theme in the Vision.
- **Trace**: Check that every "todo" Feature and Task rolls up into a Vision-aligned Epic.

### 4. Context folder Sync
- **Review**: `business-goals.md`, `constraints.md`, `assumptions.md`, and `personas.md`.
- **Sync**: Update these files to reflect the new technical realities or strategic shifts introduced by realignment (e.g., new constraints for node-graph rendering).

### 5. Documentation of Change
- **Log**: Add an entry to `agent-pack/03-agent-ops/mistakes-framework.md` if the realignment was triggered by a significant drift.
- **Summarize**: Provide a clear "Alignment Report" to the user.

---

## Validation Checklist (Definition of Done)
- [ ] Roadmap reflects the Vision.
- [ ] Epics exist for all core Vision themes.
- [ ] Features/Tasks map to those Epics.
- [ ] 00-context files reflect current strategic priorities.
