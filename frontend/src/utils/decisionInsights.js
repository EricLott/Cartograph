import { flattenDecisionNodes, getRelatedDecisionsForTarget } from './decisionRelations';

const ruleMatches = (text, patterns) => patterns.some((pattern) => pattern.test(text));
const tokenize = (text = '') =>
    String(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token && token.length > 2);

const sharedTerms = (leftText, rightText, limit = 4) => {
    const left = new Set(tokenize(leftText));
    const right = new Set(tokenize(rightText));
    return [...left].filter((token) => right.has(token)).slice(0, limit);
};

const BEST_PRACTICE_RULES = [
    {
        patterns: [/\bauth|authentication|authorization|rbac|oauth|jwt|token\b/i],
        practices: [
            'Use least-privilege defaults and explicit role boundaries.',
            'Centralize auth policy checks to avoid drift across services.',
            'Define token/session rotation and revocation strategy early.'
        ]
    },
    {
        patterns: [/\bdata|database|schema|normaliz|migration|persistence|sql|nosql\b/i],
        practices: [
            'Treat schema changes as versioned migrations with rollback plans.',
            'Map data ownership to bounded contexts to reduce coupling.',
            'Measure read/write patterns before optimizing indexes and denormalization.'
        ]
    },
    {
        patterns: [/\bapi|rest|graphql|webhook|endpoint|integration\b/i],
        practices: [
            'Version externally visible contracts and document breaking changes.',
            'Design idempotency and retry behavior for integration boundaries.',
            'Capture request/response observability and error taxonomy.'
        ]
    },
    {
        patterns: [/\bfrontend|ui|ux|accessibility|design system\b/i],
        practices: [
            'Codify reusable UI patterns to keep feature behavior consistent.',
            'Ship accessibility checks as part of normal QA, not afterthought.',
            'Keep state boundaries explicit to avoid cross-feature regressions.'
        ]
    },
    {
        patterns: [/\bsecurity|encryption|compliance|privacy|secret\b/i],
        practices: [
            'Define threat model assumptions for this decision explicitly.',
            'Classify sensitive data and enforce encryption in transit and at rest.',
            'Log security-relevant events with clear retention rules.'
        ]
    }
];

export const getDecisionInsightBundle = (pillars, decisionId) => {
    const records = flattenDecisionNodes(pillars);
    const target = records.find((record) => record.id === decisionId) || null;
    const recordById = new Map(records.map((record) => [record.id, record]));
    if (!target) {
        return {
            target: null,
            bestPractices: [],
            impacts: [],
            semanticMatches: []
        };
    }

    const haystack = `${target.decision.question || ''} ${target.decision.context || ''} ${target.decision.technical_context || ''}`;
    const bestPractices = BEST_PRACTICE_RULES
        .filter((rule) => ruleMatches(haystack, rule.patterns))
        .flatMap((rule) => rule.practices);

    const fallbackPractices = [
        'Define success criteria and non-goals for this decision.',
        'Record tradeoffs and revisit triggers to keep the architecture adaptable.',
        'Add tests/validation points that prove this choice behaves as intended.'
    ];

    const related = getRelatedDecisionsForTarget(pillars, decisionId, { maxResults: 12, similarityThreshold: 0.2 });
    const impacts = related
        .map((item) => {
            const matchRecord = recordById.get(item.decisionId);
            const relationLabel = item.relationTypes.includes('conflicts')
                ? 'Potential conflict'
                : item.relationTypes.includes('depends_on') || item.relationTypes.includes('required_by')
                    ? 'Dependency impact'
                    : item.relationTypes.includes('related')
                        ? 'Semantic coupling'
                        : 'Cross-cutting impact';
            const overlap = matchRecord
                ? sharedTerms(
                    `${target.decision.question || ''} ${target.decision.context || ''} ${target.decision.technical_context || ''}`,
                    `${matchRecord.decision.question || ''} ${matchRecord.decision.context || ''} ${matchRecord.decision.technical_context || ''}`
                )
                : [];

            let why = '';
            if (item.relationTypes.includes('conflicts')) {
                why = 'These decisions are grouped under the same conflict condition and may require joint resolution.';
            } else if (item.relationTypes.includes('depends_on')) {
                why = 'This target depends directly on the linked decision for successful delivery.';
            } else if (item.relationTypes.includes('required_by')) {
                why = 'The linked decision depends on this target, so changes here can cascade.';
            } else if (item.relationTypes.includes('related')) {
                why = overlap.length > 0
                    ? `They share architectural concepts (${overlap.join(', ')}), indicating semantic overlap.`
                    : 'They discuss similar architectural scope and should be reviewed together.';
            } else {
                why = 'This decision can influence the same functional or technical surface.';
            }

            return {
                ...item,
                relationLabel,
                sharedTerms: overlap,
                why
            };
        })
        .sort((a, b) => b.score - a.score);

    const semanticMatches = impacts
        .filter((item) => item.relationTypes.includes('related'))
        .slice(0, 6);

    return {
        target,
        bestPractices: bestPractices.length > 0 ? bestPractices : fallbackPractices,
        impacts,
        semanticMatches
    };
};
