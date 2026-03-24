import React from 'react';

const TrashIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

const ArchiveIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"></polyline>
        <rect x="1" y="3" width="22" height="5"></rect>
        <line x1="10" y1="12" x2="14" y2="12"></line>
    </svg>
);

export default function DeleteProjectModal({ projectTitle, onArchive, onDelete, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Project Actions</h2>
                <p className="modal-desc" style={{ marginBottom: '1.5rem' }}>
                    What would you like to do with <strong>"{projectTitle}"</strong>?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button 
                        className="btn-secondary" 
                        onClick={onArchive}
                        style={{ 
                            justifyContent: 'flex-start', 
                            padding: '1rem', 
                            gap: '1rem',
                            textAlign: 'left',
                            background: 'rgba(255, 255, 255, 0.5)'
                        }}
                    >
                        <div style={{ color: 'var(--accent-color)' }}><ArchiveIcon /></div>
                        <div>
                            <div style={{ fontWeight: 600 }}>Archive Project</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Move to archive. You can restore it later.</div>
                        </div>
                    </button>

                    <button 
                        className="btn-secondary" 
                        onClick={onDelete}
                        style={{ 
                            justifyContent: 'flex-start', 
                            padding: '1rem', 
                            gap: '1rem',
                            textAlign: 'left',
                            borderColor: 'rgba(239, 68, 68, 0.2)',
                            background: 'rgba(254, 242, 242, 0.5)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#ef4444'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'}
                    >
                        <div style={{ color: '#ef4444' }}><TrashIcon /></div>
                        <div>
                            <div style={{ fontWeight: 600, color: '#ef4444' }}>Delete Permanently</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>This action cannot be undone.</div>
                        </div>
                    </button>
                </div>

                <div className="modal-actions" style={{ marginTop: '2rem' }}>
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
