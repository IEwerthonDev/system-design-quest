import type { JudgePrompt, LlmClient } from './mock-llm-client';
import { parseLlmJsonContent } from './parse-llm-json';

export interface LlmConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/** OpenAI-compatible LLM adapter (used when LLM_API_KEY is configured). */
export function createLlmClient(config: LlmConfig): LlmClient {
  const baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = config.model ?? 'gpt-4o-mini';

  return {
    async completeJson<T>(prompt: JudgePrompt): Promise<T> {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: JSON.stringify(prompt),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('LLM response missing message content');
      }

      return parseLlmJsonContent<T>(content);
    },
  };
}
