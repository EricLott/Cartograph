import { describe, it, expect } from 'vitest';
import { resolveDecisionInsertion } from '../utils/chatMutationRouting';

const mockPillars = [
    {
        id: 'pillar-features',
        title: 'Features',
        subcategories: [],
        decisions: [
            { id: 'epic_internal_partners', question: 'Internal Partners Portal', work_item_type: 'epic' },
            {
                id: 'feat_location_filtering',
                question: 'Location-based Data Filtering',
                work_item_type: 'feature',
                parent_id: 'epic_internal_partners'
            }
        ]
    },
    {
        id: 'pillar-frontend',
        title: 'Frontend',
        subcategories: [],
        decisions: []
    }
];

describe('chatMutationRouting', () => {
    it('keeps insertion unchanged when target node exists', () => {
        const insertion = {
            targetId: 'pillar-frontend',
            decision: { id: 'frontend_nav', question: 'Navigation strategy', context: 'Define nav model.', answer: null }
        };

        expect(resolveDecisionInsertion(mockPillars, insertion)).toEqual(insertion);
    });

    it('routes feature-like insertion to features pillar when target is invalid', () => {
        const insertion = {
            targetId: 'internal-partners-portal',
            decision: {
                id: 'feat_blackout_dates',
                question: 'Blackout Dates Management',
                context: 'Allow blocked rental dates for partner portal.',
                answer: 'Included',
                work_item_type: 'feature'
            }
        };

        const resolved = resolveDecisionInsertion(mockPillars, insertion);
        expect(resolved.targetId).toBe('pillar-features');
        expect(resolved.decision.id).toBe('feat_blackout_dates');
    });

    it('maps target decision id to parent_id when creating feature/task children', () => {
        const insertion = {
            targetId: 'feat_location_filtering',
            decision: {
                id: 'task_blackout_ui',
                question: 'Blackout Calendar UI',
                context: 'Calendar management in partner portal.',
                answer: 'Included',
                work_item_type: 'task'
            }
        };

        const resolved = resolveDecisionInsertion(mockPillars, insertion);
        expect(resolved.targetId).toBe('pillar-features');
        expect(resolved.decision.parent_id).toBe('feat_location_filtering');
    });
});
