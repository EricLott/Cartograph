import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { getDecisionInsightBundle } from '../utils/decisionInsights';
import { fetchDecisionSemanticNeighbors, fetchDecisionSuggestions } from '../services/apiService';

const flattenAllDecisions = (nodes = [], parentTrail = []) => {
    const rows = [];
    (nodes || []).forEach((node) => {
        const trail = [...parentTrail, node.title];
        (node.decisions || []).forEach((decision) => {
            rows.push({
                ...decision,
                pillarId: node.id,
                pillarTitle: trail[0] || node.title,
                breadcrumb: trail.join(' > ')
            });
        });
        rows.push(...flattenAllDecisions(node.subcategories || [], trail));
    });
    return rows;
};

export default function DecisionFocusView({
    pillars,
    decisionId,
    projectId,
    onJumpToDecision,
    onExitFocus,
    onApplyDecision
}) {
    const insights = React.useMemo(() => getDecisionInsightBundle(pillars, decisionId), [pillars, decisionId]);
    const { target, bestPractices, impacts } = insights;
    const [showWhy, setShowWhy] = React.useState(false);
    const [embeddingSemanticMatches, setEmbeddingSemanticMatches] = React.useState([]);
    const [decisionSuggestions, setDecisionSuggestions] = React.useState([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = React.useState(false);
    const [suggestionsError, setSuggestionsError] = React.useState('');
    const [pendingSuggestion, setPendingSuggestion] = React.useState(null);
    const [isHidingSuggestions, setIsHidingSuggestions] = React.useState(false);
    const allDecisions = React.useMemo(() => flattenAllDecisions(pillars), [pillars]);

    React.useEffect(() => {
        let cancelled = false;
        setEmbeddingSemanticMatches([]);
        setPendingSuggestion(null);
        setIsHidingSuggestions(false);
        if (!projectId || !decisionId) return () => { cancelled = true; };

        fetchDecisionSemanticNeighbors(projectId, decisionId, 8)
            .then((data) => {
                if (cancelled) return;
                const neighbors = Array.isArray(data?.neighbors) ? data.neighbors : [];
                setEmbeddingSemanticMatches(neighbors);
            })
            .catch(() => {
                if (cancelled) return;
                setEmbeddingSemanticMatches([]);
            });

        setIsSuggestionsLoading(true);
        setSuggestionsError('');
        setDecisionSuggestions([]);
        fetchDecisionSuggestions(projectId, decisionId, 6)
            .then((data) => {
                if (cancelled) return;
                const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
                setDecisionSuggestions(suggestions);
            })
            .catch((err) => {
                if (cancelled) return;
                setSuggestionsError(err?.message || 'Failed to generate suggestions.');
            })
            .finally(() => {
                if (cancelled) return;
                setIsSuggestionsLoading(false);
            });

        return () => { cancelled = true; };
    }, [projectId, decisionId]);

    const decision = target?.decision || {};
    const isConflict = !!decision.conflict;
    const conflictReasons = React.useMemo(() => {
        const reasons = Array.isArray(decision.conflict_reasons)
            ? decision.conflict_reasons
            : (decision.conflict ? [decision.conflict] : []);
        return reasons
            .map((reason) => String(reason || '').trim())
            .filter(Boolean);
    }, [decision.conflict, decision.conflict_reasons]);
    const isResolved = !!decision.answer && !isConflict;
    const shouldShowSuggestions = !decision.answer;
    const statusLabel = isConflict ? 'Conflict' : (isResolved ? 'Resolved' : 'Pending');
    const statusColor = isConflict ? '#ef4444' : (isResolved ? '#10b981' : '#f59e0b');
    const handleConfirmSuggestion = (label) => {
        setIsHidingSuggestions(true);
        setTimeout(() => {
            onApplyDecision?.(target.pillarId, decision.id, label);
            setPendingSuggestion(null);
            setIsHidingSuggestions(false);
        }, 260);
    };

    const relationTone = (impact) => {
        const normalizedScore = Number.isFinite(impact?.score)
            ? Math.max(0, Math.min(1, impact.score))
            : 0.5;
        const fillAlpha = 0.06 + (normalizedScore * 0.2);
        const borderAlpha = 0.2 + (normalizedScore * 0.25);

        if (impact.relationTypes?.includes('conflicts')) {
            return {
                bg: `rgba(239,68,68,${fillAlpha.toFixed(3)})`,
                border: `rgba(239,68,68,${borderAlpha.toFixed(3)})`
            };
        }
        if (impact.relationTypes?.includes('depends_on') || impact.relationTypes?.includes('required_by')) {
            return {
                bg: `rgba(59,130,246,${fillAlpha.toFixed(3)})`,
                border: `rgba(59,130,246,${borderAlpha.toFixed(3)})`
            };
        }
        return {
            bg: `rgba(16,185,129,${fillAlpha.toFixed(3)})`,
            border: `rgba(16,185,129,${borderAlpha.toFixed(3)})`
        };
    };

    const embeddingImpacts = React.useMemo(() => (
        embeddingSemanticMatches.map((match) => ({
            decisionId: match.decisionId,
            question: match.question,
            answer: match.answer || '',
            pillarId: match.pillarId || target?.pillarId,
            pillarTitle: match.pillarTitle || target?.pillarTitle,
            topLevelTitle: match.topLevelTitle || match.pillarTitle || target?.pillarTitle || 'Project',
            breadcrumb: match.breadcrumb || match.pillarTitle || '',
            relationTypes: ['semantic_related'],
            score: typeof match.score === 'number' ? match.score : 0,
            why: 'Embedding vectors indicate these decisions occupy similar architectural space and should be reviewed together.'
        }))
    ), [embeddingSemanticMatches, target?.pillarId, target?.pillarTitle]);

    const combinedImpacts = React.useMemo(() => {
        const byId = new Map();
        [...impacts, ...embeddingImpacts].forEach((item) => {
            const current = byId.get(item.decisionId);
            if (!current) {
                byId.set(item.decisionId, {
                    ...item,
                    relationTypes: Array.isArray(item.relationTypes) ? [...item.relationTypes] : []
                });
                return;
            }
            const mergedTypes = new Set([...(current.relationTypes || []), ...(item.relationTypes || [])]);
            byId.set(item.decisionId, {
                ...current,
                ...item,
                relationTypes: [...mergedTypes],
                score: Math.max(current.score || 0, item.score || 0),
                why: current.why || item.why
            });
        });

        return [...byId.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
    }, [impacts, embeddingImpacts]);

    const decisionContextSummary = React.useMemo(() => {
        const total = allDecisions.length;
        const resolved = allDecisions.filter((d) => d.answer && !d.conflict).length;
        const deps = combinedImpacts.filter((i) => i.relationTypes.includes('depends_on'));
        const requiredBy = combinedImpacts.filter((i) => i.relationTypes.includes('required_by'));
        const conflicts = combinedImpacts.filter((i) => i.relationTypes.includes('conflicts'));
        const strongestSemantic = embeddingSemanticMatches.slice(0, 3);

        return [
            `Project coverage: ${resolved}/${total} decisions are resolved.`,
            deps.length > 0
                ? `Dependencies to validate first: ${deps.map((d) => d.question).slice(0, 2).join('; ')}.`
                : 'No direct dependency blockers are currently linked to this decision.',
            conflicts.length > 0
                ? `Potential conflict scope: ${conflicts.length} linked conflict${conflicts.length === 1 ? '' : 's'} need joint resolution.`
                : 'No active conflict links detected for this decision.',
            strongestSemantic.length > 0
                ? `Most related architecture areas: ${strongestSemantic.map((m) => `${m.question} (${Math.round((m.score || 0) * 100)}%)`).join('; ')}.`
                : 'No embedding matches yet. Add provider keys to unlock semantic context.',
            requiredBy.length > 0
                ? `Downstream impact: ${requiredBy.length} decision${requiredBy.length === 1 ? '' : 's'} depend on this choice.`
                : 'No downstream dependencies are currently registered.'
        ];
    }, [allDecisions, combinedImpacts, embeddingSemanticMatches]);

    if (!target) {
        return (
            <div className="glass-panel" style={{ padding: '1.25rem', height: '100%' }}>
                <h2 style={{ marginTop: 0 }}>Decision Focus</h2>
                <p>No decision selected. Choose a decision point to enter focus mode.</p>
            </div>
        );
    }

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
                    {conflictReasons.length > 0 && (
                        <div
                            style={{
                                marginTop: '0.7rem',
                                border: '1px solid rgba(239,68,68,0.35)',
                                borderRadius: '8px',
                                background: 'rgba(254,226,226,0.72)',
                                padding: '0.55rem 0.65rem'
                            }}
                        >
                            <p style={{ margin: '0 0 0.35rem 0', fontWeight: 700, color: '#991b1b' }}>
                                Conflict Reason{conflictReasons.length === 1 ? '' : 's'}
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '1rem', color: '#7f1d1d' }}>
                                {conflictReasons.map((reason, idx) => (
                                    <li key={`${reason}-${idx}`} style={{ marginBottom: '0.25rem' }}>
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
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
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>Decision Brief</h4>
                <div style={{ border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', background: 'rgba(239,246,255,0.7)', padding: '0.75rem 0.85rem' }}>
                    <p style={{ margin: '0 0 0.55rem 0', opacity: 0.86 }}>
                        Summary of context needed to make a project-grounded, data-driven decision:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {decisionContextSummary.map((line, idx) => (
                            <li key={`${line}-${idx}`} style={{ marginBottom: '0.35rem' }}>{line}</li>
                        ))}
                    </ul>
                </div>

                {(shouldShowSuggestions || isHidingSuggestions) && (
                <div className={`decision-suggestions-section ${isHidingSuggestions ? 'hiding' : ''}`} style={{ marginTop: '0.8rem' }}>
                    <h5 style={{ margin: '0 0 0.45rem 0', color: '#1f2937' }}>Suggested Decisions</h5>
                    <p style={{ margin: '0 0 0.5rem 0', opacity: 0.8, fontSize: '0.84rem' }}>
                        Click a suggestion, then confirm to apply it as the current decision.
                    </p>
                    {isSuggestionsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {[0, 1, 2].map((idx) => (
                                <div
                                    key={`suggestion-skeleton-${idx}`}
                                    style={{
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        padding: '0.65rem 0.8rem',
                                        background: 'rgba(255,255,255,0.04)'
                                    }}
                                >
                                    <div className="decision-skeleton-line title" />
                                    <div className="decision-skeleton-line body" />
                                    <div className="decision-skeleton-line body short" />
                                </div>
                            ))}
                        </div>
                    ) : suggestionsError ? (
                        <p style={{ opacity: 0.85, margin: 0, color: '#b45309' }}>
                            {suggestionsError}
                        </p>
                    ) : decisionSuggestions.length === 0 ? (
                        <p style={{ opacity: 0.78, margin: 0 }}>
                            No model-generated suggestions yet. Check provider key settings.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {decisionSuggestions.map((suggestion, idx) => (
                                <div
                                    key={`${suggestion.label}-${idx}`}
                                    className={`decision-suggestion-card ${pendingSuggestion?.label === suggestion.label ? 'selected' : ''}`}
                                    style={{
                                        textAlign: 'left'
                                    }}
                                    onClick={() => setPendingSuggestion(suggestion)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setPendingSuggestion(suggestion);
                                        }
                                    }}
                                    title={`Use suggestion: ${suggestion.label}`}
                                >
                                    {idx === 0 && (
                                        <div className="decision-recommended-badge">
                                            <FaCheck size={10} />
                                            <span>Recommended</span>
                                        </div>
                                    )}
                                    <div className="decision-suggestion-title">
                                        {suggestion.label}
                                    </div>
                                    <div className="decision-suggestion-reason">
                                        {suggestion.reason}
                                    </div>
                                    {pendingSuggestion?.label === suggestion.label && (
                                        <div className="decision-suggestion-confirm">
                                            <span style={{ fontSize: '0.83rem', opacity: 0.86 }}>
                                                Use this suggestion?
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPendingSuggestion(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn-primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConfirmSuggestion(suggestion.label);
                                                    }}
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}
            </section>

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
                {combinedImpacts.length === 0 ? (
                    <p style={{ opacity: 0.8 }}>No linked impacts yet. As decisions are connected, they will show up here.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {combinedImpacts.map((impact) => {
                            const tone = relationTone(impact);
                            const similarityPercent = Number.isFinite(impact.score)
                                ? Math.round(Math.max(0, Math.min(1, impact.score)) * 100)
                                : null;
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                            <strong>{impact.question}</strong>
                                            <span style={{ fontSize: '0.72rem', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '10px', padding: '1px 7px' }}>
                                                {impact.topLevelTitle}
                                            </span>
                                            {impact.breadcrumb && impact.breadcrumb !== impact.topLevelTitle && (
                                                <span style={{ fontSize: '0.72rem', opacity: 0.78 }}>{impact.breadcrumb}</span>
                                            )}
                                        </div>
                                        {similarityPercent !== null && (
                                            <span style={{ fontSize: '0.72rem', opacity: 0.86, whiteSpace: 'nowrap' }}>
                                                {similarityPercent}% similar
                                            </span>
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
                .decision-skeleton-line {
                    border-radius: 6px;
                    margin-bottom: 0.4rem;
                    background: linear-gradient(90deg, rgba(148,163,184,0.18) 0%, rgba(148,163,184,0.32) 50%, rgba(148,163,184,0.18) 100%);
                    background-size: 220% 100%;
                    animation: decisionSkeletonPulse 1.1s ease-in-out infinite;
                }
                .decision-skeleton-line.title {
                    height: 18px;
                    width: 45%;
                }
                .decision-skeleton-line.body {
                    height: 14px;
                    width: 96%;
                }
                .decision-skeleton-line.body.short {
                    width: 72%;
                    margin-bottom: 0;
                }
                .decision-recommended-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.3rem;
                    font-size: 0.68rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: #065f46;
                    background: rgba(16,185,129,0.14);
                    border: 1px solid rgba(16,185,129,0.4);
                    border-radius: 999px;
                    padding: 0.15rem 0.5rem;
                    margin-bottom: 0.45rem;
                }
                .decision-suggestion-card {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    cursor: pointer;
                    border: 1px solid rgba(15,23,42,0.1);
                    background: rgba(255,255,255,0.72);
                    border-radius: 10px;
                    padding: 0.7rem 0.9rem;
                    white-space: normal;
                    line-height: 1.35;
                    transition: border-color 0.18s ease, background 0.18s ease;
                }
                .decision-suggestion-card:hover {
                    border-color: rgba(59,130,246,0.32);
                    background: rgba(239,246,255,0.78);
                }
                .decision-suggestion-card.selected {
                    border-color: rgba(59,130,246,0.56);
                    background: rgba(219,234,254,0.72);
                }
                .decision-suggestion-title {
                    font-weight: 700;
                    font-size: 1.12rem;
                    line-height: 1.25;
                    color: #111827;
                    margin-bottom: 0.55rem;
                }
                .decision-suggestion-reason {
                    font-size: 1.02rem;
                    line-height: 1.45;
                    color: #42556f;
                }
                .decision-suggestion-confirm {
                    margin-top: 0.55rem;
                    width: 100%;
                    border-top: 1px solid rgba(59,130,246,0.2);
                    padding-top: 0.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 0.6rem;
                }
                .decision-suggestions-section {
                    transition: opacity 0.22s ease, transform 0.22s ease, max-height 0.26s ease;
                    opacity: 1;
                    transform: translateY(0);
                    max-height: 1400px;
                    overflow: hidden;
                }
                .decision-suggestions-section.hiding {
                    opacity: 0;
                    transform: translateY(-4px);
                    max-height: 0;
                    pointer-events: none;
                }
                @keyframes decisionSkeletonPulse {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @media (max-width: 980px) {
                    .decision-focus-top-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
