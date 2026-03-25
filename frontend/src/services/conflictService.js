import { analyzeArchitectureConsistency } from './agentService';

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
    const description = String(conflict.description || '').trim();
    const decisionIds = Array.isArray(conflict.decisionIds)
        ? [...new Set(conflict.decisionIds.map((id) => String(id || '').trim()).filter(Boolean))]
        : [];
    return { description, decisionIds };
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

const isHighSignalConflict = (description = '') => {
    const text = String(description || '').toLowerCase();
    return !(
        text.includes('remain unresolved')
        || text.includes('unspecified')
        || text.includes('still deciding')
        || text.includes('pending decision')
        || text.includes('not specified')
    );
};

const filterToResolvedContradictions = (conflicts, resolvedDecisionById) => {
    return (conflicts || []).filter((conflict) => {
        if (!conflict.description || conflict.decisionIds.length < 2) return false;
        if (!isHighSignalConflict(conflict.description)) return false;
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

export const detectActiveConflicts = async (pillars, llmConfig) => {
    const normalizedState = stripConflictFieldsForConsistency(pillars);
    const allDecisions = flattenDecisions(normalizedState);
    const resolvedDecisionById = new Map(
        allDecisions
            .filter((decision) => hasResolvedAnswer(decision.answer))
            .map((decision) => [String(decision.id), decision])
    );

    if (resolvedDecisionById.size < 2) return [];

    const consistency = await analyzeArchitectureConsistency(normalizedState, llmConfig).catch(() => ({ conflicts: [] }));
    const normalized = dedupeConflicts(consistency?.conflicts || []);
    return filterToResolvedContradictions(normalized, resolvedDecisionById);
};
