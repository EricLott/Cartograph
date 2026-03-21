import { describe, test, expect } from 'vitest';
import { validateBlueprint } from '../services/validationService';

describe('ValidationService: Blueprint Integrity', () => {
    test('fails if critical pillars (Frontend/Backend/Data) are missing', () => {
        const project = {
            idea: 'Example idea',
            pillars: [
                { id: 'p1', title: 'UX Design', description: 'At least ten words in this description for the pillar.' }
            ]
        };

        const result = validateBlueprint(project);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing critical pillar: "Frontend".');
        expect(result.errors).toContain('Missing critical pillar: "Backend".');
        expect(result.errors).toContain('Missing critical pillar: "Data".');
    });

    test('succeeds if all critical pillars are present with enough description', () => {
        const project = {
            idea: 'Example idea',
            pillars: [
                { id: 'p1', title: 'Frontend Architecture', description: 'At least ten words in this description for the pillar.' },
                { id: 'p2', title: 'Backend Strategy', description: 'At least ten words in this description for the pillar.' },
                { id: 'p3', title: 'Data Design', description: 'At least ten words in this description for the pillar.' }
            ]
        };

        const result = validateBlueprint(project);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    test('warns if descriptions are too short', () => {
        const project = {
            idea: 'Example idea',
            pillars: [
                { id: 'p1', title: 'Frontend Architecture', description: 'too short' },
                { id: 'p2', title: 'Backend Strategy', description: 'At least ten words in this description for the pillar.' },
                { id: 'p3', title: 'Data Design', description: 'At least ten words in this description for the pillar.' }
            ]
        };

        const result = validateBlueprint(project);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Pillar "Frontend Architecture" has a thin description (2/10 words).');
        expect(result.metadataReport).toContainEqual(expect.objectContaining({ 
            id: 'p1', 
            pillarId: 'p1',
            type: 'pillar', 
            field: 'description', 
            issue: 'short_description',
            severity: 'warning'
        }));
    });

    test('warns and reports unresolved decisions', () => {
        const project = {
            idea: 'Example idea',
            pillars: [
                { id: 'p1', title: 'Frontend Architecture', description: 'At least ten words in this description for the pillar.', decisions: [
                    { id: 'd1', question: 'React framework?', answer: '' }
                ]},
                { id: 'p2', title: 'Backend Strategy', description: 'At least ten words in this description for the pillar.' },
                { id: 'p3', title: 'Data Design', description: 'At least ten words in this description for the pillar.' }
            ]
        };

        const result = validateBlueprint(project);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Pending decision in "Frontend Architecture": "React framework?"');
        expect(result.metadataReport).toContainEqual(expect.objectContaining({ 
            id: 'd1', 
            pillarId: 'p1',
            type: 'decision', 
            field: 'answer', 
            title: 'React framework?', 
            parentTitle: 'Frontend Architecture', 
            issue: 'unresolved',
            severity: 'warning'
        }));
    });
});
