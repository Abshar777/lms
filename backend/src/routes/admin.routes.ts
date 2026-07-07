import { Router } from 'express'
import { z } from 'zod'
import { AdminController } from '@/controllers/admin.controller.ts'
import { AuthController } from '@/controllers/auth.controller.ts'
import { LiveClassController } from '@/controllers/liveClass.controller.ts'
import { RolesController } from '@/controllers/roles.controller.ts'
import { authenticateAdmin, requireRole, requireAdmin, requireAnyAdmin, requireInstructor, injectCategoryScope } from '@/middleware/auth.middleware.ts'
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
const authCtrl   = new AuthController()
const roleCtrl   = new RolesController()
const quizSvc    = new QuizService()
const assignSvc  = new AssignmentService()
const sectionSvc = new SectionService()
const orderSvc   = new OrderService()
const couponSvc  = new CouponService()
const userSvc    = new UserService()

/* ── Admin-portal auth routes (public — no cookie guard) ──────────────
   These use lms_admin_at / lms_admin_rt so the admin session is fully
   independent from the client-portal session (lms_at / lms_rt).
─────────────────────────────────────────────────────────────────────── */
router.post('/auth/login',   authCtrl.adminLogin)
router.post('/auth/refresh', authCtrl.adminRefresh)
router.post('/auth/logout',  authCtrl.adminLogout)
router.get ('/auth/me',      authenticateAdmin, authCtrl.me)

/* Admin routes are open to admins and instructors. Per-resource
   ownership checks inside the controllers reject instructors who
   try to mutate courses they don't own. */
router.use(authenticateAdmin, requireRole('super_admin', 'admin', '4x_admin', 'digital_marketing_admin', 'ai_admin', 'instructor'), injectCategoryScope)

/* ─── Schemas ─────────────────────────────────────── */
const courseCreateSchema = z.object({
  title:        z.string().min(3).max(255).trim(),
  slug:         z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  description:  z.string().min(20).optional(),
  thumbnailUrl: z.string().url().or(z.literal('')).optional(),
  previewUrl:   z.string().url().or(z.literal('')).optional(),
  price:        z.coerce.number().min(0),
  priceINR:     z.coerce.number().min(0).optional(),
  isFree:       z.boolean(),
  status:       z.enum(['draft', 'published', 'archived']),
  level:        z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language:     z.string().min(1).default('English'),
  tags:         z.union([z.string(), z.array(z.string())]).optional(),
  categoryId:   z.string().optional(),
  instructorId: z.string().optional(),
  program:      z.enum(['4x-trading', 'digital-marketing', 'ai']).optional(),
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
  page:              z.coerce.number().int().min(1).default(1),
  per_page:          z.coerce.number().int().min(1).max(500).default(20),
  role:              z.enum(['student', 'instructor', 'admin', '4x_admin', 'digital_marketing_admin', 'ai_admin', 'super_admin']).optional(),
  search:            z.string().trim().optional(),
  category:          z.enum(['4x-trading', 'digital-marketing', 'ai']).optional(),
  status:            z.enum(['active', 'inactive']).optional(),
  exclude_students:  z.coerce.boolean().optional(),
  enrollmentStatus:  z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
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
  role:       z.enum(['student', 'instructor', 'admin', '4x_admin', 'digital_marketing_admin', 'ai_admin', 'super_admin']).optional(),
  isActive:   z.boolean().optional(),
  isVerified: z.boolean().optional(),
  name:       z.string().min(2).max(100).trim().optional(),
  email:      z.string().email().optional(),
  category:   z.enum(['4x-trading', 'digital-marketing', 'ai']).nullable().optional(),
  avatarUrl:  z.string().url().or(z.literal('')).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Provide at least one field' })

const userCreateSchema = z.object({
  name:      z.string().min(2).max(100).trim(),
  email:     z.string().email(),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  role:      z.enum(['student', 'instructor', 'admin', '4x_admin', 'digital_marketing_admin', 'ai_admin', 'super_admin']).default('instructor'),
  bio:       z.string().max(2000).optional(),
  headline:  z.string().max(255).optional(),
  category:  z.enum(['4x-trading', 'digital-marketing', 'ai']).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
  courses:   z.array(z.object({
    courseId:       z.string().min(1),
    blockedLessons: z.array(z.string()).default([]),
  })).optional(),
})

router.get  ('/users',
  validate(usersQuerySchema, 'query'),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user!.role === 'instructor') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } })
      return
    }
    next()
  },
  ctrl.listUsers)
router.post ('/users',          validate(userCreateSchema), audit('user.create', 'User'),
  async (req, res, next) => {
    const role       = req.user!.role
    const targetRole = (req.body as { role?: string }).role ?? 'instructor'
    if (role === 'instructor') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Instructors cannot create accounts.' } })
      return
    }
    if ((role === '4x_admin' || role === 'digital_marketing_admin' || role === 'ai_admin') && targetRole !== 'instructor') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only create instructor accounts.' } })
      return
    }
    if (role === 'admin' && targetRole === 'super_admin') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super admins can create super admin accounts.' } })
      return
    }
    if (role === '4x_admin')                    (req.body as any).category = '4x-trading'
    else if (role === 'digital_marketing_admin') (req.body as any).category = 'digital-marketing'
    else if (role === 'ai_admin')               (req.body as any).category = 'ai'
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
router.patch ('/users/:id',
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user!.role === 'admin' && (req.body as any).role === 'super_admin') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super admins can grant super admin access.' } })
      return
    }
    next()
  },
  validate(userUpdateSchema),
  audit('user.roleChange', 'User', r => String(r.params['id'] ?? '')),
  ctrl.updateUser,
)
router.delete('/users/:id',           requireAdmin, audit('user.delete', 'User', r => String(r.params['id'] ?? '')), ctrl.deleteUser)
router.post  ('/users/:id/impersonate', requireRole('super_admin'), audit('user.impersonate', 'User', r => String(r.params['id'] ?? '')), ctrl.impersonateUser)

/* ── Enrollment requests (student approval workflow) ─────────────────────
   4x_admin / digital_marketing_admin approve or cancel student signups
   for their program. super_admin / admin manage all.
──────────────────────────────────────────────────────────────────────── */
const enrollmentRequestQuerySchema = z.object({
  status:   z.enum(['pending', 'approved', 'rejected', 'cancelled', 'all']).default('pending'),
  category: z.enum(['4x-trading', 'digital-marketing', 'ai']).optional(),
  page:     z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(20),
})

const approveEnrollmentSchema = z.object({
  categories: z.array(z.enum(['4x-trading', 'digital-marketing', 'ai'])).optional(),
})

const rejectEnrollmentSchema = z.object({
  reason: z.string().min(5, 'Please provide a reason (min 5 characters)').max(1000),
})

router.get ('/enrollment-requests',
  validate(enrollmentRequestQuerySchema, 'query'),
  ctrl.listEnrollmentRequests,
)
router.patch('/enrollment-requests/:userId/approve',         requireAnyAdmin, validate(approveEnrollmentSchema), ctrl.approveEnrollment)
router.patch('/enrollment-requests/:userId/reject',          requireAnyAdmin, validate(rejectEnrollmentSchema),  ctrl.rejectEnrollment)
router.patch('/enrollment-requests/:userId/cancel',          requireAnyAdmin, validate(rejectEnrollmentSchema),  ctrl.rejectEnrollment)
router.patch('/enrollment-requests/:userId/revoke-to-viewer', requireAnyAdmin, ctrl.revokeToViewer)

const removeCategorySchema = z.object({
  category: z.enum(['4x-trading', 'digital-marketing', 'ai']),
})
router.patch('/enrollment-requests/:userId/remove-category', requireAnyAdmin, validate(removeCategorySchema), ctrl.removeEnrollmentCategory)

const enrollmentDocsAdminSchema = z.object({
  passportUrl: z.string().url().optional().or(z.literal('')),
  photoUrl:    z.string().url().optional().or(z.literal('')),
})
router.patch('/enrollment-requests/:userId/docs', requireAnyAdmin, validate(enrollmentDocsAdminSchema), ctrl.updateStudentDocs)

/* GET /admin/users/:id/enrollments — list a student's course enrollments */
router.get('/users/:id/enrollments', requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { EnrollmentModel } = await import('@/models/schema.ts')
      const { Types } = await import('mongoose')
      if (!Types.ObjectId.isValid(req.params['id'] as string)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid user ID' } })
        return
      }
      const enrollments = await EnrollmentModel.find({ userId: new Types.ObjectId(req.params['id'] as string) })
        .populate('courseId', 'id title thumbnailUrl')
        .lean({ virtuals: true })
      sendSuccess(res, enrollments)
    } catch (err) { next(err) }
  },
)

/* POST /admin/users/:id/enrollments — enroll student in a course */
const enrollCreateSchema = z.object({ courseId: z.string().min(1) })

router.post('/users/:id/enrollments', requireAdmin, validate(enrollCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { EnrollmentModel } = await import('@/models/schema.ts')
      const { Types } = await import('mongoose')
      const userId   = req.params['id'] as string
      const courseId = (req.body as { courseId: string }).courseId
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } })
        return
      }
      /* Admin override — bypass published/paid checks; idempotent */
      const existing = await EnrollmentModel.findOne({
        userId:   new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
      }).populate('courseId', 'id title thumbnailUrl').lean({ virtuals: true })
      if (existing) {
        sendSuccess(res, existing, 'Already enrolled')
        return
      }
      const doc = await EnrollmentModel.create({
        userId:   new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
      })
      const populated = await EnrollmentModel.findById(doc._id)
        .populate('courseId', 'id title thumbnailUrl')
        .lean({ virtuals: true })
      sendSuccess(res, populated, 'Enrolled', 201)
    } catch (err) { next(err) }
  },
)

/* DELETE /admin/enrollments/:id — remove an enrollment */
router.delete('/enrollments/:id', requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { EnrollmentModel } = await import('@/models/schema.ts')
      const deleted = await EnrollmentModel.findByIdAndDelete(req.params['id'])
      if (!deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enrollment not found' } })
        return
      }
      sendSuccess(res, null, 'Enrollment removed')
    } catch (err) { next(err) }
  },
)

/* PATCH /admin/enrollments/:id — update blocked lessons for one enrollment */
const enrollmentUpdateSchema = z.object({
  blockedLessons: z.array(z.string()),
})

router.patch('/enrollments/:id', requireAdmin, validate(enrollmentUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { EnrollmentModel } = await import('@/models/schema.ts')
      const { Types } = await import('mongoose')
      const { blockedLessons } = req.body as { blockedLessons: string[] }
      const blockedObjectIds = blockedLessons
        .filter((id: string) => Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id))
      const enrollment = await EnrollmentModel.findByIdAndUpdate(
        req.params['id'],
        { blockedLessons: blockedObjectIds },
        { new: true },
      ).populate('courseId', 'id title thumbnailUrl').lean({ virtuals: true })
      if (!enrollment) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enrollment not found' } })
        return
      }
      sendSuccess(res, enrollment)
    } catch (err) { next(err) }
  },
)

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
const LIVE_LANGUAGES = ['English', 'Arabic', 'Hindi', 'Malayalam', 'Urdu'] as const
const liveCreateSchema = z.object({
  courseId:        z.string().min(1),
  title:           z.string().min(3).max(255).trim(),
  description:     z.string().max(2000).optional(),
  scheduledStart:  z.string().datetime().or(z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date')),
  durationMins:    z.coerce.number().int().min(5).max(600),
  type:            z.enum(['external', 'internal']).default('external'),
  /* meetingUrl is now auto-generated for external sessions — omit from create requests */
  instructorId:    z.string().optional(),
  sectionId:       z.string().optional(),
  sessionCapacity: z.coerce.number().int().min(1).max(10000).optional(),
  language:        z.enum(LIVE_LANGUAGES).default('English'),
  /* Offline / in-person support */
  isOnline:        z.boolean().optional(),
  location:        z.string().max(500).optional(),
  room:            z.string().max(100).optional(),
})
const liveUpdateSchema = z.object({
  title:           z.string().min(3).max(255).trim().optional(),
  description:     z.string().max(2000).optional(),
  scheduledStart:  z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date').optional(),
  durationMins:    z.coerce.number().int().min(5).max(600).optional(),
  meetingUrl:      z.string().url().max(2048).optional(),
  recordingUrl:    z.string().url().max(2048).optional().or(z.literal('')),
  status:          z.enum(['scheduled', 'live', 'ended', 'cancelled']).optional(),
  sessionCapacity: z.coerce.number().int().min(1).max(10000).optional(),
  mentorNotes:     z.string().max(5000).optional(),
  courseId:        z.string().optional(),
  sectionId:       z.string().optional(),
  instructorId:    z.string().optional(),
  language:          z.enum(LIVE_LANGUAGES).optional(),
  /* Offline / in-person support */
  isOnline:          z.boolean().optional(),
  location:          z.string().max(500).optional(),
  room:              z.string().max(100).optional(),
  rescheduleReason:  z.string().max(2000).optional(),
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

/* ─── Admin book-for-student (offline classes only) ──── */
const bookForStudentSchema = z.object({
  liveClassId: z.string().min(1),
  studentId:   z.string().min(1),
})

router.post('/bookings/book-for-student', requireAnyAdmin, validate(bookForStudentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel, LiveClassModel, UserModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const { NotificationService } = await import('@/services/notification.service.ts')

    const { liveClassId, studentId } = req.body as { liveClassId: string; studentId: string }

    if (!Types.ObjectId.isValid(liveClassId) || !Types.ObjectId.isValid(studentId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid liveClassId or studentId' } }); return
    }

    const session = await LiveClassModel.findById(liveClassId).lean()
    if (!session) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }); return
    }

    if ((session as any).isOnline !== false) {
      res.status(400).json({ success: false, error: { code: 'ONLINE_CLASS', message: 'Admin booking is only available for offline (in-person) classes' } }); return
    }

    if (session.status === 'cancelled' || session.status === 'ended') {
      res.status(400).json({ success: false, error: { code: 'SESSION_UNAVAILABLE', message: 'Session is no longer available for booking' } }); return
    }

    if (new Date(session.scheduledStart) <= new Date()) {
      res.status(400).json({ success: false, error: { code: 'BOOKING_CLOSED', message: 'Booking is closed — this class has already started' } }); return
    }

    const student = await UserModel.findById(studentId).lean()
    if (!student || (student as any).role !== 'student') {
      res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } }); return
    }

    /* Enrollment gate — student must be enrolled in the session's course */
    let enrollment = null
    if (session.courseId) {
      const { EnrollmentModel } = await import('@/models/schema.ts')
      enrollment = await EnrollmentModel.findOne({
        userId:   new Types.ObjectId(studentId),
        courseId: session.courseId,
        status:   'active',
      }).lean()
      if (!enrollment) {
        res.status(403).json({ success: false, error: { code: 'NOT_ENROLLED', message: 'Student is not enrolled in this course' } }); return
      }
    }

    /* Module blocking — cannot book if student's section is blocked */
    if (enrollment && session.sectionId) {
      const blockedIds = ((enrollment as any).blockedLessons ?? []).map((id: any) => String(id))
      if (blockedIds.includes(String(session.sectionId))) {
        res.status(403).json({ success: false, error: { code: 'MODULE_BLOCKED', message: 'Student does not have access to this module' } }); return
      }
    }

    if (session.bookedCount >= session.sessionCapacity) {
      res.status(400).json({ success: false, error: { code: 'SESSION_FULL', message: 'This session is fully booked' } }); return
    }

    const existing = await ClassBookingModel.findOne({
      userId:      new Types.ObjectId(studentId),
      liveClassId: new Types.ObjectId(liveClassId),
    }).lean()

    let bookingDoc
    if (existing) {
      if (existing.status === 'cancelled') {
        await ClassBookingModel.findByIdAndUpdate(existing._id, {
          status: 'booked', bookedAt: new Date(), cancelledAt: undefined,
          reminderDayBeforeSent: false, reminderDayOfSent: false,
          reminderPreSessionSent: false, reminder5MinSent: false, reminderAtTimeSent: false,
        })
        await LiveClassModel.findByIdAndUpdate(liveClassId, { $inc: { bookedCount: 1 } })
        bookingDoc = await ClassBookingModel.findById(existing._id).lean({ virtuals: true })
      } else {
        res.status(409).json({ success: false, error: { code: 'ALREADY_BOOKED', message: 'Student already has a booking for this session' } }); return
      }
    } else {
      const [booking] = await Promise.all([
        ClassBookingModel.create({
          userId:      new Types.ObjectId(studentId),
          liveClassId: new Types.ObjectId(liveClassId),
          status:      'booked',
          bookedAt:    new Date(),
        }),
        LiveClassModel.findByIdAndUpdate(liveClassId, { $inc: { bookedCount: 1 } }),
      ])
      bookingDoc = await booking.populate([
        { path: 'liveClassId', select: 'id title scheduledStart durationMins meetingUrl type' },
      ])
    }

    sendSuccess(res, bookingDoc, 'Booking created for student', 201)

    /* Post-booking: notify + email student (fire-and-forget) */
    const notifSvc = new NotificationService()
    const dateLabel = new Date(session.scheduledStart).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
    const joinUrl = (session as any).meetingUrl ?? `${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/live-classes/${liveClassId}/watch`

    notifSvc.create(studentId, {
      kind: 'booking-confirmed', title: `Booking confirmed: ${session.title}`,
      body: `Your seat is confirmed for ${session.title} on ${dateLabel}.`, link: '/class-bookings',
    }).catch(() => {/* non-fatal */})

    import('@/services/email.service.ts').then(({ sendBookingConfirmation }) => {
      sendBookingConfirmation((student as any).email, (student as any).name, session.title, dateLabel, joinUrl)
        .catch(() => {/* non-fatal */})
    }).catch(() => {/* non-fatal */})

  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, error: { code: 'ALREADY_BOOKED', message: 'Student already has a booking for this session' } }); return
    }
    next(err)
  }
})

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
   GET  /admin/bookings — list all bookings (filter by liveClassId, userId)
   PATCH /admin/bookings/:id/attendance — mark attended/missed
─────────────────────────────────────────────────────── */
const bookingQuerySchema = z.object({
  liveClassId:  z.string().optional(),
  userId:       z.string().optional(),
  status:       z.enum(['booked', 'attended', 'missed', 'cancelled']).optional(),
  instructorId: z.string().optional(),
  courseId:     z.string().optional(),
  language:     z.string().optional(),
  dateFrom:     z.string().optional(),
  dateTo:       z.string().optional(),
  page:         z.coerce.number().int().min(1).default(1),
  per_page:     z.coerce.number().int().min(1).max(200).default(50),
})

router.get('/bookings', requireInstructor, validate(bookingQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel, LiveClassModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const q = req.query as unknown as z.infer<typeof bookingQuerySchema>

    /* ── Step 1: Build live-class filter (instructor scope + date + courseId) ── */
    const lcFilter: Record<string, any> = {}

    // Instructors only see their own classes
    if (req.user!.role === 'instructor') {
      lcFilter['instructorId'] = new Types.ObjectId(req.user!.id)
    } else if (q.instructorId && Types.ObjectId.isValid(q.instructorId)) {
      lcFilter['instructorId'] = new Types.ObjectId(q.instructorId)
    }

    // Category-scoped admins (e.g. digital_marketing_admin, 4x_admin) only see their program's bookings
    const scope = (req.user as any)?.categoryScope as string | undefined
    if (scope) {
      const { CourseModel } = await import('@/models/schema.ts')
      const scopedCourses = await CourseModel.find({ program: scope }, '_id').lean()
      const scopedIds = scopedCourses.map((c: any) => c._id)
      if (!q.courseId) {
        lcFilter['courseId'] = { $in: scopedIds }
      }
    }

    if (q.courseId && Types.ObjectId.isValid(q.courseId)) {
      lcFilter['courseId'] = new Types.ObjectId(q.courseId)
    }

    if (q.language) {
      lcFilter['language'] = q.language
    }

    // For cancelled bookings the date range applies to cancelledAt (not scheduledStart)
    if (q.dateFrom || q.dateTo) {
      if (q.status !== 'cancelled') {
        lcFilter['scheduledStart'] = {}
        if (q.dateFrom) lcFilter['scheduledStart']['$gte'] = new Date(q.dateFrom)
        if (q.dateTo) {
          const end = new Date(q.dateTo)
          end.setHours(23, 59, 59, 999)
          lcFilter['scheduledStart']['$lte'] = end
        }
      }
    }

    /* ── Step 2: Resolve live-class IDs if needed ── */
    const filter: Record<string, any> = {}
    if (Object.keys(lcFilter).length > 0) {
      const matchingLcIds = await LiveClassModel.find(lcFilter, '_id').lean()
      filter['liveClassId'] = { $in: matchingLcIds.map((l: any) => l._id) }
    }

    // Direct liveClassId override (more specific than instructor/date scope)
    if (q.liveClassId && Types.ObjectId.isValid(q.liveClassId)) {
      filter['liveClassId'] = new Types.ObjectId(q.liveClassId)
    }
    if (q.userId && Types.ObjectId.isValid(q.userId)) filter['userId'] = new Types.ObjectId(q.userId)
    if (q.status) filter['status'] = q.status

    // Cancelled bookings: apply date range to cancelledAt instead of scheduledStart
    if (q.status === 'cancelled' && (q.dateFrom || q.dateTo)) {
      const cf: Record<string, any> = {}
      if (q.dateFrom) cf['$gte'] = new Date(q.dateFrom)
      if (q.dateTo)   { const e = new Date(q.dateTo); e.setHours(23,59,59,999); cf['$lte'] = e }
      filter['cancelledAt'] = cf
    }

    /* ── Step 3: Fetch bookings with rich populate ── */
    const page     = Number(q.page)     || 1
    const per_page = Number(q.per_page) || 50
    const skip     = (page - 1) * per_page

    const [docs, total] = await Promise.all([
      ClassBookingModel.find(filter)
        .populate('userId', 'id name email avatarUrl')
        .populate({
          path:     'liveClassId',
          select:   'id title scheduledStart durationMins language courseId sectionId instructorId isOnline location room',
          populate: [
            { path: 'courseId',     select: 'id title' },
            { path: 'sectionId',    select: 'id title' },
            { path: 'instructorId', select: 'id name avatarUrl' },
          ],
        })
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

router.patch('/bookings/:id/attendance', requireInstructor, validate(attendanceUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
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
   GET /admin/reports/attendance?from=&to=
─────────────────────────────────────────────────────── */
router.get('/reports/attendance', requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const { from, to } = req.query as Record<string, string>
    const filter: Record<string, any> = {}
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
router.get('/live-classes/:id/feedback', authenticateAdmin, requireRole('admin', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
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

/* ── Roles & Permissions ──────────────────────────────────────────────── */

const roleCreateSchema = z.object({
  name:        z.string().min(1).max(80).trim(),
  description: z.string().max(500).optional(),
})

const roleUpdateSchema = roleCreateSchema.partial()

const resourcePermissionSchema = z.object({
  resource:    z.string(),
  create:      z.boolean().optional(),
  read:        z.boolean().optional(),
  update:      z.boolean().optional(),
  delete:      z.boolean().optional(),
  list:        z.boolean().optional(),
  list_basic:  z.boolean().optional(),
  impersonate: z.boolean().optional(),
})

const permissionsBodySchema = z.object({
  permissions: z.array(resourcePermissionSchema),
})

const assignRoleSchema = z.object({
  roleId: z.string().nullable(),
})

router.get   ('/roles',                      requireAdmin, roleCtrl.list)
router.post  ('/roles',                      requireAdmin, validate(roleCreateSchema), roleCtrl.create)
router.patch ('/roles/:id',                  requireAdmin, validate(roleUpdateSchema), roleCtrl.update)
router.patch ('/roles/:id/permissions',      requireAdmin, validate(permissionsBodySchema), roleCtrl.updatePermissions)
router.delete('/roles/:id',                  requireAdmin, roleCtrl.delete)
router.patch ('/users/:userId/assign-role',  requireAdmin, validate(assignRoleSchema), roleCtrl.assignRole)
router.post  ('/users/:userId/impersonate',  requireRole('super_admin'), roleCtrl.impersonate)

export default router
