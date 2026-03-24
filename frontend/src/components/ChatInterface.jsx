import React, { useState, useRef, useEffect } from 'react';

const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export default function ChatInterface({ messages, onSendMessage, isWaiting, focusTrigger = 0 }) {
    const [input, setInput] = useState('');
    const [expandedArtifacts, setExpandedArtifacts] = useState({});
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!inputRef.current) return;
        inputRef.current.focus({ preventScroll: true });
    }, [focusTrigger]);

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

    const renderAdaptiveBodyItem = (item, idx) => {
        if (!item || typeof item !== 'object') return null;
        if (item.type === 'TextBlock') {
            const style = {
                margin: 0,
                whiteSpace: item.wrap ? 'pre-wrap' : 'normal',
                fontWeight: item.weight === 'Bolder' ? 700 : 500,
                fontSize: item.size === 'Large' ? '1.05rem' : item.size === 'Medium' ? '0.95rem' : '0.9rem',
                lineHeight: 1.4,
                opacity: 0.92
            };
            return <p key={idx} style={style}>{item.text || ''}</p>;
        }
        if (item.type === 'FactSet' && Array.isArray(item.facts)) {
            return (
                <div key={idx} className="artifact-facts">
                    {item.facts.map((fact, factIdx) => (
                        <div key={`${idx}-${factIdx}`} className="artifact-fact-row">
                            <span className="artifact-fact-title">{fact.title}</span>
                            <span className="artifact-fact-value">{fact.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderArtifact = (artifact, messageIndex) => {
        if (!artifact || artifact.type !== 'adaptive_card' || !artifact.json) return null;
        const isExpanded = !!expandedArtifacts[messageIndex];
        const body = Array.isArray(artifact.json.body) ? artifact.json.body : [];

        return (
            <div className="artifact-block">
                <div className="artifact-title-row">
                    <div className="artifact-title">Artifact: Adaptive Card</div>
                    <button
                        className="artifact-toggle"
                        onClick={() => setExpandedArtifacts((current) => ({ ...current, [messageIndex]: !isExpanded }))}
                    >
                        {isExpanded ? 'Hide JSON' : 'View JSON'}
                    </button>
                </div>
                <div className="artifact-preview">
                    {body.length > 0 ? body.map((item, i) => renderAdaptiveBodyItem(item, i)) : <p style={{ margin: 0 }}>No card body provided.</p>}
                </div>
                {isExpanded && <pre>{JSON.stringify(artifact.json, null, 2)}</pre>}
            </div>
        );
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
                        <div className="bubble">
                            <div>{renderMessageContent(msg.content)}</div>
                            {renderArtifact(msg.artifact, idx)}
                        </div>
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
                    ref={inputRef}
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
                .artifact-block {
                    margin-top: 0.75rem;
                    border: 1px solid rgba(59, 130, 246, 0.25);
                    border-radius: 8px;
                    background: rgba(15, 23, 42, 0.08);
                    padding: 0.6rem;
                }
                .artifact-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                    margin-bottom: 0.45rem;
                }
                .artifact-title {
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    opacity: 0.8;
                }
                .artifact-toggle {
                    border: 1px solid rgba(59, 130, 246, 0.35);
                    background: rgba(59, 130, 246, 0.12);
                    color: inherit;
                    font-size: 0.72rem;
                    border-radius: 6px;
                    padding: 0.15rem 0.45rem;
                    cursor: pointer;
                }
                .artifact-preview {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 0.35rem;
                }
                .artifact-facts {
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 6px;
                    padding: 0.45rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .artifact-fact-row {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: space-between;
                    font-size: 0.82rem;
                }
                .artifact-fact-title {
                    opacity: 0.75;
                    font-weight: 600;
                }
                .artifact-fact-value {
                    opacity: 0.95;
                }
                .artifact-block pre {
                    margin: 0;
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-size: 0.78rem;
                    line-height: 1.35;
                }
            `}</style>
        </div>
    );
}
