import React, { useState, useRef, useEffect } from 'react';

const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export default function ChatInterface({ messages, onSendMessage, isWaiting }) {
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isWaiting) return;
        onSendMessage(input);
        setInput('');
    };

    const renderMessageContent = (content) => {
        const safeContent = typeof content === 'string' ? content : String(content ?? '');
        const lines = safeContent.split('\n');
        return lines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
            </React.Fragment>
        ));
    };

    return (
        <div className="chat-container glass-panel" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="chat-history">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role === 'agent' ? 'agent-message' : 'user-message'}`} style={{ animation: 'messageSlideIn 0.3s ease-out forwards' }}>
                        <div className="avatar">
                            {msg.role === 'agent' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12 2.1 7.1"></path><path d="M12 12l9.9 4.9"></path></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            )}
                        </div>
                        <div className="bubble">{renderMessageContent(msg.content)}</div>
                    </div>
                ))}
                {isWaiting && (
                    <div className="message agent-message" style={{ animation: 'messageSlideIn 0.3s ease-out forwards' }}>
                        <div className="avatar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12 2.1 7.1"></path><path d="M12 12l9.9 4.9"></path></svg>
                        </div>
                        <div className="bubble typing-indicator" style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '100%', minHeight: '44px' }}>
                            <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'currentColor', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out' }}></span>
                            <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'currentColor', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out 0.2s' }}></span>
                            <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'currentColor', borderRadius: '50%', animation: 'pulse 1.5s infinite ease-in-out 0.4s' }}></span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            <div className="chat-input-area">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Describe your architecture requirements..."
                    rows="2"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    style={{
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.3s ease'
                    }}
                ></textarea>
                <button className="btn-primary" onClick={handleSend} disabled={isWaiting} style={{ height: '44px', padding: '0 1.25rem' }}>
                    <SendIcon /> Send
                </button>
            </div>
            <style>{`
                @keyframes messageSlideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(0.8); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
