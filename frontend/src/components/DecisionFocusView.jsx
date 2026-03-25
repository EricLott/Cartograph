import React from 'react';
import { getDecisionInsightBundle } from '../utils/decisionInsights';
import { fetchDecisionSemanticNeighbors } from '../services/apiService';

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

const cleanSuggestion = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const parseInlineOptions = (question = '') => {
    const match = String(question).match(/\(([^)]+)\)/);
    if (!match) return [];
    if (!String(match[1]).includes('/')) return [];
    return match[1].split('/').map(cleanSuggestion).filter(Boolean);
};

const buildSuggestions = (decision, semanticMatches = []) => {
    const targetText = `${decision.question || ''} ${decision.context || ''}`.toLowerCase();
    const domainPatterns = {
        auth: /\bauth|authentication|authorization|oauth|jwt|token|api key|rbac|session\b/i,
        data: /\bdata|database|storage|schema|sql|nosql|warehouse|etl|backup|retention\b/i,
        security: /\bsecurity|encryption|privacy|gdpr|compliance|secret|vault|access control\b/i,
        api: /\bapi|endpoint|rest|graphql|gateway|webhook|contract\b/i,
        ui: /\bui|ux|frontend|responsive|accessibility|design system\b/i
    };
    const targetDomains = Object.entries(domainPatterns)
        .filter(([, pattern]) => pattern.test(targetText))
        .map(([key]) => key);

    const domainScore = (text) => {
        if (targetDomains.length === 0) return 0;
        const hay = String(text || '').toLowerCase();
        return targetDomains.reduce((count, domain) => (
            domainPatterns[domain].test(hay) ? count + 1 : count
        ), 0);
    };

    const suggestions = [];
    const seen = new Set();
    const add = (label, source, reason) => {
        const normalized = cleanSuggestion(label);
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        suggestions.push({ label: normalized, source, reason });
    };

    (decision.options || []).forEach((opt) => {
        const label = cleanSuggestion(opt?.label || opt?.title || opt?.value || opt?.id);
        add(label, 'Configured option', 'Matches a predefined choice for this decision.');
    });
    parseInlineOptions(decision.question).forEach((label) => {
        add(label, 'Question options', 'Extracted from the decision prompt options.');
    });
    semanticMatches
        .filter((m) => m?.answer)
        .map((m) => ({
            ...m,
            _domainScore: domainScore(`${m.question || ''} ${m.answer || ''} ${m.breadcrumb || ''}`)
        }))
        .filter((m) => m._domainScore > 0 || (m.score || 0) >= 0.75)
        .sort((a, b) => {
            if (b._domainScore !== a._domainScore) return b._domainScore - a._domainScore;
            return (b.score || 0) - (a.score || 0);
        })
        .slice(0, 4)
        .forEach((m) => {
            add(m.answer, 'Similar resolved decision', `Used in "${m.question}".`);
        });

    if (suggestions.length === 0) {
        add('Run a short spike first', 'Fallback', 'Collect implementation and risk data before locking a choice.');
        add('Choose the simplest viable option', 'Fallback', 'Bias for lower complexity unless constraints require more.');
        add('Defer with explicit trigger', 'Fallback', 'Document when this decision must be revisited.');
    }

    return suggestions.slice(0, 6);
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
    const [pendingSuggestion, setPendingSuggestion] = React.useState(null);
    const allDecisions = React.useMemo(() => flattenAllDecisions(pillars), [pillars]);

    React.useEffect(() => {
        let cancelled = false;
        setEmbeddingSemanticMatches([]);
        setPendingSuggestion(null);
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

        return () => { cancelled = true; };
    }, [projectId, decisionId]);

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

    const decisionSuggestions = React.useMemo(
        () => buildSuggestions(decision, embeddingSemanticMatches),
        [decision, embeddingSemanticMatches]
    );

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

                <div style={{ marginTop: '0.8rem' }}>
                    <h5 style={{ margin: '0 0 0.45rem 0', color: '#1f2937' }}>Suggested Decisions</h5>
                    <p style={{ margin: '0 0 0.5rem 0', opacity: 0.8, fontSize: '0.84rem' }}>
                        Click a suggestion, then confirm to apply it as the current decision.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {decisionSuggestions.map((suggestion, idx) => (
                            <button
                                key={`${suggestion.label}-${idx}`}
                                className="btn-secondary"
                                style={{
                                    textAlign: 'left',
                                    whiteSpace: 'normal',
                                    lineHeight: 1.3,
                                    borderColor: pendingSuggestion?.label === suggestion.label ? '#3b82f6' : 'rgba(255,255,255,0.12)',
                                    background: pendingSuggestion?.label === suggestion.label ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.04)'
                                }}
                                onClick={() => setPendingSuggestion(suggestion)}
                                title={`Use suggestion: ${suggestion.label}`}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                                    <strong>{suggestion.label}</strong>
                                    <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>{suggestion.source}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.78, marginTop: '0.2rem' }}>
                                    {suggestion.reason}
                                </div>
                            </button>
                        ))}
                    </div>

                    {pendingSuggestion && (
                        <div style={{ marginTop: '0.6rem', border: '1px solid rgba(16,185,129,0.32)', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', padding: '0.55rem 0.65rem', display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.86rem' }}>
                                Confirm decision: <strong>{pendingSuggestion.label}</strong>
                            </span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button className="btn-secondary" onClick={() => setPendingSuggestion(null)}>Cancel</button>
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        onApplyDecision?.(target.pillarId, decision.id, pendingSuggestion.label);
                                        setPendingSuggestion(null);
                                    }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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
                @media (max-width: 980px) {
                    .decision-focus-top-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
