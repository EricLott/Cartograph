import React from 'react';

export default function PillarWorkspace({ pillar, onBack }) {
    if (!pillar) return null;

    return (
        <div className="pillar-workspace glass-panel">
            <div className="workspace-nav">
                <button className="btn-secondary" onClick={onBack}>&larr; Back</button>
                <h2>{pillar.title}</h2>
            </div>

            <div className="decision-container">
                <p className="pillar-description">{pillar.description}</p>

                {pillar.subcategories && pillar.subcategories.length > 0 && (
                    <div className="subcategories-list" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Subcategories</h4>
                        <ul style={{ marginLeft: '1.5rem' }}>
                            {pillar.subcategories.map(sub => <li key={sub.id}>{sub.title}</li>)}
                        </ul>
                    </div>
                )}

                <h3 className="section-title">Key Decisions</h3>
                {pillar.decisions && pillar.decisions.length > 0 ? (
                    <div className="decision-list">
                        {pillar.decisions.map(decision => (
                            <div key={decision.id} className={`decision-card ${decision.answer ? 'answered' : 'pending'}`}>
                                <h4>{decision.question}</h4>
                                <p className="decision-context">{decision.context}</p>

                                <div className="decision-input-area" style={{ marginTop: '1rem' }}>
                                    {decision.answer ? (
                                        <div className="answered-text glass-panel" style={{ padding: '1rem', background: 'rgba(50, 200, 100, 0.1)' }}>
                                            <strong>Agent Extracted Decision:</strong>
                                            <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{decision.answer}</p>
                                        </div>
                                    ) : (
                                        <div className="pending-text glass-panel" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.6)' }}>
                                            <em>Pending Decision... The agent will guide you through this in the chat.</em>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No decisions generated for this pillar.</p>
                )}
            </div>
        </div>
    );
}
