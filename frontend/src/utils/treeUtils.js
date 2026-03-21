export const findNodeById = (nodes, id) => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.subcategories && node.subcategories.length > 0) {
            const found = findNodeById(node.subcategories, id);
            if (found) return found;
        }
    }
    return null;
};

export const updateNodeDecisions = (nodes, decisionId, updater) => {
    return nodes.map(node => {
        let newNode = { ...node };
        if (newNode.decisions) {
            newNode.decisions = newNode.decisions.map(d => {
                if (typeof decisionId === 'string' && d.id === decisionId) {
                    return updater(d);
                }
                // Handle batch updates if decisionId is an array or handled by updater
                return cleanerUpdater(d, decisionId, updater);
            });
        }
        if (newNode.subcategories && newNode.subcategories.length > 0) {
            newNode.subcategories = updateNodeDecisions(newNode.subcategories, decisionId, updater);
        }
        return newNode;
    });
};

const cleanerUpdater = (decision, targetId, updater) => {
    if (Array.isArray(targetId)) {
        // Handle array of update objects (with .id) or array of raw ID strings
        const update = targetId.find(u => (u.id === decision.id || u === decision.id));
        return update ? updater(decision, update) : decision;
    }
    if (decision.id === targetId) {
        return updater(decision);
    }
    return decision;
};
