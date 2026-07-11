import type { Request, Response, NextFunction } from 'express'
import { CourseService } from '@/services/course.service.ts'
import { CategoryService } from '@/services/category.service.ts'
import { UserService } from '@/services/user.service.ts'
import { ReviewService } from '@/services/review.service.ts'
import { AdminService } from '@/services/admin.service.ts'
import { SectionService } from '@/services/section.service.ts'
import { LessonService } from '@/services/lesson.service.ts'
import { LessonRepository } from '@/repositories/lesson.repository.ts'
import { SectionRepository } from '@/repositories/section.repository.ts'
import { sendSuccess, buildPaginationMeta, parsePagination } from '@/utils/response.ts'
import { toCourseDTO } from '@/utils/courseDTO.ts'
import { signAccessToken } from '@/utils/jwt.ts'
import type { UserRole } from '@/types/index.ts'

export class AdminController {
  private readonly courseService   = new CourseService()
  private readonly categoryService = new CategoryService()
  private readonly userService     = new UserService()
  private readonly reviewService   = new ReviewService()
  private readonly admin           = new AdminService()
  private readonly sectionService  = new SectionService()
  private readonly lessonService   = new LessonService()
  private readonly lessonRepo      = new LessonRepository()
  private readonly sectionRepo     = new SectionRepository()

  /* ─── Dashboard stats ─────────────────────────── */
  stats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.admin.getStats())
    } catch (err) { next(err) }
  }

  /* ─── Courses (any status) ──────────────────────
     Admins see everything; instructors only see their own. */
  listCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const q = req.query as Record<string, string | undefined>
      const TEACHING_STAFF = ['instructor']
      const scope = req.user!.categoryScope
      const isTeachingStaff = TEACHING_STAFF.includes(req.user!.role)
      const { docs, totalCount } = await this.courseService.listAdmin({
        page,
        perPage:      per_page,
        search:       q['search']?.trim() || undefined,
        status:       (q['status'] as 'draft' | 'published' | 'archived' | 'all' | undefined) ?? 'all',
        level:        q['level'] as 'beginner' | 'intermediate' | 'advanced' | undefined,
        category:     q['category']?.trim() || undefined,
        program:      scope ?? (q['program'] as string | undefined),
        free:         q['free'] === 'true',
        sort:         q['sort'] as 'popular' | 'rating' | 'newest' | 'price_lo' | 'price_hi' | undefined,
        instructorId: isTeachingStaff ? req.user!.id : undefined,
      })
      const counts = await Promise.all(docs.map(c => this.lessonRepo.countByCourse(c.id)))
      const dtos   = docs.map((c, i) => toCourseDTO(c, counts[i]))
      const meta   = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, dtos, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  getCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const course = await this.courseService.getById(id)
      /* Instructors may only read their own courses. */
      await this.sectionService.assertCourseEditable(course.id, req.user!.id, req.user!.role, req.user!.categoryScope)
      const lessonCount = await this.lessonRepo.countByCourse(course.id)
      sendSuccess(res, toCourseDTO(course, lessonCount))
    } catch (err) { next(err) }
  }

  createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as {
        title:         string
        slug:          string
        description?:  string
        thumbnailUrl?: string
        previewUrl?:   string
        price:         number
        isFree:        boolean
        status:        'draft' | 'published' | 'archived'
        level?:        'beginner' | 'intermediate' | 'advanced'
        language:      string
        tags?:         string[] | string
        categoryId?:   string
        instructorId?: string
        program?:      '4x-trading' | 'digital-marketing' | 'ai'
      }

      const tags = typeof dto.tags === 'string'
        ? dto.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (dto.tags ?? [])

      /* Instructors can only author their own courses; admins may assign
         the course to any instructor (or default to themselves). */
      const isAdmin = ['super_admin', 'admin', '4x_admin', 'digital_marketing_admin'].includes(req.user!.role)
      const instructorId = isAdmin
        ? (dto.instructorId ?? req.user!.id)
        : req.user!.id

      const scope = req.user!.categoryScope

      const course = await this.courseService.create({
        title:        dto.title,
        slug:         dto.slug,
        description:  dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        previewUrl:   dto.previewUrl,
        price:        dto.price,
        isFree:       dto.isFree,
        status:       dto.status,
        level:        dto.level,
        language:     dto.language,
        tags,
        instructorId,
        categoryId:   dto.categoryId,
        program:      scope ?? dto.program,
      })
      sendSuccess(res, toCourseDTO(course, 0), 'Course created', 201)
    } catch (err) { next(err) }
  }

  updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id  = String(req.params['id'] ?? '')
      await this.sectionService.assertCourseEditable(id, req.user!.id, req.user!.role, req.user!.categoryScope)
      const dto = req.body as Record<string, unknown>
      /* Instructors cannot reassign their course to a different author. */
      const isAdmin = ['super_admin', 'admin', '4x_admin', 'digital_marketing_admin'].includes(req.user!.role)
      if (!isAdmin) delete dto['instructorId']
      /* Category-scoped admins cannot override their program scope */
      const scope = req.user!.categoryScope
      if (scope) dto['program'] = scope
      const tags = typeof dto['tags'] === 'string'
        ? (dto['tags'] as string).split(',').map(t => t.trim()).filter(Boolean)
        : (dto['tags'] as string[] | undefined)
      const course = await this.courseService.update(id, { ...dto, tags } as Parameters<CourseService['update']>[1])
      const lessonCount = await this.lessonRepo.countByCourse(course.id)
      sendSuccess(res, toCourseDTO(course, lessonCount), 'Course updated')
    } catch (err) { next(err) }
  }

  deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      await this.sectionService.assertCourseEditable(id, req.user!.id, req.user!.role, req.user!.categoryScope)
      await this.courseService.delete(id)
      sendSuccess(res, null, 'Course deleted')
    } catch (err) { next(err) }
  }

  /* ─── Categories CRUD ─────────────────────────── */
  listCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.categoryService.listAll()) } catch (err) { next(err) }
  }

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const c = await this.categoryService.create(req.body)
      sendSuccess(res, c, 'Category created', 201)
    } catch (err) { next(err) }
  }

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const c = await this.categoryService.update(String(req.params['id'] ?? ''), req.body)
      sendSuccess(res, c, 'Category updated')
    } catch (err) { next(err) }
  }

  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.categoryService.delete(String(req.params['id'] ?? ''))
      sendSuccess(res, null, 'Category deleted')
    } catch (err) { next(err) }
  }

  /* ─── Users ───────────────────────────────────── */
  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const q        = req.query as Record<string, string | undefined>
      const role             = q['role'] as UserRole | undefined
      const search           = q['search']?.trim() || undefined
      const category         = q['category'] as string | undefined
      const effectiveCategory = req.user!.categoryScope ? req.user!.categoryScope as string : category
      const status           = q['status'] as 'active' | 'inactive' | undefined
      const excludeStudents  = Boolean(q['exclude_students'])
      const enrollmentStatus = q['enrollmentStatus'] as 'pending' | 'approved' | 'rejected' | 'cancelled' | undefined
      const { docs, totalCount } = await this.userService.listByRole(role, { page, perPage: per_page, search, category: effectiveCategory, status, excludeStudents, enrollmentStatus })
      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, docs, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      await this.userService.adminDelete(id)
      sendSuccess(res, null, 'User deleted')
    } catch (err) { next(err) }
  }

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as {
        name:      string
        email:     string
        password:  string
        role:      UserRole
        bio?:      string
        headline?: string
      }
      const user = await this.userService.adminCreateUser(dto)
      sendSuccess(res, user, 'User created', 201)
    } catch (err) { next(err) }
  }

  /* ─── Reviews (global) ────────────────────────── */
  listReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const { docs, totalCount } = await this.reviewService.listAll(page, per_page)
      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, docs, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.reviewService.adminDelete(String(req.params['id'] ?? ''))
      sendSuccess(res, null, 'Review deleted')
    } catch (err) { next(err) }
  }

  /* ─── User actions ────────────────────────────── */
  impersonateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetId = String(req.params['id'] ?? '')
      if (targetId === req.user!.id) {
        sendSuccess(res, null, 'Cannot impersonate yourself', 400)
        return
      }
      const target = await this.userService.findById(targetId)
      if (!target) { sendSuccess(res, null, 'User not found', 404); return }

      const token = await signAccessToken({ id: String(target._id), email: target.email, role: target.role })
      sendSuccess(res, {
        token,
        user: { id: String(target._id), name: target.name, email: target.email, role: target.role, avatarUrl: target.avatarUrl },
      }, 'Impersonation token issued')
    } catch (err) { next(err) }
  }

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const dto = req.body as { role?: UserRole; isActive?: boolean; isVerified?: boolean; name?: string; email?: string; category?: '4x-trading' | 'digital-marketing' | 'ai' | null; categories?: ('4x-trading' | 'digital-marketing' | 'ai')[]; headline?: string; bio?: string }
      const user = await this.userService.adminUpdate(id, dto)
      sendSuccess(res, user, 'User updated')
    } catch (err) { next(err) }
  }

  /* ─── Enrollment requests ────────────────────── */

  listEnrollmentRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('@/models/schema.ts')
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const q      = req.query as Record<string, string | undefined>
      const status = q['status'] ?? 'pending'
      const scope  = req.user!.categoryScope as string | undefined
      const role   = req.user!.role

      const filter: Record<string, unknown> = {
        role:             'student',
        enrollmentStatus: { $exists: true },
      }

      // For approved tab: scoped admins only see students in their category
      if (status === 'approved' && scope) {
        filter['$or'] = [{ category: scope }, { categories: scope }]
      } else if (status === 'approved' && q['category']) {
        filter['$or'] = [{ category: q['category'] }, { categories: q['category'] }]
      }

      if (status === 'all') {
        // no enrollmentStatus filter — but still requires enrollmentStatus to exist (set above)
      } else if (status === 'rejected') {
        filter['enrollmentStatus'] = { $in: ['rejected', 'cancelled'] }
      } else {
        filter['enrollmentStatus'] = status
      }

      const projection = 'id name email avatarUrl category categories enrollmentStatus enrollmentApplication enrollmentCancellationReason rejectionReason approvedBy approvedByEmail approvedByName approvedByRole approvedAt rejectedByEmail rejectedAt isActive createdAt'

      const [docs, totalCount] = await Promise.all([
        UserModel.find(filter).select(projection).sort({ createdAt: -1 })
          .skip((page - 1) * per_page).limit(per_page).lean({ virtuals: true }),
        UserModel.countDocuments(filter),
      ])

      const mapped = (docs as any[]).map(d => ({
        ...d,
        id:         d.id ?? String(d._id),
        categories: d.categories ?? (d.category ? [d.category] : []),
        rejectionReason: d.rejectionReason ?? d.enrollmentCancellationReason,
      }))
      sendSuccess(res, mapped, undefined, 200, buildPaginationMeta(totalCount, page, per_page))
    } catch (err) { next(err) }
  }

  approveEnrollment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('@/models/schema.ts')
      const { Types }     = await import('mongoose')
      const { sendEnrollmentApproved } = await import('@/services/email.service.ts')

      const userId = String(req.params['userId'] ?? '')
      const scope  = req.user!.categoryScope as string | undefined
      const admin  = req.user!

      if (!Types.ObjectId.isValid(userId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid user ID' } }); return
      }

      // Categories to assign: scoped admin uses their scope; full admins use body
      let assignCategories: string[] = (req.body as { categories?: string[] }).categories ?? []
      if (scope) assignCategories = [scope]
      if (!assignCategories.length) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CATEGORIES', message: 'Select at least one category to assign.' } }); return
      }

      const existing = await UserModel.findById(userId).select('email name categories category').lean()
      if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

      // Merge new categories with existing ones (avoid duplicates)
      const existingCats: string[] = (existing.categories as string[] | undefined) ?? (existing.category ? [existing.category as string] : [])
      const mergedCats  = [...new Set([...existingCats, ...assignCategories])]
      const primaryCat  = mergedCats[0]

      // Look up admin's full info for metadata
      const adminUser = await UserModel.findById(admin.id).select('name email role').lean()

      await UserModel.findByIdAndUpdate(userId, {
        $set:   {
          enrollmentStatus: 'approved',
          categories:       mergedCats,
          category:         primaryCat,
          approvedBy:       admin.id,
          approvedByEmail:  adminUser?.email ?? '',
          approvedByName:   adminUser?.name ?? '',
          approvedByRole:   admin.role,
          approvedAt:       new Date(),
        },
        $unset: { enrollmentCancellationReason: '', rejectionReason: '' },
      })

      void sendEnrollmentApproved(existing.email, existing.name, mergedCats.join(', ')).catch(() => {})

      sendSuccess(res, { id: userId, enrollmentStatus: 'approved', categories: mergedCats }, 'Enrollment approved')
    } catch (err) { next(err) }
  }

  rejectEnrollment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('@/models/schema.ts')
      const { Types }     = await import('mongoose')
      const { sendEnrollmentCancelled } = await import('@/services/email.service.ts')

      const userId = String(req.params['userId'] ?? '')
      const admin  = req.user!
      const role   = admin.role
      const { reason } = req.body as { reason: string }

      if (!Types.ObjectId.isValid(userId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid user ID' } }); return
      }

      const existing = await UserModel.findById(userId).select('email name approvedBy').lean()
      if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

      // Category admins can only revoke approved students in exactly their own program.
      // Pending / rejected users have no categories yet — any admin level can reject them.
      const isCategoryAdmin = role === '4x_admin' || role === 'digital_marketing_admin' || role === 'ai_admin'
      if (isCategoryAdmin) {
        const studentCats: string[] = (existing as any).categories?.length
          ? (existing as any).categories
          : (existing as any).category ? [(existing as any).category] : []

        if (studentCats.length > 0) {
          const adminScope = (admin as any).categoryScope as string | undefined
          if (studentCats.length !== 1 || studentCats[0] !== adminScope) {
            const msg = studentCats.length > 1
              ? 'This student is enrolled in multiple programs. Remove the other programs first before revoking.'
              : `You can only revoke students in your own program (${adminScope}).`
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: msg } }); return
          }
        }
      }

      const adminUser = await UserModel.findById(admin.id).select('name email').lean()

      await UserModel.findByIdAndUpdate(userId, {
        $set: {
          enrollmentStatus:  'rejected',
          rejectionReason:   reason,
          rejectedBy:        admin.id,
          rejectedByEmail:   adminUser?.email ?? '',
          rejectedByName:    adminUser?.name ?? '',
          rejectedAt:        new Date(),
          categories:        [],
        },
        $unset: {
          category:        '',
          approvedBy:      '', approvedByEmail: '', approvedByName: '', approvedByRole: '', approvedAt: '',
        },
      })

      // Remove all course enrollments so the user loses access to all course content
      const { EnrollmentModel } = await import('@/models/schema.ts')
      await EnrollmentModel.deleteMany({ userId })

      void sendEnrollmentCancelled(existing.email, existing.name, '', reason).catch(() => {})

      sendSuccess(res, { id: userId, enrollmentStatus: 'rejected' }, 'Enrollment rejected')
    } catch (err) { next(err) }
  }

  /* Keep for backward compat alias */
  cancelEnrollment = this.rejectEnrollment

  revokeToViewer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('@/models/schema.ts')
      const { Types }     = await import('mongoose')

      const userId = String(req.params['userId'] ?? '')
      if (!Types.ObjectId.isValid(userId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid user ID' } }); return
      }

      const existing = await UserModel.findById(userId).select('email name enrollmentStatus').lean()
      if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

      await UserModel.findByIdAndUpdate(userId, {
        $set:   { enrollmentStatus: 'pending', categories: [] },
        $unset: {
          category:    '',
          approvedBy: '', approvedByEmail: '', approvedByName: '', approvedByRole: '', approvedAt: '',
          rejectedBy: '', rejectedByEmail: '', rejectedByName: '', rejectedAt: '', rejectionReason: '',
        },
      })

      sendSuccess(res, { id: userId, enrollmentStatus: 'pending' }, 'Student reverted to viewer')
    } catch (err) { next(err) }
  }

  removeEnrollmentCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('@/models/schema.ts')
      const { Types }     = await import('mongoose')

      const userId       = String(req.params['userId'] ?? '')
      const { category } = req.body as { category: string }
      const admin        = req.user!
      const adminScope   = (admin as any).categoryScope as string | undefined

      if (!Types.ObjectId.isValid(userId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid user ID' } }); return
      }

      // Category-scoped admins can only remove students from their own program
      if (adminScope && category !== adminScope) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: `You can only remove students from your own program (${adminScope}).` } }); return
      }

      const existing = await UserModel.findById(userId).select('email name categories category').lean()
      if (!existing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

      const existingCats: string[] = (existing.categories as string[] | undefined) ?? (existing.category ? [existing.category as string] : [])
      const updatedCats = existingCats.filter(c => c !== category)
      const primaryCat  = updatedCats[0] ?? null
      const newStatus   = updatedCats.length === 0 ? 'rejected' : 'approved'

      const adminUser = await UserModel.findById(admin.id).select('name email').lean()

      const updateDoc: Record<string, any> = {
        $set: { categories: updatedCats, category: primaryCat, enrollmentStatus: newStatus },
      }
      if (newStatus === 'rejected') {
        updateDoc.$set.rejectionReason  = `Access to the ${category} program was removed by an admin.`
        updateDoc.$set.rejectedBy       = admin.id
        updateDoc.$set.rejectedByEmail  = (adminUser as any)?.email ?? ''
        updateDoc.$set.rejectedByName   = (adminUser as any)?.name ?? ''
        updateDoc.$set.rejectedAt       = new Date()
        updateDoc.$unset = { approvedBy: '', approvedByEmail: '', approvedByName: '', approvedByRole: '', approvedAt: '' }
      }

      await UserModel.findByIdAndUpdate(userId, updateDoc)

      sendSuccess(res, { id: userId, enrollmentStatus: newStatus, categories: updatedCats }, 'Category removed')
    } catch (err) { next(err) }
  }

  updateStudentDocs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('@/models/schema.ts')
      const { Types }     = await import('mongoose')

      const userId = String(req.params['userId'] ?? '')
      if (!Types.ObjectId.isValid(userId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid user ID' } }); return
      }

      const { passportUrl, idDocUrl, photoUrl } = req.body as { passportUrl?: string; idDocUrl?: string; photoUrl?: string }
      const update: Record<string, unknown> = {}
      if (passportUrl !== undefined) update['enrollmentApplication.passportUrl'] = passportUrl
      if (idDocUrl    !== undefined) update['enrollmentApplication.idDocUrl']    = idDocUrl
      if (photoUrl    !== undefined) update['enrollmentApplication.photoUrl']    = photoUrl

      await UserModel.findByIdAndUpdate(userId, { $set: update })
      sendSuccess(res, { id: userId }, 'Documents updated')
    } catch (err) { next(err) }
  }

  /* ─── Sections ────────────────────────────────── */
  listSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const sections = await this.sectionService.list(courseId)
      sendSuccess(res, sections)
    } catch (err) { next(err) }
  }

  createSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const { title } = req.body as { title: string }
      await this.sectionService.assertCourseEditable(courseId, req.user!.id, req.user!.role, req.user!.categoryScope)
      const section = await this.sectionService.create({ courseId, title })
      sendSuccess(res, section, 'Section created', 201)
    } catch (err) { next(err) }
  }

  updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const dto = req.body as { title?: string; order?: number }
      /* Look up course to verify edit permission. */
      const section = await this.sectionRepo.findById(id)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role, req.user!.categoryScope)
      }
      const updated = await this.sectionService.update(id, dto)
      sendSuccess(res, updated, 'Section updated')
    } catch (err) { next(err) }
  }

  deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const section = await this.sectionRepo.findById(id)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role, req.user!.categoryScope)
      }
      await this.sectionService.delete(id)
      sendSuccess(res, null, 'Section deleted')
    } catch (err) { next(err) }
  }

  reorderSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const { ids } = req.body as { ids: string[] }
      await this.sectionService.assertCourseEditable(courseId, req.user!.id, req.user!.role, req.user!.categoryScope)
      const sections = await this.sectionService.reorder(courseId, ids)
      sendSuccess(res, sections, 'Sections reordered')
    } catch (err) { next(err) }
  }

  /* ─── Lessons ─────────────────────────────────── */
  createLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as Parameters<LessonService['create']>[0]
      /* Permission check via section → course */
      const section = await this.sectionRepo.findById(dto.sectionId)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role, req.user!.categoryScope)
      }
      const lesson = await this.lessonService.create(dto)
      sendSuccess(res, lesson, 'Lesson created', 201)
    } catch (err) { next(err) }
  }

  updateLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const existing = await this.lessonRepo.findById(id)
      if (existing) {
        await this.sectionService.assertCourseEditable(String(existing.courseId), req.user!.id, req.user!.role, req.user!.categoryScope)
      }
      const updated = await this.lessonService.update(id, req.body as Parameters<LessonService['update']>[1])
      sendSuccess(res, updated, 'Lesson updated')
    } catch (err) { next(err) }
  }

  deleteLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const existing = await this.lessonRepo.findById(id)
      if (existing) {
        await this.sectionService.assertCourseEditable(String(existing.courseId), req.user!.id, req.user!.role, req.user!.categoryScope)
      }
      await this.lessonService.delete(id)
      sendSuccess(res, null, 'Lesson deleted')
    } catch (err) { next(err) }
  }

  reorderLessons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sectionId = String(req.params['sectionId'] ?? '')
      const { ids } = req.body as { ids: string[] }
      const section = await this.sectionRepo.findById(sectionId)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role, req.user!.categoryScope)
      }
      const lessons = await this.lessonService.reorderInSection(sectionId, ids)
      sendSuccess(res, lessons, 'Lessons reordered')
    } catch (err) { next(err) }
  }

  moveLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = String(req.params['id'] ?? '')
      const { sectionId } = req.body as { sectionId: string }
      const existing = await this.lessonRepo.findById(lessonId)
      if (existing) {
        await this.sectionService.assertCourseEditable(String(existing.courseId), req.user!.id, req.user!.role, req.user!.categoryScope)
      }
      const lesson = await this.lessonService.moveToSection(lessonId, sectionId)
      sendSuccess(res, lesson, 'Lesson moved')
    } catch (err) { next(err) }
  }

  /* ─── Course outline (sections + lessons in one call) ─── */
  getOutline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['id'] ?? '')
      const [sections, lessons] = await Promise.all([
        this.sectionRepo.findByCourseOrdered(courseId),
        this.lessonRepo.findByCourseOrdered(courseId),
      ])
      sendSuccess(res, { sections, lessons })
    } catch (err) { next(err) }
  }

  /* ─── Analytics extensions ────────────────────── */
  enrollmentsTimeseries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = Math.min(180, Math.max(7, Number(req.query['days'] ?? 30)))
      const data = await this.admin.enrollmentsTimeseries(days)
      sendSuccess(res, data)
    } catch (err) { next(err) }
  }

  topCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(20, Math.max(1, Number(req.query['limit'] ?? 5)))
      const data  = await this.admin.topCourses(limit)
      sendSuccess(res, data)
    } catch (err) { next(err) }
  }

  completionStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.admin.completionStats()) } catch (err) { next(err) }
  }
}
