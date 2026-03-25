const { AppSettings } = require('../models');

const DEFAULT_MODELS = {
    openai: {
        interactions: 'gpt-4o',
        planner: 'gpt-4o',
        suggestions: 'gpt-4o-mini',
        conflicts: 'gpt-4o',
        embeddings: 'text-embedding-3-small'
    },
    anthropic: {
        interactions: 'claude-3-5-sonnet-20240620',
        planner: 'claude-3-5-sonnet-20240620',
        suggestions: 'claude-3-5-sonnet-20240620',
        conflicts: 'claude-3-5-sonnet-20240620'
    },
    gemini: {
        interactions: 'gemini-1.5-pro',
        planner: 'gemini-1.5-pro',
        suggestions: 'gemini-1.5-flash',
        conflicts: 'gemini-1.5-pro',
        embeddings: 'text-embedding-004'
    }
};

const getModelForTask = (models, provider, task) => {
    const scoped = models?.[provider] || {};
    const defaults = DEFAULT_MODELS?.[provider] || {};
    return (
        scoped?.[task]
        || scoped?.interactions
        || defaults?.[task]
        || defaults?.interactions
        || null
    );
};

const getStoredProviderConfig = async () => {
    const settings = await AppSettings.findOne({ where: { singletonKey: 'global' } });
    const persistedProvider = settings?.provider || 'mock';
    const rawKeys = settings?.keys && typeof settings.keys === 'object' ? settings.keys : {};
    const { _models, ...keys } = rawKeys;
    const models = _models || DEFAULT_MODELS;

    const envHas = {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY
    };

    let provider = persistedProvider;
    if (!provider || provider === 'mock') {
        provider = envHas.openai
            ? 'openai'
            : (envHas.anthropic ? 'anthropic' : (envHas.gemini ? 'gemini' : null));
    }

    return { provider, keys, models };
};

const resolveProviderConfig = async (runtimeConfig = null) => {
    const stored = await getStoredProviderConfig();
    if (!runtimeConfig || typeof runtimeConfig !== 'object') {
        return stored;
    }

    const provider = runtimeConfig.provider || stored.provider;
    const runtimeKeys = runtimeConfig.keys && typeof runtimeConfig.keys === 'object'
        ? runtimeConfig.keys
        : {};
    const runtimeModels = runtimeConfig.models && typeof runtimeConfig.models === 'object'
        ? runtimeConfig.models
        : {};

    return {
        provider,
        keys: { ...stored.keys, ...runtimeKeys },
        models: {
            ...DEFAULT_MODELS,
            ...stored.models,
            ...runtimeModels
        }
    };
};

const buildCompletionPayload = (provider, model, systemPrompt, userPrompt, options = {}) => {
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.2;
    const maxTokens = typeof options.maxTokens === 'number' ? options.maxTokens : 3000;
    if (provider === 'openai') {
        return {
            model,
            temperature,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        };
    }
    if (provider === 'anthropic') {
        return {
            model,
            system: systemPrompt,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: userPrompt }]
        };
    }
    if (provider === 'gemini') {
        return {
            model,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
                responseMimeType: 'application/json'
            }
        };
    }
    throw new Error(`Unsupported provider "${provider}".`);
};

module.exports = {
    DEFAULT_MODELS,
    getModelForTask,
    getStoredProviderConfig,
    resolveProviderConfig,
    buildCompletionPayload
};
