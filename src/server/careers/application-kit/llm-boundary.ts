export type LlmProvider =
  | 'none'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'local';

export type LlmCallInput = {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type LlmCallResult = {
  provider: LlmProvider;
  text: string;
  metadata: Record<string, unknown>;
};

let activeProvider: LlmProvider = 'none';

export function configureLlmProvider(provider: LlmProvider) {
  activeProvider = provider;
}

export function getActiveLlmProvider(): LlmProvider {
  return activeProvider;
}

export function llmProviderEnabled(): boolean {
  return activeProvider !== 'none';
}

export function resolveLlmProviderFromEnv(): LlmProvider {
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  if (key) return 'openrouter';
  return 'none';
}

export async function callLlm(input: LlmCallInput): Promise<LlmCallResult> {
  const provider = activeProvider;

  if (provider === 'none') {
    return {
      provider,
      text: '',
      metadata: { disabled: true, reason: 'LLM provider is not configured' },
    };
  }

  if (provider === 'openrouter') {
    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      return {
        provider,
        text: '',
        metadata: { disabled: true, reason: 'OPENROUTER_API_KEY is not set' },
      };
    }

    const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    const model = (process.env.OPENROUTER_MODEL || '').trim() || 'openrouter/default';

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: input.prompt }],
          temperature: input.temperature ?? 0.2,
          max_tokens: input.maxTokens ?? 256,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const text = String((data?.choices?.[0] as Record<string, unknown>)?.['message']?.['content'] ?? '');

      return {
        provider,
        text,
        metadata: {
          status: response.status,
          model,
          raw: data,
        },
      };
    } catch (error) {
      return {
        provider,
        text: '',
        metadata: {
          error: true,
          message: (error as Error)?.message || 'OpenRouter request failed',
        },
      };
    }
  }

  return {
    provider,
    text: '',
    metadata: { disabled: true, reason: `LLM provider '${provider}' boundary not implemented` },
  };
}
