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
    const { data, latency_ms } = await callProviderApi({
        providerName: 'Gemini',
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keys.gemini}`,
        requestInit: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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
    switch (provider) {
        case 'openai': result = await getOpenAICompletion(keys, payload); break;
        case 'anthropic': result = await getAnthropicCompletion(keys, payload); break;
        case 'gemini': result = await getGeminiCompletion(keys, payload); break;
        default: throw new Error(`Unsupported provider: ${provider}`);
    }

    console.log(`[LLM Proxy] ${provider} completion: ${result.usage.total_tokens} tokens, ${result.latency_ms}ms`);
    return result;
};

module.exports = {
    requestProviderCompletion
};
