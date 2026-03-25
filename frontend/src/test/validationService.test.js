import { describe, test, expect } from 'vitest';
import { validateBlueprint } from '../services/validationService';

describe('ValidationService: Domain-Agnostic Integrity', () => {
    test('fails for invalid project state shape', () => {
        const result = validateBlueprint(null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid project state.');
    });

    test('fails when no architecture nodes are present', () => {
        const result = validateBlueprint({ idea: 'Example', pillars: [] });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('No architecture nodes found. Start by generating a domain capability map.');
    });

    test('warns when node descriptions are too short', () => {
        const project = {
            idea: 'Example idea',
            pillars: [
                {
                    id: 'p1',
                    title: 'Domain',
                    description: 'too short',
                    decisions: []
                }
            ]
        };

        const result = validateBlueprint(project);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Node "Domain" has a thin description (2/8 words).');
    });

    test('warns on unresolved decisions and exposes metadata report entries', () => {
        const project = {
            idea: 'Example idea',
            pillars: [
                {
                    id: 'p1',
                    title: 'Dataverse',
                    description: 'This description has enough words for validation to pass cleanly.',
                    decisions: [
                        { id: 'd1', question: 'Primary app type?', context: 'Select app type', answer: '' }
                    ]
                }
            ]
        };

        const result = validateBlueprint(project);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Pending decision in "Dataverse": "Primary app type?"');
        expect(result.metadataReport).toContainEqual(expect.objectContaining({
            id: 'd1',
            pillarId: 'p1',
            field: 'answer',
            issue: 'unresolved',
            severity: 'warning'
        }));
    });
});
