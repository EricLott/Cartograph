const PRIORITY_RE = /^P[0-2]$/i;

const toSentenceCase = (value = '') => {
    const text = String(value).trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        return value
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const toFeatureId = (value = '') => {
    const slug = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
    return slug ? `feat_${slug}` : `feat_${Date.now()}`;
};

const defaultAcceptanceCriteria = (question, context) => {
    const label = toSentenceCase(question || 'Feature');
    const contextText = String(context || '').trim();
    return [
        `${label} is implemented end-to-end and available in the product flow.`,
        contextText
            ? `Behavior aligns with scope: ${contextText}.`
            : `${label} behavior is covered with clear user-facing outcomes.`
    ];
};

export const normalizeFeatureDecision = (decision = {}) => {
    const question = String(decision.question || '').trim() || 'New Feature';
    const context = String(decision.context || '').trim() || 'Feature details captured from conversation.';
    const acceptanceCriteria = asArray(decision.acceptance_criteria);
    const dependencies = asArray(decision.dependencies);
    const rawPriority = String(decision.priority || '').toUpperCase();

    return {
        ...decision,
        id: String(decision.id || '').startsWith('feat_') ? decision.id : toFeatureId(question),
        question,
        context,
        acceptance_criteria: acceptanceCriteria.length > 0
            ? acceptanceCriteria
            : defaultAcceptanceCriteria(question, context),
        technical_context: String(decision.technical_context || '').trim() || 'Technical approach to be detailed during implementation planning.',
        dependencies,
        priority: PRIORITY_RE.test(rawPriority) ? rawPriority : 'P1'
    };
};
