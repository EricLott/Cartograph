import React from 'react';
import { getDecisionInsightBundle } from '../utils/decisionInsights';

export default function DecisionFocusView({ pillars, decisionId, onJumpToDecision, onExitFocus }) {
    const insights = React.useMemo(() => getDecisionInsightBundle(pillars, decisionId), [pillars, decisionId]);
    const { target, bestPractices, impacts, semanticMatches } = insights;
    const [showWhy, setShowWhy] = React.useState(false);

    if (!target) {
        return (
            <div className="glass-panel" style={{ padding: '1.25rem', height: '100%' }}>
                <h2 style={{ marginTop: 0 }}>Decision Focus</h2>
                <p>No decision selected. Choose a decision point to enter focus mode.</p>
            </div>
        );
    }

    const decision = target.decision;
    const isConflict = !!decision.conflict;
    const isResolved = !!decision.answer && !isConflict;
    const statusLabel = isConflict ? 'Conflict' : (isResolved ? 'Resolved' : 'Pending');
    const statusColor = isConflict ? '#ef4444' : (isResolved ? '#10b981' : '#f59e0b');

    const relationTone = (impact) => {
        if (impact.relationTypes?.includes('conflicts')) return { bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.35)' };
        if (impact.relationTypes?.includes('depends_on') || impact.relationTypes?.includes('required_by')) {
            return { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.34)' };
        }
        return { bg: 'rgba(16,185,129,0.11)', border: 'rgba(16,185,129,0.3)' };
    };

    return (
        <div className="glass-panel decision-focus-shell" style={{ padding: '1.15rem 1.2rem', height: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Decision Focus</h2>
                    <p style={{ margin: '0.3rem 0 0.1rem 0', opacity: 0.76, fontSize: '0.9rem' }}>
                        Visualize critical architectural choices and downstream effects.
                    </p>
                    <p style={{ margin: 0, opacity: 0.68, fontSize: '0.8rem' }}>
                        {target.pillarTitle} | {decision.id || target.id}
                    </p>
                </div>
                <button className="btn-secondary" onClick={onExitFocus}>Back to Details</button>
            </div>

            <div className="decision-focus-top-grid">
                <div
                    className="decision-focus-primary-card"
                    style={{ borderLeft: `3px solid ${statusColor}` }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', marginBottom: '0.55rem' }}>
                        <span
                            style={{
                                fontSize: '0.68rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                borderRadius: '11px',
                                padding: '2px 9px',
                                background: `${statusColor}22`,
                                border: `1px solid ${statusColor}55`
                            }}
                        >
                            {statusLabel}
                        </span>
                        <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                            Ref: {decision.id || target.id}
                        </span>
                    </div>
                    <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{decision.question}</h3>
                    <p style={{ marginBottom: 0, opacity: 0.9 }}>{decision.context || 'No additional context provided.'}</p>
                    {decision.answer && (
                        <p style={{ marginTop: '0.65rem', marginBottom: 0 }}>
                            <strong>Current Answer:</strong> {decision.answer}
                        </p>
                    )}
                </div>

                <div className="decision-focus-practice-card">
                    <h4 style={{ marginTop: 0, marginBottom: '0.55rem' }}>Best Practices</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.05rem' }}>
                        {bestPractices.map((item, idx) => <li key={`${item}-${idx}`} style={{ marginBottom: '0.35rem' }}>{item}</li>)}
                    </ul>
                </div>
            </div>

            <section style={{ marginTop: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <h4 style={{ margin: 0, color: '#1f2937' }}>Impact Map</h4>
                    <button
                        className="btn-secondary"
                        style={{ padding: '0.22rem 0.5rem', fontSize: '0.78rem' }}
                        onClick={() => setShowWhy((current) => !current)}
                    >
                        {showWhy ? 'Hide Why' : 'Generate Why These Are Related'}
                    </button>
                </div>
                {impacts.length === 0 ? (
                    <p style={{ opacity: 0.8 }}>No linked impacts yet. As decisions are connected, they will show up here.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {impacts.map((impact) => {
                            const tone = relationTone(impact);
                            return (
                                <button
                                    key={impact.decisionId}
                                    className="btn-secondary"
                                    style={{
                                        textAlign: 'left',
                                        whiteSpace: 'normal',
                                        lineHeight: 1.35,
                                        display: 'block',
                                        gap: '0.5rem',
                                        borderColor: tone.border,
                                        background: tone.bg
                                    }}
                                    onClick={() => onJumpToDecision?.(impact.pillarId, impact.decisionId)}
                                    title={`Click to navigate to ${impact.question}`}
                                >
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                        <strong>{impact.question}</strong>
                                        <span style={{ fontSize: '0.72rem', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '10px', padding: '1px 7px' }}>
                                            {impact.topLevelTitle}
                                        </span>
                                        {impact.breadcrumb && impact.breadcrumb !== impact.topLevelTitle && (
                                            <span style={{ fontSize: '0.72rem', opacity: 0.78 }}>{impact.breadcrumb}</span>
                                        )}
                                    </div>
                                    {showWhy && (
                                        <div style={{ marginTop: '0.35rem', fontSize: '0.84rem', opacity: 0.86 }}>
                                            {impact.why}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            <section style={{ marginTop: '1.15rem' }}>
                <h4 style={{ marginBottom: '0.45rem', color: '#1f2937' }}>Semantically Similar Project Objects</h4>
                {semanticMatches.length === 0 ? (
                    <p style={{ opacity: 0.8 }}>No semantic matches found yet.</p>
                ) : (
                    <div className="decision-focus-table">
                        <div className="decision-focus-table-head">
                            <span>Decision Object</span>
                            <span>Context</span>
                            <span>Navigation</span>
                        </div>
                        {semanticMatches.map((match) => (
                            <button
                                key={match.decisionId}
                                className="decision-focus-table-row"
                                onClick={() => onJumpToDecision?.(match.pillarId, match.decisionId)}
                                title={`Click to navigate to ${match.question}`}
                            >
                                <span style={{ fontWeight: 600 }}>{match.question}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    <span className="decision-focus-context-pill">
                                        {match.topLevelTitle}
                                    </span>
                                    {match.breadcrumb && match.breadcrumb !== match.topLevelTitle && (
                                        <span style={{ fontSize: '0.76rem', opacity: 0.78 }}>{match.breadcrumb}</span>
                                    )}
                                </span>
                                <span style={{ fontSize: '0.76rem', opacity: 0.75 }}>Click to open</span>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <style>{`
                .decision-focus-shell {
                    background:
                        radial-gradient(1200px 350px at 0% 0%, rgba(59,130,246,0.08), transparent 60%),
                        radial-gradient(900px 280px at 100% 100%, rgba(16,185,129,0.06), transparent 58%);
                }
                .decision-focus-top-grid {
                    display: grid;
                    grid-template-columns: 1.45fr 1fr;
                    gap: 0.85rem;
                }
                .decision-focus-primary-card {
                    border: 1px solid rgba(59,130,246,0.24);
                    background: rgba(255,255,255,0.75);
                    border-radius: 10px;
                    padding: 0.85rem;
                }
                .decision-focus-practice-card {
                    border: 1px solid rgba(59,130,246,0.24);
                    background: rgba(239,246,255,0.72);
                    border-radius: 10px;
                    padding: 0.85rem;
                    font-size: 0.88rem;
                }
                .decision-focus-table {
                    border: 1px solid rgba(15,23,42,0.08);
                    border-radius: 10px;
                    overflow: hidden;
                    background: rgba(255,255,255,0.78);
                }
                .decision-focus-table-head {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr 0.45fr;
                    gap: 0.5rem;
                    padding: 0.45rem 0.65rem;
                    font-size: 0.74rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    background: rgba(148,163,184,0.16);
                    color: rgba(30,41,59,0.8);
                }
                .decision-focus-table-row {
                    width: 100%;
                    display: grid;
                    grid-template-columns: 1.5fr 1fr 0.45fr;
                    gap: 0.5rem;
                    border: none;
                    border-top: 1px solid rgba(15,23,42,0.06);
                    background: rgba(255,255,255,0.84);
                    text-align: left;
                    padding: 0.55rem 0.65rem;
                    cursor: pointer;
                    color: inherit;
                }
                .decision-focus-table-row:hover {
                    background: rgba(239,246,255,0.9);
                }
                .decision-focus-context-pill {
                    font-size: 0.72rem;
                    border: 1px solid rgba(59,130,246,0.3);
                    border-radius: 10px;
                    padding: 1px 7px;
                    background: rgba(59,130,246,0.1);
                }
                @media (max-width: 980px) {
                    .decision-focus-top-grid {
                        grid-template-columns: 1fr;
                    }
                    .decision-focus-table-head,
                    .decision-focus-table-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
