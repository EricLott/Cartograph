import React from 'react';

export default function ProjectOverview({ markdown }) {
    return (
        <div className="glass-panel" style={{ height: '100%', overflow: 'auto', padding: '1rem 1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>Project Overview</h2>
            <pre
                style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace',
                    fontSize: '0.86rem',
                    lineHeight: 1.45,
                    margin: 0,
                    color: 'var(--text-primary)'
                }}
            >
                {markdown || 'Overview will appear here after the project is saved.'}
            </pre>
        </div>
    );
}
