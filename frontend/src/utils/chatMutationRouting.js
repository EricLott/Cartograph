import { findNodeById } from './treeUtils';

const FEATURE_ID_RE = /^(feat|epic|task)_/i;

const normalizeText = (value = '') => String(value).toLowerCase();

const walkNodes = (nodes, visitor, pillarId = null) => {
    (nodes || []).forEach((node) => {
        const nextPillarId = pillarId || node.id;
        visitor(node, nextPillarId);
        if (node.subcategories?.length) walkNodes(node.subcategories, visitor, nextPillarId);
    });
};

const findFeaturesPillarId = (pillars) => {
    const direct = (pillars || []).find((pillar) => pillar?.id === 'pillar-features');
    if (direct) return direct.id;
    const byTitle = (pillars || []).find((pillar) => normalizeText(pillar?.title).includes('feature'));
    return byTitle?.id || null;
};

const findDecisionOwnerNode = (pillars, decisionId) => {
    if (!decisionId) return null;
    let owner = null;
    walkNodes(pillars, (node, pillarId) => {
        if (owner) return;
        if ((node.decisions || []).some((decision) => decision.id === decisionId)) {
            owner = { nodeId: node.id, pillarId };
        }
    });
    return owner;
};

const isFeatureLikeDecision = (decision = {}, targetId = '') => {
    const workItemType = String(decision.work_item_type || '').toLowerCase().trim();
    if (workItemType === 'epic' || workItemType === 'feature' || workItemType === 'task') return true;
    if (FEATURE_ID_RE.test(String(decision.id || ''))) return true;
    if (FEATURE_ID_RE.test(String(targetId || ''))) return true;
    if (Array.isArray(decision.acceptance_criteria)) return true;
    if (typeof decision.technical_context === 'string' && decision.technical_context.trim()) return true;
    if (Array.isArray(decision.dependencies)) return true;
    if (typeof decision.priority === 'string' && decision.priority.trim()) return true;
    return false;
};

export const resolveDecisionInsertion = (pillars, insertion) => {
    if (!insertion?.targetId || !insertion?.decision) return null;

    const targetNode = findNodeById(pillars, insertion.targetId);
    if (targetNode) return insertion;

    const decision = { ...insertion.decision };
    const featurePillarId = findFeaturesPillarId(pillars);
    const featureLike = isFeatureLikeDecision(decision, insertion.targetId);

    const ownerFromTargetDecision = findDecisionOwnerNode(pillars, insertion.targetId);
    if (ownerFromTargetDecision && featureLike && featurePillarId) {
        const type = String(decision.work_item_type || '').toLowerCase().trim();
        if (type !== 'epic' && !decision.parent_id) {
            decision.parent_id = insertion.targetId;
        }
        return {
            targetId: featurePillarId,
            decision
        };
    }

    if (featureLike && featurePillarId) {
        return {
            targetId: featurePillarId,
            decision
        };
    }

    return null;
};
