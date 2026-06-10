import type { Request, Response, NextFunction } from 'express'
import { SupportService } from '@/services/support.service.ts'
import { sendSuccess } from '@/utils/response.ts'

function requester(req: Request) {
  return { id: req.user!.id, role: req.user!.role as 'student' | 'instructor' | 'admin' }
}

export class SupportController {
  private readonly service = new SupportService()

  /* ── Client ── */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subject, category, message } = req.body as { subject: string; category?: any; message: string }
      const ticket = await this.service.create(requester(req), { subject, category, message })
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
      const status = req.query['status'] ? String(req.query['status']) : undefined
      const search = req.query['search'] ? String(req.query['search']) : undefined
      sendSuccess(res, await this.service.listAll({ status, search }))
    } catch (err) { next(err) }
  }

  stats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.adminStats())
    } catch (err) { next(err) }
  }

  setStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.body as { status: any }
      sendSuccess(res, await this.service.setStatus(String(req.params['id'] ?? ''), status), 'Status updated')
    } catch (err) { next(err) }
  }
}
