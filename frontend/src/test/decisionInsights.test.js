import { describe, it, expect } from 'vitest';
import { getDecisionInsightBundle } from '../utils/decisionInsights';

describe('decisionInsights', () => {
    const pillars = [
        {
            id: 'pillar-data',
            title: 'Data',
            decisions: [
                {
                    id: 'd_norm',
                    question: 'What level of normalization should be used?',
                    context: 'Choose between normalized relational model and denormalization.'
                },
                {
                    id: 'd_schema',
                    question: 'Schema migration strategy',
                    context: 'Versioned migrations for normalized relational data model updates.'
                }
            ],
            subcategories: []
        }
    ];

    it('returns best practices and semantic matches for target decision', () => {
        const bundle = getDecisionInsightBundle(pillars, 'd_norm');
        expect(bundle.target?.id).toBe('d_norm');
        expect(bundle.bestPractices.length).toBeGreaterThan(0);
        expect(bundle.semanticMatches.some((m) => m.decisionId === 'd_schema')).toBe(true);
    });
});
