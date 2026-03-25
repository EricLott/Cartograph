const { toExecutionProjection } = require('./projectionV2Service');
const { REQUIRED_ARTIFACT_FILES } = require('./plannerV2Service');

const asArray = (value) => (Array.isArray(value) ? value : []);

const markdownList = (items = [], fallback = '- TBD') => {
    const cleaned = asArray(items)
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    if (cleaned.length === 0) return fallback;
    return cleaned.map((item) => `- ${item}`).join('\n');
};

const taskMarkdown = (item, type) => {
    const dependsOn = asArray(item.depends_on || item.dependencies).filter(Boolean);
    const dependsYaml = JSON.stringify(dependsOn);
    return [
        `---`,
        `id: ${item.id}`,
        `title: ${item.title || 'Untitled'}`,
        `type: ${type}`,
        `status: todo`,
        `priority: ${item.priority || 'P1'}`,
        `owner: TBD`,
        `depends_on: ${dependsYaml}`,
        `last_updated: ${new Date().toISOString().slice(0, 10)}`,
        `claim_owner: null`,
        `claim_status: unclaimed`,
        `claim_expires_at: null`,
        `sla_due_at: null`,
        `---`,
        ``,
        `# ${item.title || 'Untitled'}`,
        ``,
        item.description || 'TBD',
        ``,
        `## Acceptance Criteria`,
        `- [ ] Implementation completes this ${type}.`,
        `- [ ] Evidence captured in ../05-state/progress-log.md.`,
        ``,
        `## Notes`,
        `- source_decision_id: ${item.source_decision_id || 'n/a'}`,
        `- capability_id: ${item.capability_id || 'n/a'}`,
        ``
    ].join('\n');
};

const ensureUniqueFiles = (files = []) => {
    const seen = new Set();
    return files.filter((file) => {
        if (!file || !file.path) return false;
        if (seen.has(file.path)) return false;
        seen.add(file.path);
        return true;
    });
};

const buildArchitectureSummary = (projectState = {}) => {
    const capabilityGraph = projectState.capability_graph || {};
    const decisionGraph = projectState.decision_graph || {};
    const capabilityCount = asArray(capabilityGraph.nodes).length;
    const decisionCount = asArray(decisionGraph.decisions).length;
    return {
        capabilityCount,
        decisionCount
    };
};

const buildCoreDocs = (projectState = {}) => {
    const idea = String(projectState.idea || 'Project idea not provided.').trim();
    const discovery = projectState.domain_discovery || {};
    const capabilityGraph = projectState.capability_graph || {};
    const decisionGraph = projectState.decision_graph || {};
    const summary = buildArchitectureSummary(projectState);

    const assumptions = asArray(discovery.assumptions);
    const constraints = asArray(discovery.constraints);
    const capabilityLines = asArray(capabilityGraph.nodes).map(
        (node) => `- **${node.title}** (${node.id}): ${node.description || 'No description.'}`
    );
    const decisionLines = asArray(decisionGraph.decisions).map(
        (decision) => `- **${decision.short_title || decision.question}** (${decision.id}): ${decision.question}`
    );
    const edgeLines = asArray(capabilityGraph.edges).map(
        (edge) => `- ${edge.from} -> ${edge.to} (${edge.type})${edge.reason ? `: ${edge.reason}` : ''}`
    );

    return [
        {
            path: '00-context/vision.md',
            content: `# Vision\n\n${idea}\n`
        },
        {
            path: '00-context/business-goals.md',
            content: `# Business Goals\n\n- Deliver a coherent architecture plan for downstream execution agents.\n- Maintain adaptability across technology ecosystems.\n- Keep decisions traceable with rationale and dependency context.\n`
        },
        {
            path: '00-context/constraints.md',
            content: `# Constraints\n\n${markdownList(constraints, '- No explicit constraints captured yet.')}\n`
        },
        {
            path: '00-context/assumptions.md',
            content: `# Assumptions\n\n${markdownList(assumptions, '- Assumptions pending.')}\n`
        },
        {
            path: '01-architecture/system-overview.md',
            content: `# System Overview\n\n- Capabilities: ${summary.capabilityCount}\n- Decisions: ${summary.decisionCount}\n\n## Domain Summary\n${discovery.domain_summary || 'No domain summary generated.'}\n`
        },
        {
            path: '01-architecture/domain-model.md',
            content: `# Domain Model\n\n${markdownList(capabilityLines, '- Domain capabilities pending.')}\n`
        },
        {
            path: '01-architecture/api-strategy.md',
            content: `# API Strategy\n\nDocument API and connector boundaries discovered in capability analysis.\n`
        },
        {
            path: '01-architecture/data-architecture.md',
            content: `# Data Architecture\n\nCapture persistence, data movement, and governance decisions here.\n`
        },
        {
            path: '01-architecture/security-architecture.md',
            content: `# Security Architecture\n\nCapture identity, authorization, compliance, and threat controls.\n`
        },
        {
            path: '01-architecture/infrastructure-architecture.md',
            content: `# Infrastructure Architecture\n\nCapture runtime platform, environments, and operations constraints.\n`
        },
        {
            path: '01-architecture/integration-architecture.md',
            content: `# Integration Architecture\n\n${markdownList(edgeLines, '- Integration edges not defined yet.')}\n`
        },
        {
            path: '01-architecture/non-functional-requirements.md',
            content: `# Non-Functional Requirements\n\n- Reliability, performance, security, and operability requirements should be refined per capability.\n`
        },
        {
            path: '02-execution/implementation-strategy.md',
            content: `# Implementation Strategy\n\n1. Validate domain capability graph with stakeholders.\n2. Resolve highest-risk pending decisions first.\n3. Project validated decisions into execution backlog.\n4. Execute and continuously reconcile architecture state.\n`
        },
        {
            path: '02-execution/workstreams.md',
            content: `# Workstreams\n\n${markdownList(capabilityLines, '- Workstreams pending capability synthesis.')}\n`
        },
        {
            path: '02-execution/dependency-map.md',
            content: `# Dependency Map\n\n${markdownList(asArray(decisionGraph.edges).map((edge) => `${edge.from} -> ${edge.to} (${edge.type})`), '- No decision dependencies registered.')}\n`
        },
        {
            path: '02-execution/milestones.md',
            content: `# Milestones\n\n- M1: Domain model and capability graph validated.\n- M2: High-impact decisions resolved.\n- M3: Execution backlog projected and sequenced.\n- M4: Delivery and verification complete.\n`
        },
        {
            path: '02-execution/definition-of-done.md',
            content: `# Definition of Done\n\n- Architecture decisions updated with rationale.\n- Conflicts resolved or explicitly accepted.\n- Backlog artifacts synchronized with latest architecture.\n- Validation evidence captured in state logs.\n`
        },
        {
            path: '03-agent-ops/AGENTS.md',
            content: `# AGENTS\n\nUse project artifacts, state logs, and task contracts as source of truth.\n`
        },
        {
            path: '03-agent-ops/agent-rules.md',
            content: `# Agent Rules\n\n- Respect dependency order.\n- Do not introduce unresolved blockers silently.\n- Keep architecture and backlog in sync every turn.\n`
        },
        {
            path: '03-agent-ops/coding-standards.md',
            content: `# Coding Standards\n\n- Prefer small cohesive modules.\n- Add tests for behavior changes.\n- Preserve deterministic interfaces.\n`
        },
        {
            path: '03-agent-ops/execution-loop.md',
            content: `# Execution Loop\n\n1. Read context + architecture.\n2. Select ready backlog item.\n3. Implement with evidence.\n4. Validate and update state logs.\n`
        },
        {
            path: '03-agent-ops/escalation-rules.md',
            content: `# Escalation Rules\n\nEscalate when security, compliance, or data-integrity ambiguity introduces material risk.\n`
        },
        {
            path: '05-state/progress-log.md',
            content: `# Progress Log\n\n- ${new Date().toISOString()}: Export bundle generated from planner.v2 state.\n`
        },
        {
            path: '05-state/blockers.md',
            content: `# Blockers\n\n- None currently logged.\n`
        },
        {
            path: '05-state/decisions-log.md',
            content: `# Decisions Log\n\n${markdownList(decisionLines, '- No decisions captured yet.')}\n`
        },
        {
            path: '05-state/change-log.md',
            content: `# Change Log\n\n- Initial V2 artifact bundle generated.\n`
        },
        {
            path: '05-state/open-questions.md',
            content: `# Open Questions\n\n- Which pending decisions should be resolved first?\n`
        },
        {
            path: '06-quality/testing-strategy.md',
            content: `# Testing Strategy\n\n- Validate projection output integrity.\n- Validate conflict detection semantics.\n- Validate export contract completeness.\n`
        },
        {
            path: '06-quality/acceptance-criteria.md',
            content: `# Acceptance Criteria\n\n- All required output contract files generated.\n- Execution backlog is structurally complete.\n- No stale conflicts remain after resolution.\n`
        },
        {
            path: '06-quality/observability.md',
            content: `# Observability\n\n- Capture model usage, conflict counts, and decision coverage over time.\n`
        },
        {
            path: '06-quality/performance-budget.md',
            content: `# Performance Budget\n\n- Initial planning latency target: <= 30s.\n- Incremental decision updates: <= 5s.\n`
        },
        {
            path: '06-quality/security-checklist.md',
            content: `# Security Checklist\n\n- API keys never persisted in export output.\n- Sensitive data absent from state logs.\n- Provider calls routed through secure backend proxy.\n`
        },
        {
            path: '07-artifacts/diagrams.md',
            content: `# Diagrams\n\nCapture graph exports or Mermaid diagrams derived from capability and decision graphs.\n`
        },
        {
            path: '07-artifacts/prompts.md',
            content: `# Prompts\n\nRecord key planner and conflict prompt templates used for this project.\n`
        },
        {
            path: '07-artifacts/glossary.md',
            content: `# Glossary\n\nDefine domain-specific terms surfaced during capability discovery.\n`
        }
    ];
};

const buildTaskFiles = (execution = {}) => {
    const files = [];
    const buckets = ['epics', 'features', 'tasks', 'spikes', 'bugs'];

    buckets.forEach((bucket) => {
        const items = asArray(execution[bucket]);
        if (items.length === 0) {
            files.push({
                path: `04-tasks/${bucket}/.keep`,
                content: ''
            });
            return;
        }
        items.forEach((item) => {
            const safeName = String(item.id || 'task').replace(/[^a-zA-Z0-9_-]/g, '_');
            files.push({
                path: `04-tasks/${bucket}/${safeName}.md`,
                content: taskMarkdown(item, bucket === 'epics' ? 'epic' : bucket.slice(0, -1))
            });
        });
    });

    return files;
};

const buildExportBundleV2 = (projectState = {}) => {
    const executionProjection = projectState.execution_projection || toExecutionProjection(projectState);
    const coreFiles = buildCoreDocs(projectState);
    const taskFiles = buildTaskFiles(executionProjection);

    const requiredFiles = REQUIRED_ARTIFACT_FILES.map((path) => ({
        path,
        content: coreFiles.find((file) => file.path === path)?.content || '# TODO\n'
    }));

    const files = ensureUniqueFiles([
        ...requiredFiles,
        ...taskFiles
    ]);

    return {
        root: 'cartograph-output',
        files
    };
};

module.exports = {
    buildExportBundleV2
};
