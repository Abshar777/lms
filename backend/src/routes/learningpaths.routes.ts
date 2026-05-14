import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { sendSuccess, parsePagination, buildPaginationMeta } from '@/utils/response.ts'
import { LearningPathService } from '@/services/learningpath.service.ts'

const router = Router()
const svc    = new LearningPathService()

const listQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).optional(),
  per_page:   z.coerce.number().int().min(1).max(100).optional(),
  categoryId: z.string().optional(),
})

const courseItemSchema = z.object({
  courseId:       z.string(),
  order:          z.number().int().min(1),
  isPrerequisite: z.boolean().optional(),
})

const upsertSchema = z.object({
  title:        z.string().min(3).max(255),
  description:  z.string().max(5000).optional(),
  thumbnailUrl: z.string().url().max(2048).optional(),
  categoryId:   z.string().optional(),
  status:       z.enum(['draft', 'published']).optional(),
  courses:      z.array(courseItemSchema).optional(),
})

const updateSchema = upsertSchema.partial()

/* ── Public routes ──────────────────────────────────── */

/* GET /learning-paths */
router.get(
  '/',
  validate(listQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const result = await svc.listPublished({
        page,
        per_page,
        categoryId: req.query['categoryId'] as string | undefined,
      })
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },
)

/* GET /learning-paths/admin/list  (must come BEFORE /:slug) */
router.get(
  '/admin/list',
  authenticate,
  requireRole('admin', 'instructor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const result = await svc.adminList({ page, per_page })
      sendSuccess(res, result)
    } catch (err) {
      next(err)
    }
  },
)

/* GET /learning-paths/:slug */
router.get(
  '/:slug',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = await svc.getBySlug(String(req.params['slug'] ?? ''))
      sendSuccess(res, { path })
    } catch (err) {
      next(err)
    }
  },
)

/* ── Authenticated write routes ─────────────────────── */

/* POST /learning-paths */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'instructor'),
  validate(upsertSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = await svc.adminCreate(req.user!.id, req.body)
      sendSuccess(res, { path }, 'Learning path created', 201)
    } catch (err) {
      next(err)
    }
  },
)

/* PATCH /learning-paths/:id */
router.patch(
  '/:id',
  authenticate,
  requireRole('admin', 'instructor'),
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = await svc.adminUpdate(String(req.params['id'] ?? ''), req.body)
      sendSuccess(res, { path })
    } catch (err) {
      next(err)
    }
  },
)

/* DELETE /learning-paths/:id */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.adminDelete(String(req.params['id'] ?? ''))
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)

export default router
