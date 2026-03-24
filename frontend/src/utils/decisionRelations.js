const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or',
    'that', 'the', 'this', 'to', 'we', 'with', 'you', 'your'
]);

const tokenize = (text = '') => {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token && !STOP_WORDS.has(token) && token.length > 1);
};

const buildTfVector = (tokens) => {
    const vector = new Map();
    tokens.forEach((token) => {
        vector.set(token, (vector.get(token) || 0) + 1);
    });
    return vector;
};

const cosineSimilarity = (a, b) => {
    if (!a.size || !b.size) return 0;
    const keys = new Set([...a.keys(), ...b.keys()]);
    let dot = 0;
    let magA = 0;
    let magB = 0;
    keys.forEach((key) => {
        const av = a.get(key) || 0;
        const bv = b.get(key) || 0;
        dot += av * bv;
        magA += av * av;
        magB += bv * bv;
    });
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const flattenDecisionText = (decision) => {
    const criteria = Array.isArray(decision.acceptance_criteria) ? decision.acceptance_criteria.join(' ') : '';
    const deps = Array.isArray(decision.dependencies) ? decision.dependencies.join(' ') : '';
    return [
        decision.question,
        decision.context,
        decision.answer,
        decision.technical_context,
        criteria,
        deps,
        decision.priority
    ].filter(Boolean).join(' ');
};

export const flattenDecisionNodes = (pillars) => {
    const records = [];

    const walk = (nodes, parentPillar = null) => {
        if (!Array.isArray(nodes)) return;
        nodes.forEach((node) => {
            const owningPillar = parentPillar || node;
            (node.decisions || []).forEach((decision) => {
                records.push({
                    id: decision.id,
                    decision,
                    pillarId: owningPillar.id,
                    pillarTitle: owningPillar.title,
                    isFeature: String(decision.id || '').startsWith('feat_')
                });
            });
            walk(node.subcategories || [], owningPillar);
        });
    };

    walk(pillars || []);
    return records;
};

export const getRelatedDecisionsForTarget = (pillars, targetDecisionId, { maxResults = 6, similarityThreshold = 0.36 } = {}) => {
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

    // Semantic similarity.
    const vectors = records.map((record) => ({
        id: record.id,
        vector: buildTfVector(tokenize(flattenDecisionText(record.decision)))
    }));
    const targetVector = vectors.find((v) => v.id === targetDecisionId)?.vector || new Map();
    vectors.forEach(({ id, vector }) => {
        if (id === targetDecisionId) return;
        const similarity = cosineSimilarity(targetVector, vector);
        if (similarity >= similarityThreshold) {
            addRelation(id, 'related', similarity);
        }
    });

    return [...relatedById.values()]
        .map((item) => ({ ...item, relationTypes: [...item.relationTypes] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
};
