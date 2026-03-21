import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatInterface from '../components/ChatInterface';
import React from 'react';

describe('ChatInterface', () => {
    it('renders multiline content with <br /> tags', () => {
        const messages = [
            { role: 'agent', content: 'Line 1\nLine 2\nLine 3' }
        ];
        render(<ChatInterface messages={messages} onSendMessage={() => {}} isWaiting={false} />);
        
        const bubbleElement = document.querySelector('.bubble');
        expect(bubbleElement).toBeInTheDocument();
        // Check for the presence of <br> tags - JSDOM might use <br>
        const brTags = bubbleElement.querySelectorAll('br');
        expect(brTags.length).toBe(2);
        expect(bubbleElement.textContent).toContain('Line 1');
        expect(bubbleElement.textContent).toContain('Line 3');
    });

    it('handles non-string content gracefully', () => {
        const messages = [
            { role: 'user', content: null },
            { role: 'agent', content: undefined },
            { role: 'user', content: 123 }
        ];
        render(<ChatInterface messages={messages} onSendMessage={() => {}} isWaiting={false} />);
        
        // Bubbles should be present but empty or contain stringified value
        const bubbles = document.querySelectorAll('.bubble');
        expect(bubbles.length).toBe(3);
        expect(bubbles[2].textContent).toBe('123');
    });

    it('escapes potentially dangerous HTML content when rendered as text', () => {
        const maliciousContent = '<script>alert("xss")</script>';
        const messages = [
            { role: 'agent', content: maliciousContent }
        ];
        render(<ChatInterface messages={messages} onSendMessage={() => {}} isWaiting={false} />);
        
        const bubble = screen.getByText(maliciousContent);
        expect(bubble).toBeInTheDocument();
        // If it was rendered as HTML, getByText wouldn't find the raw script tags as text
    });
});
