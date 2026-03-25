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

import { generateBlueprintZip } from '../services/exportService';
import { exportBundleV2 } from '../services/apiService';

describe('exportService execution projection contract (Task-031)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('writes mandatory /04-tasks buckets from V2 bundle', async () => {
        exportBundleV2.mockResolvedValue({
            root: 'cartograph-output',
            files: [
                { path: '04-tasks/epics/epic_core.md', content: '# Epic' },
                { path: '04-tasks/features/feature_alpha.md', content: '# Feature' },
                { path: '04-tasks/tasks/task_alpha.md', content: '# Task' },
                { path: '04-tasks/spikes/.keep', content: '' },
                { path: '04-tasks/bugs/.keep', content: '' }
            ]
        });

        const pillars = [
            {
                id: 'p1',
                title: 'Execution',
                description: 'This description is long enough for validator thresholds.',
                decisions: [{ id: 'd1', question: 'Q1', answer: 'A1', context: 'Long enough context here.' }]
            }
        ];

        const JSZip = (await import('jszip')).default;
        await generateBlueprintZip(pillars, {}, true, {});
        const zipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

        expect(zipInstance.file).toHaveBeenCalledWith('epic_core.md', '# Epic');
        expect(zipInstance.file).toHaveBeenCalledWith('feature_alpha.md', '# Feature');
        expect(zipInstance.file).toHaveBeenCalledWith('task_alpha.md', '# Task');
    });
});
