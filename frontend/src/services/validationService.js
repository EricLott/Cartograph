/**
 * Validation service for architecture blueprints.
 * Domain-agnostic: no fixed "critical pillar" assumptions.
 */

const MIN_DESCRIPTION_WORDS = 8;

const wordCount = (value = '') => String(value).trim().split(/\s+/).filter(Boolean).length;

const isResolved = (decision) => typeof decision?.answer === 'string' && decision.answer.trim().length > 0;

export const validateBlueprint = (project) => {
    const errors = [];
    const warnings = [];
    const metadataReport = [];

    if (!project || !Array.isArray(project.pillars)) {
        return { isValid: false, errors: ['Invalid project state.'], warnings: [], metadataReport: [] };
    }

    const allNodes = [];
    const allDecisions = [];
    const seenNodeIds = new Set();
    const seenDecisionIds = new Set();

    const walk = (nodes = [], topLevelId = null, topLevelTitle = null) => {
        (nodes || []).forEach((node) => {
            allNodes.push({ node, topLevelId: topLevelId || node.id, topLevelTitle: topLevelTitle || node.title });

            if (node.id) {
                if (seenNodeIds.has(node.id)) {
                    warnings.push(`Duplicate node id detected: "${node.id}".`);
                }
                seenNodeIds.add(node.id);
            }

            (node.decisions || []).forEach((decision) => {
                allDecisions.push({
                    decision,
                    pillarId: topLevelId || node.id,
                    pillarTitle: topLevelTitle || node.title,
                    parentTitle: node.title
                });
                if (decision.id) {
                    if (seenDecisionIds.has(decision.id)) {
                        warnings.push(`Duplicate decision id detected: "${decision.id}".`);
                    }
                    seenDecisionIds.add(decision.id);
                }
            });

            walk(node.subcategories || [], topLevelId || node.id, topLevelTitle || node.title);
        });
    };
    walk(project.pillars);

    if (project.pillars.length === 0) {
        errors.push('No architecture nodes found. Start by generating a domain capability map.');
    }

    allNodes.forEach(({ node, topLevelId }) => {
        const wc = wordCount(node.description || '');
        if (wc < MIN_DESCRIPTION_WORDS) {
            const msg = `Node "${node.title}" has a thin description (${wc}/${MIN_DESCRIPTION_WORDS} words).`;
            warnings.push(msg);
            metadataReport.push({
                id: node.id,
                pillarId: topLevelId,
                type: 'pillar',
                field: 'description',
                title: node.title,
                issue: 'short_description',
                severity: 'warning',
                message: msg
            });
        }
    });

    allDecisions.forEach(({ decision, pillarId, pillarTitle, parentTitle }) => {
        if (decision.conflict) {
            const msg = `Conflict: ${decision.conflict}`;
            warnings.push(msg);
            metadataReport.push({
                id: decision.id,
                pillarId,
                type: 'decision',
                field: 'conflict',
                title: decision.question,
                parentTitle,
                issue: 'conflict',
                severity: 'warning',
                message: msg
            });
        }

        if (!isResolved(decision)) {
            const msg = `Pending decision in "${pillarTitle}": "${decision.question}"`;
            warnings.push(msg);
            metadataReport.push({
                id: decision.id,
                pillarId,
                type: 'decision',
                field: 'answer',
                title: decision.question,
                parentTitle,
                issue: 'unresolved',
                severity: 'warning',
                message: msg
            });
        }

        if (wordCount(decision.context || '') < 4) {
            metadataReport.push({
                id: decision.id,
                pillarId,
                type: 'decision',
                field: 'context',
                title: decision.question,
                parentTitle,
                issue: 'thin_context',
                severity: 'info',
                message: `Decision "${decision.question}" has thin context.`
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadataReport
    };
};
