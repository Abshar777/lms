import type { Request, Response, NextFunction } from 'express'
import { SupportService } from '@/services/support.service.ts'
import { sendSuccess } from '@/utils/response.ts'

function requester(req: Request) {
  const role = req.user!.role as any
  // Normalize all staff roles so the service recognises them
  return {
    id:            req.user!.id,
    role,
    categoryScope: (req.user as any).categoryScope as '4x-trading' | 'digital-marketing' | undefined,
  }
}

export class SupportController {
  private readonly service = new SupportService()

  /* ── Client ── */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subject, category, message } = req.body as { subject: string; category?: any; message: string }

      // Attach the student's program so tickets are scoped to their category
      let program: string | undefined
      const userRole = req.user!.role
      if (userRole === 'student') {
        const { UserModel } = await import('@/models/schema.ts')
        const user = await UserModel.findById(req.user!.id).select('category').lean()
        const cat = (user as any)?.category as string | undefined
        if (cat === '4x-trading' || cat === 'digital-marketing') program = cat
      }

      const ticket = await this.service.create(requester(req), { subject, category, message, program })
      sendSuccess(res, ticket, 'Ticket created', 201)
    } catch (err) { next(err) }
  }

  myTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.listForUser(req.user!.id))
    } catch (err) { next(err) }
  }

  /* ── Shared (owner or staff) ── */
  getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getOne(String(req.params['id'] ?? ''), requester(req)))
    } catch (err) { next(err) }
  }

  addMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { body } = req.body as { body: string }
      sendSuccess(res, await this.service.addMessage(String(req.params['id'] ?? ''), requester(req), body))
    } catch (err) { next(err) }
  }

  /* ── Admin ── */
  listAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status  = req.query['status']  ? String(req.query['status'])  : undefined
      const search  = req.query['search']  ? String(req.query['search'])  : undefined
      // category-scoped admins are restricted to their program; super/admin can pass ?program= to filter
      const scope   = (req.user as any).categoryScope as string | undefined
      const program = scope ?? (req.query['program'] ? String(req.query['program']) : undefined)
      sendSuccess(res, await this.service.listAll({ status, search, program }))
    } catch (err) { next(err) }
  }

  stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope   = (req.user as any).categoryScope as string | undefined
      const program = scope ?? (req.query['program'] ? String(req.query['program']) : undefined)
      sendSuccess(res, await this.service.adminStats(program))
    } catch (err) { next(err) }
  }

  setStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.body as { status: any }
      sendSuccess(res, await this.service.setStatus(String(req.params['id'] ?? ''), status), 'Status updated')
    } catch (err) { next(err) }
  }
}
