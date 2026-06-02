import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { LiveClassModel, type ILiveClass } from '@/models/schema.ts'
import { resolveLiveStatus, LIVE_LEAD_MS, LIVE_GRACE_MS } from '@/utils/liveStatus.ts'

export class LiveClassRepository extends BaseRepository<ILiveClass> {
  constructor() {
    super(LiveClassModel)
  }

  async listForCourse(courseId: string | Types.ObjectId): Promise<ILiveClass[]> {
    return LiveClassModel
      .find({ courseId })
      .sort({ scheduledStart: 1 })
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }

  /* Upcoming sessions in a set of courses (used for "my upcoming" feed) */
  async listUpcomingForCourses(courseIds: Array<string | Types.ObjectId>, limit = 10): Promise<ILiveClass[]> {
    if (courseIds.length === 0) return []
    return LiveClassModel
      .find({
        courseId: { $in: courseIds },
        status:   { $in: ['scheduled', 'live'] },          // exclude ended/cancelled
        scheduledStart: { $gte: new Date(Date.now() - 60 * 60_000) }, // include sessions starting in the last hour
      })
      .sort({ scheduledStart: 1 })
      .limit(limit)
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }

  /* All upcoming/live sessions across every course — no enrollment filter */
  async listAllUpcoming(limit = 50): Promise<ILiveClass[]> {
    return LiveClassModel
      .find({
        status: { $in: ['scheduled', 'live'] },
        scheduledStart: { $gte: new Date(Date.now() - 60 * 60_000) },
      })
      .sort({ scheduledStart: 1 })
      .limit(limit)
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }

  /* Admin global list — all live classes across all courses.
   *
   * A 'scheduled' session is bucketed by the clock (see utils/liveStatus.ts):
   *   - LIVE    while within [start - 30m, start + 15m]  (the 45-min window)
   *   - ENDED   once > 15m past start
   *   - UPCOMING until 30m before start
   * The returned `status` reflects this so tabs, counts, and badges all agree.
   * We do NOT mutate the DB, so internal (Mux) sessions can still be started
   * late or rescheduled. */
  async listAll(filter: {
    status?: string
    limit?:  number
  } = {}): Promise<ILiveClass[]> {
    const now      = Date.now()
    const liveFrom = new Date(now - LIVE_GRACE_MS)  // start ≥ this → not yet past the 15-min grace
    const liveTo   = new Date(now + LIVE_LEAD_MS)   // start ≤ this → live window has opened (30 min ahead)
    const query: Record<string, unknown> = {}

    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'live') {
        query['$or'] = [
          { status: 'live' },
          { status: 'scheduled', scheduledStart: { $gte: liveFrom, $lte: liveTo } },
        ]
      } else if (filter.status === 'scheduled') {
        // "Upcoming" = scheduled and the live window hasn't opened yet
        query['status'] = 'scheduled'
        query['scheduledStart'] = { $gt: liveTo }
      } else if (filter.status === 'ended') {
        query['$or'] = [
          { status: 'ended' },
          { status: 'scheduled', scheduledStart: { $lt: liveFrom } },
        ]
      } else {
        query['status'] = filter.status   // 'cancelled'
      }
    }

    const docs = await LiveClassModel
      .find(query)
      .sort({ scheduledStart: -1 })   // newest first
      .limit(filter.limit ?? 100)
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()

    // Reflect the effective (clock-based) status. Not persisted.
    for (const d of docs) {
      d.status = resolveLiveStatus(d.status, d.scheduledStart, now) as ILiveClass['status']
    }
    return docs
  }

  async createOne(data: Partial<ILiveClass>): Promise<ILiveClass> {
    const created = await LiveClassModel.create(data)
    return (await this.findByIdPopulated(created.id)) as ILiveClass
  }

  async findByIdPopulated(id: string): Promise<ILiveClass | null> {
    return LiveClassModel
      .findById(id)
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }

  async updateByIdPopulated(id: string, data: Partial<ILiveClass>): Promise<ILiveClass | null> {
    return LiveClassModel
      .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }
}
