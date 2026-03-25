import React, { useState, useRef, useEffect } from 'react';

const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export default function ChatInterface({ messages, onSendMessage, isWaiting, focusTrigger = 0 }) {
    const [input, setInput] = useState('');
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

    const renderInlineMarkdown = (text, keyPrefix) => {
        const safeText = typeof text === 'string' ? text : String(text ?? '');
        const pattern = /(\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        let idx = 0;

        while ((match = pattern.exec(safeText)) !== null) {
            if (match.index > lastIndex) {
                parts.push(
                    <React.Fragment key={`${keyPrefix}-text-${idx++}`}>
                        {safeText.slice(lastIndex, match.index)}
                    </React.Fragment>
                );
            }

            if (match[2]) {
                parts.push(
                    <a
                        key={`${keyPrefix}-link-${idx++}`}
                        href={match[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {match[1].slice(1, match[1].indexOf(']'))}
                    </a>
                );
            } else if (match[3]) {
                parts.push(<strong key={`${keyPrefix}-bold-${idx++}`}>{match[3]}</strong>);
            } else if (match[4]) {
                parts.push(<code key={`${keyPrefix}-code-${idx++}`}>{match[4]}</code>);
            } else if (match[5]) {
                parts.push(<em key={`${keyPrefix}-italic-${idx++}`}>{match[5]}</em>);
            }

            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < safeText.length) {
            parts.push(
                <React.Fragment key={`${keyPrefix}-tail-${idx++}`}>
                    {safeText.slice(lastIndex)}
                </React.Fragment>
            );
        }

        return parts.length > 0 ? parts : safeText;
    };

    const renderMessageContent = (content) => {
        const safeContent = typeof content === 'string' ? content : String(content ?? '');
        const lines = safeContent.split('\n');
        const blocks = [];
        let i = 0;
        let key = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed) {
                i += 1;
                continue;
            }

            if (/^\d+\.\s+/.test(trimmed)) {
                const items = [];
                while (i < lines.length) {
                    const current = lines[i].trim();
                    if (!current) {
                        i += 1;
                        continue;
                    }
                    if (!/^\d+\.\s+/.test(current)) break;
                    items.push(current.replace(/^\d+\.\s+/, ''));
                    i += 1;
                }
                blocks.push(
                    <ol key={`md-ol-${key++}`}>
                        {items.map((item, itemIdx) => (
                            <li key={`md-ol-item-${itemIdx}`}>{renderInlineMarkdown(item, `md-ol-${key}-${itemIdx}`)}</li>
                        ))}
                    </ol>
                );
                continue;
            }

            if (/^[-*]\s+/.test(trimmed)) {
                const items = [];
                while (i < lines.length) {
                    const current = lines[i].trim();
                    if (!current) {
                        i += 1;
                        continue;
                    }
                    if (!/^[-*]\s+/.test(current)) break;
                    items.push(current.replace(/^[-*]\s+/, ''));
                    i += 1;
                }
                blocks.push(
                    <ul key={`md-ul-${key++}`}>
                        {items.map((item, itemIdx) => (
                            <li key={`md-ul-item-${itemIdx}`}>{renderInlineMarkdown(item, `md-ul-${key}-${itemIdx}`)}</li>
                        ))}
                    </ul>
                );
                continue;
            }

            const paragraph = [];
            while (i < lines.length) {
                const next = lines[i].trim();
                if (!next || /^\d+\.\s+/.test(next) || /^[-*]\s+/.test(next)) break;
                paragraph.push(lines[i]);
                i += 1;
            }

            const joined = paragraph.join(' ').replace(/\s+/g, ' ').trim();
            if (joined) {
                blocks.push(<p key={`md-p-${key++}`}>{renderInlineMarkdown(joined, `md-p-${key}`)}</p>);
            }
        }

        return blocks.length > 0 ? blocks : safeContent;
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
        const body = Array.isArray(artifact.json.body) ? artifact.json.body : [];
        const actions = Array.isArray(artifact.json.actions) ? artifact.json.actions : [];

        const handleAction = (action) => {
            if (!action || typeof action !== 'object') return;
            if (action.type === 'Action.OpenUrl' && action.url && typeof window !== 'undefined' && typeof window.open === 'function') {
                window.open(action.url, '_blank', 'noopener,noreferrer');
                return;
            }

            // Default to submitting a quick follow-up to the agent.
            const fallback = action.title || '';
            const dataValue = action.data && typeof action.data === 'object'
                ? (action.data.prompt || action.data.message || fallback || JSON.stringify(action.data))
                : fallback;
            const payload = String(dataValue || '').trim();
            if (payload) onSendMessage(payload);
        };

        return (
            <div className="artifact-block">
                <div className="artifact-preview">
                    {body.length > 0 ? body.map((item, i) => renderAdaptiveBodyItem(item, i)) : <p style={{ margin: 0 }}>No card body provided.</p>}
                </div>
                {actions.length > 0 && (
                    <div className="artifact-actions">
                        {actions.map((action, idx) => (
                            <button
                                key={`${messageIndex}-action-${idx}`}
                                className="artifact-action-btn"
                                onClick={() => handleAction(action)}
                            >
                                {action.title || `Action ${idx + 1}`}
                            </button>
                        ))}
                    </div>
                )}
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
                .artifact-preview {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 0.35rem;
                }
                .artifact-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.4rem;
                    margin-top: 0.25rem;
                }
                .artifact-action-btn {
                    border: 1px solid rgba(59, 130, 246, 0.35);
                    background: rgba(59, 130, 246, 0.12);
                    color: inherit;
                    font-size: 0.76rem;
                    border-radius: 6px;
                    padding: 0.2rem 0.5rem;
                    cursor: pointer;
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
            `}</style>
        </div>
    );
}
