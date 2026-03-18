// src/services/agentService.js

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

const parseLLMResponse = (text) => {
    try {
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
        return JSON.parse(cleanText.trim());
    } catch (e) {
        console.error("Failed to parse JSON:", text);
        throw new Error("Invalid output format from LLM. It failed to produce valid JSON.");
    }
};

export const generatePillarsFromIdea = async (ideaDescription, config) => {
    const { provider, keys } = config;

    if (provider === 'mock') return mockGenerate();

    const prompt = `Application Idea:\n${ideaDescription}`;

    try {
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.openai}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' } // OpenAI requires `json_object` to wrap in `{ "pillars": [...] }`, so let's just use text and parse
                })
            });
            // OpenAI JSON mode requires the output to be an object, but our schema is an Array. We'll disable response_format and rely on the prompt instructing raw JSON.
        }
    } catch (e) { } // Refactoring fetch below to handle the JSON object constraint properly.

    try {
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.openai}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT + "\nRemember, return ONLY the raw JSON array." },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return parseLLMResponse(data.choices[0].message.content);
        }

        if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': keys.anthropic,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    system: SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return parseLLMResponse(data.content[0].text);
        }

        if (provider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keys.gemini}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return parseLLMResponse(data.candidates[0].content.parts[0].text);
        }
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
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.openai}` },
                body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: SUBCATEGORY_SYSTEM_PROMPT }, { role: 'user', content: prompt }] })
            });
            const data = await res.json();
            return parseLLMResponse(data.choices[0].message.content);
        }

        if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': keys.anthropic, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                body: JSON.stringify({ model: 'claude-3-5-sonnet-20240620', max_tokens: 4000, system: SUBCATEGORY_SYSTEM_PROMPT, messages: [{ role: 'user', content: prompt }] })
            });
            const data = await res.json();
            return parseLLMResponse(data.content[0].text);
        }

        if (provider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keys.gemini}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ systemInstruction: { parts: [{ text: SUBCATEGORY_SYSTEM_PROMPT }] }, contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
            });
            const data = await res.json();
            return parseLLMResponse(data.candidates[0].content.parts[0].text);
        }
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
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.openai}` },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: CHAT_SYSTEM_PROMPT },
                        ...chatHistory.slice(1, -1), // skip system and current user msg
                        { role: 'user', content: prompt }
                    ]
                })
            });
            const data = await res.json();
            return parseLLMResponse(data.choices[0].message.content);
        }

        if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': keys.anthropic, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20240620', max_tokens: 4000, system: CHAT_SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await res.json();
            return parseLLMResponse(data.content[0].text);
        }

        if (provider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keys.gemini}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            const data = await res.json();
            return parseLLMResponse(data.candidates[0].content.parts[0].text);
        }
    } catch (err) {
        console.error("LLM Chat Error:", err);
        return { reply: "I encountered an error trying to process that thought: " + err.message, updatedDecisions: [], newCategories: [], conflicts: [] };
    }
};

export const evaluateDecisions = async (pillars, config) => {
    return new Promise((resolve) => resolve([]));
};
