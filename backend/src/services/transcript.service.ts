import { LessonModel } from '@/models/schema.ts'
import { hasLLM, callLLM } from '@/utils/llm.ts'
import { logger } from '@/utils/logger.ts'

export class TranscriptError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'TranscriptError'
  }
}

export class TranscriptService {

  /* ── Get transcript for a lesson ────────────────── */
  async get(lessonId: string): Promise<string | null> {
    const lesson = await LessonModel.findById(lessonId).select('transcript').lean().exec()
    if (!lesson) throw new TranscriptError('NOT_FOUND', 'Lesson not found', 404)
    return lesson.transcript ?? null
  }

  /* ── Save a manually-authored transcript ─────────── */
  async save(lessonId: string, text: string): Promise<void> {
    const result = await LessonModel.updateOne(
      { _id: lessonId },
      { $set: { transcript: text.trim() } },
    ).exec()
    if (result.matchedCount === 0) {
      throw new TranscriptError('NOT_FOUND', 'Lesson not found', 404)
    }
  }

  /* ── AI-generate a transcript using Ollama ───────────────────────
     We can't process audio with a text LLM, so we generate an
     instructional transcript from the lesson's title + contentBody
     (article text) or a rich outline for video-only lessons.
     The result is clearly labelled "AI-generated" in the UI.
  ─────────────────────────────────────────────────────────────── */
  async generate(lessonId: string): Promise<string> {
    if (!hasLLM()) {
      throw new TranscriptError(
        'AI_NOT_CONFIGURED',
        'AI (Ollama) is not available. Start Ollama and pull a model first.',
        503,
      )
    }

    const lesson = await LessonModel
      .findById(lessonId)
      .select('title type contentBody contentUrl durationMins')
      .lean()
      .exec()

    if (!lesson) throw new TranscriptError('NOT_FOUND', 'Lesson not found', 404)

    const systemPrompt = `You are an expert instructional designer creating a detailed written transcript for an online course lesson. Write in first-person as if you are the instructor speaking. Use clear, natural spoken language — no bullet points, no headers — just flowing paragraphs of educational narration. Aim for approximately one paragraph per major concept.`

    const context = [
      `Lesson title: "${lesson.title}"`,
      `Lesson type: ${lesson.type}`,
      lesson.durationMins > 0 ? `Estimated duration: ${lesson.durationMins} minutes` : '',
      lesson.contentBody ? `\nLesson content:\n${lesson.contentBody.slice(0, 2000)}` : '',
      !lesson.contentBody ? `\nNo written content is available. Generate a thorough, educational transcript covering what this lesson would typically teach based on its title.` : '',
    ].filter(Boolean).join('\n')

    const userMessage = `Write a complete spoken transcript for this lesson:\n\n${context}`

    try {
      const transcript = await callLLM(systemPrompt, [{ role: 'user', content: userMessage }])

      /* Persist the generated transcript */
      await LessonModel.updateOne(
        { _id: lessonId },
        { $set: { transcript: transcript.trim() } },
      ).exec()

      return transcript.trim()
    } catch (err: unknown) {
      logger.error({ err, lessonId }, 'Transcript generation failed')
      const msg = err instanceof Error ? err.message : 'Unknown error'
      throw new TranscriptError('GENERATION_FAILED', `Transcript generation failed: ${msg}`, 503)
    }
  }
}
