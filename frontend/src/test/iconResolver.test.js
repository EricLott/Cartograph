import { describe, it, expect } from 'vitest';
import { getIconCandidates } from '../utils/iconResolver';

describe('iconResolver', () => {
    it('prefers indexed icon for known alias', () => {
        const candidates = getIconCandidates('Azure/AWS/GCP/Hybrid/etc');
        expect(candidates[0]).toBe('vsc:azure');
    });

    it('keeps explicit iconify name as candidate', () => {
        const candidates = getIconCandidates('mdi:shield-check-outline');
        expect(candidates).toContain('mdi:shield-check-outline');
    });

    it('generates fallback candidates for unknown labels', () => {
        const candidates = getIconCandidates('event stream');
        expect(candidates).toContain('mdi:event-stream');
        expect(candidates).toContain('vsc:event-stream');
        expect(candidates[candidates.length - 1]).toBe('vsc:question');
    });
});
