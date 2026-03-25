import { describe, it, expect } from 'vitest';
import { getRelatedDecisionsForTarget } from '../utils/decisionRelations';

describe('decisionRelations', () => {
    const pillars = [
        {
            id: 'pillar-features',
            title: 'Features',
            decisions: [
                {
                    id: 'feat_customer_api',
                    question: 'Customer API',
                    context: 'Expose operations over HTTP.',
                    dependencies: ['api_auth'],
                    conflict: 'auth mismatch'
                }
            ],
            subcategories: []
        },
        {
            id: 'pillar-backend',
            title: 'Backend',
            decisions: [
                {
                    id: 'api_auth',
                    question: 'API authentication',
                    context: 'JWT and role checks.',
                    links: [{ id: 'feat_customer_api', type: 'supports' }],
                    conflict: 'auth mismatch'
                },
                {
                    id: 'api_docs',
                    question: 'API documentation',
                    context: 'OpenAPI documentation for endpoints.'
                }
            ],
            subcategories: []
        }
    ];

    it('finds linked and dependency-related decisions for a feature', () => {
        const related = getRelatedDecisionsForTarget(pillars, 'feat_customer_api');
        const ids = related.map((r) => r.decisionId);
        expect(ids).toContain('api_auth');
    });

    it('does not infer lexical similarity-only relations', () => {
        const related = getRelatedDecisionsForTarget(pillars, 'feat_customer_api');
        const ids = related.map((r) => r.decisionId);
        expect(ids).not.toContain('api_docs');
    });
});
