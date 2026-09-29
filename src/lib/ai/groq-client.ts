// ============================================
// Groq API Client Wrapper
// Handles all LLM interactions with streaming
// ============================================

import Groq from 'groq-sdk';

let groqClient: Groq | null = null;

export function getGroqClient(apiKey: string): Groq {
  if (!groqClient || (groqClient as unknown as { apiKey: string }).apiKey !== apiKey) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export async function generateChatResponse(
  apiKey: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
): Promise<string> {
  const client = getGroqClient(apiKey);

  const completion = await client.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.92,
    max_tokens: 1024,
    top_p: 0.95,
    frequency_penalty: 0.8,
    presence_penalty: 0.7,
  });

  return completion.choices[0]?.message?.content || '';
}

export async function generateSummary(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const client = getGroqClient(apiKey);

  const completion = await client.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: 'You are a memory summarization engine. Output valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  return completion.choices[0]?.message?.content || '{}';
}

export async function streamChatResponse(
  apiKey: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
): Promise<AsyncIterable<string>> {
  const client = getGroqClient(apiKey);

  const stream = await client.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.85,
    max_tokens: 1024,
    top_p: 0.9,
    frequency_penalty: 0.3,
    presence_penalty: 0.4,
    stream: true,
  });

  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
    },
  };
}
