const crypto = require('crypto');
const agentService = require('./agentService');
const {
    resolveProviderConfig,
    getModelForTask,
    buildCompletionPayload
} = require('./providerConfigService');

const flattenDecisions = (nodes = [], bucket = []) => {
    (nodes || []).forEach((node) => {
        (node.decisions || []).forEach((decision) => {
            bucket.push(decision);
        });
        flattenDecisions(node.subcategories || [], bucket);
    });
    return bucket;
};

const hasResolvedAnswer = (decision) => {
    return typeof decision?.answer === 'string' && decision.answer.trim().length > 0;
};

const parseJson = (raw, fallback = {}) => {
    if (!raw || typeof raw !== 'string') return fallback;
    const trimmed = raw.trim();
    const candidates = [];
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) candidates.push(objectMatch[0]);
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) candidates.push(`{"conflicts":${arrayMatch[0]}}`);
    candidates.push(trimmed);

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch {
            // Try next candidate.
        }
    }
    return fallback;
};

const stateHashForResolvedDecisions = (resolvedDecisions = []) => {
    const canonical = [...resolvedDecisions]
        .map((decision) => ({
            id: String(decision.id || ''),
            answer: String(decision.answer || '').trim().toLowerCase()
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    const payload = JSON.stringify(canonical);
    return crypto.createHash('sha256').update(payload).digest('hex');
};

const toConflictKey = (conflict = {}) => {
    const ids = Array.isArray(conflict.decision_ids) ? [...conflict.decision_ids].sort().join('|') : '';
    return `${ids}::${String(conflict.reason || '').trim().toLowerCase()}`;
};

const sanitizeConflicts = (rawConflicts = [], resolvedById = new Map(), stateHash = '') => {
    const seen = new Set();
    const conflicts = [];

    (Array.isArray(rawConflicts) ? rawConflicts : []).forEach((raw) => {
        const ids = Array.isArray(raw?.decision_ids)
            ? [...new Set(raw.decision_ids.map((id) => String(id || '').trim()).filter(Boolean))]
            : [];
        if (ids.length < 2) return;
        if (!ids.every((id) => resolvedById.has(id))) return;

        const reason = String(raw?.reason || raw?.description || '').trim();
        if (!reason) return;

        const resolutionCandidates = Array.isArray(raw?.resolution_candidates)
            ? raw.resolution_candidates
                .map((candidate) => String(candidate || '').trim())
                .filter(Boolean)
            : [];

        const conflict = {
            reason,
            decision_ids: ids,
            resolution_candidates: [...new Set(resolutionCandidates)],
            resolved_at_state_hash: stateHash
        };
        const key = toConflictKey(conflict);
        if (seen.has(key)) return;
        seen.add(key);
        conflicts.push(conflict);
    });

    return conflicts;
};

const buildDetectPrompt = (resolvedDecisions) => {
    const systemPrompt = [
        'You are conflicts.v2.detect for architecture decisions.',
        'Detect only explicit contradictions between resolved decisions.',
        'Unresolved or missing decisions are not conflicts and must be ignored.',
        'Be conservative. Prefer zero conflicts over weak guesses.',
        'Return strict JSON only with this schema:',
        '{"conflicts":[{"reason":"string","decision_ids":["id1","id2"],"resolution_candidates":["string"]}]}'
    ].join(' ');

    const userPrompt = [
        'Resolved decisions (only these can be conflict sources):',
        JSON.stringify(
            resolvedDecisions.map((decision) => ({
                id: decision.id,
                question: decision.question,
                context: decision.context,
                answer: decision.answer,
                tags: decision.tags || [],
                dependencies: decision.dependencies || [],
                options: decision.options || null
            })),
            null,
            2
        )
    ].join('\n');

    return { systemPrompt, userPrompt };
};

const detectConflictsV2 = async (projectState = {}, runtimeConfig = null) => {
    const allDecisions = projectState?.decision_graph?.decisions
        || projectState?.decisionGraph?.decisions
        || flattenDecisions(projectState?.pillars || []);
    const resolved = (Array.isArray(allDecisions) ? allDecisions : [])
        .filter((decision) => hasResolvedAnswer(decision))
        .map((decision) => ({
            id: String(decision.id || decision.decisionId || ''),
            question: String(decision.question || ''),
            context: String(decision.context || ''),
            answer: String(decision.answer || ''),
            tags: Array.isArray(decision.tags) ? decision.tags : [],
            dependencies: Array.isArray(decision.dependencies) ? decision.dependencies : [],
            options: Array.isArray(decision.options) ? decision.options : null
        }))
        .filter((decision) => decision.id);

    const stateHash = stateHashForResolvedDecisions(resolved);
    if (resolved.length < 2) {
        return {
            conflicts: [],
            state_hash: stateHash
        };
    }

    const providerConfig = await resolveProviderConfig(runtimeConfig);
    if (!providerConfig.provider) {
        return {
            conflicts: [],
            state_hash: stateHash
        };
    }

    const model = getModelForTask(providerConfig.models, providerConfig.provider, 'conflicts');
    const { systemPrompt, userPrompt } = buildDetectPrompt(resolved);
    const payload = buildCompletionPayload(
        providerConfig.provider,
        model,
        systemPrompt,
        userPrompt,
        { temperature: 0.05, maxTokens: 1800 }
    );

    const { completion } = await agentService.requestProviderCompletion({
        provider: providerConfig.provider,
        payload,
        clientKeys: providerConfig.keys
    });

    const parsed = parseJson(completion, { conflicts: [] });
    const resolvedById = new Map(resolved.map((decision) => [decision.id, decision]));
    const conflicts = sanitizeConflicts(parsed?.conflicts, resolvedById, stateHash);
    return {
        conflicts,
        state_hash: stateHash
    };
};

const applyDecisionUpdate = (projectState = {}, decisionUpdate = {}) => {
    const nextState = JSON.parse(JSON.stringify(projectState || {}));
    const targetId = String(decisionUpdate?.id || decisionUpdate?.decision_id || '').trim();
    const answer = String(decisionUpdate?.answer || '').trim();
    if (!targetId) return nextState;

    const decisions = nextState?.decision_graph?.decisions
        || nextState?.decisionGraph?.decisions
        || flattenDecisions(nextState?.pillars || []);
    const list = Array.isArray(decisions) ? decisions : [];
    list.forEach((decision) => {
        const decisionId = String(decision.id || decision.decisionId || '');
        if (decisionId !== targetId) return;
        decision.answer = answer;
    });
    return nextState;
};

const resolveConflictsV2 = async (projectState = {}, decisionUpdate = {}, runtimeConfig = null) => {
    const before = await detectConflictsV2(projectState, runtimeConfig);
    const nextState = applyDecisionUpdate(projectState, decisionUpdate);
    const after = await detectConflictsV2(nextState, runtimeConfig);

    const remainingKeys = new Set((after.conflicts || []).map((conflict) => toConflictKey(conflict)));
    const resolved = (before.conflicts || []).filter((conflict) => !remainingKeys.has(toConflictKey(conflict)));
    const suggestedActions = [...new Set((after.conflicts || [])
        .flatMap((conflict) => conflict.resolution_candidates || [])
        .filter(Boolean))];

    return {
        conflicts: after.conflicts || [],
        resolved,
        suggested_actions: suggestedActions,
        state_hash: after.state_hash
    };
};

module.exports = {
    detectConflictsV2,
    resolveConflictsV2
};
