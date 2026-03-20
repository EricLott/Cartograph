# User Flows: Defining the Cartograph Journey

To ensure a seamless end-to-end experience, we define the primary paths a user (human or agent) takes through the system.

---

## 🌊 Flow 1: "The Architect's Spark" (Initial Setup)
*From a vague idea to a structured architecture.*

1. **Prompt Entry**: User enters a high-level goal (e.g., "Build a secure subscription-based SaaS with Next.js").
2. **LLM Decomposition**: Cartograph calls the provider to identify core "Pillars" (Persistence, UI, Auth, API).
3. **Pillar Generation**: The UI renders a set of cards representing these pillars, showing "0% complete."
4. **Draft Tasks**: The system generates a first-pass set of "Requirement Questions" for each pillar.
5. **Success Criteria**: The user sees a visual representation of their project "taking shape."

---

## 🌊 Flow 2: "The Decision Loop" (Refinement)
*Defining the 'How' through iterative dialogue.*

1. **Pillar Selection**: User clicks an "Incomplete" pillar (e.g., "Persistence").
2. **Contextual Chat**: The system asks a series of targeted questions (e.g., "SQL or NoSQL?," "Local or Cloud?").
3. **Drafting Implementation**: User selects "SQL with Prisma."
4. **State Transition**: Cartograph updates the pillar's metadata and marks it as "In Progress."
5. **Persistent Save**: The decision is logged to `decisions-log.md` on the backend, ensuring it survives a browser refresh.

---

## 🌊 Flow 3: "The Contributor Claim" (Execution)
*An agent claiming and finishing a task.*

1. **Task Hunt**: An agent reads `04-tasks/tasks/todo` and identifies an eligible, unblocked task.
2. **Claim Workflow**: The agent runs `node scripts/cartograph-contribute.mjs --auto --task task-###`.
3. **Task Prep**: The script moves the task to `in_progress/` and updates the metadata with the agent's ID and timestamp.
4. **Implementation**: The agent works on the codebase, referencing `AGENTS.md` and `design-system.md`.
5. **Closeout**: The agent runs `node scripts/cartograph-closeout.mjs --task task-###`, moving the task to `complete/` and logging evidence.

---

## 🌊 Flow 4: "The Final Handover" (Export)
*Packaging the mission for long-running execution.*

1. **Readiness Check**: User clicks "Export Blueprint."
2. **Validation**: Cartograph scans all pillars to ensure they are at "100% decision coverage."
3. **Pack Compilation**: The backend gathers all contextual docs (`00-07`) and generates a structured zip file.
4. **Download**: User receives the `agent-pack.zip`, ready to be dropped into a new repository for autonomous execution.
5. **Milestone Reached**: Success event is logged, and the project is marked as "Exported."

---

## Designing for Resilience
* All flows must handle **interruption** (e.g., refreshing during Flow 2).
* All flows must handle **LLM errors** (e.g., retrying or failing gracefully during Flow 1).
* All flows must be **traceable** (e.g., Flow 3 must log to `progress-log.md`).
