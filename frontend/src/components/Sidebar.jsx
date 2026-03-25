import React, { useState } from 'react';
import DynamicIcon from './common/DynamicIcon';
import { buildFeatureHierarchy } from '../utils/featureNormalization';

const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

const PlusIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const FolderOpenIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
);

const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const toTitleCase = (value = '') =>
    String(value)
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

const toBriefTitle = (question = '') => {
    const text = String(question).trim().replace(/\?+$/, '');
    if (!text) return 'Untitled Decision';

    const semanticPatterns = [
        /^what\s+(?:are|is)\s+(?:the\s+)?(.+?)\s+(?:strateg(?:y|ies)|approach(?:es)?|method(?:s)?|framework(?:s)?|model(?:s)?|pattern(?:s)?|principles?|policy|policies|architecture)\s+(?:for|to|in|of)\b/i,
        /^what\s+(?:type|types)\s+of\s+(.+?)\s+(?:should|will|is|are)\b/i,
        /^which\s+(.+?)\s+(?:should|will|is|are)\b/i,
        /^how\s+(?:will|should|can|do|does)\s+(.+?)\s+(?:be|to|is|are)\b/i
    ];

    for (const pattern of semanticPatterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
            const phrase = match[1]
                .replace(/\b(the|a|an)\b/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (phrase) return toTitleCase(phrase);
        }
    }

    const normalized = text
        .replace(/^what\s+/i, '')
        .replace(/^how\s+/i, '')
        .replace(/^which\s+/i, '')
        .replace(/^will\s+/i, '')
        .replace(/^should\s+/i, '')
        .replace(/^do\s+/i, '')
        .replace(/^does\s+/i, '')
        .replace(/^is\s+/i, '')
        .trim();

    const words = normalized.split(/\s+/).filter(Boolean);
    const compact = words.slice(0, 3).join(' ');
    return toTitleCase(`${compact}${words.length > 3 ? '...' : ''}`);
};

const hasWorkItemHierarchy = (decisions = []) => {
    return (decisions || []).some((decision) => !!decision?.work_item_type);
};

const normalizeStringArray = (value) => (
    Array.isArray(value)
        ? value.map((item) => String(item || '').trim()).filter(Boolean)
        : []
);

const DetectedEcosystemPanel = ({ domainDiscovery }) => {
    const summary = String(domainDiscovery?.domain_summary || '').trim();
    const platformSignals = normalizeStringArray(domainDiscovery?.platform_signals).slice(0, 6);
    const lensTitles = normalizeStringArray((domainDiscovery?.lenses || []).map((lens) => lens?.title)).slice(0, 6);
    const primitives = normalizeStringArray(domainDiscovery?.domain_primitives).slice(0, 8);
    const assumptions = normalizeStringArray(domainDiscovery?.assumptions).slice(0, 2);
    const sourceCitations = Array.isArray(domainDiscovery?.source_citations)
        ? domainDiscovery.source_citations
            .filter((source) => source && typeof source === 'object')
            .map((source) => ({
                title: String(source.title || source.url || '').trim(),
                url: String(source.url || '').trim()
            }))
            .filter((source) => source.title || source.url)
            .slice(0, 3)
        : [];
    const hasDiscoveryData = !!(summary || platformSignals.length || lensTitles.length || primitives.length || assumptions.length || sourceCitations.length);

    if (!hasDiscoveryData) return null;

    return (
        <section className="detected-ecosystem-panel" aria-label="Detected Ecosystem">
            <div className="detected-ecosystem-title-row">
                <h3>Detected Ecosystem</h3>
                {lensTitles.length > 0 && <span className="detected-ecosystem-count">{lensTitles.length} lenses</span>}
            </div>
            {summary && (
                <p className="detected-ecosystem-summary" title={summary}>
                    {summary}
                </p>
            )}
            {platformSignals.length > 0 && (
                <div className="detected-ecosystem-group">
                    <span className="detected-ecosystem-label">Signals</span>
                    <div className="detected-ecosystem-chips">
                        {platformSignals.map((signal) => (
                            <span key={signal} className="detected-ecosystem-chip">{signal}</span>
                        ))}
                    </div>
                </div>
            )}
            {lensTitles.length > 0 && (
                <div className="detected-ecosystem-group">
                    <span className="detected-ecosystem-label">Lenses</span>
                    <div className="detected-ecosystem-chips">
                        {lensTitles.map((lens) => (
                            <span key={lens} className="detected-ecosystem-chip lens">{lens}</span>
                        ))}
                    </div>
                </div>
            )}
            {primitives.length > 0 && (
                <div className="detected-ecosystem-group">
                    <span className="detected-ecosystem-label">Primitives</span>
                    <div className="detected-ecosystem-chips">
                        {primitives.map((primitive) => (
                            <span key={primitive} className="detected-ecosystem-chip primitive">{primitive}</span>
                        ))}
                    </div>
                </div>
            )}
            {assumptions.length > 0 && (
                <div className="detected-ecosystem-group">
                    <span className="detected-ecosystem-label">Assumption</span>
                    <p className="detected-ecosystem-assumption" title={assumptions[0]}>
                        {assumptions[0]}
                    </p>
                </div>
            )}
            {sourceCitations.length > 0 && (
                <div className="detected-ecosystem-group">
                    <span className="detected-ecosystem-label">Sources</span>
                    <div className="detected-ecosystem-sources">
                        {sourceCitations.map((source, idx) => (
                            source.url ? (
                                <a
                                    key={`${source.url}|${source.title}|${idx}`}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="detected-ecosystem-source-link"
                                    title={source.url || source.title}
                                >
                                    {source.title || source.url}
                                </a>
                            ) : (
                                <span
                                    key={`${source.title}|no-url|${idx}`}
                                    className="detected-ecosystem-source-link muted"
                                    title={source.title}
                                >
                                    {source.title}
                                </span>
                            )
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

const DecisionLink = ({ decision, label, activeDecisionId, onSelectDecision, nodeId, className = '' }) => {
    const isDecisionActive = activeDecisionId === decision.id;
    return (
        <button
            key={decision.id}
            className={`sidebar-decision-row ${isDecisionActive ? 'active' : ''} ${className}`}
            onClick={() => onSelectDecision?.(nodeId, decision.id)}
            title={decision.question}
        >
            <div
                className={`priority-dot ${(decision.priority || 'P1').toLowerCase()}`}
                style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: decision.conflict ? '#ef4444' : (decision.answer ? '#10b981' : '#f59e0b')
                }}
            />
            <span className="sidebar-decision-label">{label || decision.question}</span>
        </button>
    );
};

const FeatureHierarchySidebar = ({ decisions, activeDecisionId, onSelectDecision, nodeId }) => {
    const epics = buildFeatureHierarchy(decisions);
    return (
        <div className="sidebar-decision-section nested">
            {epics.map((epicNode) => (
                <div key={epicNode.epic.id} className="sidebar-feature-epic-group">
                    {!epicNode.epic.__virtual && (
                        <DecisionLink
                            decision={epicNode.epic}
                            label={toBriefTitle(epicNode.epic.question)}
                            activeDecisionId={activeDecisionId}
                            onSelectDecision={onSelectDecision}
                            nodeId={nodeId}
                            className="epic-row"
                        />
                    )}
                    {epicNode.features.map((featureNode) => (
                        <div key={featureNode.feature.id} className="sidebar-feature-feature-group">
                            {!featureNode.feature.__virtual && (
                                <DecisionLink
                                    decision={featureNode.feature}
                                    label={toBriefTitle(featureNode.feature.question)}
                                    activeDecisionId={activeDecisionId}
                                    onSelectDecision={onSelectDecision}
                                    nodeId={nodeId}
                                    className="feature-row"
                                />
                            )}
                            {featureNode.tasks.map((task) => (
                                <DecisionLink
                                    key={task.id}
                                    decision={task}
                                    label={toBriefTitle(task.question)}
                                    activeDecisionId={activeDecisionId}
                                    onSelectDecision={onSelectDecision}
                                    nodeId={nodeId}
                                    className="task-row"
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const PillarNode = ({ node, activePillarId, activeDecisionId, onSelectPillar, onSelectDecision, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(depth === 0 || activePillarId === node.id);
    const hasSubcategories = node.subcategories && node.subcategories.length > 0;
    const hasDecisionChildren = node.decisions && node.decisions.length > 0;
    const hasChildren = hasSubcategories || hasDecisionChildren;
    const isActive = activePillarId === node.id;

    return (
        <div className={`pillar-node-container depth-${depth}`} style={{ marginLeft: `${depth * 10}px`, marginTop: depth === 0 ? '0.35rem' : '0.22rem' }}>
            <div className="pillar-node-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {hasChildren ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="sidebar-chevron-btn"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                        <ChevronRight />
                    </button>
                ) : (
                    <span style={{ width: '20px', display: 'inline-block' }}></span>
                )}
                <button
                    className={`pillar-btn sidebar-pill-btn ${isActive ? 'active' : ''} ${depth === 0 ? 'top-level' : 'nested-level'}`}
                    onClick={() => onSelectPillar(node)}
                    style={{
                        flexGrow: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minHeight: depth === 0 ? '34px' : '30px'
                    }}
                >
                    {node.icon && <DynamicIcon name={node.icon} size={14} />}
                    <span style={{ flex: 1, textAlign: 'left' }}>{node.title}</span>
                </button>
            </div>
            {isExpanded && hasChildren && (
                <div className="pillar-children sidebar-children-group">
                    {node.subcategories?.map(child => (
                        <PillarNode
                            key={child.id}
                            node={child}
                            activePillarId={activePillarId}
                            activeDecisionId={activeDecisionId}
                            onSelectPillar={onSelectPillar}
                            onSelectDecision={onSelectDecision}
                            depth={depth + 1}
                        />
                    ))}
                    {hasDecisionChildren && (
                        <div className={`sidebar-decision-section ${depth > 0 ? 'nested' : ''}`}>
                            {hasWorkItemHierarchy(node.decisions || []) ? (
                                <FeatureHierarchySidebar
                                    decisions={node.decisions || []}
                                    activeDecisionId={activeDecisionId}
                                    onSelectDecision={onSelectDecision}
                                    nodeId={node.id}
                                />
                            ) : (
                                node.decisions?.map(decision => (
                                    <DecisionLink
                                        key={decision.id}
                                        decision={decision}
                                        label={depth >= 1 ? toBriefTitle(decision.question) : decision.question}
                                        activeDecisionId={activeDecisionId}
                                        onSelectDecision={onSelectDecision}
                                        nodeId={node.id}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function Sidebar({ pillars, activePillarId, activeDecisionId, onSelectPillar, onSelectDecision, onOpenSettings, domainDiscovery }) {
    return (
        <aside className="sidebar glass-panel" style={{ border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Cartograph</h2>
            </div>
            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
                <DetectedEcosystemPanel domainDiscovery={domainDiscovery} />
                {pillars && pillars.length > 0 ? (
                    <nav className="pillar-nav">
                        {pillars.map(p => (
                            <PillarNode
                                key={p.id}
                                node={p}
                                activePillarId={activePillarId}
                                activeDecisionId={activeDecisionId}
                                onSelectPillar={onSelectPillar}
                                onSelectDecision={onSelectDecision}
                            />
                        ))}
                    </nav>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '3rem', opacity: 0.6, textAlign: 'center', padding: '1rem' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        <p className="empty-state">No pillars generated yet.<br />Start a new project to begin.</p>
                    </div>
                )}
            </div>
            <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'rgba(241, 245, 249, 0.5)' }}>
                <button className="btn-secondary" onClick={onOpenSettings} style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}>
                    <SettingsIcon />
                    Settings
                </button>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .sidebar-chevron-btn {
                    padding: 0;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.18s ease, color 0.18s ease;
                }
                .sidebar-pill-btn.top-level {
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.96rem;
                }
                .sidebar-pill-btn.nested-level {
                    border-radius: 7px;
                    font-size: 0.9rem;
                    opacity: 0.92;
                }
                .sidebar-children-group {
                    margin-left: 9px;
                    padding-left: 8px;
                    border-left: 1px solid rgba(148, 163, 184, 0.32);
                    margin-top: 3px;
                    animation: fadeIn 0.24s ease-out;
                }
                .sidebar-decision-section {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    margin: 3px 0 0 10px;
                }
                .sidebar-decision-section.nested {
                    margin-top: 6px;
                }
                .sidebar-decision-row {
                    border: none;
                    background: transparent;
                    padding: 3px 6px;
                    border-radius: 6px;
                    transition: background-color 0.15s ease, color 0.15s ease;
                    min-height: 24px;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    cursor: pointer;
                    width: calc(100% - 2px);
                    text-align: left;
                }
                .sidebar-decision-row:hover {
                    background: rgba(59, 130, 246, 0.08);
                }
                .sidebar-decision-row.active {
                    background: rgba(59, 130, 246, 0.16);
                    color: #1d4ed8;
                }
                .sidebar-decision-row:focus-visible {
                    outline: 1px solid rgba(59, 130, 246, 0.55);
                    outline-offset: 1px;
                }
                .sidebar-decision-label {
                    line-height: 1.22;
                    font-size: 0.84rem;
                    opacity: 0.9;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .sidebar-feature-epic-group {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .sidebar-feature-feature-group {
                    margin-left: 11px;
                    padding-left: 8px;
                    border-left: 1px solid rgba(148,163,184,0.24);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .sidebar-decision-row.epic-row .sidebar-decision-label {
                    font-weight: 700;
                }
                .sidebar-decision-row.feature-row {
                    margin-left: 1px;
                }
                .sidebar-decision-row.task-row {
                    margin-left: 10px;
                }
                .detected-ecosystem-panel {
                    border: 1px solid rgba(59, 130, 246, 0.28);
                    background: linear-gradient(180deg, rgba(239, 246, 255, 0.92), rgba(255, 255, 255, 0.92));
                    border-radius: 10px;
                    padding: 0.7rem 0.75rem;
                    margin: 0 0 0.9rem 0;
                    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
                }
                .detected-ecosystem-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                    margin-bottom: 0.35rem;
                }
                .detected-ecosystem-title-row h3 {
                    margin: 0;
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: #1e3a8a;
                }
                .detected-ecosystem-count {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #1d4ed8;
                    background: rgba(59, 130, 246, 0.13);
                    border: 1px solid rgba(59, 130, 246, 0.24);
                    border-radius: 999px;
                    padding: 0.12rem 0.42rem;
                    white-space: nowrap;
                }
                .detected-ecosystem-summary {
                    margin: 0 0 0.48rem 0;
                    font-size: 0.79rem;
                    line-height: 1.35;
                    color: #334155;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .detected-ecosystem-group {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    align-items: flex-start;
                    gap: 0.45rem;
                    margin-top: 0.35rem;
                }
                .detected-ecosystem-label {
                    font-size: 0.67rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #64748b;
                    padding-top: 0.12rem;
                }
                .detected-ecosystem-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.28rem;
                }
                .detected-ecosystem-chip {
                    font-size: 0.72rem;
                    line-height: 1.1;
                    color: #1f2937;
                    background: rgba(148, 163, 184, 0.15);
                    border: 1px solid rgba(148, 163, 184, 0.28);
                    padding: 0.16rem 0.38rem;
                    border-radius: 999px;
                }
                .detected-ecosystem-chip.lens {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.22);
                    color: #1d4ed8;
                }
                .detected-ecosystem-chip.primitive {
                    background: rgba(16, 185, 129, 0.1);
                    border-color: rgba(16, 185, 129, 0.24);
                    color: #047857;
                }
                .detected-ecosystem-assumption {
                    margin: 0;
                    font-size: 0.75rem;
                    color: #475569;
                    line-height: 1.3;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .detected-ecosystem-sources {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }
                .detected-ecosystem-source-link {
                    font-size: 0.74rem;
                    color: #1d4ed8;
                    text-decoration: none;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .detected-ecosystem-source-link:hover {
                    text-decoration: underline;
                }
                .detected-ecosystem-source-link.muted {
                    color: #64748b;
                    cursor: default;
                    text-decoration: none;
                }
            `}</style>
        </aside>
    );
}
