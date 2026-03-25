import React, { useState } from 'react';

const DEFAULT_MODELS = {
    openai: { interactions: 'gpt-4o', planner: 'gpt-4o', suggestions: 'gpt-4o-mini', conflicts: 'gpt-4o' },
    anthropic: { interactions: 'claude-3-5-sonnet-20240620', planner: 'claude-3-5-sonnet-20240620', suggestions: 'claude-3-5-sonnet-20240620', conflicts: 'claude-3-5-sonnet-20240620' },
    gemini: { interactions: 'gemini-1.5-pro', planner: 'gemini-1.5-pro', suggestions: 'gemini-1.5-flash', conflicts: 'gemini-1.5-pro' }
};

const mergeModels = (current = {}) => ({
    openai: { ...DEFAULT_MODELS.openai, ...(current.openai || {}) },
    anthropic: { ...DEFAULT_MODELS.anthropic, ...(current.anthropic || {}) },
    gemini: { ...DEFAULT_MODELS.gemini, ...(current.gemini || {}) }
});

export default function SettingsModal({ onClose, onSave, currentConfig }) {
    const [keys, setKeys] = useState(currentConfig?.keys || { openai: '', anthropic: '', gemini: '' });
    const [provider, setProvider] = useState(currentConfig?.provider || 'mock');
    const [models, setModels] = useState(mergeModels(currentConfig?.models));
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ keys, provider, models });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <h2>LLM Settings (BYOK)</h2>
                <p className="modal-desc">Provide your APIs keys to empower Cartograph with real AI. Settings are persisted in the backend database.</p>

                <div className="form-group">
                    <label>Active Provider</label>
                    <select
                        value={provider}
                        onChange={e => {
                            const nextProvider = e.target.value;
                            setProvider(nextProvider);
                            if (nextProvider !== 'mock') {
                                setModels((prev) => mergeModels(prev));
                            }
                        }}
                    >
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

                {provider !== 'mock' && (
                    <>
                        <div className="form-group">
                            <label>Interactions Model ({provider})</label>
                            <input
                                type="text"
                                placeholder={DEFAULT_MODELS[provider]?.interactions || ''}
                                value={models[provider]?.interactions || ''}
                                onChange={e =>
                                    setModels({
                                        ...models,
                                        [provider]: { ...(models[provider] || {}), interactions: e.target.value }
                                    })
                                }
                            />
                        </div>
                        <div className="form-group">
                            <label>Planner V2 Model ({provider})</label>
                            <input
                                type="text"
                                placeholder={DEFAULT_MODELS[provider]?.planner || ''}
                                value={models[provider]?.planner || ''}
                                onChange={e =>
                                    setModels({
                                        ...models,
                                        [provider]: { ...(models[provider] || {}), planner: e.target.value }
                                    })
                                }
                            />
                        </div>
                        <div className="form-group">
                            <label>Suggested Decisions Model ({provider})</label>
                            <input
                                type="text"
                                placeholder={DEFAULT_MODELS[provider]?.suggestions || ''}
                                value={models[provider]?.suggestions || ''}
                                onChange={e =>
                                    setModels({
                                        ...models,
                                        [provider]: { ...(models[provider] || {}), suggestions: e.target.value }
                                    })
                                }
                            />
                        </div>
                        <div className="form-group">
                            <label>Conflict Detection Model ({provider})</label>
                            <input
                                type="text"
                                placeholder={DEFAULT_MODELS[provider]?.conflicts || ''}
                                value={models[provider]?.conflicts || ''}
                                onChange={e =>
                                    setModels({
                                        ...models,
                                        [provider]: { ...(models[provider] || {}), conflicts: e.target.value }
                                    })
                                }
                            />
                        </div>
                    </>
                )}

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
