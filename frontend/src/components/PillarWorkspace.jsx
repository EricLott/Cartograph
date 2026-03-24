import React, { useState } from 'react';
import { ConfigOption, CheckIcon, PendingIcon, WarningIcon } from './PillarComponents';
import { STANDARD_DECISIONS } from '../constants/architecture';
import DynamicIcon from './common/DynamicIcon';
import { VscAdd, VscTrash, VscEdit, VscCheck, VscClose, VscNote, VscPass, VscSettingsGear, VscListOrdered, VscReferences } from 'react-icons/vsc';
import { normalizeFeatureDecision } from '../utils/featureNormalization';
import { getRelatedDecisionsForTarget } from '../utils/decisionRelations';

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

const FeatureCard = ({ feature, onEdit, onDelete, pillarId, relatedDecisions = [], onJumpToDecision }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState({ 
        question: feature.question, 
        context: feature.context,
        acceptance_criteria: Array.isArray(feature.acceptance_criteria) ? feature.acceptance_criteria.join('\n') : (feature.acceptance_criteria || ''),
        technical_context: feature.technical_context || '',
        dependencies: Array.isArray(feature.dependencies) ? feature.dependencies.join(', ') : (feature.dependencies || ''),
        priority: feature.priority || 'P1'
    });

    const handleSave = () => {
        onEdit(pillarId, feature.id, {
            ...editValue,
            acceptance_criteria: editValue.acceptance_criteria.split('\n').filter(l => l.trim()),
            dependencies: editValue.dependencies.split(',').map(d => d.trim()).filter(d => d)
        });
        setIsEditing(false);
    };

    return (
        <div className={`decision-card answered priority-${(feature.priority || 'P1').toLowerCase()}`}>
            <div className="decision-card-header" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select 
                                    className="btn-secondary" 
                                    style={{ width: '80px', padding: '0.25rem' }}
                                    value={editValue.priority}
                                    onChange={(e) => setEditValue({ ...editValue, priority: e.target.value })}
                                >
                                    <option value="P0">P0</option>
                                    <option value="P1">P1</option>
                                    <option value="P2">P2</option>
                                </select>
                                <input 
                                    className="btn-secondary" 
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text' }}
                                    value={editValue.question} 
                                    onChange={(e) => setEditValue({ ...editValue, question: e.target.value })} 
                                    placeholder="Feature Name"
                                />
                            </div>
                            
                            <div className="edit-field">
                                <label><VscNote /> Description</label>
                                <textarea 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '60px', width: '100%' }}
                                    value={editValue.context} 
                                    onChange={(e) => setEditValue({ ...editValue, context: e.target.value })} 
                                />
                            </div>

                            <div className="edit-field">
                                <label><VscPass /> Acceptance Criteria (one per line)</label>
                                <textarea 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '80px', width: '100%' }}
                                    value={editValue.acceptance_criteria} 
                                    onChange={(e) => setEditValue({ ...editValue, acceptance_criteria: e.target.value })} 
                                />
                            </div>

                            <div className="edit-field">
                                <label><VscSettingsGear /> Technical Context</label>
                                <textarea 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '60px', width: '100%' }}
                                    value={editValue.technical_context} 
                                    onChange={(e) => setEditValue({ ...editValue, technical_context: e.target.value })} 
                                />
                            </div>

                            <div className="edit-field">
                                <label><VscReferences /> Dependencies (comma separated)</label>
                                <input 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', width: '100%' }}
                                    value={editValue.dependencies} 
                                    onChange={(e) => setEditValue({ ...editValue, dependencies: e.target.value })} 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="feature-view">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                <span className={`priority-badge ${(feature.priority || 'P1').toLowerCase()}`}>{feature.priority || 'P1'}</span>
                                <h4 style={{ margin: 0 }}>{feature.question}</h4>
                            </div>
                            <p className="decision-context">{feature.context}</p>
                            
                            {feature.acceptance_criteria && Array.isArray(feature.acceptance_criteria) && feature.acceptance_criteria.length > 0 && (
                                <div className="feature-detail-section">
                                    <h5><VscPass /> Acceptance Criteria</h5>
                                    <ul>
                                        {feature.acceptance_criteria.map((ac, idx) => <li key={idx}>{ac}</li>)}
                                    </ul>
                                </div>
                            )}

                            {feature.technical_context && (
                                <div className="feature-detail-section">
                                    <h5><VscSettingsGear /> Technical Context</h5>
                                    <p>{feature.technical_context}</p>
                                </div>
                            )}

                            {feature.dependencies && Array.isArray(feature.dependencies) && feature.dependencies.length > 0 && (
                                <div className="feature-detail-section">
                                    <h5><VscReferences /> Dependencies</h5>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {feature.dependencies.map(dep => (
                                            <span key={dep} className="dep-tag">{dep}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {relatedDecisions.length > 0 && (
                                <div className="feature-detail-section">
                                    <h5><VscListOrdered /> Related Decisions</h5>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {relatedDecisions.map((related) => (
                                            <button
                                                key={related.decisionId}
                                                className="btn-secondary"
                                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                                                onClick={() => onJumpToDecision?.(related.pillarId, related.decisionId)}
                                                title={`${related.pillarTitle} · ${related.relationTypes.join(', ')}`}
                                            >
                                                {related.question}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
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
            <style>{`
                .feature-view .decision-context {
                    margin-bottom: 1rem;
                }
                .feature-detail-section {
                    margin-top: 1rem;
                    padding-top: 0.75rem;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .feature-detail-section h5 {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-secondary);
                    display: flex;
                    alignItems: center;
                    gap: 6px;
                }
                .feature-detail-section ul {
                    margin: 0;
                    padding-left: 1.25rem;
                    font-size: 0.9rem;
                    color: var(--text-primary);
                }
                .feature-detail-section ul li {
                    margin-bottom: 0.25rem;
                }
                .priority-badge {
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.1);
                }
                .priority-badge.p0 { background: #ef4444; color: white; }
                .priority-badge.p1 { background: #f59e0b; color: white; }
                .priority-badge.p2 { background: #3b82f6; color: white; }
                
                .dep-tag {
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                
                .edit-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .edit-field label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
            `}</style>
        </div>
    );
};

export default function PillarWorkspace({
    pillar,
    allPillars = [],
    onBack,
    onUpdateDecision,
    activeDecisionId,
    onAddFeature,
    onDeleteFeature,
    onEditFeature,
    onJumpToDecision
}) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFeature, setNewFeature] = useState({ 
        question: '', 
        context: '',
        acceptance_criteria: '',
        technical_context: '',
        dependencies: '',
        priority: 'P1'
    });

    if (!pillar) return null;

    const isFeatures = pillar.id === 'pillar-features';
    const relatedByFeatureId = React.useMemo(() => {
        if (!isFeatures) return {};
        const map = {};
        (pillar.decisions || []).forEach((decision) => {
            map[decision.id] = getRelatedDecisionsForTarget(allPillars, decision.id, { maxResults: 5 });
        });
        return map;
    }, [isFeatures, pillar.decisions, allPillars]);

    const handleAdd = () => {
        if (!newFeature.question) return;
        onAddFeature(pillar.id, { 
            id: `feat_${Date.now()}`, 
            question: newFeature.question, 
            context: newFeature.context,
            acceptance_criteria: newFeature.acceptance_criteria.split('\n').filter(l => l.trim()),
            technical_context: newFeature.technical_context,
            dependencies: newFeature.dependencies.split(',').map(d => d.trim()).filter(d => d),
            priority: newFeature.priority
        });
        setNewFeature({ 
            question: '', 
            context: '',
            acceptance_criteria: '',
            technical_context: '',
            dependencies: '',
            priority: 'P1'
        });
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select 
                                    className="btn-secondary" 
                                    style={{ width: '80px', padding: '0.25rem' }}
                                    value={newFeature.priority}
                                    onChange={(e) => setNewFeature({ ...newFeature, priority: e.target.value })}
                                >
                                    <option value="P0">P0</option>
                                    <option value="P1">P1</option>
                                    <option value="P2">P2</option>
                                </select>
                                <input 
                                    className="btn-secondary" 
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text' }}
                                    placeholder="Feature Name (e.g. User Authentication)"
                                    value={newFeature.question}
                                    onChange={(e) => setNewFeature({ ...newFeature, question: e.target.value })}
                                />
                            </div>

                            <div className="edit-field">
                                <label><VscNote /> Description</label>
                                <textarea 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '60px' }}
                                    placeholder="Short description..."
                                    value={newFeature.context}
                                    onChange={(e) => setNewFeature({ ...newFeature, context: e.target.value })}
                                />
                            </div>

                            <div className="edit-field">
                                <label><VscPass /> Acceptance Criteria (one per line)</label>
                                <textarea 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '80px' }}
                                    placeholder="The user can log in with email..."
                                    value={newFeature.acceptance_criteria}
                                    onChange={(e) => setNewFeature({ ...newFeature, acceptance_criteria: e.target.value })}
                                />
                            </div>

                            <div className="edit-field">
                                <label><VscSettingsGear /> Technical Context</label>
                                <textarea 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text', minHeight: '60px' }}
                                    placeholder="Suggested tech, constraints..."
                                    value={newFeature.technical_context}
                                    onChange={(e) => setNewFeature({ ...newFeature, technical_context: e.target.value })}
                                />
                            </div>

                            <div className="edit-field">
                                <label><VscReferences /> Dependencies (comma separated)</label>
                                <input 
                                    className="btn-secondary" 
                                    style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'text' }}
                                    placeholder="feat_auth, feat_db"
                                    value={newFeature.dependencies}
                                    onChange={(e) => setNewFeature({ ...newFeature, dependencies: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleAdd}>Add Feature</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="decision-list">
                    {pillar.decisions?.map((d, i) => (
                        isFeatures ? (
                            <FeatureCard 
                                key={d.id} 
                                feature={normalizeFeatureDecision(d)} 
                                pillarId={pillar.id}
                                onEdit={onEditFeature}
                                onDelete={onDeleteFeature}
                                relatedDecisions={relatedByFeatureId[d.id] || []}
                                onJumpToDecision={onJumpToDecision}
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
