import React, { useState } from 'react';

export default function SettingsModal({ onClose, onSave }) {
    const [keys, setKeys] = useState(() => {
        try {
            const saved = localStorage.getItem('cartograph_keys');
            return saved ? JSON.parse(saved) : { openai: '', anthropic: '', gemini: '' };
        } catch {
            return { openai: '', anthropic: '', gemini: '' };
        }
    });
    const [provider, setProvider] = useState(() => localStorage.getItem('cartograph_provider') || 'mock');

    const handleSave = () => {
        localStorage.setItem('cartograph_keys', JSON.stringify(keys));
        localStorage.setItem('cartograph_provider', provider);
        onSave({ keys, provider });
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <h2>LLM Settings (BYOK)</h2>
                <p className="modal-desc">Provide your APIs keys to empower Cartograph with real AI. Keys are stored locally in your browser.</p>

                <div className="form-group">
                    <label>Active Provider</label>
                    <select value={provider} onChange={e => setProvider(e.target.value)}>
                        <option value="mock">Mock Agent (Testing)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="gemini">Google Gemini</option>
                    </select>
                </div>

                {provider !== 'mock' && (
                    <div className="form-group">
                        <label>{provider === 'openai' ? 'OpenAI API Key' : provider === 'anthropic' ? 'Anthropic API Key' : 'Gemini API Key'}</label>
                        <input
                            type="password"
                            placeholder={`sk-...`}
                            value={keys[provider]}
                            onChange={e => setKeys({ ...keys, [provider]: e.target.value })}
                        />
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave}>Save Settings</button>
                </div>
            </div>
        </div>
    );
}
