import { Types } from 'mongoose'
import { LiveClassRepository } from '@/repositories/liveClass.repository.ts'
import { CourseRepository } from '@/repositories/course.repository.ts'
import { EnrollmentRepository } from '@/repositories/enrollment.repository.ts'
import { sendLiveClassScheduled } from '@/services/email.service.ts'
import { logger } from '@/utils/logger.ts'
import { env } from '@/config/env.ts'
import { EnrollmentModel, type ILiveClass } from '@/models/schema.ts'

export class LiveClassError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'LiveClassError'
  }
}

export class LiveClassService {
  private readonly liveRepo   = new LiveClassRepository()
  private readonly courseRepo = new CourseRepository()
  private readonly enrollRepo = new EnrollmentRepository()

  /* Public list — slug-based for the course page */
  async listForCourseSlug(slug: string): Promise<ILiveClass[]> {
    const course = await this.courseRepo.findBySlug(slug)
    if (!course) throw new LiveClassError('COURSE_NOT_FOUND', 'Course not found', 404)
    return this.liveRepo.listForCourse(course.id)
  }

  async listForCourseId(courseId: string): Promise<ILiveClass[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new LiveClassError('INVALID_ID', 'Invalid course id', 400)
    }
    return this.liveRepo.listForCourse(courseId)
  }

  /* Personalised upcoming feed — what's coming up across my enrollments */
  async listUpcomingForUser(userId: string, limit = 5): Promise<ILiveClass[]> {
    const enrollments = await this.enrollRepo.listForUser(userId)
    const courseIds = enrollments
      .map(e => (typeof e.courseId === 'object' ? (e.courseId as { _id?: unknown })._id ?? null : e.courseId))
      .filter(Boolean) as Array<string | Types.ObjectId>
    return this.liveRepo.listUpcomingForCourses(courseIds, limit)
  }

  /* Admin/instructor create */
  async create(input: {
    courseId:       string
    instructorId:   string
    title:          string
    description?:   string
    scheduledStart: Date
    durationMins:   number
    meetingUrl:     string
  }): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(input.courseId)) {
      throw new LiveClassError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }
    const course = await this.courseRepo.findById(input.courseId)
    if (!course) throw new LiveClassError('COURSE_NOT_FOUND', 'Course not found', 404)

    const created = await this.liveRepo.createOne({
      courseId:       new Types.ObjectId(input.courseId),
      instructorId:   new Types.ObjectId(input.instructorId),
      title:          input.title.trim(),
      description:    input.description,
      scheduledStart: input.scheduledStart,
      durationMins:   input.durationMins,
      meetingUrl:     input.meetingUrl.trim(),
    } as Partial<ILiveClass>)

    /* Fire-and-forget notification to enrolled students */
    void this.#notifyEnrolledStudents(created, course.title, course.slug).catch(err =>
      logger.warn({ err, liveClassId: created.id }, 'live-class notification failed'),
    )

    return created
  }

  async update(id: string, input: Partial<{
    title:          string
    description:    string
    scheduledStart: Date
    durationMins:   number
    meetingUrl:     string
    cancelled:      boolean
  }>): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const updated = await this.liveRepo.updateByIdPopulated(id, input as Partial<ILiveClass>)
    if (!updated) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)
    return updated
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const ok = await this.liveRepo.hardDelete(id)
    if (!ok) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)
  }

  /* ─── Helpers ─────────────────────────────────────── */

  async #notifyEnrolledStudents(live: ILiveClass, courseTitle: string, courseSlug: string): Promise<void> {
    /* Cap notifications to first 200 to be polite for free-tier providers. */
    const enrolledStudents = await EnrollmentModel
      .find({ courseId: live.courseId, status: { $ne: 'dropped' } })
      .limit(200)
      .populate('userId', '_id email name isActive')
      .exec()

    const courseUrl = `${env.CLIENT_URL}/courses/${courseSlug}`

    /* Lazy import to avoid a circular import between live-class + notifications. */
    const { NotificationService } = await import('@/services/notification.service.ts')
    const notifications = new NotificationService()

    const whenLabel = live.scheduledStart.toLocaleString('en-US',
      { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

    for (const e of enrolledStudents) {
      const u = e.userId as unknown as {
        _id: { toString: () => string }
        email: string
        name: string
        isActive: boolean
      }
      if (!u?.email || u.isActive === false) continue

      /* In-app notification — always, even if email fails. */
      try {
        await notifications.create(u._id.toString(), {
          kind:  'live-class-scheduled',
          title: `Live class scheduled in ${courseTitle}`,
          body:  `"${live.title}" — ${whenLabel}`,
          link:  `/courses/${courseSlug}`,
        })
      } catch (err) {
        logger.warn({ err, userId: u._id.toString() }, 'live-class in-app notification failed')
      }

      /* Email blast — best effort. */
      try {
        await sendLiveClassScheduled(u.email, u.name, courseTitle, live.title, live.scheduledStart, courseUrl)
      } catch (err) {
        logger.warn({ err, email: u.email }, 'live-class email send failed')
      }
    }
  }
}
