import React, { useState, useEffect } from 'react';
import { fetchAllProjects, deleteProject, archiveProject } from '../services/apiService';
import DeleteProjectModal from './DeleteProjectModal';

const FolderIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
);

const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export default function ProjectsPanel({ onSelectProject, currentProjectId, isOpen, onToggle, onNewProject }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectToConfirm, setProjectToConfirm] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadProjects();
        }
    }, [isOpen]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await fetchAllProjects();
            setProjects(data);
        } catch (err) {
            console.error("Failed to load projects:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTrigger = (e, project) => {
        e.stopPropagation();
        setProjectToConfirm(project);
    };

    const handleArchive = async () => {
        if (!projectToConfirm) return;
        try {
            await archiveProject(projectToConfirm.id);
            setProjects(projects.filter(p => p.id !== projectToConfirm.id));
            setProjectToConfirm(null);
        } catch (err) {
            alert("Failed to archive project: " + err.message);
        }
    };

    const handleDeletePermanent = async () => {
        if (!projectToConfirm) return;
        try {
            await deleteProject(projectToConfirm.id);
            setProjects(projects.filter(p => p.id !== projectToConfirm.id));
            setProjectToConfirm(null);
        } catch (err) {
            alert("Failed to delete project: " + err.message);
        }
    };

    return (
        <div className="projects-sidebar-container">
            <div className="projects-tab-handle" onClick={onToggle}>
                <FolderIcon />
                <div className="tab-text">Projects</div>
            </div>

            <div className={`projects-sidebar ${!isOpen ? 'collapsed' : ''}`}>
                <div className="panel-header" style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexShrink: 0
                }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', opacity: 0.8 }}>Project History</h2>
                    <button
                        className="btn-primary"
                        onClick={onNewProject}
                        style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            borderRadius: '8px'
                        }}
                    >
                        <PlusIcon />
                        New
                    </button>
                </div>

                <div className="projects-list" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '1rem', fontSize: '0.9rem', opacity: 0.6 }}>Loading...</p>
                    ) : projects.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, fontSize: '0.85rem' }}>
                            <p>No project history found.</p>
                        </div>
                    ) : (
                        projects.map(p => (
                            <div
                                key={p.id}
                                onClick={() => onSelectProject(p.id)}
                                className={`project-item glass-panel ${p.id === currentProjectId ? 'active' : ''}`}
                                style={{
                                    padding: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: '1px solid var(--border-color)',
                                    background: p.id === currentProjectId ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: '10px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ paddingRight: '1.5rem' }}>
                                    <h4 style={{
                                        margin: '0 0 0.2rem 0',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-primary)',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: 1.3
                                    }}>
                                        {p.idea}
                                    </h4>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                        {new Date(p.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    className="btn-delete"
                                    onClick={(e) => handleDeleteTrigger(e, p)}
                                    style={{
                                        position: 'absolute',
                                        top: '0.4rem',
                                        right: '0.4rem',
                                        padding: '0.2rem',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#ef4444',
                                        opacity: 0.3,
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.3'}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {projectToConfirm && (
                <DeleteProjectModal 
                    projectTitle={projectToConfirm.idea}
                    onArchive={handleArchive}
                    onDelete={handleDeletePermanent}
                    onClose={() => setProjectToConfirm(null)}
                />
            )}

            <style>{`
                .project-item:hover {
                    transform: translateY(-1px);
                    border-color: var(--accent-color);
                    background: rgba(255, 255, 255, 0.8) !important;
                }
                .project-item.active {
                    border-color: var(--accent-color) !important;
                    background: rgba(59, 130, 246, 0.1) !important;
                }
            `}</style>
        </div>
    );
}
