import React from 'react';
import { ConfigOption, CheckIcon, PendingIcon, WarningIcon } from './PillarComponents';
import { STANDARD_DECISIONS } from '../constants/architecture';

const SubcategoriesList = ({ subcategories }) => {
    if (!subcategories || subcategories.length === 0) return null;
    return (
        <div className="subcategories-list glass-panel">
            <h4>Sub-Components</h4>
            <ul>
                {subcategories.map(sub => (
                    <li key={sub.id}>
                        <div className="dot"></div>
                        <span>{sub.title}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const DecisionCard = ({ decision, index, onUpdateDecision, pillarId }) => {
    const standardConfig = STANDARD_DECISIONS[decision.id];
    return (
        <div className={`decision-card ${decision.conflict ? 'conflict' : (decision.answer ? 'answered' : 'pending')}`} style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="decision-card-header">
                <h4>{decision.question}</h4>
                {decision.conflict ? (
                    <span className="status-conflict"><WarningIcon /> Conflict</span>
                ) : decision.answer ? (
                    <span className="status-resolved"><CheckIcon /> Resolved</span>
                ) : (
                    <span className="status-pending"><PendingIcon /> Pending</span>
                )}
            </div>
            <p className="decision-context">{decision.context}</p>
            {decision.conflict && (
                <div className="conflict-banner">
                    <p>{decision.conflict}</p>
                </div>
            )}
            <div className="decision-input-area">
                {decision.answer ? (
                    <div className="answered-text">
                        <strong>Agent Extracted Decision</strong>
                        <p>{decision.answer}</p>
                    </div>
                ) : (
                    <div className="pending-content-wrapper">
                        {standardConfig ? (
                            <div className="standard-config-ui">
                                {standardConfig.options.map(opt => (
                                    <ConfigOption key={opt.id} option={opt} onClick={(val) => onUpdateDecision(pillarId, decision.id, val)} />
                                ))}
                            </div>
                        ) : (
                            <div className="pending-text">
                                <em>The agent will guide you through resolving this in the chat.</em>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function PillarWorkspace({ pillar, onBack, onUpdateDecision }) {
    if (!pillar) return null;
    return (
        <div className="pillar-workspace glass-panel">
            <div className="workspace-nav">
                <button className="btn-secondary" onClick={onBack}>Back</button>
                <h2>{pillar.title}</h2>
            </div>
            <div className="decision-container">
                <p className="pillar-description">{pillar.description}</p>
                <SubcategoriesList subcategories={pillar.subcategories} />
                <h3 className="section-title">Key Architectural Decisions</h3>
                <div className="decision-list">
                    {pillar.decisions?.map((d, i) => (
                        <DecisionCard key={d.id} decision={d} index={i} onUpdateDecision={onUpdateDecision} pillarId={pillar.id} />
                    ))}
                </div>
            </div>
        </div>
    );
}
