// src/services/agentService.js
import { 
    SYSTEM_PROMPT, 
    SUBCATEGORY_SYSTEM_PROMPT, 
    CHAT_SYSTEM_PROMPT,
    CONSISTENCY_SYSTEM_PROMPT
} from './prompts';
import { 
    validatePillarArrayOutput, 
    validateCategoryExpansionOutput, 
    validateChatTurnOutput,
    validateConsistencyOutput,
    parseAndValidateProviderOutput 
} from './agentValidator';

const DEFAULT_MODELS = {
    openai: { interactions: 'gpt-4o', planner: 'gpt-4o', suggestions: 'gpt-4o-mini', conflicts: 'gpt-4o' },
    anthropic: { interactions: 'claude-3-5-sonnet-20240620', planner: 'claude-3-5-sonnet-20240620', suggestions: 'claude-3-5-sonnet-20240620', conflicts: 'claude-3-5-sonnet-20240620' },
    gemini: { interactions: 'gemini-1.5-pro', planner: 'gemini-1.5-pro', suggestions: 'gemini-1.5-flash', conflicts: 'gemini-1.5-pro' }
};

const getModelForTask = (config, task) => {
    const provider = config?.provider || 'mock';
    const configured = config?.models?.[provider] || {};
    const defaults = DEFAULT_MODELS[provider] || {};
    return configured[task] || configured.interactions || defaults[task] || defaults.interactions || null;
};

const requestProviderCompletion = async ({ provider, payload, keys }) => {
    const response = await fetch('/api/agent/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, payload, clientKeys: keys })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || 'Failed to retrieve completion from backend proxy.');
    }

    const { completion } = await response.json();
    return completion;
};

export const generatePillarsFromIdea = async (ideaDescription, config) => {
    const { provider, keys } = config;
    if (provider === 'mock') return mockGenerate();
    const model = getModelForTask(config, 'interactions');

    const prompt = `Application Idea:\n${ideaDescription}`;
    
    let payload;
    if (provider === 'openai') {
        payload = {
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT + "\nRemember, return ONLY the raw JSON array." },
                { role: 'user', content: prompt }
            ]
        };
    } else if (provider === 'anthropic') {
        payload = {
            model,
            max_tokens: 4000,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }]
        };
    } else if (provider === 'gemini') {
        payload = {
            model,
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        };
    }

    const completion = await requestProviderCompletion({ provider, payload, keys });
    return parseAndValidateProviderOutput(completion, 'Pillar generation', validatePillarArrayOutput);
};

export const generateCategoriesForPillar = async (ideaDescription, pillar, config) => {
    const { provider, keys } = config;
    if (provider === 'mock') return mockExpandPillar(ideaDescription, pillar);
    const model = getModelForTask(config, 'interactions');

    const prompt = `Application Idea:\n${ideaDescription}\n\nAssigned Pillar to expand:\nID: ${pillar.id}\nTitle: ${pillar.title}\nDescription: ${pillar.description}`;
    
    let payload;
    if (provider === 'openai') {
        payload = {
            model,
            messages: [{ role: 'system', content: SUBCATEGORY_SYSTEM_PROMPT }, { role: 'user', content: prompt }]
        };
    } else if (provider === 'anthropic') {
        payload = {
            model,
            max_tokens: 4000,
            system: SUBCATEGORY_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }]
        };
    } else if (provider === 'gemini') {
        payload = {
            model,
            systemInstruction: { parts: [{ text: SUBCATEGORY_SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        };
    }

    const completion = await requestProviderCompletion({ provider, payload, keys });
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
    const model = getModelForTask(config, 'interactions');

    const userMsg = chatHistory[chatHistory.length - 1].content;
    const prompt = `Current Architecture State:\n${JSON.stringify(currentPillars, null, 2)}\n\nUser Message: ${userMsg}`;

    const history = consolidateMessages(chatHistory.slice(1, -1).map(m => ({
        role: m.role === 'agent' ? 'assistant' : m.role,
        content: m.content
    })));

    let payload;
    if (provider === 'openai') {
        payload = {
            model,
            messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...history, { role: 'user', content: prompt }]
        };
    } else if (provider === 'anthropic') {
        payload = {
            model,
            max_tokens: 4000,
            system: CHAT_SYSTEM_PROMPT,
            messages: [...history, { role: 'user', content: prompt }]
        };
    } else if (provider === 'gemini') {
        payload = {
            model,
            systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
            contents: [
                ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                { role: 'user', parts: [{ text: prompt }] }
            ],
            generationConfig: { responseMimeType: 'application/json' }
        };
    }

    const completion = await requestProviderCompletion({ provider, payload, keys });
    return parseAndValidateProviderOutput(completion, 'Chat turn processing', validateChatTurnOutput);
};

export const analyzeArchitectureConsistency = async (currentPillars, config) => {
    const { provider, keys } = config;
    if (provider === 'mock') return { conflicts: [] };
    const model = getModelForTask(config, 'conflicts');

    const prompt = `Current Architecture State:\n${JSON.stringify(currentPillars, null, 2)}\n\nIdentify cross-decision conflicts and return JSON only.`;

    let payload;
    if (provider === 'openai') {
        payload = {
            model,
            messages: [{ role: 'system', content: CONSISTENCY_SYSTEM_PROMPT }, { role: 'user', content: prompt }]
        };
    } else if (provider === 'anthropic') {
        payload = {
            model,
            max_tokens: 3000,
            system: CONSISTENCY_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }]
        };
    } else if (provider === 'gemini') {
        payload = {
            model,
            systemInstruction: { parts: [{ text: CONSISTENCY_SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        };
    }

    const completion = await requestProviderCompletion({ provider, payload, keys });
    return parseAndValidateProviderOutput(completion, 'Consistency scan', validateConsistencyOutput);
};

// --- Mocks ---

const mockGenerate = async () => [
    { id: 'pillar-features', title: 'Features', description: 'Core functional requirements and product features.', subcategories: [], decisions: [] },
    { id: 'pillar-frontend', title: 'Frontend & UI', description: 'The user-facing application interface.', subcategories: [], decisions: [] },
    { id: 'pillar-infra', title: 'Infrastructure', description: 'Hosting, deployment, and cloud strategy.', subcategories: [], decisions: [] }
];

const mockExpandPillar = async (idea, pillar) => {
    if (pillar.id === 'pillar-features') {
        return {
            subcategories: [],
            decisions: [
                { id: 'feat_auth', question: 'User Authentication', context: 'Allow users to sign up and log in.', answer: 'Included' },
                { id: 'feat_crud', question: 'Core CRUD Operations', context: 'Manage the main data entities.', answer: 'Included' }
            ]
        };
    }
    return {
        subcategories: [{ 
            id: 'cat-fe-state', title: 'State Management', description: 'How client state is managed.', subcategories: [], 
            decisions: [{ id: 'd-fe-state', question: 'Global state or local?', context: 'Impacts perf', answer: null }] 
        }],
        decisions: [
            { id: 'infra_hosting', question: 'Where is this going to live?', context: 'Cloud provider choice', answer: null },
            { id: 'infra_containerization', question: 'Do you want it containerized?', context: 'Deployment model', answer: null },
            { id: 'infra_iac', question: 'How to handle infrastructure-as-code?', context: 'Management strategy', answer: null }
        ]
    };
};

const mockChatTurn = async () => ({
    reply: "Got it, evaluating your decision...",
    updatedDecisions: [],
    newCategories: [],
    newDecisions: [],
    conflicts: [],
    artifact: null
});
