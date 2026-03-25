const agentService = require('./agentService');
const { toExecutionProjection } = require('./projectionV2Service');
const {
    resolveProviderConfig,
    getModelForTask,
    buildCompletionPayload
} = require('./providerConfigService');

const REQUIRED_ARTIFACT_FILES = [
    '00-context/vision.md',
    '00-context/business-goals.md',
    '00-context/constraints.md',
    '00-context/assumptions.md',
    '01-architecture/system-overview.md',
    '01-architecture/domain-model.md',
    '01-architecture/api-strategy.md',
    '01-architecture/data-architecture.md',
    '01-architecture/security-architecture.md',
    '01-architecture/infrastructure-architecture.md',
    '01-architecture/integration-architecture.md',
    '01-architecture/non-functional-requirements.md',
    '02-execution/implementation-strategy.md',
    '02-execution/workstreams.md',
    '02-execution/dependency-map.md',
    '02-execution/milestones.md',
    '02-execution/definition-of-done.md',
    '03-agent-ops/AGENTS.md',
    '03-agent-ops/agent-rules.md',
    '03-agent-ops/coding-standards.md',
    '03-agent-ops/execution-loop.md',
    '03-agent-ops/escalation-rules.md',
    '05-state/progress-log.md',
    '05-state/blockers.md',
    '05-state/decisions-log.md',
    '05-state/change-log.md',
    '05-state/open-questions.md',
    '06-quality/testing-strategy.md',
    '06-quality/acceptance-criteria.md',
    '06-quality/observability.md',
    '06-quality/performance-budget.md',
    '06-quality/security-checklist.md',
    '07-artifacts/diagrams.md',
    '07-artifacts/prompts.md',
    '07-artifacts/glossary.md'
];

const parseJson = (raw, fallback = null) => {
    if (typeof raw !== 'string' || !raw.trim()) return fallback;
    const trimmed = raw.trim();
    const candidates = [];
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) candidates.push(objectMatch[0]);
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) candidates.push(arrayMatch[0]);
    candidates.push(trimmed);

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch {
            // Continue trying candidates.
        }
    }
    return fallback;
};

const slugify = (value, fallback = 'item') => {
    const slug = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
    if (slug) return slug;
    return `${fallback}_${Date.now()}`;
};

const toStringList = (value, limit = 30) => {
    if (!Array.isArray(value)) return [];
    const cleaned = value
        .map((item) => {
            if (item == null) return '';
            if (typeof item === 'string') return item.trim();
            if (typeof item === 'object') {
                return String(item.title || item.name || item.label || item.id || '').trim();
            }
            return String(item).trim();
        })
        .filter(Boolean);
    return [...new Set(cleaned)].slice(0, limit);
};

const mergeStringLists = (...lists) => {
    const merged = [];
    lists.forEach((list) => {
        toStringList(list, 200).forEach((entry) => {
            if (!merged.includes(entry)) merged.push(entry);
        });
    });
    return merged;
};

const dedupeById = (items = []) => {
    const map = new Map();
    (items || []).forEach((item, index) => {
        const id = String(item?.id || item?.decision_id || `item_${index}`).trim();
        if (!id) return;
        if (!map.has(id)) map.set(id, { ...item, id });
    });
    return [...map.values()];
};

const normalizeSourceCitations = (value) => {
    if (!Array.isArray(value)) return [];
    const output = [];
    const seen = new Set();

    value.forEach((source) => {
        const title = String(source?.title || source?.name || '').trim();
        const url = String(source?.url || source?.link || '').trim();
        const publisher = String(source?.publisher || source?.domain || '').trim();
        if (!title && !url) return;
        const key = `${url}|${title}`;
        if (seen.has(key)) return;
        seen.add(key);
        output.push({ title: title || url, url, publisher });
    });

    return output.slice(0, 12);
};

const normalizeDomainGrounding = (raw = {}, idea = '', mode = 'fallback', injectedSources = []) => ({
    mode,
    ecosystem: String(raw.detected_ecosystem || raw.domain || raw.platform || '').trim(),
    domain_summary: String(raw.domain_summary || raw.summary || idea).trim(),
    platform_signals: mergeStringLists(raw.platform_signals, raw.platforms, raw.signals),
    domain_primitives: mergeStringLists(raw.domain_primitives, raw.platform_primitives, raw.required_artifacts, raw.core_objects),
    decision_axes: mergeStringLists(raw.critical_decision_axes, raw.decision_axes),
    failure_modes: mergeStringLists(raw.common_failure_modes, raw.failure_modes, raw.pitfalls),
    ambiguity_flags: mergeStringLists(raw.ambiguities, raw.ambiguity_flags),
    source_citations: normalizeSourceCitations([...(raw.source_citations || []), ...injectedSources]),
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : null
});

const normalizeDomainDiscovery = (raw = {}, idea = '', grounding = {}) => {
    const capabilities = dedupeById(Array.isArray(raw.capabilities) ? raw.capabilities : []).map((capability) => ({
        id: String(capability.id || slugify(capability.title, 'capability')),
        title: String(capability.title || 'Untitled Capability').trim(),
        description: String(capability.description || capability.summary || '').trim(),
        type: String(capability.type || 'capability').trim(),
        lens_id: capability.lens_id ? String(capability.lens_id) : null,
        tags: Array.isArray(capability.tags) ? capability.tags.map(String) : []
    }));

    const inferredLenses = dedupeById(Array.isArray(raw.lenses) ? raw.lenses : []).map((lens) => ({
        id: String(lens.id || slugify(lens.title, 'lens')),
        title: String(lens.title || 'General').trim(),
        description: String(lens.description || '').trim()
    }));

    return {
        detected_ecosystem: String(raw.detected_ecosystem || grounding.ecosystem || '').trim(),
        domain_summary: String(raw.domain_summary || raw.summary || grounding.domain_summary || idea).trim(),
        platform_signals: mergeStringLists(raw.platform_signals, grounding.platform_signals),
        assumptions: mergeStringLists(raw.assumptions),
        constraints: mergeStringLists(raw.constraints),
        domain_primitives: mergeStringLists(raw.domain_primitives, grounding.domain_primitives),
        decision_axes: mergeStringLists(raw.decision_axes, grounding.decision_axes),
        failure_modes: mergeStringLists(raw.failure_modes, grounding.failure_modes),
        ambiguity_flags: mergeStringLists(raw.ambiguity_flags, grounding.ambiguity_flags),
        source_citations: normalizeSourceCitations([...(raw.source_citations || []), ...(grounding.source_citations || [])]),
        confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : grounding.confidence,
        capabilities,
        lenses: inferredLenses.length > 0
            ? inferredLenses
            : [{ id: 'lens_general', title: 'General', description: 'Cross-cutting architecture concerns.' }]
    };
};
const normalizeCapabilityGraph = (raw = {}, discovery = {}) => {
    const lenses = dedupeById(discovery.lenses || []);
    const lensIds = new Set(lenses.map((lens) => lens.id));
    const fallbackNodes = Array.isArray(discovery.capabilities) ? discovery.capabilities : [];
    const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : fallbackNodes;

    const nodes = dedupeById(rawNodes).map((node) => {
        const id = String(node.id || slugify(node.title, 'capability'));
        const title = String(node.title || 'Untitled Capability').trim();
        const description = String(node.description || '').trim();
        const lensId = node.lens_id ? String(node.lens_id) : null;
        const fallbackLensId = lensId && lensIds.has(lensId) ? lensId : (lenses[0]?.id || 'lens_general');
        return {
            id,
            title,
            description,
            type: String(node.type || 'capability').trim(),
            lens_id: fallbackLensId,
            parent_id: node.parent_id ? String(node.parent_id) : null,
            tags: Array.isArray(node.tags) ? node.tags.map(String) : []
        };
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = (Array.isArray(raw.edges) ? raw.edges : [])
        .map((edge) => ({
            from: String(edge.from || edge.source || '').trim(),
            to: String(edge.to || edge.target || '').trim(),
            type: String(edge.type || 'related_to').trim(),
            reason: String(edge.reason || '').trim()
        }))
        .filter((edge) => edge.from && edge.to && nodeIds.has(edge.from) && nodeIds.has(edge.to));

    return { nodes, edges };
};

const normalizeDecisionGraph = (raw = {}, capabilityGraph = {}) => {
    const nodeIds = new Set((capabilityGraph.nodes || []).map((node) => node.id));
    const decisions = dedupeById(Array.isArray(raw.decisions) ? raw.decisions : []).map((decision, index) => {
        const id = String(decision.id || slugify(decision.question, `decision_${index + 1}`));
        const question = String(decision.question || decision.title || 'Untitled decision').trim();
        const context = String(decision.context || decision.description || '').trim();
        const capabilityId = String(decision.capability_id || decision.capabilityId || '').trim();
        const shortTitle = String(
            decision.title_short || decision.short_title || question.split('?')[0] || question
        ).trim();
        return {
            id,
            capability_id: nodeIds.has(capabilityId) ? capabilityId : (capabilityGraph.nodes[0]?.id || null),
            question,
            short_title: shortTitle,
            context,
            answer: decision.answer == null ? null : String(decision.answer),
            options: Array.isArray(decision.options) ? decision.options : [],
            dependencies: Array.isArray(decision.dependencies) ? decision.dependencies.map(String) : [],
            priority: String(decision.priority || 'P1').toUpperCase(),
            work_item_type: String(decision.work_item_type || decision.workItemType || 'task').toLowerCase(),
            parent_id: decision.parent_id ? String(decision.parent_id) : null,
            rationale: String(decision.rationale || '').trim(),
            tags: Array.isArray(decision.tags) ? decision.tags.map(String) : []
        };
    });

    const decisionIds = new Set(decisions.map((decision) => decision.id));
    const edges = (Array.isArray(raw.edges) ? raw.edges : [])
        .map((edge) => ({
            from: String(edge.from || edge.source || '').trim(),
            to: String(edge.to || edge.target || '').trim(),
            type: String(edge.type || 'depends_on').trim(),
            reason: String(edge.reason || '').trim()
        }))
        .filter((edge) => edge.from && edge.to && decisionIds.has(edge.from) && decisionIds.has(edge.to));

    return { decisions, edges };
};

const normalizeCoverageAudit = (raw = {}) => ({
    missing_coverage: mergeStringLists(raw.missing_coverage, raw.gaps),
    notes: mergeStringLists(raw.notes),
    capability_additions: dedupeById(Array.isArray(raw.capability_additions) ? raw.capability_additions : []),
    decision_additions: dedupeById(Array.isArray(raw.decision_additions) ? raw.decision_additions : [])
});

const applyCoverageAuditAdditions = ({ capabilityGraph = {}, decisionGraph = {}, coverageAudit = {} }) => {
    const nextCapabilityGraph = {
        ...capabilityGraph,
        nodes: Array.isArray(capabilityGraph.nodes) ? [...capabilityGraph.nodes] : [],
        edges: Array.isArray(capabilityGraph.edges) ? [...capabilityGraph.edges] : [],
        lenses: Array.isArray(capabilityGraph.lenses) ? [...capabilityGraph.lenses] : []
    };
    const nextDecisionGraph = {
        ...decisionGraph,
        decisions: Array.isArray(decisionGraph.decisions) ? [...decisionGraph.decisions] : [],
        edges: Array.isArray(decisionGraph.edges) ? [...decisionGraph.edges] : []
    };

    const existingCapabilityIds = new Set(nextCapabilityGraph.nodes.map((node) => node.id));
    const normalizedCapabilityAdditions = normalizeCapabilityGraph(
        { nodes: coverageAudit.capability_additions, edges: [] },
        { lenses: nextCapabilityGraph.lenses, capabilities: nextCapabilityGraph.nodes }
    );
    normalizedCapabilityAdditions.nodes.forEach((node) => {
        if (existingCapabilityIds.has(node.id)) return;
        nextCapabilityGraph.nodes.push(node);
        existingCapabilityIds.add(node.id);
    });

    const existingDecisionIds = new Set(nextDecisionGraph.decisions.map((decision) => decision.id));
    const normalizedDecisionAdditions = normalizeDecisionGraph(
        { decisions: coverageAudit.decision_additions, edges: [] },
        nextCapabilityGraph
    );
    normalizedDecisionAdditions.decisions.forEach((decision) => {
        if (existingDecisionIds.has(decision.id)) return;
        nextDecisionGraph.decisions.push(decision);
        existingDecisionIds.add(decision.id);
    });

    return {
        capabilityGraph: nextCapabilityGraph,
        decisionGraph: nextDecisionGraph
    };
};

const ensureCapabilityDecisionCoverage = (capabilityGraph = {}, decisionGraph = {}) => {
    const nextDecisionGraph = {
        ...decisionGraph,
        decisions: Array.isArray(decisionGraph.decisions) ? [...decisionGraph.decisions] : []
    };
    const perCapability = new Map();
    nextDecisionGraph.decisions.forEach((decision) => {
        const key = String(decision.capability_id || '');
        if (!key) return;
        perCapability.set(key, (perCapability.get(key) || 0) + 1);
    });

    const existingDecisionIds = new Set(nextDecisionGraph.decisions.map((decision) => decision.id));
    (capabilityGraph.nodes || []).forEach((capability) => {
        if ((perCapability.get(capability.id) || 0) > 0) return;
        const candidateId = `decision_${slugify(capability.title, capability.id)}_core`;
        const decisionId = existingDecisionIds.has(candidateId)
            ? `${candidateId}_${Math.floor(Math.random() * 1000)}`
            : candidateId;
        nextDecisionGraph.decisions.push({
            id: decisionId,
            capability_id: capability.id,
            question: `What is the implementation strategy for ${capability.title}?`,
            short_title: capability.title,
            context: capability.description || 'Define the core approach, responsibilities, and guardrails.',
            answer: null,
            options: [],
            dependencies: [],
            priority: 'P1',
            work_item_type: 'task',
            parent_id: null,
            rationale: '',
            tags: ['coverage_guardrail']
        });
        existingDecisionIds.add(decisionId);
    });

    return nextDecisionGraph;
};

const buildPillarProjectionFromGraphs = (capabilityGraph = {}, decisionGraph = {}) => {
    const lensMap = new Map();
    const decisionByCapability = new Map();

    (decisionGraph.decisions || []).forEach((decision) => {
        const capabilityId = decision.capability_id || 'capability_general';
        if (!decisionByCapability.has(capabilityId)) decisionByCapability.set(capabilityId, []);
        decisionByCapability.get(capabilityId).push({
            id: decision.id,
            question: decision.question,
            short_title: decision.short_title,
            context: decision.context,
            answer: decision.answer,
            options: decision.options,
            dependencies: decision.dependencies,
            priority: decision.priority,
            work_item_type: decision.work_item_type,
            parent_id: decision.parent_id,
            tags: decision.tags
        });
    });

    const lensNodes = [];
    (capabilityGraph.lenses || []).forEach((lens) => {
        const lensId = String(lens.id || slugify(lens.title, 'lens'));
        const lensNode = {
            id: lensId,
            title: String(lens.title || 'General').trim(),
            description: String(lens.description || '').trim(),
            icon: null,
            decisions: [],
            subcategories: []
        };
        lensMap.set(lensId, lensNode);
        lensNodes.push(lensNode);
    });

    if (lensNodes.length === 0) {
        const fallbackLens = {
            id: 'lens_general',
            title: 'General',
            description: 'Cross-domain capabilities.',
            icon: null,
            decisions: [],
            subcategories: []
        };
        lensMap.set(fallbackLens.id, fallbackLens);
        lensNodes.push(fallbackLens);
    }

    const capabilityTreeById = new Map();
    (capabilityGraph.nodes || []).forEach((capability) => {
        capabilityTreeById.set(capability.id, {
            id: capability.id,
            title: capability.title,
            description: capability.description,
            icon: null,
            decisions: decisionByCapability.get(capability.id) || [],
            subcategories: []
        });
    });

    (capabilityGraph.nodes || []).forEach((capability) => {
        const currentNode = capabilityTreeById.get(capability.id);
        if (!currentNode) return;
        if (capability.parent_id && capabilityTreeById.has(capability.parent_id)) {
            capabilityTreeById.get(capability.parent_id).subcategories.push(currentNode);
            return;
        }
        const lensId = capability.lens_id && lensMap.has(capability.lens_id)
            ? capability.lens_id
            : lensNodes[0].id;
        lensMap.get(lensId).subcategories.push(currentNode);
    });

    return lensNodes;
};

const buildArtifactManifest = (idea, discovery = {}, capabilityGraph = {}, decisionGraph = {}) => ({
    root: 'cartograph-output',
    required_files: REQUIRED_ARTIFACT_FILES,
    summary: {
        idea,
        domain_summary: discovery.domain_summary,
        detected_ecosystem: discovery.detected_ecosystem || 'unspecified',
        primitive_count: (discovery.domain_primitives || []).length,
        capability_count: (capabilityGraph.nodes || []).length,
        decision_count: (decisionGraph.decisions || []).length
    }
});
const getFallbackGrounding = (idea) => normalizeDomainGrounding({
    domain_summary: `Architecture intent inferred from prompt: ${idea}`,
    platform_signals: [],
    domain_primitives: [],
    critical_decision_axes: [],
    common_failure_modes: ['Domain specifics may be incomplete without external grounding.'],
    source_citations: []
}, idea, 'fallback');

const getFallbackDiscovery = (idea, grounding = {}) => {
    const baseCapability = (id, title, description, lensId) => ({
        id,
        title,
        description,
        type: 'capability',
        lens_id: lensId,
        tags: []
    });
    return normalizeDomainDiscovery({
        detected_ecosystem: grounding.ecosystem || '',
        domain_summary: grounding.domain_summary || `Architecture intent inferred from prompt: ${idea}`,
        platform_signals: grounding.platform_signals || [],
        assumptions: ['No provider configured; generated with deterministic fallback.'],
        constraints: [],
        domain_primitives: grounding.domain_primitives || [],
        decision_axes: grounding.decision_axes || [],
        failure_modes: grounding.failure_modes || [],
        source_citations: grounding.source_citations || [],
        lenses: [
            { id: 'lens_product', title: 'Product', description: 'Domain behavior and user value.' },
            { id: 'lens_platform', title: 'Platform', description: 'Runtime platform and integrations.' },
            { id: 'lens_quality', title: 'Quality', description: 'Security, reliability, and observability.' }
        ],
        capabilities: [
            baseCapability('capability_domain', 'Domain Model', 'Core domain entities and lifecycle.', 'lens_product'),
            baseCapability('capability_workflow', 'Workflow Orchestration', 'Primary process flows and state transitions.', 'lens_product'),
            baseCapability('capability_platform', 'Platform Components', 'Primary components, apps, and services.', 'lens_platform'),
            baseCapability('capability_integration', 'Integration Surfaces', 'External systems, APIs, and connectors.', 'lens_platform'),
            baseCapability('capability_governance', 'Governance and Operations', 'Auditability, operations, and quality controls.', 'lens_quality')
        ]
    }, idea, grounding);
};

const getFallbackDecisionGraph = (capabilityGraph = {}) => {
    const node = (capabilityId, idx, question, shortTitle, context, workType = 'task', parentId = null) => ({
        id: `decision_${slugify(shortTitle || question, `${capabilityId}_${idx}`)}`,
        capability_id: capabilityId,
        question,
        short_title: shortTitle,
        context,
        answer: null,
        options: [],
        dependencies: [],
        priority: 'P1',
        work_item_type: workType,
        parent_id: parentId,
        rationale: '',
        tags: []
    });

    const capabilities = capabilityGraph.nodes || [];
    const decisions = [];
    if (capabilities.length === 0) return { decisions: [], edges: [] };

    const epicId = 'epic_core_delivery';
    decisions.push({
        id: epicId,
        capability_id: capabilities[0].id,
        question: 'What is the primary delivery epic for this solution?',
        short_title: 'Primary Delivery Epic',
        context: 'Defines the top-level execution objective.',
        answer: null,
        options: [],
        dependencies: [],
        priority: 'P1',
        work_item_type: 'epic',
        parent_id: null,
        rationale: '',
        tags: []
    });

    capabilities.forEach((capability, index) => {
        const featureId = `feature_${slugify(capability.title, `feature_${index + 1}`)}`;
        decisions.push({
            id: featureId,
            capability_id: capability.id,
            question: `How should ${capability.title} be implemented?`,
            short_title: capability.title,
            context: capability.description || 'Implementation details to be decided.',
            answer: null,
            options: [],
            dependencies: [epicId],
            priority: 'P1',
            work_item_type: 'feature',
            parent_id: epicId,
            rationale: '',
            tags: []
        });
        decisions.push(node(
            capability.id,
            1,
            `What technical approach should be used for ${capability.title}?`,
            `${capability.title} Approach`,
            capability.description || 'Select tools and patterns for this capability.',
            'task',
            featureId
        ));
    });

    return { decisions, edges: [] };
};

const callPlannerPass = async (providerConfig, task, systemPrompt, userPrompt, fallback, options = {}) => {
    if (!providerConfig.provider) return fallback;
    const model = getModelForTask(providerConfig.models, providerConfig.provider, task);
    const payload = buildCompletionPayload(providerConfig.provider, model, systemPrompt, userPrompt, {
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.15,
        maxTokens: typeof options.maxTokens === 'number' ? options.maxTokens : 2600
    });

    const { completion } = await agentService.requestProviderCompletion({
        provider: providerConfig.provider,
        payload,
        clientKeys: providerConfig.keys
    });
    return parseJson(completion, fallback) || fallback;
};

const runDomainGroundingPass = async ({ providerConfig, idea, fallback }) => {
    const systemPrompt = [
        'You are planner.v2.generate pass 0: domain grounding.',
        'Your top priority is domain correctness and architectural risk detection.',
        'Assume the user may make architecture mistakes; surface likely failure modes proactively.',
        'When web research is available, ground output in authoritative sources and include citations.',
        'Return strict JSON with keys:',
        'detected_ecosystem, domain_summary, platform_signals, domain_primitives, critical_decision_axes, common_failure_modes, ambiguities, confidence, source_citations.',
        'source_citations is an array of {title,url,publisher}.'
    ].join(' ');
    const userPrompt = [
        `Project idea:\n${idea}`,
        'Identify the platform/domain-specific building blocks that should become architecture decision areas.',
        'Example primitives for relevant domains might include data objects, forms/views, workflow automations, security model, integration points, and governance controls.',
        'Do not force software-only framing; remain open-ended for any planning domain.'
    ].join('\n\n');

    if (!providerConfig.provider) {
        return { grounding: fallback, groundedSearchUsed: false, groundedSearchError: null };
    }

    const model = getModelForTask(providerConfig.models, providerConfig.provider, 'planner');
    if (providerConfig.provider === 'openai') {
        try {
            const { completion, sources } = await agentService.requestProviderGroundedCompletion({
                provider: providerConfig.provider,
                clientKeys: providerConfig.keys,
                payload: {
                    model,
                    instructions: systemPrompt,
                    input: userPrompt,
                    tools: [{ type: 'web_search' }],
                    include: ['web_search_call.action.sources'],
                    tool_choice: 'auto',
                    reasoning: { effort: 'medium' },
                    timeoutMs: 120000
                }
            });
            const parsed = parseJson(completion, fallback) || fallback;
            return {
                grounding: normalizeDomainGrounding(parsed, idea, 'web_grounded', sources),
                groundedSearchUsed: true,
                groundedSearchError: null
            };
        } catch (error) {
            const parsedFallback = await callPlannerPass(
                providerConfig,
                'planner',
                systemPrompt,
                userPrompt,
                fallback,
                { temperature: 0.1, maxTokens: 2200 }
            );
            return {
                grounding: normalizeDomainGrounding(parsedFallback, idea, 'model_only'),
                groundedSearchUsed: false,
                groundedSearchError: String(error?.message || 'Unknown grounded-search failure.')
            };
        }
    }

    const parsed = await callPlannerPass(
        providerConfig,
        'planner',
        systemPrompt,
        userPrompt,
        fallback,
        { temperature: 0.1, maxTokens: 2200 }
    );
    return {
        grounding: normalizeDomainGrounding(parsed, idea, 'model_only'),
        groundedSearchUsed: false,
        groundedSearchError: null
    };
};

const groundPlannerV2 = async ({ idea, runtimeConfig = null }) => {
    const providerConfig = await resolveProviderConfig(runtimeConfig);
    const timings = {};
    const timed = async (label, fn) => {
        const started = Date.now();
        const result = await fn();
        timings[label] = Date.now() - started;
        return result;
    };

    const groundingFallback = getFallbackGrounding(idea);
    const groundingResult = await timed('domain_grounding', async () => runDomainGroundingPass({
        providerConfig,
        idea,
        fallback: groundingFallback
    }));
    const grounding = groundingResult.grounding;

    return {
        grounding,
        planner_meta: {
            provider: providerConfig.provider || 'fallback',
            grounded_search_used: groundingResult.groundedSearchUsed,
            grounded_search_error: groundingResult.groundedSearchError,
            grounding_mode: grounding.mode,
            sources_used: (grounding.source_citations || []).length,
            pass_timings_ms: timings,
            passes: ['domain_grounding'],
            grounding_prerequisite_complete: true
        }
    };
};

const generatePlannerV2 = async ({ idea, runtimeConfig = null, seedGrounding = null, seedGroundingMeta = null }) => {
    const providerConfig = await resolveProviderConfig(runtimeConfig);
    const timings = {};
    const timed = async (label, fn) => {
        const started = Date.now();
        const result = await fn();
        timings[label] = Date.now() - started;
        return result;
    };

    let groundingResult;
    if (seedGrounding && typeof seedGrounding === 'object') {
        const seededMode = String(
            seedGrounding.mode
            || seedGroundingMeta?.grounding_mode
            || 'seeded'
        ).trim() || 'seeded';
        groundingResult = {
            grounding: normalizeDomainGrounding(seedGrounding, idea, seededMode),
            groundedSearchUsed: !!(
                seedGroundingMeta?.grounded_search_used
                || seedGrounding.grounded_search_used
                || seededMode === 'web_grounded'
            ),
            groundedSearchError: seedGroundingMeta?.grounded_search_error || null,
            seeded: true
        };
        timings.domain_grounding = Math.max(0, Number(seedGroundingMeta?.pass_timings_ms?.domain_grounding || 0));
    } else {
        const groundingFallback = getFallbackGrounding(idea);
        groundingResult = await timed('domain_grounding', async () => runDomainGroundingPass({
            providerConfig,
            idea,
            fallback: groundingFallback
        }));
    }
    const grounding = groundingResult.grounding;

    const discoveryFallback = getFallbackDiscovery(idea, grounding);
    const discoveryPromptSystem = [
        'You are planner.v2.generate pass 1: capability-oriented domain discovery.',
        'Prioritize domain understanding and correctness over generic taxonomy.',
        'Infer decision-ready architecture lenses and capabilities from idea + grounding context.',
        'Avoid fixed web/cloud pillars. Keep planning open-ended for any domain.',
        'Return strict JSON with keys: detected_ecosystem, domain_summary, platform_signals, assumptions, constraints, domain_primitives, decision_axes, failure_modes, ambiguity_flags, source_citations, confidence, lenses, capabilities.',
        'Each lens: {id,title,description}.',
        'Each capability: {id,title,description,type,lens_id,tags}.'
    ].join(' ');
    const discoveryPromptUser = [
        `Project idea:\n${idea}`,
        `Grounding context:\n${JSON.stringify(grounding, null, 2)}`
    ].join('\n\n');
    const discoveryRaw = await timed('domain_discovery', async () => callPlannerPass(
        providerConfig,
        'planner',
        discoveryPromptSystem,
        discoveryPromptUser,
        discoveryFallback
    ));
    const discovery = normalizeDomainDiscovery(discoveryRaw, idea, grounding);

    const capabilityFallback = {
        lenses: discovery.lenses,
        nodes: discovery.capabilities,
        edges: []
    };
    const capabilityPromptSystem = [
        'You are planner.v2.generate pass 2: capability graph synthesis.',
        'Build a graph of capabilities and explicit relationships.',
        'Capabilities should represent real platform/domain components users must design.',
        'If domain primitives include concrete objects (for example tables/forms/views/flows), ensure they are reflected in capability nodes when relevant.',
        'Never inject mandatory frontend/backend pillars.',
        'Return strict JSON with keys: nodes, edges.',
        'Node schema: {id,title,description,type,lens_id,parent_id,tags}.',
        'Edge schema: {from,to,type,reason}.'
    ].join(' ');
    const capabilityPromptUser = [
        `Project idea:\n${idea}`,
        `Domain discovery:\n${JSON.stringify(discovery, null, 2)}`
    ].join('\n\n');
    const capabilityRaw = await timed('capability_graph', async () => callPlannerPass(
        providerConfig,
        'planner',
        capabilityPromptSystem,
        capabilityPromptUser,
        capabilityFallback
    ));
    let capabilityGraph = normalizeCapabilityGraph(capabilityRaw, discovery);
    capabilityGraph.lenses = discovery.lenses;

    const decisionFallback = getFallbackDecisionGraph(capabilityGraph);
    const decisionPromptSystem = [
        'You are planner.v2.generate pass 3: decision synthesis.',
        'Generate explicit architecture decisions mapped to capability nodes.',
        'Assume users may pick contradictory or weak choices; include guardrail decisions that prevent common mistakes.',
        'Prefer specific decision points over generic questions.',
        'Include concise short_title for tree navigation.',
        'Include work_item_type and parent_id when useful for execution projection.',
        'Do not assume a fixed technology stack.',
        'Return strict JSON with keys: decisions, edges.',
        'Decision schema: {id,capability_id,question,short_title,context,answer,options,dependencies,priority,work_item_type,parent_id,rationale,tags}.',
        'Edge schema: {from,to,type,reason}.'
    ].join(' ');
    const decisionPromptUser = [
        `Project idea:\n${idea}`,
        `Domain grounding:\n${JSON.stringify(grounding, null, 2)}`,
        `Capability graph:\n${JSON.stringify(capabilityGraph, null, 2)}`
    ].join('\n\n');
    const decisionRaw = await timed('decision_synthesis', async () => callPlannerPass(
        providerConfig,
        'planner',
        decisionPromptSystem,
        decisionPromptUser,
        decisionFallback
    ));
    let decisionGraph = normalizeDecisionGraph(decisionRaw, capabilityGraph);

    const coverageFallback = {
        missing_coverage: [],
        notes: [],
        capability_additions: [],
        decision_additions: []
    };
    const coveragePromptSystem = [
        'You are planner.v2.generate pass 4: coverage audit.',
        'Ensure capability and decision graphs fully cover required domain primitives and major failure modes.',
        'When coverage is missing, propose focused additions.',
        'Return strict JSON with keys: missing_coverage, notes, capability_additions, decision_additions.',
        'capability_additions uses node schema {id,title,description,type,lens_id,parent_id,tags}.',
        'decision_additions uses decision schema {id,capability_id,question,short_title,context,answer,options,dependencies,priority,work_item_type,parent_id,rationale,tags}.'
    ].join(' ');
    const coveragePromptUser = [
        `Domain grounding:\n${JSON.stringify(grounding, null, 2)}`,
        `Domain discovery:\n${JSON.stringify(discovery, null, 2)}`,
        `Capability graph:\n${JSON.stringify(capabilityGraph, null, 2)}`,
        `Decision graph:\n${JSON.stringify(decisionGraph, null, 2)}`
    ].join('\n\n');
    const coverageRaw = await timed('coverage_audit', async () => callPlannerPass(
        providerConfig,
        'planner',
        coveragePromptSystem,
        coveragePromptUser,
        coverageFallback,
        { temperature: 0.05, maxTokens: 2200 }
    ));
    const coverageAudit = normalizeCoverageAudit(coverageRaw);
    const withCoverage = applyCoverageAuditAdditions({ capabilityGraph, decisionGraph, coverageAudit });
    capabilityGraph = withCoverage.capabilityGraph;
    decisionGraph = ensureCapabilityDecisionCoverage(capabilityGraph, withCoverage.decisionGraph);

    const executionProjection = await timed('execution_projection', async () => toExecutionProjection({
        capability_graph: capabilityGraph,
        decision_graph: decisionGraph
    }));
    const artifactManifest = buildArtifactManifest(idea, discovery, capabilityGraph, decisionGraph);
    const pillars = buildPillarProjectionFromGraphs(capabilityGraph, decisionGraph);

    return {
        domain_discovery: discovery,
        capability_graph: capabilityGraph,
        decision_graph: decisionGraph,
        execution_projection: executionProjection,
        artifact_manifest: artifactManifest,
        artifacts: artifactManifest,
        pillars,
        planner_meta: {
            provider: providerConfig.provider || 'fallback',
            grounded_search_used: groundingResult.groundedSearchUsed,
            grounded_search_error: groundingResult.groundedSearchError,
            grounding_seeded: !!groundingResult.seeded,
            grounding_sequence: 'blocking_first',
            grounding_mode: grounding.mode,
            sources_used: (discovery.source_citations || []).length,
            uncovered_items: coverageAudit.missing_coverage,
            pass_timings_ms: timings,
            passes: [
                'domain_grounding',
                'domain_discovery',
                'capability_graph',
                'decision_synthesis',
                'coverage_audit',
                'execution_projection',
                'artifact_assembly'
            ]
        }
    };
};

module.exports = {
    groundPlannerV2,
    generatePlannerV2,
    REQUIRED_ARTIFACT_FILES
};
