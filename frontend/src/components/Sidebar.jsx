import React, { useState } from 'react';

const PillarNode = ({ node, activePillar, onSelectPillar, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.subcategories && node.subcategories.length > 0;

    return (
        <div className="pillar-node-container" style={{ marginLeft: `${depth * 12}px`, marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {hasChildren ? (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ padding: '0.2rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.7, width: '20px' }}
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                ) : (
                    <span style={{ width: '20px', display: 'inline-block' }}></span>
                )}
                <button
                    className={`pillar-btn ${activePillar?.id === node.id ? 'active' : ''}`}
                    onClick={() => onSelectPillar(node)}
                    style={{ flexGrow: 1, textAlign: 'left', background: activePillar?.id === node.id ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', padding: '0.5rem' }}
                >
                    {node.title}
                </button>
            </div>
            {isExpanded && hasChildren && (
                <div className="pillar-children">
                    {node.subcategories.map(child => (
                        <PillarNode key={child.id} node={child} activePillar={activePillar} onSelectPillar={onSelectPillar} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Sidebar({ pillars, activePillar, onSelectPillar, onOpenSettings }) {
    return (
        <aside className="sidebar glass-panel">
            <div className="sidebar-header">
                <h2>Cartograph</h2>
            </div>
            <div className="sidebar-content">
                {pillars && pillars.length > 0 ? (
                    <nav className="pillar-nav" style={{ display: 'flex', flexDirection: 'column' }}>
                        {pillars.map(p => (
                            <PillarNode key={p.id} node={p} activePillar={activePillar} onSelectPillar={onSelectPillar} />
                        ))}
                    </nav>
                ) : (
                    <p className="empty-state">No pillars generated yet. Describe your app idea to begin.</p>
                )}
            </div>
            <div className="sidebar-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={onOpenSettings} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Settings
                </button>
            </div>
        </aside>
    );
}
