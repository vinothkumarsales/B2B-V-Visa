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

export async function callLlm(input: LlmCallInput): Promise<LlmCallResult> {
  if (!llmProviderEnabled()) {
    return {
      provider: activeProvider,
      text: '',
      metadata: { disabled: true, reason: 'LLM provider is not configured' },
    };
  }

  // Provider boundary: no live LLM call is implemented in this phase.
  // This stub preserves the contract for 4C wiring while keeping fixture-only behavior safe.
  return {
    provider: activeProvider,
    text: '',
    metadata: { stub: true, reason: 'LLM call boundary not implemented in 4A/4B' },
  };
}
