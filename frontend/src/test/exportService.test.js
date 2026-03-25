import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jszip', () => {
    const mockJSZip = vi.fn().mockImplementation(function () {
        this.folder = vi.fn().mockReturnThis();
        this.file = vi.fn().mockReturnThis();
        this.generateAsync = vi.fn().mockResolvedValue('mock-zip-content');
    });
    return { default: mockJSZip };
});

vi.mock('file-saver', () => ({
    saveAs: vi.fn()
}));

vi.mock('../services/apiService', () => ({
    exportBundleV2: vi.fn()
}));

import { checkAllAnswered, generateBlueprintZip } from '../services/exportService';
import { exportBundleV2 } from '../services/apiService';

const mockBundle = {
    root: 'cartograph-output',
    files: [
        { path: '00-context/vision.md', content: '# Vision' },
        { path: '02-execution/dependency-map.md', content: '# Dependency Map' },
        { path: '04-tasks/tasks/task_example.md', content: '# Task Example' }
    ]
};

describe('exportService (V2 bundle)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        exportBundleV2.mockResolvedValue(mockBundle);
    });

    it('checkAllAnswered returns true when there are no warnings', () => {
        const pillars = [
            {
                id: 'p1',
                title: 'Domain',
                description: 'This description is long enough for validator thresholds.',
                decisions: [{ id: 'd1', question: 'Q1', answer: 'A1', context: 'Long enough context here.' }]
            }
        ];
        expect(checkAllAnswered(pillars)).toBe(true);
    });

    it('checkAllAnswered returns false when unresolved decisions exist', () => {
        const pillars = [
            {
                id: 'p1',
                title: 'Domain',
                description: 'This description is long enough for validator thresholds.',
                decisions: [{ id: 'd1', question: 'Q1', answer: '', context: 'Long enough context here.' }]
            }
        ];
        expect(checkAllAnswered(pillars)).toBe(false);
    });

    it('throws when pillars are missing', async () => {
        await expect(generateBlueprintZip([])).rejects.toThrow('Cannot export blueprint. No architecture pillars defined.');
    });

    it('throws warning object when unresolved decisions exist and force is false', async () => {
        const pillars = [
            {
                id: 'p1',
                title: 'Domain',
                description: 'This description is long enough for validator thresholds.',
                decisions: [{ id: 'd1', question: 'Q1', answer: '', context: 'Long enough context here.' }]
            }
        ];

        await expect(generateBlueprintZip(pillars)).rejects.toMatchObject({ isWarning: true });
    });

    it('builds zip from export.v2.bundle response when forced', async () => {
        const pillars = [
            {
                id: 'p1',
                title: 'Domain',
                description: 'This description is long enough for validator thresholds.',
                decisions: [{ id: 'd1', question: 'Q1', answer: '', context: 'Long enough context here.' }]
            }
        ];

        const JSZip = (await import('jszip')).default;
        await generateBlueprintZip(pillars, { projectId: 123 }, true, { decision_graph: { decisions: [] } });

        expect(exportBundleV2).toHaveBeenCalledWith(expect.objectContaining({
            projectId: 123,
            projectState: expect.objectContaining({
                pillars
            })
        }));

        const instance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;
        expect(instance.folder).toHaveBeenCalledWith('cartograph-output');
        expect(instance.file).toHaveBeenCalledWith('vision.md', '# Vision');
        expect(instance.file).toHaveBeenCalledWith('dependency-map.md', '# Dependency Map');

        const { saveAs } = await import('file-saver');
        expect(saveAs).toHaveBeenCalled();
    });
});
