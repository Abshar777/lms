import { CourseRepository } from '@/repositories/course.repository.ts'
import { CourseError } from '@/services/course.service.ts'
import { hasLLM, callLLMJSON } from '@/utils/llm.ts'
import { logger } from '@/utils/logger.ts'
import type { ICourse, ISection, ILesson } from '@/models/schema.ts'

/* ─────────────────────────────────────────────────────
   AINotesService
   ─────────────────────────────────────────────────────
   Returns structured study notes for a published course.

   When ANTHROPIC_API_KEY is set the notes are generated
   by Claude (claude-3-5-haiku — fast, cheap). When the
   key is absent the service falls back to a deterministic
   generator so the feature still works locally without a
   key.
───────────────────────────────────────────────────── */

export interface AINotes {
  summary:            string
  keyTopics:          string[]
  studyOrder:         Array<{ title: string; tip: string; minutes: number }>
  keyTakeaways:       string[]
  estimatedStudyTime: string  // e.g. "5 hours over 2 weeks"
  difficulty:         'beginner' | 'intermediate' | 'advanced' | 'mixed'
  generatedAt:        string
  generator:          'deterministic-v1' | 'ollama'
}

/* ── Deterministic helpers (fallback) ────────────────── */

function fmtMins(mins: number): string {
  if (mins < 60) return `${mins} minutes`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0)         return `${h} hour${h > 1 ? 's' : ''}`
  return `${h}h ${m}m`
}

function suggestPace(totalMins: number): string {
  if (totalMins < 60)   return 'one focused sitting'
  if (totalMins < 240)  return '2–3 sessions over a week'
  if (totalMins < 600)  return `${fmtMins(totalMins)} over 2 weeks`
  return `${fmtMins(totalMins)} over 3–4 weeks`
}

function studyTipFor(sectionTitle: string, lessonCount: number, mins: number): string {
  const t = sectionTitle.toLowerCase()
  if (/start|intro|welcome|setup/.test(t))
    return `Skim this section first to set up your environment and align on terminology. Aim for ~${fmtMins(mins)}.`
  if (/core|fundamentals|concept|basics/.test(t))
    return `Take notes as you go — these are the load-bearing ideas the rest of the course builds on.`
  if (/advanced|deep|going deeper|pattern/.test(t))
    return `Re-watch any sections that feel tricky. Try to predict what comes next before each lesson plays.`
  if (/project|hands-on|build|implementation/.test(t))
    return `Block out ${fmtMins(mins)} of uninterrupted time. Code along — don't just watch.`
  if (/recap|wrap|conclusion|next/.test(t))
    return `Use this as a personal review. Try to summarise each section in your own words before watching.`
  return `Plan ~${fmtMins(mins)} for the ${lessonCount} lesson${lessonCount > 1 ? 's' : ''} in this section.`
}

function takeawaysFor(course: ICourse, sections: ISection[], lessons: ILesson[]): string[] {
  const out: string[] = []
  if (course.tags && course.tags.length > 0)
    out.push(`Hands-on practice with: ${course.tags.slice(0, 5).join(', ')}.`)
  if (course.level)
    out.push(`Calibrated for ${course.level} learners — pace yourself accordingly.`)
  const interesting = sections
    .map(s => s.title)
    .filter(t => !/^(intro|wrap-?up|welcome|getting started|recap)$/i.test(t.trim()))
    .slice(0, 3)
  for (const t of interesting) out.push(`How to work with ${t.toLowerCase()}.`)
  const breakdown = lessons.reduce<Record<string, number>>((acc, l) => {
    acc[l.type] = (acc[l.type] ?? 0) + 1; return acc
  }, {})
  const mix = Object.entries(breakdown).map(([type, n]) => `${n} ${type}${n > 1 ? 's' : ''}`).join(' + ')
  if (mix) out.push(`Mixed-format content: ${mix}.`)
  return out.slice(0, 6)
}

function inferDifficulty(course: ICourse): AINotes['difficulty'] {
  const allowed = ['beginner', 'intermediate', 'advanced'] as const
  if (course.level && (allowed as readonly string[]).includes(course.level))
    return course.level as typeof allowed[number]
  return 'mixed'
}

/* ── Main service ─────────────────────────────────────── */

export class AINotesService {
  private readonly courseRepo = new CourseRepository()

  async getForSlug(slug: string): Promise<AINotes> {
    const course = await this.courseRepo.findBySlug(slug)
    if (!course || course.status !== 'published') {
      throw new CourseError('COURSE_NOT_FOUND', 'Course not found.', 404)
    }
    const { sections, lessons } = await this.courseRepo.getOutline(course.id)
    return this.generate(course, sections, lessons)
  }

  /* ─── Dispatcher ────────────────────────────────── */
  private async generate(course: ICourse, sections: ISection[], lessons: ILesson[]): Promise<AINotes> {
    if (hasLLM()) {
      try {
        return await this.generateWithClaude(course, sections, lessons)
      } catch (err) {
        logger.warn({ err }, 'Claude AI notes generation failed — falling back to deterministic')
      }
    }
    return this.generateDeterministic(course, sections, lessons)
  }

  /* ─── Claude generation ─────────────────────────── */
  private async generateWithClaude(
    course:   ICourse,
    sections: ISection[],
    lessons:  ILesson[],
  ): Promise<AINotes> {
    const outline = sections
      .sort((a, b) => a.order - b.order)
      .map(s => {
        const inSection = lessons.filter(l => String(l.sectionId) === String(s._id))
        const mins = inSection.reduce((acc, l) => acc + (l.durationMins ?? 0), 0)
        return `- ${s.title} (${inSection.length} lessons, ${mins} min)`
      })
      .join('\n')

    const systemPrompt = `You are an expert educational content analyst. Generate structured study notes for an online course.
Return ONLY valid JSON matching this exact shape — no extra keys, no markdown fences:
{
  "summary": "2-3 sentence overview of what the student will learn",
  "keyTopics": ["topic1", "topic2", ...],
  "studyOrder": [
    { "title": "Section Title", "tip": "Actionable study tip for this section", "minutes": 30 }
  ],
  "keyTakeaways": ["takeaway1", "takeaway2", ...],
  "estimatedStudyTime": "e.g. 4 hours over 2 weeks",
  "difficulty": "beginner" | "intermediate" | "advanced" | "mixed"
}
Rules:
- keyTopics: 5–10 items
- studyOrder: one entry per section, minutes = total lesson minutes in that section
- keyTakeaways: 3–6 actionable items
- difficulty must be one of the four literal strings above`

    const userMessage = `Course: "${course.title}"
Level: ${course.level ?? 'not specified'}
Tags: ${(course.tags ?? []).join(', ') || 'none'}
Description: ${course.description ?? 'none'}
Total duration: ${fmtMins(course.durationMins ?? 0)}

Sections & lessons:
${outline}`

    const parsed = await callLLMJSON<Omit<AINotes, 'generatedAt' | 'generator'>>(
      systemPrompt,
      userMessage,
    )

    return {
      ...parsed,
      studyOrder: parsed.studyOrder ?? [],
      generatedAt: new Date().toISOString(),
      generator:   'ollama',
    }
  }

  /* ─── Deterministic fallback ─────────────────────── */
  private generateDeterministic(course: ICourse, sections: ISection[], lessons: ILesson[]): AINotes {
    const studyOrder = sections
      .sort((a, b) => a.order - b.order)
      .map(s => {
        const inSection = lessons.filter(l => String(l.sectionId) === String(s._id))
        const minutes   = inSection.reduce((acc, l) => acc + (l.durationMins ?? 0), 0)
        return { title: s.title, tip: studyTipFor(s.title, inSection.length, minutes), minutes }
      })

    const topics = new Set<string>()
    sections.forEach(s => topics.add(s.title))
    course.tags?.forEach(t => topics.add(t))
    const keyTopics = Array.from(topics).slice(0, 10)

    const desc = course.description?.trim()
    const summary = desc
      ? `${desc} You'll move through ${sections.length} sections and ${lessons.length} lessons (${fmtMins(course.durationMins ?? 0)} total).`
      : `${course.title} covers ${sections.length} sections (${lessons.length} lessons, ${fmtMins(course.durationMins ?? 0)} total).`

    return {
      summary,
      keyTopics,
      studyOrder,
      keyTakeaways:       takeawaysFor(course, sections, lessons),
      estimatedStudyTime: suggestPace(course.durationMins ?? 0),
      difficulty:         inferDifficulty(course),
      generatedAt:        new Date().toISOString(),
      generator:          'deterministic-v1',
    }
  }
}
