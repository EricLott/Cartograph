import React, { useState } from 'react';
import { ConfigOption, CheckIcon, PendingIcon, WarningIcon } from './PillarComponents';
import { STANDARD_DECISIONS } from '../constants/architecture';
import DynamicIcon from './common/DynamicIcon';
import { VscAdd, VscTrash, VscEdit, VscCheck, VscClose } from 'react-icons/vsc';

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

const DecisionCard = ({ decision, index, onUpdateDecision, pillarId, isActive }) => {
    const standardConfig = STANDARD_DECISIONS[decision.id];
    const cardRef = React.useRef(null);

    React.useEffect(() => {
        if (isActive && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [isActive]);

    return (
        <div 
            ref={cardRef}
            className={`decision-card ${decision.conflict ? 'conflict' : (decision.answer ? 'answered' : 'pending')} ${isActive ? 'active-highlight' : ''}`} 
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <div className="decision-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {decision.icon && <DynamicIcon name={decision.icon} size={20} />}
                    <h4 style={{ margin: 0 }}>{decision.question}</h4>
                </div>
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
                        {(decision.options || standardConfig?.options) ? (
                            <div className="standard-config-ui">
                                {(decision.options || standardConfig.options).map(opt => (
                                    <ConfigOption 
                                        key={opt.id} 
                                        option={{
                                            ...opt,
                                            icon: typeof opt.icon === 'string' ? <DynamicIcon name={opt.icon} /> : opt.icon
                                        }} 
                                        onClick={(val) => onUpdateDecision(pillarId, decision.id, val)} 
                                    />
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

const FeatureCard = ({ feature, onEdit, onDelete, pillarId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState({ question: feature.question, context: feature.context });

    const handleSave = () => {
        onEdit(pillarId, feature.id, editValue);
        setIsEditing(false);
    };

    return (
        <div className="decision-card answered">
            <div className="decision-card-header" style={{ alignItems: 'flex-start' }}>
                {isEditing ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input 
                            className="btn-secondary" 
                            style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text' }}
                            value={editValue.question} 
                            onChange={(e) => setEditValue({ ...editValue, question: e.target.value })} 
                        />
                        <textarea 
                            className="btn-secondary" 
                            style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '60px' }}
                            value={editValue.context} 
                            onChange={(e) => setEditValue({ ...editValue, context: e.target.value })} 
                        />
                    </div>
                ) : (
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0 }}>{feature.question}</h4>
                        <p className="decision-context" style={{ marginTop: '0.5rem' }}>{feature.context}</p>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isEditing ? (
                        <>
                            <button className="btn-secondaryIcon" onClick={handleSave} title="Save"><VscCheck color="#10b981" /></button>
                            <button className="btn-secondaryIcon" onClick={() => setIsEditing(false)} title="Cancel"><VscClose color="#ef4444" /></button>
                        </>
                    ) : (
                        <>
                            <button className="btn-secondaryIcon" onClick={() => setIsEditing(true)} title="Edit"><VscEdit /></button>
                            <button className="btn-secondaryIcon" onClick={() => onDelete(pillarId, feature.id)} title="Delete"><VscTrash /></button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function PillarWorkspace({ pillar, onBack, onUpdateDecision, activeDecisionId, onAddFeature, onDeleteFeature, onEditFeature }) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFeature, setNewFeature] = useState({ question: '', context: '' });

    if (!pillar) return null;

    const isFeatures = pillar.id === 'pillar-features';

    const handleAdd = () => {
        if (!newFeature.question) return;
        onAddFeature(pillar.id, { 
            id: `feat_${Date.now()}`, 
            question: newFeature.question, 
            context: newFeature.context 
        });
        setNewFeature({ question: '', context: '' });
        setShowAddForm(false);
    };

    return (
        <div className="pillar-workspace glass-panel">
            <div className="workspace-nav">
                <button className="btn-secondary" onClick={onBack}>Back</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {pillar.icon && <DynamicIcon name={pillar.icon} size={28} />}
                    <h2 style={{ margin: 0 }}>{pillar.title}</h2>
                </div>
            </div>
            <div className="decision-container">
                <p className="pillar-description">{pillar.description}</p>
                <SubcategoriesList subcategories={pillar.subcategories} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="section-title" style={{ margin: 0 }}>
                        {isFeatures ? 'Proposed Features' : 'Key Architectural Decisions'}
                    </h3>
                    {isFeatures && (
                        <button className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setShowAddForm(true)}>
                            <VscAdd /> Add Feature
                        </button>
                    )}
                </div>

                {showAddForm && (
                    <div className="decision-card pending" style={{ marginBottom: '1rem', border: '1px dashed var(--accent-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <input 
                                className="btn-secondary" 
                                style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text' }}
                                placeholder="Feature Name (e.g. User Authentication)"
                                value={newFeature.question}
                                onChange={(e) => setNewFeature({ ...newFeature, question: e.target.value })}
                            />
                            <textarea 
                                className="btn-secondary" 
                                style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '60px' }}
                                placeholder="Short description..."
                                value={newFeature.context}
                                onChange={(e) => setNewFeature({ ...newFeature, context: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleAdd}>Add</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="decision-list">
                    {pillar.decisions?.map((d, i) => (
                        isFeatures ? (
                            <FeatureCard 
                                key={d.id} 
                                feature={d} 
                                pillarId={pillar.id}
                                onEdit={onEditFeature}
                                onDelete={onDeleteFeature}
                            />
                        ) : (
                            <DecisionCard 
                                key={d.id} 
                                decision={d} 
                                index={i} 
                                onUpdateDecision={onUpdateDecision} 
                                pillarId={pillar.id}
                                isActive={d.id === activeDecisionId}
                            />
                        )
                    ))}
                </div>
            </div>
        </div>
    );
}
