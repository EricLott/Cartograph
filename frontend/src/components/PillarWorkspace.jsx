import React from 'react';
import { VscAzure, VscServer, VscCircuitBoard, VscHubot } from "react-icons/vsc";
import { SiGooglecloud, SiDocker, SiKubernetes, SiPulumi, SiPodman, SiTerraform } from "react-icons/si";
import { TbFileLambda } from "react-icons/tb";
import { FaAws, FaRegHandPointer } from "react-icons/fa";
import { GiWeightLiftingUp } from "react-icons/gi"; // For Bicep

const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const PendingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);


const STANDARD_DECISIONS = {
    'infra_hosting': {
        options: [
            { id: 'azure', label: 'Azure', icon: <VscAzure /> },
            { id: 'aws', label: 'AWS', icon: <FaAws /> },
            { id: 'gcp', label: 'GCP', icon: <SiGooglecloud /> },
            { id: 'hybrid', label: 'Hybrid', icon: <VscHubot /> },
            { id: 'onprem', label: 'On-Premise', icon: <VscServer /> }
        ]
    },
    'infra_containerization': {
        options: [
            { id: 'docker', label: 'Docker', icon: <SiDocker /> },
            { id: 'k8s', label: 'Kubernetes', icon: <SiKubernetes /> },
            { id: 'podman', label: 'Podman', icon: <SiPodman /> },
            { id: 'none', label: 'None (Bare Metal/VM)', icon: <VscCircuitBoard /> }
        ]
    },
    'infra_iac': {
        options: [
            { id: 'terraform', label: 'Terraform', icon: <SiTerraform /> },
            { id: 'bicep', label: 'Bicep/ARM', icon: <GiWeightLiftingUp /> },
            { id: 'pulumi', label: 'Pulumi', icon: <SiPulumi /> },
            { id: 'cdk', label: 'AWS CDK', icon: <TbFileLambda /> },
            { id: 'manual', label: 'Manual/ClickOps', icon: <FaRegHandPointer /> }
        ]
    }
};

const ConfigOption = ({ option, onClick }) => (
    <button
        className="config-option-btn glass-panel"
        onClick={() => onClick(option.label)}
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1rem',
            border: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '12px'
        }}
    >
        <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{option.icon}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{option.label}</span>
    </button>
);

export default function PillarWorkspace({ pillar, onBack, onUpdateDecision }) {
    if (!pillar) return null;

    return (
        <div className="pillar-workspace glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)' }}>
            <div className="workspace-nav">
                <button className="btn-secondary" onClick={onBack} style={{ padding: '0.4rem 0.8rem', gap: '0.4rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                </button>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{pillar.title}</h2>
            </div>

            <div className="decision-container" style={{ flex: 1 }}>
                <p className="pillar-description">{pillar.description}</p>

                {pillar.subcategories && pillar.subcategories.length > 0 && (
                    <div className="subcategories-list glass-panel" style={{ marginTop: '1rem', padding: '1.5rem', marginBottom: '2.5rem', background: 'rgba(255, 255, 255, 0.5)' }}>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                            Sub-Components
                        </h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {pillar.subcategories.map(sub => (
                                <li key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.8 }}></div>
                                    <span style={{ fontWeight: 500 }}>{sub.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    Key Architectural Decisions
                </h3>

                {pillar.decisions && pillar.decisions.length > 0 ? (
                    <div className="decision-list">
                        {pillar.decisions.map((decision, index) => {
                            const standardConfig = STANDARD_DECISIONS[decision.id];

                            return (
                                <div key={decision.id} className={`decision-card ${decision.answer ? 'answered' : 'pending'}`} style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.1}s backwards` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h4>{decision.question}</h4>
                                        {decision.answer ? (
                                            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(52, 211, 153, 0.15)', padding: '0.25rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                <CheckIcon /> Resolved
                                            </span>
                                        ) : (
                                            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(251, 191, 36, 0.15)', padding: '0.25rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                <PendingIcon /> Pending
                                            </span>
                                        )}
                                    </div>
                                    <p className="decision-context">{decision.context}</p>

                                    <div className="decision-input-area" style={{ marginTop: '1.25rem' }}>
                                        {decision.answer ? (
                                            <div className="answered-text box-shadow-sm" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.8)', borderLeft: '3px solid #10b981', borderRadius: '0 8px 8px 0', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Extracted Decision</strong>
                                                <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.6 }}>{decision.answer}</p>
                                            </div>
                                        ) : (
                                            <div className="pending-content-wrapper">
                                                {standardConfig ? (
                                                    <div className="standard-config-ui" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                                                        {standardConfig.options.map(opt => (
                                                            <ConfigOption
                                                                key={opt.id}
                                                                option={opt}
                                                                onClick={(val) => onUpdateDecision(pillar.id, decision.id, val)}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="pending-text" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.4)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                        <em>The agent will guide you through resolving this in the chat.</em>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.4)', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                        <p>No decisions generated for this pillar yet.</p>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .config-option-btn:hover {
                    background: rgba(255, 255, 255, 0.9) !important;
                    border-color: var(--accent-color) !important;
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .config-option-btn:active {
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
}
