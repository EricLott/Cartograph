// backend/services/agentService.js
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

const extractOutputTextFromResponsesApi = (data) => {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) {
        return data.output_text.trim();
    }
    const chunks = [];
    const outputItems = Array.isArray(data?.output) ? data.output : [];
    outputItems.forEach((item) => {
        if (item?.type === 'output_text' && typeof item.text === 'string') {
            chunks.push(item.text);
            return;
        }
        if (item?.type === 'message' && Array.isArray(item.content)) {
            item.content.forEach((part) => {
                if (part?.type === 'output_text' && typeof part.text === 'string') {
                    chunks.push(part.text);
                } else if (typeof part?.text === 'string') {
                    chunks.push(part.text);
                }
            });
        }
    });
    return chunks.join('\n').trim();
};

const extractWebSourcesFromResponsesApi = (data) => {
    const found = [];

    const pushSource = (source = {}) => {
        const url = typeof source.url === 'string' ? source.url.trim() : '';
        const title = typeof source.title === 'string' ? source.title.trim() : '';
        const publisher = typeof source.publisher === 'string' ? source.publisher.trim() : '';
        if (!url && !title) return;
        found.push({
            title: title || url,
            url,
            publisher
        });
    };

    const scanValue = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(scanValue);
            return;
        }
        if (Array.isArray(value.sources)) {
            value.sources.forEach(pushSource);
        }
        Object.values(value).forEach(scanValue);
    };

    scanValue(data?.output);
    scanValue(data);

    const deduped = [];
    const seen = new Set();
    found.forEach((source) => {
        const key = `${source.url}|${source.title}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(source);
    });
    return deduped.slice(0, 12);
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

const callProviderApi = async ({ providerName, url, requestInit, timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS }) => {
    const maxAttempts = PROVIDER_MAX_RETRIES + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const startTime = performance.now();

        try {
            const response = await fetch(url, { ...requestInit, signal: controller.signal });
            clearTimeout(timeoutId);

            const result = await handleProviderResponse(response, providerName, attempt, maxAttempts);
            if (result.retry) {
                await wait(PROVIDER_RETRY_BASE_DELAY_MS * attempt);
                continue;
            }

            const latency_ms = Math.round(performance.now() - startTime);
            return { data: result, latency_ms };
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
    const { data, latency_ms } = await callProviderApi({
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
    const completion = data?.choices?.[0]?.message?.content;
    if (typeof completion !== 'string') throw new Error('OpenAI response was missing content.');

    const usage = {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
    };

    return { completion, usage, latency_ms };
};

const getAnthropicCompletion = async (keys, payload) => {
    const { data, latency_ms } = await callProviderApi({
        providerName: 'Anthropic',
        url: 'https://api.anthropic.com/v1/messages',
        requestInit: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': keys.anthropic,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(payload)
        }
    });

    const completion = data?.content?.[0]?.text;
    if (typeof completion !== 'string') throw new Error('Anthropic response was missing content.');

    const usage = {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    };

    return { completion, usage, latency_ms };
};

const getGeminiCompletion = async (keys, payload) => {
    const model = payload?.model || 'gemini-1.5-pro';
    const { model: _ignoredModel, ...requestPayload } = payload || {};
    const { data, latency_ms } = await callProviderApi({
        providerName: 'Gemini',
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
        requestInit: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        }
    });

    const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof completion !== 'string') throw new Error('Gemini response was missing content.');

    const usage = {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0
    };

    return { completion, usage, latency_ms };
};

const getOpenAIGroundedCompletion = async (keys, payload = {}) => {
    const model = payload?.model || 'gpt-5';
    const tools = Array.isArray(payload?.tools) && payload.tools.length > 0
        ? payload.tools
        : [{ type: 'web_search' }];
    const include = Array.isArray(payload?.include) && payload.include.length > 0
        ? payload.include
        : ['web_search_call.action.sources'];
    const toolChoice = payload?.tool_choice || 'auto';
    const instructions = typeof payload?.instructions === 'string' ? payload.instructions : '';
    const input = payload?.input;
    const reasoning = payload?.reasoning || { effort: 'low' };
    const timeoutMs = typeof payload?.timeoutMs === 'number' ? payload.timeoutMs : 120000;
    const maxToolCalls = Number.isInteger(payload?.max_tool_calls) ? payload.max_tool_calls : 6;

    const { data, latency_ms } = await callProviderApi({
        providerName: 'OpenAI',
        url: 'https://api.openai.com/v1/responses',
        timeoutMs,
        requestInit: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keys.openai}`
            },
            body: JSON.stringify({
                model,
                instructions,
                input,
                tools,
                include,
                tool_choice: toolChoice,
                reasoning,
                max_tool_calls: maxToolCalls
            })
        }
    });

    if (data?.error) throw new Error(data.error.message || 'OpenAI grounded request returned an error.');
    const completion = extractOutputTextFromResponsesApi(data);
    if (!completion) throw new Error('OpenAI grounded response was missing content.');

    const usage = {
        prompt_tokens: data?.usage?.input_tokens || data?.usage?.prompt_tokens || 0,
        completion_tokens: data?.usage?.output_tokens || data?.usage?.completion_tokens || 0,
        total_tokens: data?.usage?.total_tokens || 0
    };
    const sources = extractWebSourcesFromResponsesApi(data);

    return { completion, usage, latency_ms, sources };
};

const requestProviderCompletion = async ({ provider, payload, clientKeys = {} }) => {
    // Keys from environment override client keys
    const keys = {
        openai: process.env.OPENAI_API_KEY || clientKeys.openai,
        anthropic: process.env.ANTHROPIC_API_KEY || clientKeys.anthropic,
        gemini: process.env.GEMINI_API_KEY || clientKeys.gemini
    };

    if (!keys[provider]) {
        throw new Error(`Missing API key for ${provider}. Please configure it in the backend environment or frontend settings.`);
    }

    let result;
    try {
        switch (provider) {
            case 'openai': result = await getOpenAICompletion(keys, payload); break;
            case 'anthropic': result = await getAnthropicCompletion(keys, payload); break;
            case 'gemini': result = await getGeminiCompletion(keys, payload); break;
            default: throw new Error(`Unsupported provider: ${provider}`);
        }

        console.log(`[LLM Proxy] ${provider} SUCCESS: ${result.usage.total_tokens} tokens, ${result.latency_ms}ms`);
        return result;
    } catch (err) {
        console.error(`[LLM Proxy] ${provider} ERROR:`, err.message);
        throw err;
    }
};

const requestProviderGroundedCompletion = async ({ provider, payload, clientKeys = {} }) => {
    const keys = {
        openai: process.env.OPENAI_API_KEY || clientKeys.openai,
        anthropic: process.env.ANTHROPIC_API_KEY || clientKeys.anthropic,
        gemini: process.env.GEMINI_API_KEY || clientKeys.gemini
    };

    if (!keys[provider]) {
        throw new Error(`Missing API key for ${provider}. Please configure it in the backend environment or frontend settings.`);
    }

    if (provider !== 'openai') {
        const fallback = await requestProviderCompletion({ provider, payload, clientKeys });
        return { ...fallback, sources: [] };
    }

    try {
        const result = await getOpenAIGroundedCompletion(keys, payload);
        console.log(`[LLM Grounded Proxy] ${provider} SUCCESS: ${result.usage.total_tokens} tokens, ${result.latency_ms}ms, ${result.sources.length} sources`);
        return result;
    } catch (err) {
        console.error(`[LLM Grounded Proxy] ${provider} ERROR:`, err.message);
        throw err;
    }
};

const getOpenAIEmbedding = async (keys, text) => {
    const { data, latency_ms } = await callProviderApi({
        providerName: 'OpenAI',
        url: 'https://api.openai.com/v1/embeddings',
        requestInit: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keys.openai}`
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text
            })
        }
    });

    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) throw new Error('OpenAI response was missing embedding data.');

    const usage = {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: 0,
        total_tokens: data.usage?.total_tokens || 0
    };

    return { embedding, usage, latency_ms };
};

const getGeminiEmbedding = async (keys, text) => {
    const { data, latency_ms } = await callProviderApi({
        providerName: 'Gemini',
        url: `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${keys.gemini}`,
        requestInit: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text }] }
            })
        }
    });

    const embedding = data?.embedding?.values;
    if (!Array.isArray(embedding)) throw new Error('Gemini response was missing embedding data.');

    const usage = {
        prompt_tokens: 0, // Gemini embedding API doesn't return usage in the same way, usually billed per 1k characters/tokens but not in the response metadata
        completion_tokens: 0,
        total_tokens: 0
    };

    return { embedding, usage, latency_ms };
};

const requestProviderEmbedding = async ({ provider, text, clientKeys = {} }) => {
    const keys = {
        openai: process.env.OPENAI_API_KEY || clientKeys.openai,
        gemini: process.env.GEMINI_API_KEY || clientKeys.gemini
    };

    if (!keys[provider]) {
        throw new Error(`Missing API key for ${provider}. Please configure it in the backend environment or frontend settings.`);
    }

    let result;
    try {
        switch (provider) {
            case 'openai': result = await getOpenAIEmbedding(keys, text); break;
            case 'gemini': result = await getGeminiEmbedding(keys, text); break;
            default: throw new Error(`Unsupported provider for embeddings: ${provider}`);
        }

        console.log(`[LLM Embedding Proxy] ${provider} SUCCESS: ${result.latency_ms}ms`);
        return result;
    } catch (err) {
        console.error(`[LLM Embedding Proxy] ${provider} ERROR:`, err.message);
        throw err;
    }
};

module.exports = {
    requestProviderCompletion,
    requestProviderGroundedCompletion,
    requestProviderEmbedding
};
