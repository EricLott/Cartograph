// src/services/agentService.js

const PROVIDER_REQUEST_TIMEOUT_MS = 20000;
const PROVIDER_MAX_RETRIES = 2;
const PROVIDER_RETRY_BASE_DELAY_MS = 600;
const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const SYSTEM_PROMPT = `You are the Cartograph Agent, an expert software architect. 
Analyze the application idea and break it down into top-level architectural Pillars (e.g., Frontend, Backend, Data, Security, Infrastructure). 
You MUST respond with ONLY a valid JSON array of these top-level pillar objects! 
Do NOT generate subcategories or decisions at this stage. Keep the payload extremely small and fast.
NO markdown wrappers like \`\`\`json. Just the raw array.

Format MUST match exactly:
[
  {
    "id": "pillar_id_string",
    "title": "Pillar Title",
    "description": "Short explanation of this pillar.",
    "subcategories": [],
    "decisions": []
  }
]
`;

const SUBCATEGORY_SYSTEM_PROMPT = `You are a specialized Sub-Agent architect focusing exclusively on a single architectural pillar.
Analyze the user's application idea and generate the specific categories and pending architectural decisions required for your assigned pillar.
The initial decisions should ask VERY high-level, abstract questions that an architect needs to know to get started, thinking chronologically to build context.
You can optionally define "subcategories" to recursively break down larger architectural domains.
You MUST respond with ONLY a valid JSON object! NO markdown wrappers like \`\`\`json. Just the raw object.

Format MUST match exactly:
{
  "subcategories": [
    {
      "id": "cat_id_string",
      "title": "Category Title",
      "description": "Short explanation.",
      "subcategories": [], // Optional recursive array
      "decisions": [
        {
          "id": "decision_id_string",
          "question": "What is the specific high-level architectural question?",
          "context": "Why is this decision important?",
          "answer": null
        }
      ]
    }
  ],
  "decisions": [
    // Decisions that belong directly to the root pillar, matching the decision schema above
  ]
}
`;

const CHAT_SYSTEM_PROMPT = `You are the Cartograph Agent, an expert software architect.
You are helping the user build the perfect architectural context package for an AI coding agent.
You MUST be proactive. You will receive the current state of Pillars/Decisions and the user's latest message.

Your job:
1. Scan the Current Architecture State. Find decisions where "answer" is null.
2. In your "reply", proactively guide the user sequentially. Ask them about these pending architectural decisions one at a time or in logical groups. Do NOT passively wait for them. Drive the conversation carefully.
3. If they answer your questions, extract the decisions into "updatedDecisions".
4. Identify logical contradictions and output them in "conflicts".
5. If a new domain is introduced, define new categories in "newCategories".

You MUST respond with ONLY a valid JSON object matching this schema exactly! NO markdown wrappers:
{
  "reply": "Your natural language architectural advice, proactively asking the user to resolve pending decisions.",
  "updatedDecisions": [
    { "id": "decision_id_string", "answer": "The user's extracted reasoning or choice." }
  ],
  "newCategories": [
    // Array of completely new Pillar/Category objects (recursively matching the Pillar schema) if applicable.
  ],
  "conflicts": [
    { "description": "E.g. They chose CosmosDB but also MySQL for the same dataset.", "decisionIds": ["id1", "id2"] }
  ]
}
`;

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

const callProviderApi = async ({ providerName, url, requestInit }) => {
    const maxAttempts = PROVIDER_MAX_RETRIES + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                ...requestInit,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await readJsonSafely(response);

            if (!response.ok) {
                const detail = extractProviderErrorDetail(data) || response.statusText || 'Request failed.';
                if (attempt < maxAttempts && RETRYABLE_HTTP_STATUS_CODES.has(response.status)) {
                    await wait(PROVIDER_RETRY_BASE_DELAY_MS * attempt);
                    continue;
                }

                throw new Error(
                    `${providerName} request failed after ${attempt} attempt${attempt === 1 ? '' : 's'} (status ${response.status}): ${detail}`
                );
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);

            const isTimeout = error?.name === 'AbortError';
            const isNetwork = error instanceof TypeError;

            if (attempt < maxAttempts && (isTimeout || isNetwork)) {
                await wait(PROVIDER_RETRY_BASE_DELAY_MS * attempt);
                continue;
            }

            if (isTimeout) {
                throw new Error(
                    `${providerName} request timed out after ${maxAttempts} attempts (${PROVIDER_REQUEST_TIMEOUT_MS}ms each).`
                );
            }

            if (isNetwork) {
                throw new Error(
                    `${providerName} request failed after ${maxAttempts} attempts due to network issues: ${error.message}`
                );
            }

            if (error instanceof Error) {
                throw error;
            }

            throw new Error(
                `${providerName} request failed after ${maxAttempts} attempts: Unknown error.`
            );
        }
    }

    throw new Error(`${providerName} request failed after ${PROVIDER_MAX_RETRIES + 1} attempts.`);
};

const parseLLMResponse = (text) => {
    try {
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
        return JSON.parse(cleanText.trim());
    } catch {
        console.error("Failed to parse JSON:", text);
        throw new Error("Invalid output format from LLM. It failed to produce valid JSON.");
    }
};

const requestProviderCompletion = async ({ provider, keys, openaiPayload, anthropicPayload, geminiPayload }) => {
    if (provider === 'openai') {
        const data = await callProviderApi({
            providerName: 'OpenAI',
            url: 'https://api.openai.com/v1/chat/completions',
            requestInit: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.openai}`
                },
                body: JSON.stringify(openaiPayload)
            }
        });

        if (data?.error) throw new Error(data.error.message || 'OpenAI returned an error.');
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') throw new Error('OpenAI response was missing completion content.');
        return content;
    }

    if (provider === 'anthropic') {
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
                body: JSON.stringify(anthropicPayload)
            }
        });

        if (data?.error) throw new Error(data.error.message || 'Anthropic returned an error.');
        const content = data?.content?.[0]?.text;
        if (typeof content !== 'string') throw new Error('Anthropic response was missing completion content.');
        return content;
    }

    if (provider === 'gemini') {
        const data = await callProviderApi({
            providerName: 'Gemini',
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keys.gemini}`,
            requestInit: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiPayload)
            }
        });

        if (data?.error) throw new Error(data.error.message || 'Gemini returned an error.');
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof content !== 'string') throw new Error('Gemini response was missing completion content.');
        return content;
    }

    throw new Error(`Unsupported provider: ${provider}`);
};

export const generatePillarsFromIdea = async (ideaDescription, config) => {
    const { provider, keys } = config;

    if (provider === 'mock') return mockGenerate();

    const prompt = `Application Idea:\n${ideaDescription}`;

    try {
        const completion = await requestProviderCompletion({
            provider,
            keys,
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

        return parseLLMResponse(completion);
    } catch (err) {
        console.error("LLM Error:", err);
        return [{ id: 'err', title: 'Error Generation', description: err.message, decisions: [] }];
    }
};

const mockGenerate = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: 'pillar-frontend',
                    title: 'Frontend & UI',
                    description: 'The user-facing application interface.',
                    subcategories: [],
                    decisions: []
                }
            ]);
        }, 500);
    });
};

export const generateCategoriesForPillar = async (ideaDescription, pillar, config) => {
    const { provider, keys } = config;

    if (provider === 'mock') {
        return new Promise((resolve) => {
            setTimeout(() => resolve({
                subcategories: [{ id: 'cat-fe-state', title: 'State Management', description: 'How client state is managed.', subcategories: [], decisions: [{ id: 'd-fe-state', question: 'Global state or local?', context: 'Impacts perf', answer: null }] }],
                decisions: [{ id: 'd-fe-fw', question: 'Primary mode of interaction?', context: 'SPA vs Static', answer: null }]
            }), 1500);
        });
    }

    const prompt = `Application Idea:\n${ideaDescription}\n\nAssigned Pillar to expand:\n${pillar.title}\n${pillar.description}`;

    try {
        const completion = await requestProviderCompletion({
            provider,
            keys,
            openaiPayload: {
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SUBCATEGORY_SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ]
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

        return parseLLMResponse(completion);
    } catch (err) {
        console.error("LLM Sub-Agent Error:", err);
        return { subcategories: [], decisions: [] };
    }
};

export const processChatTurn = async (chatHistory, currentPillars, config) => {
    const { provider, keys } = config;

    const userMsg = chatHistory[chatHistory.length - 1].content;
    const prompt = `Current Architecture State:\n${JSON.stringify(currentPillars, null, 2)}\n\nUser Message: ${userMsg}`;

    if (provider === 'mock') {
        return new Promise((resolve) => {
            setTimeout(() => resolve({
                reply: "Got it, evaluating your decision...",
                updatedDecisions: [],
                newCategories: [],
                conflicts: []
            }), 1000);
        });
    }

    try {
        const completion = await requestProviderCompletion({
            provider,
            keys,
            openaiPayload: {
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: CHAT_SYSTEM_PROMPT },
                    ...chatHistory.slice(1, -1),
                    { role: 'user', content: prompt }
                ]
            },
            anthropicPayload: {
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 4000,
                system: CHAT_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: prompt }]
            },
            geminiPayload: {
                systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            }
        });

        return parseLLMResponse(completion);
    } catch (err) {
        console.error("LLM Chat Error:", err);
        return { reply: "I encountered an error trying to process that thought: " + err.message, updatedDecisions: [], newCategories: [], conflicts: [] };
    }
};

export const evaluateDecisions = async () => {
    return new Promise((resolve) => resolve([]));
};
