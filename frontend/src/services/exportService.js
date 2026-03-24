import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { validateBlueprint } from './validationService';

export const checkAllAnswered = (pillars) => {
    const result = validateBlueprint({ pillars });
    return result.isValid && result.warnings.length === 0;
};

export const generateBlueprintZip = async (pillars, metadata = {}, force = false) => {
    if (!pillars || pillars.length === 0) {
        throw new Error("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
    }

    const validation = validateBlueprint({ pillars });
    
    if (!validation.isValid) {
        const errorList = validation.errors.join('\n- ');
        throw new Error(`Cannot export blueprint. The following critical integrity checks failed:\n- ${errorList}\n\nPlease add the missing architectural areas.`);
    }

    if (validation.warnings.length > 0 && !force) {
        // We throw a special error type or include warnings in the message
        // for the UI to handle and offer a "force export" option.
        const warningList = validation.warnings.slice(0, 3).join('\n- ');
        const moreCount = validation.warnings.length - 3;
        const msg = `Quality Warnings:\n- ${warningList}${moreCount > 0 ? `\n- ...and ${moreCount} more quality issues.` : ''}\n\nExporting now may result in low-quality agent execution. Continue anyway?`;
        
        const error = new Error(msg);
        error.warnings = validation.warnings;
        error.isWarning = true;
        throw error;
    }

    const zip = new JSZip();
    const root = zip.folder("agent-pack");

    // 0. Root Manifest (Metadata)
    const manifest = {
        projectId: metadata.projectId || 'local-draft',
        version: metadata.version || '1.0.0',
        exportTime: new Date().toISOString(),
        pillarCount: pillars.length
    };
    root.file("cartograph-manifest.json", JSON.stringify(manifest, null, 2));

    // 1. 00-context
    const context = root.folder("00-context");
    const visionContent = `# Cartograph Vision: ${metadata.projectId || 'Unnamed Project'}

## Purpose
Define the strategic contract for the application so all architecture and execution artifacts remain aligned to a clear product mission.

## Application Idea
${pillars.map(p => p.title).join(', ')} focused application.

## Core Promise
From idea to agent-ready blueprint. This pack converts architecture intent into a durable, machine-consumable mission pack with dependency-aware task decomposition.

## Target User
Autonomous coding-agent operators and implementation teams.
`;
    context.file("vision.md", visionContent);
    context.file("business-goals.md", "# Business Goals\n\n- TBD: Define key business objectives for this project.");
    context.file("constraints.md", "# Constraints\n\n- TBD: Define technical, temporal, or budgetary constraints.");
    context.file("assumptions.md", "# Assumptions\n\n- TBD: Record execution assumptions and known unknowns.");

    // 2. 01-architecture
    const arch = root.folder("01-architecture");
    let archSummary = "# Architecture Overview\n\n## Vision Alignment\nThis architecture is designed to fulfill the vision defined in `../00-context/vision.md`.\n\n## Pillars\n";
    pillars.forEach(p => {
        archSummary += `- [${p.title}](./${p.title.replace(/\s+/g, '-').toLowerCase()}.md)\n`;
        
        let pillarMd = `# Pillar: ${p.title}\n\n## Goal\n${p.description}\n\n`;
        if (p.decisions && p.decisions.length > 0) {
            pillarMd += `## Core Decisions\n\n`;
            p.decisions.forEach(d => {
                pillarMd += `### ${d.question}\n- **Answer**: ${d.answer || 'Pending Resolution'}\n- **Rationale**: TBD\n\n`;
            });
        }
        arch.file(`${p.title.replace(/\s+/g, '-').toLowerCase()}.md`, pillarMd);
    });
    arch.file("README.md", archSummary);

    // 3. 02-execution
    const exec = root.folder("02-execution");
    const strategyMd = `# Implementation Strategy

## Purpose
Translate architectural intent into an execution path that autonomous contributors can follow with low ambiguity.

## Execution Principles
1. Foundation and Core Services first.
2. Integration and API hardening.
3. Feature rollout.
4. Quality and CI Enforcement.

## Sequencing Heuristics
- Fix blocking quality issues to unlock iteration.
- Harden persistence before building complex state logic.
- Validate every step with evidence-backed progress logging.
`;
    exec.file("implementation-strategy.md", strategyMd);

    // Workstreams summary
    let workstreamMd = "# Workstreams\n\n## Overview\nMajor architecture areas defined for this project.\n\n";
    pillars.forEach(p => {
        workstreamMd += `- **${p.title}**: ${p.description}\n`;
    });
    exec.file("workstreams.md", workstreamMd);

    let depMap = "# Dependency Map\n\n## Task Nodes\n";
    let depEdges = "## Dependency Edges\n";
    let taskCount = 1;
    const taskFiles = [];

    const processPillarTasks = (ps, parentTaskId = null, parentPath = "", topLevelPillar = null, parentFeature = null) => {
        ps.forEach(p => {
            const currentTopLevel = topLevelPillar || p.title.replace(/\s+/g, '-').toLowerCase();
            const currentFeature = p.title;
            const taskId = `task-${String(taskCount++).padStart(3, '0')}`;
            const slug = p.title.replace(/\s+/g, '-').toLowerCase();
            const fileName = `${taskId}-${slug}.md`;

            const deps = parentTaskId ? `["${parentTaskId}"]` : "[]";
            let taskMd = `---\nid: ${taskId}\ntitle: ${p.title}\ntype: task\nstatus: todo\npriority: P1\nowner: TBD\ndepends_on: ${deps}\nlast_updated: ${new Date().toISOString().slice(0, 10)}\nworkstream: ${currentTopLevel}\nfeature: ${parentFeature || 'System Architecture'}\n---\n\n`;
            taskMd += `# Task: ${p.title}\n\n## Goal\n${p.description}\n\n`;

            // Build Inputs
            taskMd += `## Inputs\n`;
            taskMd += `- Workstream: ${currentTopLevel}\n`;
            if (parentFeature) {
                taskMd += `- Parent Feature: ${parentFeature}\n`;
            }
            taskMd += `\n`;

            // Build Acceptance Criteria
            taskMd += `## Acceptance Criteria\n`;
            taskMd += `- Satisfy the core pillar goal: ${p.description}\n`;
            if (p.decisions && p.decisions.length > 0) {
                taskMd += `- Address all related architectural decisions (see sub-tasks).\n`;
            }
            taskMd += `\n`;

            // Build Evidence Required
            taskMd += `## Evidence Required\n`;
            taskMd += `- [ ] Proof of implementation for ${p.title} matching architectural intent.\n`;
            taskMd += `\n`;

            taskFiles.push({ name: fileName, content: taskMd, workstream: currentTopLevel });
            depMap += `- ${taskId}: ${p.title} (Bucket: ${currentTopLevel})\n`;
            if (parentTaskId) {
                depEdges += `- ${taskId} depends on ${parentTaskId}\n`;
            }

            // Decisions as individual tasks
            if (p.decisions && p.decisions.length > 0) {
                p.decisions.forEach(d => {
                    const decisionTaskId = `task-${String(taskCount++).padStart(3, '0')}`;
                    const decisionSlug = (d.question || 'decision').replace(/[^\w\s]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 50);
                    const decisionFileName = `${decisionTaskId}-${decisionSlug}.md`;

                    const isFeature = currentTopLevel === 'pillar-features' || p.id === 'pillar-features';
                    const priority = isFeature ? (d.priority || 'P1') : 'P2';
                    const dependencies = isFeature && d.dependencies?.length > 0 ? [...d.dependencies, taskId] : [taskId];

                    let dTaskMd = `---\nid: ${decisionTaskId}\ntitle: ${isFeature ? 'Feature' : 'Decision'}: ${d.question}\ntype: task\nstatus: todo\npriority: ${priority}\nowner: TBD\ndepends_on: ${JSON.stringify(dependencies)}\nlast_updated: ${new Date().toISOString().slice(0, 10)}\nworkstream: ${currentTopLevel}\nfeature: ${currentFeature}\n---\n\n`;
                    dTaskMd += `# Task: ${isFeature ? 'Implement Feature' : 'Resolve Decision'} - ${d.question}\n\n`;
                    dTaskMd += `## Goal\n${isFeature ? d.context : `Implement the architectural resolution for "${d.question}" within the ${currentFeature} context.`}\n\n`;
                    
                    dTaskMd += `## Inputs\n`;
                    dTaskMd += `- Feature: ${currentFeature}\n`;
                    dTaskMd += `- Decision ID: ${d.id || 'N/A'}\n`;
                    if (!isFeature) dTaskMd += `- Context: ${d.context || 'Refer to architectural pillar description.'}\n`;
                    if (isFeature && d.technical_context) {
                        dTaskMd += `\n### Technical Context\n${d.technical_context}\n`;
                    }
                    dTaskMd += `\n`;

                    dTaskMd += `## Acceptance Criteria\n`;
                    if (isFeature && d.acceptance_criteria && Array.isArray(d.acceptance_criteria) && d.acceptance_criteria.length > 0) {
                        d.acceptance_criteria.forEach(ac => {
                            dTaskMd += `- [ ] ${ac}\n`;
                        });
                    } else {
                        const ans = d.answer?.trim();
                        const isUnresolved = !ans || ans === 'Pending Resolution';
                        if (isUnresolved) {
                            dTaskMd += `- [BLOCKER] Resolve decision for question: **${d.question}** before implementation.\n`;
                        } else {
                            dTaskMd += `- Implement decision: **${d.question}** as per answer choice: *${ans}*\n`;
                        }
                    }
                    if (d.conflict) {
                        dTaskMd += `- [CONFLICT] Resolve conflict: **${d.conflict}**\n`;
                    }
                    dTaskMd += `- Evidence of implementation matching the requirements.\n\n`;

                    dTaskMd += `## Evidence Required\n`;
                    dTaskMd += `- [ ] Verification of ${isFeature ? 'feature functionality' : `decision: ${d.question}`}\n`;
                    dTaskMd += `\n`;


                    taskFiles.push({ name: decisionFileName, content: dTaskMd, workstream: currentTopLevel });
                    depMap += `- ${decisionTaskId}: Decision: ${d.question} (Bucket: ${currentTopLevel})\n`;
                    depEdges += `- ${decisionTaskId} depends on ${taskId}\n`;
                });
            }

            if (p.subcategories && p.subcategories.length > 0) {
                processPillarTasks(p.subcategories, taskId, `${parentPath}${p.title} > `, currentTopLevel, currentFeature);
            }
        });
    };

    processPillarTasks(pillars);
    exec.file("dependency-map.md", `${depMap}\n${depEdges}`);

    // 4. 03-agent-ops
    const ops = root.folder("03-agent-ops");
    const agentsMd = `# AGENTS Operating Contract

## Mission
Execute tasks in priority order as defined in \`../04-task-system\`.

## Canonical Loop
1. **Read**: Load \`vision.md\` and \`AGENTS.md\`.
2. **Claim**: Identify and claim the next eligible task (no un-met dependencies).
3. **Execute**: Implement requirements defined in task acceptance criteria.
4. **Log**: Record progress in \`../05-state/progress-log.md\`.
5. **Close**: Update task status to \`completed\`.

## Rules
- Never skip dependencies.
- Never hardcode environmental secrets.
- Always provide evidence for completed work.
`;
    ops.file("AGENTS.md", agentsMd);
    
    // SECURITY.md template
    const securityMd = `# Security Policy

## Reporting a Vulnerability
If you discover a security vulnerability, please report it via the project owner's established security channel.

## Guardrails
- Secrets must never be committed to the repository.
- All agent contributions must undergo review.
- Ensure dependency scanning is enabled.
`;
    ops.file("SECURITY.md", securityMd);

    // 5. 04-task-system
    const system = root.folder("04-task-system");
    system.file("README.md", "# Task System Contract\n\nDefines the status-folder lifecycle and metadata schema for all backlog items.");
    
    taskFiles.forEach(tf => {
        const todo = system.folder(`tasks/todo/${tf.workstream}`);
        todo.file(tf.name, tf.content);
    });

    // 6. 05-state
    const state = root.folder("05-state");
    const appIdea = pillars.map(p => p.title).join(', ');
    const progressLogContent = `---
doc_type: state_log
schema_version: 1
status_enum:
  - backlog
  - todo
  - in_progress
  - blocked
  - done
  - cancelled
last_updated: ${manifest.exportTime.slice(0, 10)}
---

# Progress Log

## Latest Entries
- ${manifest.exportTime} | task-000 | done | Architecture and Planning Phase: Defined core vision and implementation strategy for the ${appIdea} application. Seeded initial agent-pack structure and task backlog.
  - Evidence:
    - ../00-context/vision.md
    - ../02-execution/implementation-strategy.md
  - Next step: Begin implementation of prioritized tasks in the 04-task-system/tasks/todo/ folder.
`;
    state.file("progress-log.md", progressLogContent);
    state.file("blockers.md", "# Blockers\n\nNo active blockers.");
    state.file("decisions-log.md", "# Decisions Log\n\nRecord key architectural or execution decisions here.");
    state.file("change-log.md", "# Change Log\n\nTrack deviations from the original blueprint.");
    state.file("open-questions.md", "# Open Questions\n\nList unresolved ambiguities for human review.");

    // 7. 06-quality
    const quality = root.folder("06-quality");
    const dodMd = `# Definition of Done

## Task-Level Done Criteria
A task is \`completed\` only when:
1. Acceptance criteria in the task file are satisfied.
2. Required commands/validation for scope passes.
3. Evidence recorded in \`../05-state/progress-log.md\`.
4. No unresolved blocker remains linked to task ID.

## Evidence Requirements
- Code changes reviewed.
- Test/Command output summaries provided.
- Verification notes linked to the task.
`;
    quality.file("DefinitionOfDone.md", dodMd);
    quality.file("README.md", "# Quality Gates\n\nContains the Definition of Done and testing strategy for the project.");

    // 8. 07-artifacts
    const artifacts = root.folder("07-artifacts");
    artifacts.file("README.md", "# Artifacts\n\nStorage for diagrams, mockups, and other supporting materials.");

    // FINAL AUDIT: Ensure no sensitive data from localStorage or environment is captured.
    // The export strictly uses provided 'pillars' and 'metadata' arguments.
    // It does not access global state, localStorage, or process.env during zip generation.

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Cartograph_AgentPack.zip");
};
