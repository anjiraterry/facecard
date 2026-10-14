/**
 * Neon AI Gateway Integration
 *
 * One API and one credential for frontier and open-source models,
 * built into the Neon branch and powered by Databricks Unity AI Gateway.
 *
 * Supported paths:
 * - /v1: OpenAI Chat Completions compatible (/v1/chat/completions)
 * - /openai/v1: OpenAI Responses API
 * - /anthropic: Native Anthropic Messages
 * - /gemini: Native Gemini generateContent
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callNeonAIGateway(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const baseUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
  const token = process.env.NEON_AI_GATEWAY_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "Missing Neon AI Gateway credentials. Ensure NEON_AI_GATEWAY_BASE_URL and NEON_AI_GATEWAY_TOKEN are defined in your environment."
    );
  }

  // Bare host URL without trailing slash + /v1/chat/completions
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const endpoint = `${cleanBase}/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Neon AI Gateway returned HTTP ${response.status}: ${errorBody}`);
  }

  return response.json();
}
