import { describe, it, expect } from 'vitest';
import { normalizeFeatureDecision } from '../utils/featureNormalization';

describe('featureNormalization', () => {
    it('fills missing feature fields with defaults', () => {
        const normalized = normalizeFeatureDecision({
            question: 'Should Stripe be integrated?',
            context: 'Add recurring subscription payments.'
        });

        expect(normalized.id.startsWith('feat_')).toBe(true);
        expect(Array.isArray(normalized.acceptance_criteria)).toBe(true);
        expect(normalized.acceptance_criteria.length).toBeGreaterThan(0);
        expect(normalized.technical_context).toBeTruthy();
        expect(normalized.dependencies).toEqual([]);
        expect(normalized.priority).toBe('P1');
    });

    it('preserves explicit feature metadata when provided', () => {
        const normalized = normalizeFeatureDecision({
            id: 'feat_customer_api',
            question: 'Customer Facing API',
            context: 'Expose customer operations.',
            acceptance_criteria: ['API docs are published.'],
            technical_context: 'OpenAPI + auth middleware.',
            dependencies: ['feat_auth'],
            priority: 'P2'
        });

        expect(normalized.id).toBe('feat_customer_api');
        expect(normalized.acceptance_criteria).toEqual(['API docs are published.']);
        expect(normalized.technical_context).toBe('OpenAPI + auth middleware.');
        expect(normalized.dependencies).toEqual(['feat_auth']);
        expect(normalized.priority).toBe('P2');
    });
});
