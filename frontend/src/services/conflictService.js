import { detectConflictsV2 as detectConflictsV2Api } from './apiService';

const hasResolvedAnswer = (value) => typeof value === 'string' && value.trim().length > 0;

const flattenDecisions = (nodes = [], bucket = []) => {
    (nodes || []).forEach((node) => {
        (node.decisions || []).forEach((decision) => {
            bucket.push(decision);
        });
        if (node.subcategories?.length) flattenDecisions(node.subcategories, bucket);
    });
    return bucket;
};

const normalizeConflict = (conflict = {}) => {
    const description = String(conflict.description || conflict.reason || '').trim();
    const decisionIds = Array.isArray(conflict.decisionIds)
        ? [...new Set(conflict.decisionIds.map((id) => String(id || '').trim()).filter(Boolean))]
        : (Array.isArray(conflict.decision_ids)
            ? [...new Set(conflict.decision_ids.map((id) => String(id || '').trim()).filter(Boolean))]
            : []);
    const resolutionCandidates = Array.isArray(conflict.resolution_candidates)
        ? [...new Set(conflict.resolution_candidates.map((item) => String(item || '').trim()).filter(Boolean))]
        : [];
    return {
        description,
        decisionIds,
        resolutionCandidates,
        resolvedAtStateHash: conflict.resolved_at_state_hash || null
    };
};

const dedupeConflicts = (conflicts = []) => {
    const seen = new Set();
    const deduped = [];
    (conflicts || []).forEach((conflict) => {
        const normalized = normalizeConflict(conflict);
        if (!normalized.description || normalized.decisionIds.length < 2) return;
        const key = `${normalized.description}::${[...normalized.decisionIds].sort().join('|')}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(normalized);
    });
    return deduped;
};

const filterToResolvedContradictions = (conflicts = [], resolvedDecisionById = new Map()) => {
    return (conflicts || []).filter((conflict) => {
        if (!conflict.description || conflict.decisionIds.length < 2) return false;
        return conflict.decisionIds.every((id) => resolvedDecisionById.has(id));
    });
};

export const clearAllDecisionConflicts = (nodes = []) => {
    return (nodes || []).map((node) => ({
        ...node,
        decisions: (node.decisions || []).map((decision) => ({
            ...decision,
            conflict: null,
            conflict_reasons: []
        })),
        subcategories: clearAllDecisionConflicts(node.subcategories || [])
    }));
};

export const stripConflictFieldsForConsistency = (nodes = []) => {
    return clearAllDecisionConflicts(nodes);
};

export const detectActiveConflicts = async (pillars, llmConfig, projectState = null) => {
    const normalizedState = stripConflictFieldsForConsistency(pillars);
    const allDecisions = flattenDecisions(normalizedState);
    const resolvedDecisionById = new Map(
        allDecisions
            .filter((decision) => hasResolvedAnswer(decision.answer))
            .map((decision) => [String(decision.id), decision])
    );

    if (resolvedDecisionById.size < 2) return [];

    const stateForDetection = projectState && typeof projectState === 'object'
        ? { ...projectState, pillars: normalizedState }
        : { pillars: normalizedState };

    const consistency = await detectConflictsV2Api(stateForDetection, llmConfig).catch(() => ({ conflicts: [] }));
    const normalized = dedupeConflicts(consistency?.conflicts || []);
    return filterToResolvedContradictions(normalized, resolvedDecisionById);
};
