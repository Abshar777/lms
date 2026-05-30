import { Router } from 'express'
import { z } from 'zod'
import { AdminController } from '@/controllers/admin.controller.ts'
import { LiveClassController } from '@/controllers/liveClass.controller.ts'
import { authenticate, requireRole, requireAdmin } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { QuizService } from '@/services/quiz.service.ts'
import { AssignmentService } from '@/services/assignment.service.ts'
import { SectionService } from '@/services/section.service.ts'
import { OrderService } from '@/services/order.service.ts'
import { CouponService } from '@/services/coupon.service.ts'
import { UserService } from '@/services/user.service.ts'
import { sendSuccess, buildPaginationMeta, parsePagination } from '@/utils/response.ts'
import { audit } from '@/middleware/audit.middleware.ts'
import type { Request, Response, NextFunction } from 'express'

const router     = Router()
const ctrl       = new AdminController()
const live       = new LiveClassController()
const quizSvc    = new QuizService()
const assignSvc  = new AssignmentService()
const sectionSvc = new SectionService()
const orderSvc   = new OrderService()
const couponSvc  = new CouponService()
const userSvc    = new UserService()

/* Admin routes are open to admins and instructors. Per-resource
   ownership checks inside the controllers reject instructors who
   try to mutate courses they don't own. */
router.use(authenticate, requireRole('admin', 'instructor'))

/* ─── Schemas ─────────────────────────────────────── */
const courseCreateSchema = z.object({
  title:        z.string().min(3).max(255).trim(),
  slug:         z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  description:  z.string().min(20).optional(),
  thumbnailUrl: z.string().url().or(z.literal('')).optional(),
  previewUrl:   z.string().url().or(z.literal('')).optional(),
  price:        z.coerce.number().min(0),
  isFree:       z.boolean(),
  status:       z.enum(['draft', 'published', 'archived']),
  level:        z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language:     z.string().min(1).default('English'),
  tags:         z.union([z.string(), z.array(z.string())]).optional(),
  categoryId:   z.string().optional(),
  instructorId: z.string().optional(),
})

const courseUpdateSchema = courseCreateSchema.partial().extend({
  /* On update, level may be cleared with empty string */
  level: z.enum(['beginner', 'intermediate', 'advanced', '']).optional(),
})

const categoryCreateSchema = z.object({
  name:        z.string().min(2).max(100).trim(),
  slug:        z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  icon:        z.string().max(40).optional(),
})

const categoryUpdateSchema = categoryCreateSchema.partial()

const usersQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  role:     z.enum(['student', 'instructor', 'admin']).default('student'),
  search:   z.string().trim().optional(),
})

/* ─── Dashboard (admin-only) ─────────────────────── */
router.get('/stats',                       requireAdmin, ctrl.stats)
router.get('/analytics/enrollments',       requireAdmin, ctrl.enrollmentsTimeseries)
router.get('/analytics/top-courses',       requireAdmin, ctrl.topCourses)
router.get('/analytics/completion',        requireAdmin, ctrl.completionStats)

/* ─── Bulk course operations (8.12) ──────────────── */
const bulkSchema = z.object({
  ids:    z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['publish', 'archive', 'delete']),
})
router.post(
  '/courses/bulk',
  requireAdmin,
  validate(bulkSchema),
  audit('bulk.publish', 'Course', undefined, r => ({ action: r.body.action, ids: r.body.ids })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids, action } = req.body as z.infer<typeof bulkSchema>
      const CourseModel = (await import('@/models/schema.ts')).CourseModel
      const { Types } = await import('mongoose')
      const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id))
      if (objectIds.length === 0) { sendSuccess(res, { affected: 0 }); return }

      if (action === 'delete') {
        await CourseModel.deleteMany({ _id: { $in: objectIds } })
      } else {
        const status = action === 'publish' ? 'published' : 'archived'
        await CourseModel.updateMany({ _id: { $in: objectIds } }, { $set: { status } })
      }
      sendSuccess(res, { affected: objectIds.length })
    } catch (err) { next(err) }
  },
)

/* ─── Courses ─────────────────────────────────────── */
router.get   ('/courses',        ctrl.listCourses)
router.get   ('/courses/:id',    ctrl.getCourse)
router.post  ('/courses',        validate(courseCreateSchema), audit('course.create', 'Course'), ctrl.createCourse)
router.patch ('/courses/:id',    validate(courseUpdateSchema), audit('course.update', 'Course', r => String(r.params['id'] ?? '')), ctrl.updateCourse)
router.delete('/courses/:id',    audit('course.delete', 'Course', r => String(r.params['id'] ?? '')), ctrl.deleteCourse)

/* ─── Categories (admin-only writes) ──────────────── */
router.get   ('/categories',     ctrl.listCategories)
router.post  ('/categories',     requireAdmin, validate(categoryCreateSchema), audit('category.create', 'Category'), ctrl.createCategory)
router.patch ('/categories/:id', requireAdmin, validate(categoryUpdateSchema), audit('category.update', 'Category', r => String(r.params['id'] ?? '')), ctrl.updateCategory)
router.delete('/categories/:id', requireAdmin, audit('category.delete', 'Category', r => String(r.params['id'] ?? '')), ctrl.deleteCategory)

/* ─── Users (admin-only) ──────────────────────────── */
const userUpdateSchema = z.object({
  role:       z.enum(['student', 'instructor', 'admin']).optional(),
  isActive:   z.boolean().optional(),
  isVerified: z.boolean().optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Provide at least one field' })

const userCreateSchema = z.object({
  name:      z.string().min(2).max(100).trim(),
  email:     z.string().email(),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  role:      z.enum(['student', 'instructor', 'admin']).default('instructor'),
  bio:       z.string().max(2000).optional(),
  headline:  z.string().max(255).optional(),
  courses:   z.array(z.object({
    courseId:       z.string().min(1),
    blockedLessons: z.array(z.string()).default([]),
  })).optional(),
})

router.get  ('/users',          requireAdmin, validate(usersQuerySchema, 'query'), ctrl.listUsers)
/* Admins can create any role; instructors can only create students. */
router.post ('/users',          validate(userCreateSchema), audit('user.create', 'User'),
  async (req, res, next) => {
    const role = req.user!.role
    const targetRole = (req.body as { role?: string }).role ?? 'instructor'
    if (role === 'instructor' && targetRole !== 'student') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Instructors can only create student accounts.' } })
      return
    }
    next()
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      /* Build DTO without the courses field (handled separately) */
      const { courses, ...userDto } = req.body as z.infer<typeof userCreateSchema>
      const user = await userSvc.adminCreateUser(userDto)

      /* Enroll the new student into the requested courses */
      if (courses && courses.length > 0) {
        const { EnrollmentModel } = await import('@/models/schema.ts')
        const { Types } = await import('mongoose')
        await Promise.all(
          courses.map(async (c: { courseId: string; blockedLessons: string[] }) => {
            try {
              const blockedObjectIds = (c.blockedLessons ?? [])
                .filter((id: string) => Types.ObjectId.isValid(id))
                .map((id: string) => new Types.ObjectId(id))
              await EnrollmentModel.create({
                userId:         new Types.ObjectId(user.id),
                courseId:       new Types.ObjectId(c.courseId),
                blockedLessons: blockedObjectIds,
              })
            } catch (_) { /* skip duplicate enrollments silently */ }
          })
        )
      }

      sendSuccess(res, user, 'User created', 201)
    } catch (err) { next(err) }
  },
)
router.patch('/users/:id',      requireAdmin, validate(userUpdateSchema), audit('user.roleChange', 'User', r => String(r.params['id'] ?? '')), ctrl.updateUser)

/* ─── Reviews (admin-only) ────────────────────────── */
router.get   ('/reviews',     requireAdmin, ctrl.listReviews)
router.delete('/reviews/:id', requireAdmin, audit('review.delete', 'Review', r => String(r.params['id'] ?? '')), ctrl.deleteReview)

/* ─── Sections + Lessons (admin + own-course instructor) ─── */
const sectionCreateSchema = z.object({
  title:       z.string().min(1).max(255).trim(),
  description: z.string().max(1000).optional(),
})
const sectionUpdateSchema = z.object({
  title:       z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).optional(),
  order:       z.coerce.number().int().min(0).optional(),
})
const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

const lessonCreateSchema = z.object({
  sectionId:    z.string().min(1),
  title:        z.string().min(1).max(255).trim(),
  type:         z.enum(['video', 'article', 'quiz']).optional(),
  contentUrl:   z.string().url().or(z.literal('')).optional(),
  contentBody:  z.string().max(20000).optional(),
  durationMins: z.coerce.number().int().min(0).max(60 * 60).optional(),
  isFree:       z.boolean().optional(),
})
const lessonUpdateSchema = lessonCreateSchema
  .omit({ sectionId: true })
  .partial()
  .extend({ order: z.coerce.number().int().min(0).optional() })
const lessonMoveSchema = z.object({
  sectionId: z.string().min(1),
})

router.get   ('/courses/:id/outline',                     ctrl.getOutline)
router.get   ('/courses/:courseId/sections',              ctrl.listSections)
router.post  ('/courses/:courseId/sections',              validate(sectionCreateSchema),  ctrl.createSection)
router.patch ('/sections/:id',                            validate(sectionUpdateSchema),  ctrl.updateSection)
router.delete('/sections/:id',                            ctrl.deleteSection)
router.put   ('/courses/:courseId/sections/reorder',      validate(reorderSchema),        ctrl.reorderSections)

router.post  ('/lessons',                                 validate(lessonCreateSchema),   ctrl.createLesson)
router.patch ('/lessons/:id',                             validate(lessonUpdateSchema),   ctrl.updateLesson)
router.delete('/lessons/:id',                             ctrl.deleteLesson)
router.post  ('/lessons/:id/move',                        validate(lessonMoveSchema),     ctrl.moveLesson)
router.put   ('/sections/:sectionId/lessons/reorder',     validate(reorderSchema),        ctrl.reorderLessons)

/* ─── Live classes ────────────────────────────────── */
const liveCreateSchema = z.object({
  courseId:        z.string().min(1),
  title:           z.string().min(3).max(255).trim(),
  description:     z.string().max(2000).optional(),
  scheduledStart:  z.string().datetime().or(z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date')),
  durationMins:    z.coerce.number().int().min(5).max(600),
  type:            z.enum(['external', 'internal']).default('external'),
  meetingUrl:      z.string().url().max(2048).optional(),
  instructorId:    z.string().optional(),
  batchId:         z.string().optional(),
  sessionCapacity: z.coerce.number().int().min(1).max(500).optional(),
}).refine(
  data => data.type === 'internal' || !!data.meetingUrl,
  { message: 'meetingUrl is required for external live classes', path: ['meetingUrl'] },
)
const liveUpdateSchema = z.object({
  title:           z.string().min(3).max(255).trim().optional(),
  description:     z.string().max(2000).optional(),
  scheduledStart:  z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date').optional(),
  durationMins:    z.coerce.number().int().min(5).max(600).optional(),
  meetingUrl:      z.string().url().max(2048).optional(),
  status:          z.enum(['scheduled', 'live', 'ended', 'cancelled']).optional(),
  batchId:         z.string().optional().nullable(),
  sessionCapacity: z.coerce.number().int().min(1).max(500).optional(),
  mentorNotes:     z.string().max(5000).optional(),
})

router.get   ('/courses/:courseId/live-classes',          live.adminListForCourse)
router.get   ('/live-classes',                            live.adminListAll)
router.get   ('/live-classes/:id',                        live.adminGetById)
router.post  ('/live-classes',                            validate(liveCreateSchema), live.adminCreate)
router.patch ('/live-classes/:id',                        validate(liveUpdateSchema), live.adminUpdate)
router.delete('/live-classes/:id',                        live.adminDelete)
router.post  ('/live-classes/:id/start',                  live.adminStart)
router.post  ('/live-classes/:id/end',                    live.adminEnd)
router.post  ('/live-classes/:id/recreate',               live.adminRecreate)
router.get   ('/live-classes/:id/stream-credentials',     live.adminGetStreamCredentials)

/* ─── Quiz management (admin + own-course instructor) ─── */
const quizUpsertSchema = z.object({
  passPercent: z.coerce.number().int().min(0).max(100).optional(),
  timeLimit:   z.coerce.number().int().min(1).optional(),
  questions:   z.array(z.object({
    text:          z.string().min(1).max(2000).trim(),
    type:          z.enum(['mcq', 'true_false', 'short']),
    choices:       z.array(z.string().max(500)).default([]),
    correctAnswer: z.string().min(1),
    points:        z.coerce.number().int().min(1).optional(),
    explanation:   z.string().max(2000).optional(),
  })).min(1),
})

const assignUpsertSchema = z.object({
  title:        z.string().min(1).max(255).trim(),
  instructions: z.string().min(1).max(20000),
  dueDate:      z.string().datetime().optional(),
  maxScore:     z.coerce.number().int().min(1).optional(),
})

const gradeSchema = z.object({
  grade:    z.coerce.number().min(0),
  feedback: z.string().max(5000).optional(),
})

/* GET quiz for a lesson */
router.get('/lessons/:lessonId/quiz', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params['lessonId'] ?? '')
    await sectionSvc.assertLessonEditable(lessonId, req.user!.id, req.user!.role)
    const quiz = await quizSvc.getByLesson(lessonId)
    sendSuccess(res, quiz ?? null)
  } catch (err) { next(err) }
})

/* PUT (upsert) quiz for a lesson */
router.put('/lessons/:lessonId/quiz', validate(quizUpsertSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params['lessonId'] ?? '')
    await sectionSvc.assertLessonEditable(lessonId, req.user!.id, req.user!.role)
    const quiz = await quizSvc.upsert(lessonId, req.body)
    sendSuccess(res, quiz, 'Quiz saved', 200)
  } catch (err) { next(err) }
})

/* DELETE quiz for a lesson */
router.delete('/lessons/:lessonId/quiz', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params['lessonId'] ?? '')
    await sectionSvc.assertLessonEditable(lessonId, req.user!.id, req.user!.role)
    await quizSvc.deleteByLesson(lessonId)
    sendSuccess(res, null, 'Quiz deleted')
  } catch (err) { next(err) }
})

/* Quiz analytics per course */
router.get('/courses/:courseId/quiz-analytics', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params['courseId'] ?? '')
    const data = await quizSvc.analyticsForCourse(courseId)
    sendSuccess(res, data)
  } catch (err) { next(err) }
})

/* ─── Assignment management ────────────────────────── */
router.get('/lessons/:lessonId/assignment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params['lessonId'] ?? '')
    await sectionSvc.assertLessonEditable(lessonId, req.user!.id, req.user!.role)
    const assignment = await assignSvc.getByLesson(lessonId)
    sendSuccess(res, assignment ?? null)
  } catch (err) { next(err) }
})

router.put('/lessons/:lessonId/assignment', validate(assignUpsertSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params['lessonId'] ?? '')
    await sectionSvc.assertLessonEditable(lessonId, req.user!.id, req.user!.role)
    const assignment = await assignSvc.upsert(lessonId, {
      ...req.body,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    })
    sendSuccess(res, assignment, 'Assignment saved', 200)
  } catch (err) { next(err) }
})

/* List submissions for grading */
router.get('/lessons/:lessonId/assignment/submissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params['lessonId'] ?? '')
    await sectionSvc.assertLessonEditable(lessonId, req.user!.id, req.user!.role)
    const submissions = await assignSvc.listSubmissions(lessonId)
    sendSuccess(res, submissions)
  } catch (err) { next(err) }
})

/* Grade a submission */
router.patch('/submissions/:id/grade', validate(gradeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submission = await assignSvc.grade(
      String(req.params['id'] ?? ''),
      req.user!.id,
      req.body as { grade: number; feedback?: string },
    )
    sendSuccess(res, submission, 'Submission graded')
  } catch (err) { next(err) }
})

/* ─── Revenue analytics (admin-only) ──────────────── */
const revenueQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
})

router.get('/analytics/revenue', requireAdmin, validate(revenueQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query['days'] ?? 30)
    const series = await orderSvc.revenueTimeseries(days)
    sendSuccess(res, series)
  } catch (err) { next(err) }
})

/* ─── Orders (admin-only) ──────────────────────────── */
const ordersQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['pending', 'paid', 'refunded', 'all']).default('all'),
})

router.get('/orders', requireAdmin, validate(ordersQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, per_page, status } = req.query as any
    const { docs, totalCount } = await orderSvc.adminList(
      Number(page ?? 1), Number(per_page ?? 20), String(status ?? 'all'),
    )
    sendSuccess(res, docs, undefined, 200, buildPaginationMeta(totalCount, Number(page ?? 1), Number(per_page ?? 20)))
  } catch (err) { next(err) }
})

router.post('/orders/:id/refund', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await orderSvc.refund(String(req.params['id'] ?? ''))
    sendSuccess(res, null, 'Order refunded')
  } catch (err) { next(err) }
})

/* ─── Coupons (admin-only) ──────────────────────────── */
const couponCreateSchema = z.object({
  code:          z.string().min(2).max(50).trim(),
  discountType:  z.enum(['percent', 'fixed']),
  discountValue: z.coerce.number().positive(),
  maxUses:       z.coerce.number().int().min(0).default(0),
  expiresAt:     z.string().datetime().optional(),
  appliesTo:     z.array(z.string()).default([]),
})
const couponUpdateSchema = couponCreateSchema.partial().extend({
  isActive:  z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

router.get('/coupons', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
    const { docs, totalCount } = await couponSvc.list(page, per_page)
    sendSuccess(res, docs, undefined, 200, buildPaginationMeta(totalCount, page, per_page))
  } catch (err) { next(err) }
})

router.post('/coupons', requireAdmin, validate(couponCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponSvc.create(req.body)
    sendSuccess(res, coupon, 'Coupon created', 201)
  } catch (err) { next(err) }
})

router.patch('/coupons/:id', requireAdmin, validate(couponUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponSvc.update(String(req.params['id'] ?? ''), req.body)
    sendSuccess(res, coupon, 'Coupon updated')
  } catch (err) { next(err) }
})

router.delete('/coupons/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await couponSvc.remove(String(req.params['id'] ?? ''))
    sendSuccess(res, null, 'Coupon deleted')
  } catch (err) { next(err) }
})

/* Validate a coupon code (student-facing, no auth required — just info) */
router.get('/coupons/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code     = String(req.query['code']     ?? '')
    const courseId = String(req.query['courseId'] ?? '')
    const coupon   = await couponSvc.validate(code, courseId)
    /* Return only non-sensitive fields */
    sendSuccess(res, {
      code:          coupon.code,
      discountType:  coupon.discountType,
      discountValue: coupon.discountValue,
    })
  } catch (err) { next(err) }
})

/* ─── Batches ─────────────────────────────────────── */
const batchCreateSchema = z.object({
  name:        z.string().min(2).max(120).trim(),
  description: z.string().max(2000).optional().default(''),
  mentorId:    z.string().min(1),
  studentIds:  z.array(z.string()).optional().default([]),
  courseId:    z.string().optional(),
  maxStudents: z.coerce.number().int().min(1).max(500).optional().default(30),
  status:      z.enum(['active', 'archived']).optional().default('active'),
})

const batchUpdateSchema = batchCreateSchema.partial()

const batchQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['active', 'archived', 'all']).optional().default('all'),
  mentorId: z.string().optional(),
  search:   z.string().trim().optional(),
})

/* Admin-only: full CRUD. Instructors: read own batches only. */
router.get('/batches', validate(batchQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const { page, per_page, status, mentorId, search } = req.query as any
    const isInstructor = req.user!.role === 'instructor'

    const filter: Record<string, any> = {}
    if (isInstructor) {
      /* Instructors only see their own batches */
      filter['mentorId'] = new Types.ObjectId(req.user!.id)
    } else {
      /* Admin can filter by mentor */
      if (mentorId && Types.ObjectId.isValid(mentorId)) filter['mentorId'] = new Types.ObjectId(mentorId)
    }
    if (status && status !== 'all') filter['status'] = status
    if (search) filter['name'] = { $regex: search, $options: 'i' }

    const skip  = (Number(page) - 1) * Number(per_page)
    const [docs, totalCount] = await Promise.all([
      BatchModel.find(filter)
        .populate('mentorId', 'id name email avatarUrl')
        .populate('courseId', 'id title slug thumbnailUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(per_page))
        .lean({ virtuals: true }),
      BatchModel.countDocuments(filter),
    ])
    const withId = (d: any) => ({ ...d, id: d.id ?? String(d._id) })
    sendSuccess(res, docs.map(withId), undefined, 200, buildPaginationMeta(totalCount, Number(page), Number(per_page)))
  } catch (err) { next(err) }
})

router.get('/batches/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const id = String(req.params['id'] ?? '')
    if (!Types.ObjectId.isValid(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid batch id' } }); return }

    const batch = await BatchModel.findById(id)
      .populate('mentorId', 'id name email avatarUrl')
      .populate('studentIds', 'id name email avatarUrl')
      .populate('courseId', 'id title slug thumbnailUrl')
      .lean({ virtuals: true })

    if (!batch) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Batch not found' } }); return }

    /* Instructors can only view their own batches */
    if (req.user!.role === 'instructor' && batch.mentorId?.toString() !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }); return
    }
    sendSuccess(res, { ...(batch as any), id: (batch as any).id ?? String((batch as any)._id) })
  } catch (err) { next(err) }
})

router.post('/batches', requireAdmin, validate(batchCreateSchema), audit('batch.create', 'Batch'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const body = req.body as z.infer<typeof batchCreateSchema>
    const batch = await BatchModel.create({
      name:        body.name,
      description: body.description,
      mentorId:    new Types.ObjectId(body.mentorId),
      studentIds:  (body.studentIds ?? []).filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id)),
      courseId:    body.courseId && Types.ObjectId.isValid(body.courseId) ? new Types.ObjectId(body.courseId) : undefined,
      maxStudents: body.maxStudents,
      status:      body.status,
    })
    const populated = await BatchModel.findById(batch._id)
      .populate('mentorId', 'id name email avatarUrl')
      .populate('courseId', 'id title slug thumbnailUrl')
      .lean({ virtuals: true })
    const p = populated as any
    sendSuccess(res, { ...p, id: p?.id ?? String(p?._id) }, 'Batch created', 201)
  } catch (err) { next(err) }
})

router.patch('/batches/:id', requireAdmin, validate(batchUpdateSchema), audit('batch.update', 'Batch', r => String(r.params['id'] ?? '')), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const id   = String(req.params['id'] ?? '')
    const body = req.body as z.infer<typeof batchUpdateSchema>
    if (!Types.ObjectId.isValid(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid batch id' } }); return }

    const update: Record<string, any> = {}
    if (body.name        !== undefined) update['name']        = body.name
    if (body.description !== undefined) update['description'] = body.description
    if (body.maxStudents !== undefined) update['maxStudents'] = body.maxStudents
    if (body.status      !== undefined) update['status']      = body.status
    if (body.mentorId    !== undefined && Types.ObjectId.isValid(body.mentorId)) update['mentorId'] = new Types.ObjectId(body.mentorId)
    if (body.courseId    !== undefined) update['courseId'] = body.courseId && Types.ObjectId.isValid(body.courseId) ? new Types.ObjectId(body.courseId) : null

    const batch = await BatchModel.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('mentorId', 'id name email avatarUrl')
      .populate('courseId', 'id title slug thumbnailUrl')
      .lean({ virtuals: true })
    if (!batch) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Batch not found' } }); return }
    sendSuccess(res, { ...(batch as any), id: (batch as any).id ?? String((batch as any)._id) }, 'Batch updated')
  } catch (err) { next(err) }
})

router.delete('/batches/:id', requireAdmin, audit('batch.delete', 'Batch', r => String(r.params['id'] ?? '')), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const id = String(req.params['id'] ?? '')
    if (!Types.ObjectId.isValid(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid batch id' } }); return }
    const batch = await BatchModel.findByIdAndDelete(id)
    if (!batch) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Batch not found' } }); return }
    sendSuccess(res, null, 'Batch deleted')
  } catch (err) { next(err) }
})

/* Add students to a batch */
router.post('/batches/:id/students', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const id = String(req.params['id'] ?? '')
    const { studentIds } = req.body as { studentIds: string[] }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'studentIds array required' } }); return
    }
    const objectIds = studentIds.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id))
    const batch = await BatchModel.findByIdAndUpdate(
      id,
      { $addToSet: { studentIds: { $each: objectIds } } },
      { new: true },
    ).populate('mentorId', 'id name email avatarUrl').lean({ virtuals: true })
    if (!batch) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Batch not found' } }); return }
    sendSuccess(res, { ...(batch as any), id: (batch as any).id ?? String((batch as any)._id) }, 'Students added')
  } catch (err) { next(err) }
})

/* Remove a student from a batch */
router.delete('/batches/:id/students/:userId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const id     = String(req.params['id']     ?? '')
    const userId = String(req.params['userId'] ?? '')
    const batch  = await BatchModel.findByIdAndUpdate(
      id,
      { $pull: { studentIds: new Types.ObjectId(userId) } },
      { new: true },
    ).populate('mentorId', 'id name email avatarUrl').lean({ virtuals: true })
    if (!batch) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Batch not found' } }); return }
    sendSuccess(res, { ...(batch as any), id: (batch as any).id ?? String((batch as any)._id) }, 'Student removed')
  } catch (err) { next(err) }
})

/* ─────────────────────────────────────────────────────
   MENTOR AVAILABILITY
   GET  /admin/mentors/:id/availability  — fetch slots
   PUT  /admin/mentors/:id/availability  — replace all slots
─────────────────────────────────────────────────────── */
const availabilitySlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM'),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM'),
}).refine(d => d.startTime < d.endTime, { message: 'startTime must be before endTime', path: ['endTime'] })

const availabilityUpdateSchema = z.object({
  slots: z.array(availabilitySlotSchema).max(21, 'Max 3 slots per day (7 days × 3)'),
}).refine(data => {
  const counts: Record<number, number> = {}
  for (const s of data.slots) {
    counts[s.dayOfWeek] = (counts[s.dayOfWeek] ?? 0) + 1
    if ((counts[s.dayOfWeek] as number) > 3) return false
  }
  return true
}, { message: 'Maximum 3 slots per day of week' })

router.get('/mentors/:id/availability', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { MentorAvailabilityModel } = await import('@/models/schema.ts')
    const mentorId = String(req.params['id'] ?? '')
    const avail = await MentorAvailabilityModel.findOne({ mentorId }).lean({ virtuals: true })
    sendSuccess(res, avail ?? { mentorId, slots: [] })
  } catch (err) { next(err) }
})

router.put('/mentors/:id/availability', requireRole('admin', 'instructor'), validate(availabilityUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { MentorAvailabilityModel } = await import('@/models/schema.ts')
    const mentorId = String(req.params['id'] ?? '')
    // Instructors can only update their own availability
    if (req.user!.role === 'instructor' && req.user!.id !== mentorId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit another mentor\'s availability' } }); return
    }
    const { slots } = req.body as { slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }
    const avail = await MentorAvailabilityModel.findOneAndUpdate(
      { mentorId },
      { mentorId, slots },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean({ virtuals: true })
    sendSuccess(res, avail, 'Availability updated')
  } catch (err) { next(err) }
})

/* Own availability — instructor shortcut (GET/PUT /availability/me) */
/* These are registered on the instructor sub-router in instructor.routes.ts if it exists,
   but we also expose them here so admin portal can use the same endpoints */
router.get('/availability/me', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { MentorAvailabilityModel } = await import('@/models/schema.ts')
    const mentorId = req.user!.id
    const avail = await MentorAvailabilityModel.findOne({ mentorId }).lean({ virtuals: true })
    sendSuccess(res, avail ?? { mentorId, slots: [] })
  } catch (err) { next(err) }
})

router.put('/availability/me', requireRole('admin', 'instructor'), validate(availabilityUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { MentorAvailabilityModel } = await import('@/models/schema.ts')
    const mentorId = req.user!.id
    const { slots } = req.body as { slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }
    const avail = await MentorAvailabilityModel.findOneAndUpdate(
      { mentorId },
      { mentorId, slots },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean({ virtuals: true })
    sendSuccess(res, avail, 'Availability updated')
  } catch (err) { next(err) }
})

/* ─────────────────────────────────────────────────────
   ADMIN BOOKING ROSTER
   GET  /admin/bookings — list all bookings (filter by liveClassId, batchId, userId)
   PATCH /admin/bookings/:id/attendance — mark attended/missed
─────────────────────────────────────────────────────── */
const bookingQuerySchema = z.object({
  liveClassId: z.string().optional(),
  batchId:     z.string().optional(),
  userId:      z.string().optional(),
  status:      z.enum(['booked', 'attended', 'missed', 'cancelled']).optional(),
  page:        z.coerce.number().int().min(1).default(1),
  per_page:    z.coerce.number().int().min(1).max(100).default(20),
})

router.get('/bookings', requireRole('admin', 'instructor'), validate(bookingQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const q = req.query as unknown as z.infer<typeof bookingQuerySchema>
    const filter: Record<string, any> = {}
    if (q.liveClassId && Types.ObjectId.isValid(q.liveClassId)) filter['liveClassId'] = new Types.ObjectId(q.liveClassId)
    if (q.batchId     && Types.ObjectId.isValid(q.batchId))     filter['batchId']     = new Types.ObjectId(q.batchId)
    if (q.userId      && Types.ObjectId.isValid(q.userId))      filter['userId']      = new Types.ObjectId(q.userId)
    if (q.status) filter['status'] = q.status
    const page     = Number(q.page)    || 1
    const per_page = Number(q.per_page) || 20
    const skip     = (page - 1) * per_page
    const [docs, total] = await Promise.all([
      ClassBookingModel.find(filter)
        .populate('userId', 'id name email avatarUrl')
        .populate('liveClassId', 'id title scheduledStart durationMins')
        .populate('batchId', 'id name')
        .sort({ bookedAt: -1 })
        .skip(skip).limit(per_page)
        .lean({ virtuals: true }),
      ClassBookingModel.countDocuments(filter),
    ])
    const withId = (d: any) => ({ ...d, id: d.id ?? String(d._id) })
    res.json({
      success: true,
      data: docs.map(withId),
      meta: { page, per_page, total_count: total, total_pages: Math.ceil(total / per_page) },
    })
  } catch (err) { next(err) }
})

const attendanceUpdateSchema = z.object({
  status: z.enum(['attended', 'missed']),
})

router.patch('/bookings/:id/attendance', requireRole('admin', 'instructor'), validate(attendanceUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const id = String(req.params['id'] ?? '')
    const { status } = req.body as { status: 'attended' | 'missed' }
    const booking = await ClassBookingModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).populate('userId', 'id name email').lean({ virtuals: true })
    if (!booking) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }); return }
    sendSuccess(res, { ...(booking as any), id: (booking as any).id ?? String((booking as any)._id) }, 'Attendance updated')
  } catch (err) { next(err) }
})

/* ─────────────────────────────────────────────────────
   REPORTS
   GET /admin/reports/attendance?batchId=&from=&to=
   GET /admin/reports/batch-performance?batchId=
─────────────────────────────────────────────────────── */
router.get('/reports/attendance', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const { batchId, from, to } = req.query as Record<string, string>
    const filter: Record<string, any> = {}
    if (batchId && Types.ObjectId.isValid(batchId)) filter['batchId'] = new Types.ObjectId(batchId)
    if (from || to) {
      filter['bookedAt'] = {}
      if (from) filter['bookedAt']['$gte'] = new Date(from)
      if (to)   filter['bookedAt']['$lte'] = new Date(to)
    }
    const bookings = await ClassBookingModel.find(filter)
      .populate('userId', 'id name email')
      .populate('liveClassId', 'id title scheduledStart')
      .lean({ virtuals: true })
    // Aggregate per student
    const byStudent: Record<string, { user: any; total: number; attended: number; missed: number; booked: number }> = {}
    for (const b of bookings) {
      const u = b.userId as any
      const uid = String(u.id ?? u._id)
      if (!byStudent[uid]) byStudent[uid] = { user: { ...u, id: uid }, total: 0, attended: 0, missed: 0, booked: 0 }
      byStudent[uid].total++
      if (b.status === 'attended') byStudent[uid].attended++
      else if (b.status === 'missed') byStudent[uid].missed++
      else if (b.status === 'booked') byStudent[uid].booked++
    }
    sendSuccess(res, Object.values(byStudent))
  } catch (err) { next(err) }
})

router.get('/reports/batch-performance', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel, BatchModel, LiveClassModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const { batchId } = req.query as Record<string, string>
    const batchFilter: Record<string, any> = {}
    if (batchId && Types.ObjectId.isValid(batchId)) batchFilter['_id'] = new Types.ObjectId(batchId)
    const batches = await BatchModel.find(batchFilter).lean({ virtuals: true })
    const results = await Promise.all(batches.map(async batch => {
      const bid = batch._id as unknown
      const [sessions, bookings] = await Promise.all([
        LiveClassModel.countDocuments({ batchId: bid }),
        ClassBookingModel.find({ batchId: bid }).lean(),
      ])
      const attended = bookings.filter(b => b.status === 'attended').length
      const total    = bookings.length
      return {
        batch: { id: (batch as any).id ?? String(batch._id), name: batch.name, status: batch.status },
        sessions,
        totalBookings: total,
        attended,
        attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
        activeStudents: batch.studentIds.length,
      }
    }))
    sendSuccess(res, results)
  } catch (err) { next(err) }
})

/* ─────────────────────────────────────────────────────
   REPORTS — Mentor Schedule
   GET /admin/reports/mentor-schedule?from=&to=&mentorId=
─────────────────────────────────────────────────────── */
router.get('/reports/mentor-schedule', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { LiveClassModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const { from, to, mentorId } = req.query as Record<string, string>

    const filter: Record<string, any> = {}
    if (from || to) {
      filter['scheduledStart'] = {}
      if (from) filter['scheduledStart']['$gte'] = new Date(from)
      if (to)   filter['scheduledStart']['$lte'] = new Date(to)
    }
    if (mentorId && Types.ObjectId.isValid(mentorId)) {
      filter['instructorId'] = new Types.ObjectId(mentorId)
    }

    const sessions = await LiveClassModel.find(filter)
      .populate('instructorId', 'id name email')
      .lean({ virtuals: true })

    // Group by instructor
    const mentorMap = new Map<string, {
      mentor: { id: string; name: string; email: string }
      assigned: number
      conducted: number
      cancelled: number
      completionPct: number
    }>()

    for (const s of sessions) {
      const inst = s.instructorId as any
      if (!inst) continue
      const key = String(inst._id ?? inst.id)
      if (!mentorMap.has(key)) {
        mentorMap.set(key, { mentor: { id: key, name: inst.name, email: inst.email }, assigned: 0, conducted: 0, cancelled: 0, completionPct: 0 })
      }
      const row = mentorMap.get(key)!
      row.assigned++
      if (s.status === 'ended') row.conducted++
      if (s.status === 'cancelled') row.cancelled++
    }

    const results = Array.from(mentorMap.values()).map(row => ({
      ...row,
      completionPct: row.assigned > 0 ? Math.round((row.conducted / row.assigned) * 100) : 0,
    }))

    sendSuccess(res, results)
  } catch (err) { next(err) }
})

/* ─────────────────────────────────────────────────────
   HOMEWORK — Session homework for live classes
   POST   /admin/live-classes/:id/homework       — create homework
   GET    /admin/live-classes/:id/homework       — list homework for session
   GET    /admin/live-classes/:id/homework/submissions — all submissions
   PATCH  /admin/homework/:id                    — update homework
   DELETE /admin/homework/:id                    — delete homework
   PATCH  /admin/homework-submissions/:id/grade  — grade a submission
─────────────────────────────────────────────────────── */
const homeworkCreateSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  dueDate:     z.string().datetime().optional(),
})

const homeworkUpdateSchema = homeworkCreateSchema.partial()

const gradeHomeworkSchema = z.object({
  grade:    z.number().min(0).max(100),
  feedback: z.string().max(2000).optional(),
})

router.post('/live-classes/:id/homework', requireRole('admin', 'instructor'), validate(homeworkCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { SessionHomeworkModel } = await import('@/models/schema.ts')
    const liveClassId = String(req.params['id'] ?? '')
    const { title, description, dueDate } = req.body as { title: string; description: string; dueDate?: string }
    const hw = await SessionHomeworkModel.create({
      liveClassId,
      assignedBy: req.user!.id,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })
    sendSuccess(res, hw, 'Homework created', 201)
  } catch (err) { next(err) }
})

router.get('/live-classes/:id/homework', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { SessionHomeworkModel } = await import('@/models/schema.ts')
    const liveClassId = String(req.params['id'] ?? '')
    const list = await SessionHomeworkModel.find({ liveClassId }).populate('assignedBy', 'id name').lean({ virtuals: true })
    sendSuccess(res, (list as any[]).map(d => ({ ...d, id: d.id ?? String(d._id) })))
  } catch (err) { next(err) }
})

router.get('/live-classes/:id/homework/submissions', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { SessionHomeworkModel, HomeworkSubmissionModel } = await import('@/models/schema.ts')
    const liveClassId = String(req.params['id'] ?? '')
    const homeworks = await SessionHomeworkModel.find({ liveClassId }).lean({ virtuals: true })
    const hwIds = homeworks.map(h => h._id)
    const submissions = await HomeworkSubmissionModel.find({ homeworkId: { $in: hwIds } })
      .populate('userId', 'id name email')
      .populate('homeworkId', 'id title')
      .populate('gradedBy', 'id name')
      .lean({ virtuals: true })
    sendSuccess(res, (submissions as any[]).map(d => ({ ...d, id: d.id ?? String(d._id) })))
  } catch (err) { next(err) }
})

router.patch('/homework/:id', requireRole('admin', 'instructor'), validate(homeworkUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { SessionHomeworkModel } = await import('@/models/schema.ts')
    const id = String(req.params['id'] ?? '')
    const hw = await SessionHomeworkModel.findByIdAndUpdate(id, req.body, { new: true }).lean({ virtuals: true })
    if (!hw) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Homework not found' } }); return }
    sendSuccess(res, hw, 'Homework updated')
  } catch (err) { next(err) }
})

router.delete('/homework/:id', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { SessionHomeworkModel } = await import('@/models/schema.ts')
    const id = String(req.params['id'] ?? '')
    await SessionHomeworkModel.findByIdAndDelete(id)
    sendSuccess(res, null, 'Homework deleted')
  } catch (err) { next(err) }
})

router.patch('/homework-submissions/:id/grade', requireRole('admin', 'instructor'), validate(gradeHomeworkSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { HomeworkSubmissionModel } = await import('@/models/schema.ts')
    const id = String(req.params['id'] ?? '')
    const { grade, feedback } = req.body as { grade: number; feedback?: string }
    const sub = await HomeworkSubmissionModel.findByIdAndUpdate(
      id,
      { grade, feedback, status: 'graded', gradedAt: new Date(), gradedBy: req.user!.id },
      { new: true },
    ).populate('userId', 'id name email').lean({ virtuals: true })
    if (!sub) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Submission not found' } }); return }
    sendSuccess(res, sub, 'Submission graded')
  } catch (err) { next(err) }
})

/* GET /admin/live-classes/:id/feedback — feedback summary for a session */
router.get('/live-classes/:id/feedback', authenticate, requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassFeedbackModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const liveClassId = String(req.params['id'] ?? '')
    if (!Types.ObjectId.isValid(liveClassId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid id' } }); return
    }
    const docs = await ClassFeedbackModel.find({ liveClassId: new Types.ObjectId(liveClassId) })
      .populate('userId', 'id name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })
    const avg = docs.length > 0 ? docs.reduce((s, d: any) => s + d.rating, 0) / docs.length : null
    res.json({ success: true, data: { feedbacks: docs, averageRating: avg ? Math.round(avg * 10) / 10 : null, count: docs.length } })
  } catch (err) { next(err) }
})

export default router
