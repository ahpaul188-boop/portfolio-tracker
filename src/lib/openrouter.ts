const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "inclusionai/ling-3.0-flash-fin:free";
const DEFAULT_FALLBACK_MODELS = ["minimax/minimax-m3:free"];

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: {
    message?: string;
    code?: number | string;
    metadata?: {
      raw?: string;
      retry_after_seconds?: number;
    };
  };
};

export class OpenRouterError extends Error {
  status: number;
  code?: number | string;

  constructor(message: string, status: number, code?: number | string) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.code = code;
  }
}

export function openrouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY?.trim();
}

function fallbackModels(): string[] {
  const fromEnv = process.env.OPENROUTER_FALLBACK_MODELS?.trim();
  if (!fromEnv) return DEFAULT_FALLBACK_MODELS;
  return fromEnv
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

function modelsToTry(override?: string | null): string[] {
  if (override?.trim()) {
    return [override.trim()];
  }
  const primary = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  const fallbacks = fallbackModels().filter((m) => m !== primary);
  return [primary, ...fallbacks];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(data: ChatCompletionResponse, status: number): string {
  return (
    data.error?.metadata?.raw ||
    data.error?.message ||
    `OpenRouter API error (${status})`
  );
}

async function requestCompletion(
  model: string,
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ ok: true; content: string } | { ok: false; status: number; data: ChatCompletionResponse }> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "Portfolio Tracker",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.6,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = (await res.json()) as ChatCompletionResponse;

  if (!res.ok) {
    return { ok: false, status: res.status, data };
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return {
      ok: false,
      status: 502,
      data: { error: { message: "Empty response from OpenRouter" } },
    };
  }

  return { ok: true, content };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; model?: string | null }
): Promise<string> {
  const models = modelsToTry(options?.model);
  let lastError: OpenRouterError | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;
    const maxAttempts = isLast ? 3 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await requestCompletion(model, messages, options);
      if (result.ok) {
        return result.content;
      }

      const { status, data } = result;
      const msg = errorMessage(data, status);
      const code = data.error?.code;
      lastError = new OpenRouterError(msg, status, code);

      const retryable =
        status === 429 ||
        (status >= 500 && status < 600) ||
        /rate-?limit/i.test(msg);

      if (!retryable || attempt === maxAttempts - 1) {
        break;
      }

      const waitMs =
        (data.error?.metadata?.retry_after_seconds ?? 5) * 1000 + attempt * 1000;
      await sleep(waitMs);
    }
  }

  throw lastError ?? new Error("AI suggestion failed");
}
