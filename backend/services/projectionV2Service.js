const sanitizeId = (value, fallbackPrefix = 'item') => {
    const slug = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
    if (slug) return slug;
    return `${fallbackPrefix}_${Date.now()}`;
};

const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
};

const normalizeWorkType = (decision = {}) => {
    const raw = String(decision.work_item_type || decision.workItemType || '').toLowerCase().trim();
    if (raw === 'epic' || raw === 'feature' || raw === 'task' || raw === 'spike' || raw === 'bug') {
        return raw;
    }
    return 'task';
};

const addNode = (target, node) => {
    if (!Array.isArray(target)) return;
    if (target.some((item) => item.id === node.id)) return;
    target.push(node);
};

const buildGraph = (items) => {
    const adjacency = new Map();
    const indegree = new Map();
    items.forEach((item) => {
        adjacency.set(item.id, new Set());
        indegree.set(item.id, 0);
    });

    items.forEach((item) => {
        toArray(item.depends_on).forEach((depId) => {
            if (!adjacency.has(depId)) return;
            if (!adjacency.get(depId).has(item.id)) {
                adjacency.get(depId).add(item.id);
                indegree.set(item.id, (indegree.get(item.id) || 0) + 1);
            }
        });
    });

    return { adjacency, indegree };
};

const detectCycles = (items) => {
    const { adjacency, indegree } = buildGraph(items);
    const queue = [];
    indegree.forEach((deg, id) => {
        if (deg === 0) queue.push(id);
    });

    let visited = 0;
    while (queue.length > 0) {
        const current = queue.shift();
        visited += 1;
        adjacency.get(current).forEach((neighbor) => {
            const next = (indegree.get(neighbor) || 0) - 1;
            indegree.set(neighbor, next);
            if (next === 0) queue.push(neighbor);
        });
    }

    const cycleNodes = [];
    indegree.forEach((deg, id) => {
        if (deg > 0) cycleNodes.push(id);
    });
    return {
        has_cycle: cycleNodes.length > 0,
        cycle_nodes: cycleNodes
    };
};

const normalizeExecutionItemsFromDecisionGraph = (decisionGraph = {}) => {
    const decisions = Array.isArray(decisionGraph.decisions) ? decisionGraph.decisions : [];

    const epics = [];
    const features = [];
    const tasks = [];
    const spikes = [];
    const bugs = [];

    const epicById = new Map();
    const featureById = new Map();

    decisions.forEach((decision, index) => {
        const workType = normalizeWorkType(decision);
        const fallbackId = `${workType}_${index + 1}`;
        const id = String(decision.id || sanitizeId(decision.question, fallbackId));
        const record = {
            id,
            title: String(decision.title_short || decision.short_title || decision.question || 'Untitled').trim(),
            description: String(decision.context || '').trim(),
            source_decision_id: id,
            capability_id: decision.capability_id || decision.capabilityId || null,
            priority: String(decision.priority || 'P1').toUpperCase(),
            depends_on: toArray(decision.dependencies).map((dep) => String(dep))
        };

        if (workType === 'epic') {
            addNode(epics, { ...record, type: 'epic' });
            epicById.set(id, true);
            return;
        }
        if (workType === 'feature') {
            const parentId = decision.parent_id || decision.parentId || null;
            addNode(features, { ...record, type: 'feature', parent_epic_id: parentId ? String(parentId) : null });
            featureById.set(id, true);
            return;
        }
        if (workType === 'spike') {
            addNode(spikes, { ...record, type: 'spike' });
            return;
        }
        if (workType === 'bug') {
            addNode(bugs, { ...record, type: 'bug' });
            return;
        }
        addNode(tasks, { ...record, type: 'task', parent_feature_id: decision.parent_id || decision.parentId || null });
    });

    if (epics.length === 0) {
        const defaultEpic = {
            id: 'epic_core_scope',
            title: 'Core Scope',
            description: 'Default execution epic derived from capability graph.',
            source_decision_id: null,
            capability_id: null,
            priority: 'P1',
            depends_on: [],
            type: 'epic'
        };
        epics.push(defaultEpic);
        epicById.set(defaultEpic.id, true);
    }

    const defaultEpicId = epics[0].id;
    features.forEach((feature) => {
        if (!feature.parent_epic_id || !epicById.has(feature.parent_epic_id)) {
            feature.parent_epic_id = defaultEpicId;
        }
    });

    if (features.length === 0) {
        const defaultFeature = {
            id: 'feature_foundation',
            title: 'Foundation Work',
            description: 'Default feature bucket when no explicit feature work items are provided.',
            source_decision_id: null,
            capability_id: null,
            priority: 'P1',
            depends_on: [],
            parent_epic_id: defaultEpicId,
            type: 'feature'
        };
        features.push(defaultFeature);
        featureById.set(defaultFeature.id, true);
    }

    const defaultFeatureId = features[0].id;
    tasks.forEach((task) => {
        const parentFeature = task.parent_feature_id ? String(task.parent_feature_id) : null;
        task.parent_feature_id = parentFeature && featureById.has(parentFeature) ? parentFeature : defaultFeatureId;
    });

    const dependencyItems = [...epics, ...features, ...tasks, ...spikes, ...bugs];
    const cycleStatus = detectCycles(dependencyItems);

    return {
        epics,
        features,
        tasks,
        spikes,
        bugs,
        dependency_map: {
            nodes: dependencyItems.map((item) => ({
                id: item.id,
                type: item.type,
                title: item.title
            })),
            edges: dependencyItems.flatMap((item) => (
                toArray(item.depends_on).map((depId) => ({
                    from: String(depId),
                    to: item.id
                }))
            )),
            ...cycleStatus
        }
    };
};

const toExecutionProjection = (projectState = {}) => {
    const decisionGraph = projectState?.decision_graph || projectState?.decisionGraph || {};
    return normalizeExecutionItemsFromDecisionGraph(decisionGraph);
};

module.exports = {
    toExecutionProjection
};
