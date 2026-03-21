/**
 * Validation service for technical architecture blueprints.
 * Ensures mission packs are of high quality and "agent-ready".
 */

const CRITICAL_PILLARS = ['Frontend', 'Backend', 'Data'];
const MIN_DESCRIPTION_WORDS = 10;

/**
 * Validates a project tree against technical integrity rules.
 * 
 * @param {Object} project - The project state object
 * @returns {Object} { isValid: boolean, errors: Array, warnings: Array }
 */
export const validateBlueprint = (project) => {
    const errors = [];
    const warnings = [];
    const metadataReport = [];

    if (!project || !Array.isArray(project.pillars)) {
        return { isValid: false, errors: ['Invalid project state.'], warnings: [] };
    }

    const allPillars = [];
    const traverse = (pillars) => {
        for (const p of pillars) {
            allPillars.push(p);
            if (p.subcategories) traverse(p.subcategories);
        }
    };
    traverse(project.pillars);

    // 1. Check for Critical Pillars (Errors)
    CRITICAL_PILLARS.forEach(criticalTitle => {
        const found = allPillars.some(p => 
            p.title.toLowerCase().includes(criticalTitle.toLowerCase())
        );
        if (!found) {
            errors.push(`Missing critical pillar: "${criticalTitle}".`);
        }
    });

    // 2. Check for Metadata and Quality (Warnings/Report)
    allPillars.forEach(p => {
        // Description Length
        const wordCount = (p.description || '').trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < MIN_DESCRIPTION_WORDS) {
            const msg = `Pillar "${p.title}" has a thin description (${wordCount}/${MIN_DESCRIPTION_WORDS} words).`;
            warnings.push(msg);
            metadataReport.push({ 
                id: p.id, 
                pillarId: p.id,
                type: 'pillar', 
                field: 'description', 
                title: p.title, 
                issue: 'short_description',
                severity: 'warning',
                message: msg
            });
        }

        // Decisions
        if (p.decisions) {
            p.decisions.forEach(d => {
                // 1. Conflict Check
                if (d.conflict) {
                    const msg = `Conflict: ${d.conflict}`;
                    warnings.push(msg);
                    metadataReport.push({ 
                        id: d.id, 
                        pillarId: p.id,
                        type: 'decision', 
                        field: 'conflict', 
                        title: d.question, 
                        parentTitle: p.title, 
                        issue: 'conflict',
                        severity: 'warning',
                        message: msg
                    });
                }

                // 2. Answer Completion
                const hasAnswer = d.answer && d.answer.trim().length > 0;
                if (!hasAnswer) {
                    const msg = `Pending decision in "${p.title}": "${d.question}"`;
                    warnings.push(msg);
                    metadataReport.push({ 
                        id: d.id, 
                        pillarId: p.id,
                        type: 'decision', 
                        field: 'answer', 
                        title: d.question, 
                        parentTitle: p.title, 
                        issue: 'unresolved',
                        severity: 'warning',
                        message: msg
                    });
                }
                
                // 3. Metadata Context
                if (!d.context || d.context.trim().length < 10) {
                    metadataReport.push({ 
                        id: d.id, 
                        pillarId: p.id,
                        type: 'decision', 
                        field: 'context', 
                        title: d.question, 
                        parentTitle: p.title, 
                        issue: 'thin_context',
                        severity: 'info',
                        message: `Decision "${d.question}" has thin context.`
                    });
                }
            });
        }
    });

    // Also include global errors in report if needed
    CRITICAL_PILLARS.forEach(criticalTitle => {
        const found = allPillars.some(p => 
            p.title.toLowerCase().includes(criticalTitle.toLowerCase())
        );
        if (!found) {
            metadataReport.push({
                type: 'global',
                issue: 'missing_pillar',
                title: criticalTitle,
                severity: 'error',
                message: `Missing critical pillar: "${criticalTitle}".`
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
