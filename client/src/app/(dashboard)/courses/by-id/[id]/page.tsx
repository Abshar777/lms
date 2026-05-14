import { notFound, redirect } from 'next/navigation'

/* ─────────────────────────────────────────────────────
   /courses/by-id/[id]
   ─────────────────────────────────────────────────────
   Looks up a course by its MongoDB ObjectId via the public
   GET /api/v1/courses/by-id/:id endpoint, then performs a
   server-side redirect to the canonical slug URL.

   Why: admin links, enrollment payloads, and many
   foreign-key references carry the course's id rather than
   its slug. Rather than duplicate the entire detail page,
   we resolve id → slug here and bounce the user to the
   one canonical URL. Renders nothing on success — the
   browser follows the 307 redirect Next emits.
───────────────────────────────────────────────────── */

function resolveApiBase(): string {
  const fallback = 'http://localhost:4000'
  const raw = process.env.NEXT_PUBLIC_API_URL
    ?? process.env.NEXT_PUBLIC_API_BASE_URL
    ?? fallback
  /* Strip stray quotes / trailing slashes that creep into .env files. */
  let v = raw.trim().replace(/^["']/, '').replace(/["']$/, '').replace(/\/+$/, '')
  /* If a full base ending in /api/v1 was provided, strip it so the
     /api/v1 path below isn't doubled up. */
  v = v.replace(/\/api\/v1$/, '')
  return v || fallback
}

interface ApiResponse {
  success: true
  data: { course: { id: string; slug: string } }
}

export default async function CourseByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  /* Cheap guard: ObjectId is 24 hex chars. Anything else won't match. */
  if (!/^[a-fA-F0-9]{24}$/.test(id)) notFound()

  const base = resolveApiBase()
  let json: ApiResponse | null = null

  try {
    const res = await fetch(`${base}/api/v1/courses/by-id/${id}`, { cache: 'no-store' })
    if (res.status === 404) notFound()
    if (!res.ok) {
      /* eslint-disable-next-line no-console */
      console.error('by-id lookup failed', res.status, await res.text().catch(() => ''))
      notFound()
    }
    json = (await res.json()) as ApiResponse
  } catch (err) {
    /* eslint-disable-next-line no-console */
    console.error('by-id lookup error', err)
    notFound()
  }

  redirect(`/courses/${json.data.course.slug}`)
}
