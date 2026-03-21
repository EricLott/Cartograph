---
id: task-037
title: Fix Agent Observations notification bloat
type: task
status: completed
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: released
claim_expires_at: null
sla_due_at: 2026-03-24
depends_on: []
acceptance_criteria:
  - Observations are grouped by type or by Pillar.
  - "Observations are filtered to show only those relevant to the *active* pillar in the `Details` view."
  - Added a summary view at the top level when no pillar is selected.
  - Implemented a collapsible/expandable UI for the observations list.
  - Verified that the workspace header and core content are visible in the initial viewport.
last_updated: 2026-03-21
---

# Task 037: Fix Agent Observations notification bloat

## Problem Statement
The "Agent Observations" section in the frontend currently displays a flat, unfiltered list of all validation errors and warnings. This list grows extremely long, dominates the UI, and pushes the primary workspace content out of the initial viewport. To fix this, we need to move these observations into a dedicated, toggleable "Notification Tray".

## Acceptance Criteria
- [ ] Observations are moved from the main content flow to a dedicated "Notification Tray" (side-drawer or slide-out panel).
- [ ] Added a notification icon (bell or issues icon) in the Header with a badge showing the count of active observations.
- [ ] Observations are grouped/filtered to show only those relevant to the *active* pillar in the `Details` view within the tray.
- [ ] The tray is toggleable (Show/Hide) and does not push main workspace content when closed.
- [ ] Implemented a "Show All" or global view within the tray when no pillar is selected.
- [ ] Verified that the workspace header and core content are visible in the initial viewport without scrolling.

## Technical Notes
- Modify `frontend/src/hooks/useAppLogic.js` to enhance the `agentFeedback` object with grouped/filtered data.
- Update `frontend/src/App.jsx` to use the new grouped data and implement the collapsible UI.
- Ensure `validationService.js` provides enough metadata in `metadataReport` to support filtering by pillar ID.

## Evidence of Done
- Screenshot showing the observations list collapsed or summarized.
- Screenshot showing observations filtered when a specific pillar is selected.
- Verification that "Architecture Blueprint" header is visible without scrolling.
