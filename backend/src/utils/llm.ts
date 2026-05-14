import { Ollama } from 'ollama'
import { env } from '@/config/env.ts'

let _client: Ollama | null = null

function getClient(): Ollama {
  if (!_client) {
    _client = new Ollama({ host: env.OLLAMA_BASE_URL })
  }
  return _client
}

/**
 * Always true — Ollama needs no API key.
 * If the local Ollama server is unreachable the caller's
 * try/catch will fire and fall back to the deterministic path.
 */
export function hasLLM(): boolean {
  return true
}

/**
 * Call Ollama with `format: 'json'` and parse the response.
 * Throws if the model output is not valid JSON.
 */
export async function callLLMJSON<T>(
  systemPrompt: string,
  userMessage:  string,
): Promise<T> {
  const res = await getClient().chat({
    model:  env.OLLAMA_MODEL,
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
  })
  const text = res.message.content.trim()
  return JSON.parse(text) as T
}

/**
 * Call Ollama for free-form text (chat assistant).
 * Messages are the conversation history including the new user turn.
 */
export async function callLLM(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const res = await getClient().chat({
    model: env.OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })
  return res.message.content
}
