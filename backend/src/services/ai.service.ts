import { Types } from 'mongoose'
import { hasLLM, callLLM, callLLMJSON } from '@/utils/llm.ts'
import { LessonModel, CourseModel } from '@/models/schema.ts'

/** Detect Ollama / fetch connection errors so we return 503 instead of 500 */
function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('econnrefused') ||
    msg.includes('fetch failed')  ||
    msg.includes('enotfound')     ||
    msg.includes('etimedout')     ||
    msg.includes('network')       ||
    msg.includes('connect')
  )
}

/** Detect "model not pulled" errors from Ollama */
function isModelNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return msg.includes('model') && (msg.includes('not found') || msg.includes('pull'))
}

export class AIError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

/* ─────────────────────────────────────────────────────
   AIService
   ─────────────────────────────────────────────────────
   Powers two AI features:

   1. chat()      — lesson-scoped "Ask AI" assistant
   2. autoTag()   — generate tags for a course title+desc
───────────────────────────────────────────────────── */
export class AIService {

  /* ── 7.2  Lesson-scoped AI chat ─────────────────── */
  async chat(
    history:     ChatMessage[],
    newMessage:  string,
    lessonId?:   string,
    courseSlug?: string,
  ): Promise<string> {
    if (!hasLLM()) {
      throw new AIError('AI_NOT_CONFIGURED', 'AI (Ollama) is not available on this server.', 503)
    }
    if (!newMessage.trim()) {
      throw new AIError('EMPTY_MESSAGE', 'Message cannot be empty.', 400)
    }

    /* Build context from lesson / course */
    const context = await this.buildContext(lessonId, courseSlug)

    const systemPrompt = `You are a helpful AI learning assistant for an online learning platform.
${context}

Guidelines:
- Answer questions clearly and concisely related to the course content above.
- If a question is unrelated to the course, politely redirect the student.
- Use examples when helpful. Format code with backticks.
- Keep responses focused — 1-3 paragraphs unless depth is clearly needed.`

    /* Build message list: trim to last 10 turns to stay within token limits */
    const trimmedHistory = history.slice(-10)
    const messages: ChatMessage[] = [
      ...trimmedHistory,
      { role: 'user', content: newMessage },
    ]

    try {
      return await callLLM(systemPrompt, messages)
    } catch (err: unknown) {
      /* Ollama offline / unreachable */
      if (isConnectionError(err)) {
        throw new AIError(
          'AI_UNAVAILABLE',
          'The AI assistant is offline. Start Ollama with `ollama serve` and make sure the model is downloaded.',
          503,
        )
      }
      /* Model not downloaded yet */
      if (isModelNotFoundError(err)) {
        const model = (err instanceof Error && err.message.match(/model '([^']+)'/)?.[1]) ?? 'llama3.2:3b'
        throw new AIError(
          'AI_MODEL_NOT_FOUND',
          `AI model "${model}" is not installed. Run in your terminal:\n\n  ollama pull ${model}\n\nThen restart the backend.`,
          503,
        )
      }
      throw err
    }
  }

  /* ── 7.7  Auto-tag a course ─────────────────────── */
  async autoTag(title: string, description?: string): Promise<string[]> {
    if (!hasLLM()) return []

    const systemPrompt = `You are a course tagging assistant. Given a course title and description, return 5–10 relevant skill/technology tags.
Return ONLY a JSON array of lowercase strings, no markdown fences. Example: ["javascript","react","web development"]`

    const userMessage = `Title: "${title}"
Description: ${description?.trim() || 'not provided'}`

    try {
      const tags = await callLLMJSON<string[]>(
        systemPrompt,
        userMessage,
      )
      return Array.isArray(tags) ? tags.slice(0, 10).map(t => String(t).toLowerCase().trim()) : []
    } catch {
      return []
    }
  }

  /* ── Private: context builder ───────────────────── */
  private async buildContext(lessonId?: string, courseSlug?: string): Promise<string> {
    const parts: string[] = []

    /* Resolve lesson */
    if (lessonId && Types.ObjectId.isValid(lessonId)) {
      const lesson = await LessonModel.findById(lessonId).lean().exec()
      if (lesson) {
        parts.push(`Current lesson: "${lesson.title}" (${lesson.type})`)
        if (lesson.contentBody) parts.push(`Lesson notes: ${lesson.contentBody.slice(0, 600)}`)
      }
    }

    /* Resolve course */
    const slug = courseSlug?.trim()
    if (slug) {
      const course = await CourseModel
        .findOne({ slug })
        .select('title description level tags')
        .lean()
        .exec()
      if (course) {
        parts.push(`Course: "${course.title}"`)
        if (course.description) parts.push(`Course description: ${course.description}`)
        if (course.level)       parts.push(`Level: ${course.level}`)
        if (course.tags?.length) parts.push(`Topics: ${course.tags.join(', ')}`)
      }
    }

    return parts.length > 0
      ? `Context:\n${parts.join('\n')}`
      : 'No specific course context is available for this session.'
  }
}
