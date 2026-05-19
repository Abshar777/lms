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

router.get  ('/users',          requireAdmin, validate(usersQuerySchema, 'query'), ctrl.listUsers)
router.patch('/users/:id',      requireAdmin, validate(userUpdateSchema), audit('user.roleChange', 'User', r => String(r.params['id'] ?? '')), ctrl.updateUser)

/* ─── Reviews (admin-only) ────────────────────────── */
router.get   ('/reviews',     requireAdmin, ctrl.listReviews)
router.delete('/reviews/:id', requireAdmin, audit('review.delete', 'Review', r => String(r.params['id'] ?? '')), ctrl.deleteReview)

/* ─── Sections + Lessons (admin + own-course instructor) ─── */
const sectionCreateSchema = z.object({
  title: z.string().min(1).max(255).trim(),
})
const sectionUpdateSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  order: z.coerce.number().int().min(0).optional(),
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
  courseId:       z.string().min(1),
  title:          z.string().min(3).max(255).trim(),
  description:    z.string().max(2000).optional(),
  scheduledStart: z.string().datetime().or(z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date')),
  durationMins:   z.coerce.number().int().min(5).max(600),
  type:           z.enum(['external', 'internal']).default('external'),
  meetingUrl:     z.string().url().max(2048).optional(),
  instructorId:   z.string().optional(),
}).refine(
  data => data.type === 'internal' || !!data.meetingUrl,
  { message: 'meetingUrl is required for external live classes', path: ['meetingUrl'] },
)
const liveUpdateSchema = z.object({
  title:          z.string().min(3).max(255).trim().optional(),
  description:    z.string().max(2000).optional(),
  scheduledStart: z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date').optional(),
  durationMins:   z.coerce.number().int().min(5).max(600).optional(),
  meetingUrl:     z.string().url().max(2048).optional(),
  status:         z.enum(['scheduled', 'live', 'ended', 'cancelled']).optional(),
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

export default router
