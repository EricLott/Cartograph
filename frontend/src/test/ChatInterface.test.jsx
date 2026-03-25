import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatInterface from '../components/ChatInterface';

describe('ChatInterface markdown rendering', () => {
    it('renders basic markdown formatting for agent messages', () => {
        render(
            <ChatInterface
                messages={[
                    {
                        role: 'agent',
                        content: "1. **Frontend**: Choose stack\n\n2. **Backend**: Choose runtime\n\n3. **Data**: Choose model\n\nSee [docs](https://example.com)."
                    }
                ]}
                onSendMessage={vi.fn()}
                isWaiting={false}
            />
        );

        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('Backend')).toBeInTheDocument();
        expect(screen.getByText('Data')).toBeInTheDocument();
        expect(screen.getByRole('list')).toBeInTheDocument();
        const link = screen.getByRole('link', { name: 'docs' });
        expect(link).toHaveAttribute('href', 'https://example.com');
    });
});
