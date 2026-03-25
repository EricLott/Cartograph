export const flattenDecisionNodes = (pillars) => {
    const records = [];

    const walk = (nodes, topLevelPillar = null, lineage = []) => {
        if (!Array.isArray(nodes)) return;
        nodes.forEach((node) => {
            const owningPillar = topLevelPillar || node;
            const nextLineage = [...lineage, node.title];
            (node.decisions || []).forEach((decision) => {
                records.push({
                    id: decision.id,
                    decision,
                    pillarId: owningPillar.id,
                    pillarTitle: owningPillar.title,
                    topLevelTitle: owningPillar.title,
                    breadcrumb: nextLineage.join(' > '),
                    isFeature: !!decision.work_item_type || String(decision.id || '').startsWith('feat_')
                });
            });
            walk(node.subcategories || [], owningPillar, nextLineage);
        });
    };

    walk(pillars || []);
    return records;
};

export const getRelatedDecisionsForTarget = (pillars, targetDecisionId, { maxResults = 6 } = {}) => {
    if (!targetDecisionId) return [];

    const records = flattenDecisionNodes(pillars);
    const recordById = new Map(records.map((r) => [r.id, r]));
    const target = recordById.get(targetDecisionId);
    if (!target) return [];

    const relatedById = new Map();
    const addRelation = (candidateId, relationType, score = 1) => {
        if (!candidateId || candidateId === targetDecisionId) return;
        const candidate = recordById.get(candidateId);
        if (!candidate) return;
        const current = relatedById.get(candidateId) || {
            decisionId: candidateId,
            question: candidate.decision.question,
            pillarId: candidate.pillarId,
            pillarTitle: candidate.pillarTitle,
            topLevelTitle: candidate.topLevelTitle,
            breadcrumb: candidate.breadcrumb,
            relationTypes: new Set(),
            score: 0
        };
        current.relationTypes.add(relationType);
        current.score = Math.max(current.score, score);
        relatedById.set(candidateId, current);
    };

    // Explicit and inferred structural links.
    records.forEach((record) => {
        const links = Array.isArray(record.decision.links) ? record.decision.links : [];
        links.forEach((link) => {
            if (record.id === targetDecisionId) addRelation(link.id, link.type || 'linked');
            if (link.id === targetDecisionId) addRelation(record.id, link.type || 'linked');
        });

        const deps = Array.isArray(record.decision.dependencies) ? record.decision.dependencies : [];
        deps.forEach((depId) => {
            if (record.id === targetDecisionId) addRelation(depId, 'depends_on');
            if (depId === targetDecisionId) addRelation(record.id, 'required_by');
        });
    });

    // Shared conflict annotation.
    const targetConflict = String(target.decision.conflict || '').trim().toLowerCase();
    if (targetConflict) {
        records.forEach((record) => {
            const conflict = String(record.decision.conflict || '').trim().toLowerCase();
            if (conflict && conflict === targetConflict && record.id !== targetDecisionId) {
                addRelation(record.id, 'conflicts');
            }
        });
    }

    return [...relatedById.values()]
        .map((item) => ({ ...item, relationTypes: [...item.relationTypes] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
};
