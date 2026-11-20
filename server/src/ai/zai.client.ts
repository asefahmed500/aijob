import { Injectable, ServiceUnavailableException } from "@nestjs/common";

const DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4";
const DEFAULT_MODEL = "glm-4.6";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

@Injectable()
export class ZaiClient {
  private readonly apiKey =
    process.env.ZAI_API_KEY ?? process.env.NEXT_ZAI_API_kEY ?? "";
  private readonly baseUrl =
    process.env.ZAI_BASE_URL ?? DEFAULT_BASE_URL;
  readonly model = process.env.ZAI_MODEL ?? DEFAULT_MODEL;

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async chatJson<T>(messages: ChatMessage[]): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException("Z.ai API key is not configured");
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "Accept-Language": "en-US,en",
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0.2,
            max_tokens: 4096,
            stream: false,
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          const detail = (await response.text()).slice(0, 500);
          throw new Error(`Z.ai HTTP ${response.status}: ${detail}`);
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("Z.ai returned an empty completion");
        }
        return this.parseJson<T>(content);
      } catch (error) {
        lastError = error as Error;
        const retryable =
          lastError.message.includes("HTTP 429") ||
          lastError.message.includes("HTTP 5") ||
          lastError.name === "TimeoutError";
        if (!retryable || attempt === MAX_ATTEMPTS) break;
      }
    }
    throw new ServiceUnavailableException(
      `Z.ai request failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message ?? "unknown error"}`,
    );
  }

  private parseJson<T>(content: string): T {
    const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(content);
    const candidate = fenced ? fenced[1] : content;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("Z.ai response did not contain a JSON object");
    }
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  }
}
