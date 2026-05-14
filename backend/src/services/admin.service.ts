import { Types } from 'mongoose'
import {
  UserModel, CourseModel, EnrollmentModel, ReviewModel, OrderModel,
} from '@/models/schema.ts'

/* ─────────────────────────────────────────────────────
   AdminService — dashboard-level stats. Counts only;
   no PII surfaced.
───────────────────────────────────────────────────── */
export class AdminService {
  async getStats(): Promise<{
    totalCourses:     number
    publishedCourses: number
    draftCourses:     number
    totalStudents:    number
    totalInstructors: number
    totalEnrollments: number
    totalReviews:     number
    /* Actual revenue from completed Stripe payments (in dollars).
       Falls back to 0 until first paid order is processed. */
    revenueEstimate:  number
  }> {
    const [
      totalCourses, publishedCourses, draftCourses,
      totalStudents, totalInstructors,
      totalEnrollments, totalReviews,
      revenueAgg,
    ] = await Promise.all([
      CourseModel.countDocuments({}).exec(),
      CourseModel.countDocuments({ status: 'published' }).exec(),
      CourseModel.countDocuments({ status: 'draft' }).exec(),
      UserModel.countDocuments({ role: 'student' }).exec(),
      UserModel.countDocuments({ role: 'instructor' }).exec(),
      EnrollmentModel.countDocuments({}).exec(),
      ReviewModel.countDocuments({}).exec(),
      OrderModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).exec(),
    ])

    /* Amount is in cents → convert to dollars */
    const revenueCents = revenueAgg[0]?.total ?? 0

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalStudents,
      totalInstructors,
      totalEnrollments,
      totalReviews,
      revenueEstimate: Math.round(revenueCents) / 100,
    }
  }

  /* Daily enrollments for the last N days. Zero-fills missing days so
     the client gets a continuous series suitable for a chart. */
  async enrollmentsTimeseries(days: number): Promise<{ date: string; count: number }[]> {
    const since = new Date()
    since.setUTCHours(0, 0, 0, 0)
    since.setUTCDate(since.getUTCDate() - (days - 1))

    const rows = await EnrollmentModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          count: { $sum: 1 },
        },
      },
    ]).exec()

    const byDate = new Map<string, number>()
    for (const r of rows) byDate.set(r._id, r.count)

    const out: { date: string; count: number }[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setUTCDate(since.getUTCDate() + i)
      const key = d.toISOString().slice(0, 10)
      out.push({ date: key, count: byDate.get(key) ?? 0 })
    }
    return out
  }

  /* Highest-enrolled courses (regardless of status) with basic metadata. */
  async topCourses(limit: number): Promise<{
    id:            string
    title:         string
    slug:          string
    enrolledCount: number
    ratingAvg:     number
    thumbnailUrl?: string
  }[]> {
    const docs = await CourseModel
      .find({})
      .sort({ enrolledCount: -1 })
      .limit(limit)
      .select('title slug enrolledCount ratingAvg thumbnailUrl')
      .exec()
    return docs.map(d => ({
      id:            d.id,
      title:         d.title,
      slug:          d.slug,
      enrolledCount: d.enrolledCount ?? 0,
      ratingAvg:     d.ratingAvg ?? 0,
      thumbnailUrl:  d.thumbnailUrl,
    }))
  }

  /* Aggregate completion rate: completed / total enrollments.
     The model only stores 'active' | 'completed' | 'dropped'. */
  async completionStats(): Promise<{
    totalEnrollments: number
    completed:        number
    active:           number
    dropped:          number
    completionRate:   number
  }> {
    const rows = await EnrollmentModel.aggregate([
      {
        $group: {
          _id:   '$status',
          count: { $sum: 1 },
        },
      },
    ]).exec()

    let completed = 0, active = 0, dropped = 0
    for (const r of rows) {
      if (r._id === 'completed') completed = r.count
      if (r._id === 'active')    active    = r.count
      if (r._id === 'dropped')   dropped   = r.count
    }
    /* "Started" denominator excludes dropped enrollments. */
    const eligible = completed + active
    const completionRate = eligible > 0
      ? Math.round((completed / eligible) * 1000) / 10
      : 0
    return {
      totalEnrollments: completed + active + dropped,
      completed,
      active,
      dropped,
      completionRate,
    }
  }
}

/* Silence unused-import warning — `Types` is intentionally re-exported
   for future expansion if AdminService grows id-targeted queries. */
void Types
