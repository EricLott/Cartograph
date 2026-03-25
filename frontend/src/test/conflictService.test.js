import { describe, it, expect } from 'vitest';
import { clearAllDecisionConflicts, stripConflictFieldsForConsistency } from '../services/conflictService';

describe('conflictService', () => {
    it('clears prior conflict fields from all decision nodes', () => {
        const pillars = [
            {
                id: 'pillar-infra',
                subcategories: [],
                decisions: [
                    {
                        id: 'infra_hosting',
                        answer: 'Azure',
                        conflict: 'Old conflict',
                        conflict_reasons: ['Old conflict', 'Another reason']
                    }
                ]
            }
        ];

        const cleared = clearAllDecisionConflicts(pillars);
        expect(cleared[0].decisions[0].conflict).toBeNull();
        expect(cleared[0].decisions[0].conflict_reasons).toEqual([]);
    });

    it('strips conflict metadata before consistency scan input', () => {
        const pillars = [
            {
                id: 'pillar-data',
                subcategories: [],
                decisions: [
                    {
                        id: 'decision_storage_type',
                        answer: 'Azure Blob Storage',
                        conflict: 'Old stale conflict',
                        conflict_reasons: ['Old stale conflict']
                    }
                ]
            }
        ];
        const normalized = stripConflictFieldsForConsistency(pillars);
        expect(normalized[0].decisions[0].conflict).toBeNull();
        expect(normalized[0].decisions[0].conflict_reasons).toEqual([]);
    });
});
