// src/services/agentService.js
import { 
    SYSTEM_PROMPT, 
    SUBCATEGORY_SYSTEM_PROMPT, 
    CHAT_SYSTEM_PROMPT 
} from './prompts';
import { 
    validatePillarArrayOutput, 
    validateCategoryExpansionOutput, 
    validateChatTurnOutput,
    parseAndValidateProviderOutput 
} from './agentValidator';

const PROVIDER_REQUEST_TIMEOUT_MS = 20000;
const PROVIDER_MAX_RETRIES = 2;
const PROVIDER_RETRY_BASE_DELAY_MS = 600;
const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readJsonSafely = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const extractProviderErrorDetail = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
    if (data.error && typeof data.error.message === 'string' && data.error.message.trim()) {
        return data.error.message;
    }
    return '';
};

const handleProviderResponse = async (response, providerName, attempt, maxAttempts) => {
    const data = await readJsonSafely(response);
    if (response.ok) return data;

    const detail = extractProviderErrorDetail(data) || response.statusText || 'Request failed.';
    if (attempt < maxAttempts && RETRYABLE_HTTP_STATUS_CODES.has(response.status)) {
        return { retry: true };
    }

    throw new Error(
        `${providerName} request failed after ${attempt} attempt${attempt === 1 ? '' : 's'} (status ${response.status}): ${detail}`
    );
};

const callProviderApi = async ({ providerName, url, requestInit }) => {
    const maxAttempts = PROVIDER_MAX_RETRIES + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, { ...requestInit, signal: controller.signal });
            clearTimeout(timeoutId);

            const result = await handleProviderResponse(response, providerName, attempt, maxAttempts);
            if (result.retry) {
                await wait(PROVIDER_RETRY_BASE_DELAY_MS * attempt);
                continue;
            }
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            const isRetryable = error?.name === 'AbortError' || error instanceof TypeError;
            if (attempt < maxAttempts && isRetryable) {
                await wait(PROVIDER_RETRY_BASE_DELAY_MS * attempt);
                continue;
            }
            throw error;
        }
    }
};

const getOpenAICompletion = async (keys, payload) => {
    const data = await callProviderApi({
        providerName: 'OpenAI',
        url: 'https://api.openai.com/v1/chat/completions',
        requestInit: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keys.openai}`
            },
            body: JSON.stringify(payload)
        }
    });
    if (data?.error) throw new Error(data.error.message || 'OpenAI returned an error.');
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('OpenAI response was missing content.');
    return content;
};

const getAnthropicCompletion = async (keys, payload) => {
    const data = await callProviderApi({
        providerName: 'Anthropic',
        url: 'https://api.anthropic.com/v1/messages',
        requestInit: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': keys.anthropic,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(payload)
        }
    });
    const content = data?.content?.[0]?.text;
    if (typeof content !== 'string') throw new Error('Anthropic response was missing content.');
    return content;
};

const getGeminiCompletion = async (keys, payload) => {
    const data = await callProviderApi({
        providerName: 'Gemini',
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keys.gemini}`,
        requestInit: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }
    });
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof content !== 'string') throw new Error('Gemini response was missing content.');
    return content;
};

const requestProviderCompletion = async ({ provider, keys, openaiPayload, anthropicPayload, geminiPayload }) => {
    switch (provider) {
        case 'openai': return getOpenAICompletion(keys, openaiPayload);
        case 'anthropic': return getAnthropicCompletion(keys, anthropicPayload);
        case 'gemini': return getGeminiCompletion(keys, geminiPayload);
        default: throw new Error(`Unsupported provider: ${provider}`);
    }
};

export const generatePillarsFromIdea = async (ideaDescription, config) => {
    const { provider, keys } = config;
    if (provider === 'mock') return mockGenerate();

    const prompt = `Application Idea:\n${ideaDescription}`;
    const completion = await requestProviderCompletion({
        provider, keys,
        openaiPayload: {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT + "\nRemember, return ONLY the raw JSON array." },
                { role: 'user', content: prompt }
            ]
        },
        anthropicPayload: {
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 4000,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }]
        },
        geminiPayload: {
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        }
    });

    return parseAndValidateProviderOutput(completion, 'Pillar generation', validatePillarArrayOutput);
};

export const generateCategoriesForPillar = async (ideaDescription, pillar, config) => {
    const { provider, keys } = config;
    if (provider === 'mock') return mockExpandPillar();

    const prompt = `Application Idea:\n${ideaDescription}\n\nAssigned Pillar to expand:\n${pillar.title}\n${pillar.description}`;
    const completion = await requestProviderCompletion({
        provider, keys,
        openaiPayload: {
            model: 'gpt-4o',
            messages: [{ role: 'system', content: SUBCATEGORY_SYSTEM_PROMPT }, { role: 'user', content: prompt }]
        },
        anthropicPayload: {
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 4000,
            system: SUBCATEGORY_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }]
        },
        geminiPayload: {
            systemInstruction: { parts: [{ text: SUBCATEGORY_SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        }
    });

    return parseAndValidateProviderOutput(completion, `Category expansion for "${pillar.title}"`, validateCategoryExpansionOutput);
};

const consolidateMessages = (messages) => {
    if (messages.length === 0) return [];
    const consolidated = [{ ...messages[0] }];
    for (let i = 1; i < messages.length; i += 1) {
        const last = consolidated[consolidated.length - 1];
        if (messages[i].role === last.role) {
            last.content = `${last.content.trim()}\n\n${messages[i].content.trim()}`;
        } else {
            consolidated.push({ ...messages[i] });
        }
    }
    return consolidated;
};

export const processChatTurn = async (chatHistory, currentPillars, config) => {
    const { provider, keys } = config;
    if (provider === 'mock') return mockChatTurn();

    const userMsg = chatHistory[chatHistory.length - 1].content;
    const prompt = `Current Architecture State:\n${JSON.stringify(currentPillars, null, 2)}\n\nUser Message: ${userMsg}`;

    const history = consolidateMessages(chatHistory.slice(1, -1).map(m => ({
        role: m.role === 'agent' ? 'assistant' : m.role,
        content: m.content
    })));

    const completion = await requestProviderCompletion({
        provider, keys,
        openaiPayload: {
            model: 'gpt-4o',
            messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...history, { role: 'user', content: prompt }]
        },
        anthropicPayload: {
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 4000,
            system: CHAT_SYSTEM_PROMPT,
            messages: [...history, { role: 'user', content: prompt }]
        },
        geminiPayload: {
            systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
            contents: [
                ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                { role: 'user', parts: [{ text: prompt }] }
            ],
            generationConfig: { responseMimeType: 'application/json' }
        }
    });

    return parseAndValidateProviderOutput(completion, 'Chat turn processing', validateChatTurnOutput);
};

// --- Mocks ---

const mockGenerate = async () => [
    { id: 'pillar-frontend', title: 'Frontend & UI', description: 'The user-facing application interface.', subcategories: [], decisions: [] },
    { id: 'pillar-infra', title: 'Infrastructure', description: 'Hosting, deployment, and cloud strategy.', subcategories: [], decisions: [] }
];

const mockExpandPillar = async () => ({
    subcategories: [{ 
        id: 'cat-fe-state', title: 'State Management', description: 'How client state is managed.', subcategories: [], 
        decisions: [{ id: 'd-fe-state', question: 'Global state or local?', context: 'Impacts perf', answer: null }] 
    }],
    decisions: [
        { id: 'infra_hosting', question: 'Where is this going to live?', context: 'Cloud provider choice', answer: null },
        { id: 'infra_containerization', question: 'Do you want it containerized?', context: 'Deployment model', answer: null },
        { id: 'infra_iac', question: 'How to handle infrastructure-as-code?', context: 'Management strategy', answer: null }
    ]
});

const mockChatTurn = async () => ({
    reply: "Got it, evaluating your decision...",
    updatedDecisions: [],
    newCategories: [],
    conflicts: []
});
