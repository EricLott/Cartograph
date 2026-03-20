import React, { useState } from 'react';

const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const PillarNode = ({ node, activePillarId, onSelectPillar, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.subcategories && node.subcategories.length > 0;
    const isActive = activePillarId === node.id;

    return (
        <div className="pillar-node-container" style={{ marginLeft: `${depth * 12}px`, marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {hasChildren ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        style={{
                            padding: '0',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                    >
                        <ChevronRight />
                    </button>
                ) : (
                    <span style={{ width: '24px', display: 'inline-block' }}></span>
                )}
                <button
                    className={`pillar-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectPillar(node)}
                    style={{
                        flexGrow: 1,
                        transition: 'all 0.2s'
                    }}
                >
                    {node.title}
                </button>
            </div>
            {isExpanded && hasChildren && (
                <div className="pillar-children" style={{
                    position: 'relative',
                    marginLeft: '12px',
                    paddingLeft: '4px',
                    borderLeft: '1px solid var(--border-color)',
                    marginTop: '4px',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {node.subcategories.map(child => (
                        <PillarNode key={child.id} node={child} activePillarId={activePillarId} onSelectPillar={onSelectPillar} depth={0} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Sidebar({ pillars, activePillarId, onSelectPillar, onOpenSettings }) {
    return (
        <aside className="sidebar glass-panel" style={{ border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-xl)' }}>
            <div className="sidebar-header">
                <h2>Cartograph</h2>
            </div>
            <div className="sidebar-content">
                {pillars && pillars.length > 0 ? (
                    <nav className="pillar-nav">
                        {pillars.map(p => (
                            <PillarNode key={p.id} node={p} activePillarId={activePillarId} onSelectPillar={onSelectPillar} />
                        ))}
                    </nav>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '3rem', opacity: 0.8 }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        <p className="empty-state" style={{ marginTop: 0 }}>No pillars generated yet.<br />Describe your app idea to begin.</p>
                    </div>
                )}
            </div>
            <div className="sidebar-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto', background: 'rgba(241, 245, 249, 0.5)' }}>
                <button className="btn-secondary" onClick={onOpenSettings} style={{ width: '100%', padding: '0.75rem' }}>
                    <SettingsIcon />
                    Settings
                </button>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </aside>
    );
}
