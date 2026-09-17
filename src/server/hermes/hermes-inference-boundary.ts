import cp from 'child_process';
import fs from 'fs';
import path from 'path';

export type HermesProviderType = 'nous' | 'openrouter' | 'openai' | 'custom' | 'none';

export interface HermesModelConfig {
  provider: HermesProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  isLocalFallback?: boolean;
}

export interface HermesStreamInput {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  isRetry?: boolean;
}

/**
 * Detects whether the current environment is running on a remote cloud deployment host (such as Vercel cloud).
 * On remote cloud deployments, developer-machine filesystem paths (HERMES_HOME, auth.json, etc.)
 * are physically unavailable and MUST NOT be accessed.
 */
function isCloudProductionEnvironment(): boolean {
  // Remote cloud hosts always supply regional/cloud-specific infrastructure metadata
  if (process.env.VERCEL_REGION || process.env.NOW_REGION || process.env.AWS_REGION || process.env.FLY_REGION) {
    return true;
  }
  // Standalone production container / VM deployment
  if (process.env.IS_PRODUCTION_SERVER === 'true') {
    return true;
  }
  // If running on a non-Windows OS (Linux container in cloud) where Hermes developer directory does not exist
  if (process.platform !== 'win32' && !process.env.HERMES_HOME) {
    return true;
  }
  return false;
}

/**
 * Checks whether a bearer token is a JWT with an expired `exp` claim.
 * Standard API keys (OpenRouter, OpenAI, etc.) are not 3-part JWTs and return false.
 */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  try {
    const trimmed = token.trim();
    const parts = trimmed.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number') {
      return Date.now() / 1000 >= payload.exp - skewSeconds;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Triggers Hermes CLI to auto-refresh its OAuth credentials under the auth lock.
 * This runs ONLY on local development machines when local tokens need refreshment.
 */
export function refreshLocalHermesAuth(hermesHomeDir?: string): boolean {
  if (isCloudProductionEnvironment()) return false;
  const hermesHome =
    hermesHomeDir ||
    process.env.HERMES_HOME?.trim() ||
    'C:\\Users\\vinod\\OneDrive\\Desktop\\David_Hermes';

  try {
    const venvHermes = path.join(hermesHome, 'hermes-agent', 'venv', 'Scripts', 'hermes.exe');
    const exe = fs.existsSync(venvHermes) ? venvHermes : 'hermes';
    cp.execFileSync(exe, ['auth', 'status', 'nous'], {
      timeout: 15000,
      stdio: 'ignore',
      windowsHide: true,
    });
    return true;
  } catch (err) {
    console.warn('[HERMES] Local auth refresh attempt warning:', err);
    return false;
  }
}

/**
 * Resolves the active Hermes inference configuration.
 *
 * PRODUCTION ARCHITECTURE:
 * Production MUST configure server-side environment variables:
 *   - OPENROUTER_API_KEY (PRIMARY, optional OPENROUTER_BASE_URL, OPENROUTER_MODEL)
 *   - or OPENAI_API_KEY (optional OPENAI_BASE_URL, OPENAI_MODEL)
 *   - or NOUS_API_KEY (optional NOUS_BASE_URL, NOUS_MODEL)
 *   - or HERMES_INFERENCE_KEY (optional HERMES_INFERENCE_URL, HERMES_MODEL)
 * None of these variables are exposed to NEXT_PUBLIC_* or browser bundles.
 *
 * LOCAL DEVELOPMENT ONLY:
 * When not deployed to a cloud production server (Vercel), a local fallback to
 * the developer's HERMES_HOME configuration is used with automatic token freshness checking.
 */
export function resolveHermesConfig(): HermesModelConfig {
  // 1. PRIMARY: OpenRouter environment variables
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    const key = process.env.OPENROUTER_API_KEY.trim();
    if (!isJwtExpired(key)) {
      return {
        provider: 'openrouter',
        baseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
        apiKey: key,
        model: process.env.OPENROUTER_MODEL?.trim() || process.env.HERMES_MODEL?.trim() || 'openai/gpt-4o-mini',
      };
    }
    console.warn('[HERMES] Warning: OPENROUTER_API_KEY in environment appears to be an expired JWT.');
  }

  // 2. OpenAI environment variables
  if (process.env.OPENAI_API_KEY?.trim()) {
    const key = process.env.OPENAI_API_KEY.trim();
    if (!isJwtExpired(key)) {
      return {
        provider: 'openai',
        baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
        apiKey: key,
        model: process.env.OPENAI_MODEL?.trim() || process.env.HERMES_MODEL?.trim() || 'gpt-4o-mini',
      };
    }
    console.warn('[HERMES] Warning: OPENAI_API_KEY in environment appears to be an expired JWT.');
  }

  // 3. Nous API Key environment variables
  if (process.env.NOUS_API_KEY?.trim()) {
    const key = process.env.NOUS_API_KEY.trim();
    if (!isJwtExpired(key)) {
      return {
        provider: 'nous',
        baseUrl: (process.env.NOUS_BASE_URL || 'https://inference-api.nousresearch.com/v1').replace(/\/+$/, ''),
        apiKey: key,
        model: process.env.NOUS_MODEL?.trim() || process.env.HERMES_MODEL?.trim() || 'upstage/solar-pro4:free',
      };
    }
    console.warn('[HERMES] Warning: NOUS_API_KEY in environment appears to be an expired JWT.');
  }

  // 4. Custom Hermes endpoint environment variables
  if (process.env.HERMES_INFERENCE_KEY?.trim()) {
    const key = process.env.HERMES_INFERENCE_KEY.trim();
    if (!isJwtExpired(key)) {
      return {
        provider: 'custom',
        baseUrl: (process.env.HERMES_INFERENCE_URL || 'https://inference-api.nousresearch.com/v1').replace(/\/+$/, ''),
        apiKey: key,
        model: process.env.HERMES_MODEL?.trim() || 'upstage/solar-pro4:free',
      };
    }
    console.warn('[HERMES] Warning: HERMES_INFERENCE_KEY in environment is an expired token.');
  }

  // If in CLOUD PRODUCTION, never attempt local filesystem lookups. Fail clearly and securely.
  if (isCloudProductionEnvironment()) {
    console.error(
      '[HERMES] Production error: Missing server-side LLM credentials. Set HERMES_INFERENCE_KEY (or OPENROUTER_API_KEY / OPENAI_API_KEY / NOUS_API_KEY).'
    );
    return {
      provider: 'none',
      baseUrl: '',
      apiKey: '',
      model: '',
    };
  }

  // 5. LOCAL DEVELOPMENT FALLBACK ONLY (Never executed on cloud production)
  const hermesHome =
    process.env.HERMES_HOME?.trim() ||
    'C:\\Users\\vinod\\OneDrive\\Desktop\\David_Hermes';

  try {
    const authPath = path.join(hermesHome, 'auth.json');
    if (fs.existsSync(authPath)) {
      let auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      const activeProvider = auth.active_provider || Object.keys(auth.providers || {})[0] || 'nous';
      let providerData = auth.providers?.[activeProvider];

      if (providerData) {
        let token = providerData.agent_key || providerData.access_token || '';

        // If local token is expiring or expired, trigger auto-refresh via Hermes CLI
        if (token && isJwtExpired(token, 60)) {
          console.log('[HERMES] Local token in auth.json is expired or expiring soon. Refreshing via Hermes CLI...');
          refreshLocalHermesAuth(hermesHome);
          if (fs.existsSync(authPath)) {
            auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
            providerData = auth.providers?.[activeProvider];
            if (providerData) {
              token = providerData.agent_key || providerData.access_token || token;
            }
          }
        }

        let baseUrl = providerData?.inference_base_url || 'https://inference-api.nousresearch.com/v1';

        let model = process.env.HERMES_MODEL?.trim() || '';
        const configPath = path.join(hermesHome, 'config.yaml');
        if (!model && fs.existsSync(configPath)) {
          const configText = fs.readFileSync(configPath, 'utf8');
          const defaultModelMatch = configText.match(/default:\s*([^\r\n#]+)/);
          if (defaultModelMatch) {
            model = defaultModelMatch[1].trim();
          }
          const baseUrlMatch = configText.match(/base_url:\s*([^\r\n#]+)/);
          if (baseUrlMatch) {
            baseUrl = baseUrlMatch[1].trim();
          }
        }

        if (!model) {
          model = 'upstage/solar-pro4:free';
        }

        if (token) {
          return {
            provider: activeProvider === 'nous' ? 'nous' : 'custom',
            baseUrl: baseUrl.replace(/\/+$/, ''),
            apiKey: token,
            model,
            isLocalFallback: true,
          };
        }
      }
    }

    // Fallback: check shared/nous_auth.json for local dev
    const nousSharedPath = path.join(hermesHome, 'shared', 'nous_auth.json');
    if (fs.existsSync(nousSharedPath)) {
      const nousAuth = JSON.parse(fs.readFileSync(nousSharedPath, 'utf8'));
      const token = nousAuth.access_token || nousAuth.agent_key || '';
      if (token) {
        return {
          provider: 'nous',
          baseUrl: 'https://inference-api.nousresearch.com/v1',
          apiKey: token,
          model: process.env.HERMES_MODEL?.trim() || 'upstage/solar-pro4:free',
          isLocalFallback: true,
        };
      }
    }
  } catch (err) {
    console.warn('[HERMES] Warning: Failed to read local dev Hermes auth configuration:', err);
  }

  return {
    provider: 'none',
    baseUrl: '',
    apiKey: '',
    model: '',
  };
}

/**
 * Streams completion tokens from the configured Hermes inference boundary.
 * Adheres to standard OpenAI-compatible Server-Sent Events format.
 */
export async function* streamHermesCompletion(input: HermesStreamInput): AsyncGenerator<string, void, unknown> {
  const config = resolveHermesConfig();

  if (config.provider === 'none' || !config.apiKey) {
    throw new Error('Hermes LLM inference is currently unavailable. Server credentials must be configured.');
  }

  const endpoint = `${config.baseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 1024,
      stream: true,
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 401 && config.isLocalFallback && !input.isRetry) {
      console.warn('[HERMES] Received HTTP 401 from inference API. Refreshing local credentials and retrying once...');
      refreshLocalHermesAuth();
      yield* streamHermesCompletion({ ...input, isRetry: true });
      return;
    }
    console.error(`[HERMES] Inference request failed (${response.status}):`, errorText);
    throw new Error(`Hermes inference returned HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Hermes inference returned empty response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') {
          return;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (typeof deltaContent === 'string' && deltaContent.length > 0) {
              yield deltaContent;
            }
          } catch {
            // Ignore incomplete JSON chunks in SSE stream
          }
        }
      }
    }

    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().slice(6).trim();
      if (jsonStr !== '[DONE]') {
        try {
          const parsed = JSON.parse(jsonStr);
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (typeof deltaContent === 'string' && deltaContent.length > 0) {
            yield deltaContent;
          }
        } catch {
          // Ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
