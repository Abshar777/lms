import { Types } from 'mongoose'
import { LiveClassRepository } from '@/repositories/liveClass.repository.ts'
import { CourseRepository } from '@/repositories/course.repository.ts'
import { EnrollmentRepository } from '@/repositories/enrollment.repository.ts'
import { sendLiveClassScheduled } from '@/services/email.service.ts'
import * as muxSvc from '@/services/mux.service.ts'
import { logger } from '@/utils/logger.ts'
import { env } from '@/config/env.ts'
import { BatchModel, EnrollmentModel, LiveClassModel, type ILiveClass, type LiveClassType } from '@/models/schema.ts'

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

  /* ── Public list — slug-based for the course page ─── */
  /* Admin — list all live classes across all courses */
  async listAll(filter: { status?: string; limit?: number } = {}): Promise<ILiveClass[]> {
    return this.liveRepo.listAll(filter)
  }

  async getById(id: string): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const live = await this.liveRepo.findByIdPopulated(id)
    if (!live) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)

    /* When live, refresh viewer count from Mux monitoring API in the background.
       We fire-and-forget so the response is still fast — next poll gets updated count. */
    if (live.status === 'live' && live.type === 'internal' && env.MUX_TOKEN_ID) {
      void muxSvc.getLiveViewerCount().then(async count => {
        await LiveClassModel.updateOne({ _id: live._id }, { $set: { viewerCount: count } })
      }).catch(() => {/* non-fatal */})
    }

    return live
  }

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

  /* ── Personalised upcoming feed ──────────────────── */
  async listUpcomingForUser(userId: string, limit = 50): Promise<ILiveClass[]> {
    // 1. Course-based sessions (from enrollments)
    const enrollments = await this.enrollRepo.listForUser(userId)
    const courseIds = enrollments
      .map(e => (e.courseId && typeof e.courseId === 'object' ? (e.courseId as { _id?: unknown })._id ?? null : e.courseId))
      .filter(Boolean) as Array<string | Types.ObjectId>
    const courseSessions = courseIds.length > 0
      ? await this.liveRepo.listUpcomingForCourses(courseIds, limit)
      : []

    // 2. Batch-based sessions (from batch membership)
    const batches = await BatchModel.find({ studentIds: userId, status: 'active' }).select('_id').lean()
    const batchIds = batches.map(b => b._id)
    const batchSessions = batchIds.length > 0
      ? await this.liveRepo.listUpcomingForBatches(batchIds, limit)
      : []

    // 3. Merge, deduplicate by id, sort by scheduledStart
    const seen = new Set<string>()
    const merged: ILiveClass[] = []
    for (const s of [...batchSessions, ...courseSessions]) {
      const id = String((s as any)._id)
      if (!seen.has(id)) { seen.add(id); merged.push(s) }
    }
    merged.sort((a, b) =>
      new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    )
    return merged.slice(0, limit)
  }

  /* ── Admin/instructor create ──────────────────────── */
  async create(input: {
    courseId:        string
    instructorId:    string
    title:           string
    description?:    string
    scheduledStart:  Date
    durationMins:    number
    type:            LiveClassType
    meetingUrl?:     string
    batchId?:        string
    sessionCapacity?: number
  }): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(input.courseId)) {
      throw new LiveClassError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }
    const course = await this.courseRepo.findById(input.courseId)
    if (!course) throw new LiveClassError('COURSE_NOT_FOUND', 'Course not found', 404)

    /* Validate meetingUrl is provided for external type */
    if (input.type === 'external') {
      if (!input.meetingUrl?.trim()) {
        throw new LiveClassError('MEETING_URL_REQUIRED', 'meetingUrl is required for external live classes', 400)
      }
    }

    let muxData: { streamId: string; streamKey: string; playbackId: string } | null = null

    /* Create Mux stream for internal type */
    if (input.type === 'internal') {
      if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
        throw new LiveClassError(
          'MUX_NOT_CONFIGURED',
          'In-app streaming is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.',
          503,
        )
      }
      muxData = await muxSvc.createLiveStream()
    }

    const doc: Partial<ILiveClass> = {
      courseId:        new Types.ObjectId(input.courseId),
      instructorId:    new Types.ObjectId(input.instructorId),
      title:           input.title.trim(),
      description:     input.description,
      scheduledStart:  input.scheduledStart,
      durationMins:    input.durationMins,
      type:            input.type,
      status:          'scheduled',
      sessionCapacity: input.sessionCapacity ?? 30,
      bookedCount:     0,
    }

    if (input.batchId && Types.ObjectId.isValid(input.batchId)) {
      doc.batchId = new Types.ObjectId(input.batchId)
    }

    if (input.type === 'external') {
      doc.meetingUrl = input.meetingUrl!.trim()
    }

    if (muxData) {
      doc.muxLiveStreamId = muxData.streamId
      doc.muxStreamKey    = muxData.streamKey
      doc.muxPlaybackId   = muxData.playbackId
    }

    const created = await this.liveRepo.createOne(doc)

    /* Fire-and-forget notification to enrolled students */
    void this.#notifyEnrolledStudents(created, course.title, course.slug).catch(err =>
      logger.warn({ err, liveClassId: created.id }, 'live-class notification failed'),
    )

    return created
  }

  /* ── Start an internal stream (instructor going live) */
  async startStream(id: string): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const live = await this.liveRepo.findByIdPopulated(id)
    if (!live) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)
    if (live.type !== 'internal') {
      throw new LiveClassError('NOT_INTERNAL', 'Only internal (Mux) live classes can be started this way', 400)
    }
    if (live.status === 'live') {
      throw new LiveClassError('ALREADY_LIVE', 'Stream is already live', 400)
    }
    if (live.status === 'ended' || live.status === 'cancelled') {
      throw new LiveClassError('STREAM_ENDED', `Cannot start a stream with status "${live.status}"`, 400)
    }
    if (!live.muxLiveStreamId) {
      throw new LiveClassError('NO_STREAM_ID', 'No Mux stream ID found for this class', 500)
    }

    try {
      await muxSvc.enableLiveStream(live.muxLiveStreamId)
    } catch (err) {
      const msg = ((err as Error).message ?? '').toLowerCase()
      logger.error({ err, id }, 'mux: failed to enable live stream')

      if (msg.includes('disabled')) {
        /* Stream key was explicitly disabled — user must recreate */
        throw new LiveClassError(
          'MUX_ERROR',
          'Could not start the stream: stream key has been disabled, please recreate the class',
          502,
        )
      }

      /* Any other error (e.g. "stream is not in a disabled state" — stream is already
         idle/enabled after recreate): non-fatal. The stream is ready to receive RTMP. */
      logger.warn({ err, id }, 'mux: enableLiveStream non-fatal error — stream already idle, proceeding')
    }

    const updated = await this.liveRepo.updateByIdPopulated(id, {
      status:    'live',
      startedAt: new Date(),
    } as Partial<ILiveClass>)

    return updated!
  }

  /* ── End an internal stream ───────────────────────── */
  async endStream(id: string): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const live = await this.liveRepo.findByIdPopulated(id)
    if (!live) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)
    if (live.type !== 'internal') {
      throw new LiveClassError('NOT_INTERNAL', 'Only internal (Mux) live classes can be ended this way', 400)
    }
    if (live.status !== 'live' && live.status !== 'scheduled') {
      throw new LiveClassError('NOT_LIVE', `Stream is not live (current status: "${live.status}")`, 400)
    }
    if (!live.muxLiveStreamId) {
      throw new LiveClassError('NO_STREAM_ID', 'No Mux stream ID found for this class', 500)
    }

    await muxSvc.disableLiveStream(live.muxLiveStreamId)

    const updated = await this.liveRepo.updateByIdPopulated(id, {
      status:  'ended',
      endedAt: new Date(),
    } as Partial<ILiveClass>)

    return updated!
  }

  /* ── Stream credentials (admin only) ─────────────── */
  async getStreamCredentials(id: string): Promise<{ rtmpUrl: string; streamKey: string; playbackId: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    /* select:false field — must explicitly include muxStreamKey */
    const live = await LiveClassModel
      .findById(id)
      .select('+muxStreamKey')
      .exec()

    if (!live) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)
    if (live.type !== 'internal') {
      throw new LiveClassError('NOT_INTERNAL', 'No RTMP credentials for external live classes', 400)
    }
    if (!live.muxStreamKey || !live.muxPlaybackId) {
      throw new LiveClassError('NO_CREDENTIALS', 'Stream credentials not found', 500)
    }

    return {
      rtmpUrl:    muxSvc.MUX_RTMP_URL,
      streamKey:  live.muxStreamKey,
      playbackId: live.muxPlaybackId,
    }
  }

  /* ── Student watch access ─────────────────────────── */
  async getWatchAccess(id: string, userId: string): Promise<{
    type:          'external' | 'internal'
    title:         string
    status:        string
    meetingUrl?:   string
    playbackUrl?:  string
    recordingUrl?: string
    thumbnailUrl?: string
    viewerCount:   number
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const live = await this.liveRepo.findByIdPopulated(id)
    if (!live) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)

    /* Access gate: student must EITHER be enrolled in the course OR have a booking for this session */
    const rawCourseId = live.courseId as unknown
    const courseId =
      rawCourseId instanceof Types.ObjectId
        ? rawCourseId
        : (rawCourseId as { _id?: Types.ObjectId })?._id ?? String(rawCourseId)
    const enrollment = await this.enrollRepo.findByUserCourse(userId, courseId).catch(() => null)

    if (!enrollment) {
      /* Fall back: check for a batch booking (students can watch via booking even without enrollment) */
      const { ClassBookingModel } = await import('@/models/schema.ts')
      const booking = await ClassBookingModel.findOne({
        userId:      new Types.ObjectId(userId),
        liveClassId: new Types.ObjectId(id),
        status:      { $in: ['booked', 'attended'] },
      }).lean()
      if (!booking) {
        throw new LiveClassError('NOT_ENROLLED', 'You must be enrolled in this course or have a booking to watch', 403)
      }
    }

    if (live.status === 'cancelled') {
      throw new LiveClassError('SESSION_CANCELLED', 'This session was cancelled', 410)
    }

    if (live.type === 'external') {
      return {
        type:        'external',
        title:       live.title,
        status:      live.status,
        meetingUrl:  live.meetingUrl,
        viewerCount: 0,
      }
    }

    /* Internal (Mux) */
    return {
      type:        'internal',
      title:       live.title,
      status:      live.status,
      playbackUrl: live.muxPlaybackId
        ? muxSvc.buildPlaybackUrl(live.muxPlaybackId)
        : undefined,
      recordingUrl: live.recordingUrl ?? undefined,
      thumbnailUrl: live.muxPlaybackId
        ? muxSvc.buildThumbnailUrl(live.muxPlaybackId)
        : undefined,
      viewerCount: live.viewerCount ?? 0,
    }
  }

  /* ── Handle Mux webhook events ───────────────────── */
  async handleMuxWebhook(event: { type: string; data: Record<string, unknown> }): Promise<void> {
    const streamId = event.data['id'] as string | undefined

    switch (event.type) {

      /* Stream went live — update status idempotently + kick off viewer count fetch */
      case 'video.live_stream.active': {
        if (!streamId) return
        await LiveClassModel.updateOne(
          { muxLiveStreamId: streamId, status: { $in: ['scheduled', 'live'] } },
          { $set: { status: 'live', startedAt: new Date() } },
        )
        /* Kick off viewer count refresh */
        if (env.MUX_TOKEN_ID) {
          void muxSvc.getLiveViewerCount().then(count =>
            LiveClassModel.updateOne({ muxLiveStreamId: streamId }, { $set: { viewerCount: count } })
          ).catch(() => {})
        }
        logger.info({ streamId }, 'mux webhook: stream active')
        break
      }

      /* Stream went idle — instructor stopped streaming */
      case 'video.live_stream.idle': {
        if (!streamId) return
        await LiveClassModel.updateOne(
          { muxLiveStreamId: streamId, status: 'live' },
          { $set: { status: 'ended', endedAt: new Date() } },
        )
        logger.info({ streamId }, 'mux webhook: stream idle → ended')
        break
      }

      /* Stream disconnected — instructor dropped (within reconnect window, may reconnect) */
      case 'video.live_stream.disconnected': {
        /* Don't change status — Mux may reconnect within reconnect_window (60s).
           If it doesn't reconnect, video.live_stream.idle fires. */
        logger.info({ streamId }, 'mux webhook: stream disconnected (waiting for reconnect)')
        break
      }

      /* Recording asset is ready — save recording URL */
      case 'video.asset.ready': {
        const assetId    = event.data['id'] as string
        const liveStream = event.data['live_stream_id'] as string | undefined
        if (!liveStream) return

        const playbackIds = event.data['playback_ids'] as Array<{ id: string; policy: string }> | undefined
        const assetPlaybackId = playbackIds?.[0]?.id

        if (assetPlaybackId) {
          const recordingUrl = muxSvc.buildRecordingUrl(assetPlaybackId)
          await LiveClassModel.updateOne(
            { muxLiveStreamId: liveStream },
            { $set: { muxAssetId: assetId, recordingUrl } },
          )
          logger.info({ liveStream, assetId, recordingUrl }, 'mux webhook: recording ready')
        }
        break
      }

      default:
        logger.debug({ type: event.type }, 'mux webhook: unhandled event type')
    }
  }

  /* ── Recreate Mux stream (when key is disabled) ──── */
  async recreateStream(id: string): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const live = await this.liveRepo.findByIdPopulated(id)
    if (!live) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)
    if (live.type !== 'internal') {
      throw new LiveClassError('NOT_INTERNAL', 'Only internal (Mux) live classes have stream credentials', 400)
    }
    if (live.status === 'live') {
      throw new LiveClassError('ALREADY_LIVE', 'Cannot recreate credentials while stream is live', 400)
    }
    if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
      throw new LiveClassError('MUX_NOT_CONFIGURED', 'Mux credentials not configured', 503)
    }

    /* Best-effort delete old stream — non-fatal if already gone on Mux's side */
    if (live.muxLiveStreamId) {
      await muxSvc.deleteLiveStream(live.muxLiveStreamId)
    }

    /* Create a fresh Mux live stream */
    const muxData = await muxSvc.createLiveStream()

    const updated = await this.liveRepo.updateByIdPopulated(id, {
      muxLiveStreamId: muxData.streamId,
      muxStreamKey:    muxData.streamKey,
      muxPlaybackId:   muxData.playbackId,
      status:          'scheduled',
      startedAt:       undefined,
      endedAt:         undefined,
      viewerCount:     0,
    } as unknown as Partial<ILiveClass>)

    if (!updated) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)

    logger.info({ id, newStreamId: muxData.streamId }, 'live-class: stream recreated')
    return updated
  }

  /* ── Update ──────────────────────────────────────── */
  async update(id: string, input: Partial<{
    title:           string
    description:     string
    scheduledStart:  Date
    durationMins:    number
    meetingUrl:      string
    status:          'scheduled' | 'live' | 'ended' | 'cancelled'
    batchId:         string | null
    sessionCapacity: number
    mentorNotes:     string
  }>): Promise<ILiveClass> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const updated = await this.liveRepo.updateByIdPopulated(id, input as Partial<ILiveClass>)
    if (!updated) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)
    return updated
  }

  /* ── Delete ──────────────────────────────────────── */
  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new LiveClassError('INVALID_ID', 'Invalid id', 400)
    }
    const live = await this.liveRepo.findByIdPopulated(id)
    if (!live) throw new LiveClassError('LIVE_CLASS_NOT_FOUND', 'Live class not found', 404)

    /* Cleanup Mux stream if internal */
    if (live.type === 'internal' && live.muxLiveStreamId) {
      await muxSvc.deleteLiveStream(live.muxLiveStreamId)
    }

    await this.liveRepo.hardDelete(id)
  }

  /* ── Helpers ─────────────────────────────────────── */
  async #notifyEnrolledStudents(live: ILiveClass, courseTitle: string, courseSlug: string): Promise<void> {
    const enrolledStudents = await EnrollmentModel
      .find({ courseId: live.courseId, status: { $ne: 'dropped' } })
      .limit(200)
      .populate('userId', '_id email name isActive')
      .exec()

    const courseUrl = `${env.CLIENT_URL}/courses/${courseSlug}`

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

      try {
        await notifications.create(u._id.toString(), {
          kind:  'live-class-scheduled',
          title: `Live class scheduled in ${courseTitle}`,
          body:  `"${live.title}" — ${whenLabel}`,
          link:  `/live-classes/${live.id}/watch`,
        })
      } catch (err) {
        logger.warn({ err, userId: u._id.toString() }, 'live-class in-app notification failed')
      }

      try {
        await sendLiveClassScheduled(u.email, u.name, courseTitle, live.title, live.scheduledStart, courseUrl)
      } catch (err) {
        logger.warn({ err, email: u.email }, 'live-class email send failed')
      }
    }
  }
}
