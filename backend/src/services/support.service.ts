import { Types } from 'mongoose'
import {
  SupportTicketModel,
  type ISupportTicket,
  type SupportTicketStatus,
  type SupportCategory,
} from '@/models/schema.ts'
import { NotificationService } from '@/services/notification.service.ts'
import { logger } from '@/utils/logger.ts'

export class SupportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'SupportError'
  }
}

type Requester = { id: string; role: 'student' | 'instructor' | 'admin' }
const isStaff = (r: Requester) => r.role === 'admin'

const notifSvc = new NotificationService()

export class SupportService {
  /* ── Client opens a new ticket ─────────────────────── */
  async create(
    requester: Requester,
    input: { subject: string; category?: SupportCategory; message: string },
  ): Promise<ISupportTicket> {
    const ticket = await SupportTicketModel.create({
      userId:         new Types.ObjectId(requester.id),
      subject:        input.subject.trim(),
      category:       input.category ?? 'other',
      status:         'open',
      messages:       [{
        senderId:   new Types.ObjectId(requester.id),
        senderRole: requester.role,
        body:       input.message.trim(),
        createdAt:  new Date(),
      }],
      lastMessageAt:  new Date(),
      lastSenderRole: requester.role,
      userUnread:     false,
      adminUnread:    true,
    })
    return this.populate(ticket.id)
  }

  /* ── Client: list my tickets ───────────────────────── */
  async listForUser(userId: string): Promise<ISupportTicket[]> {
    return SupportTicketModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ lastMessageAt: -1 })
      .populate('userId', 'name email avatarUrl')
      .exec()
  }

  /* ── Admin: list all tickets ───────────────────────── */
  async listAll(filter: { status?: string; search?: string } = {}): Promise<ISupportTicket[]> {
    const query: Record<string, unknown> = {}
    if (filter.status && filter.status !== 'all') query['status'] = filter.status
    if (filter.search?.trim()) query['subject'] = { $regex: filter.search.trim(), $options: 'i' }
    return SupportTicketModel
      .find(query)
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .populate('userId', 'name email avatarUrl')
      .exec()
  }

  /* ── Admin: status counts for the inbox header ─────── */
  async adminStats(): Promise<{ open: number; pending: number; resolved: number; closed: number; unread: number }> {
    const [open, pending, resolved, closed, unread] = await Promise.all([
      SupportTicketModel.countDocuments({ status: 'open' }),
      SupportTicketModel.countDocuments({ status: 'pending' }),
      SupportTicketModel.countDocuments({ status: 'resolved' }),
      SupportTicketModel.countDocuments({ status: 'closed' }),
      SupportTicketModel.countDocuments({ adminUnread: true }),
    ])
    return { open, pending, resolved, closed, unread }
  }

  /* ── View a single ticket (owner or staff) ─────────── */
  async getOne(ticketId: string, requester: Requester): Promise<ISupportTicket> {
    if (!Types.ObjectId.isValid(ticketId)) throw new SupportError('INVALID_ID', 'Invalid ticket id', 400)
    const ticket = await SupportTicketModel.findById(ticketId)
    if (!ticket) throw new SupportError('NOT_FOUND', 'Ticket not found', 404)
    this.assertAccess(ticket, requester)

    // Clear the unread flag for whoever is viewing
    if (isStaff(requester) && ticket.adminUnread) { ticket.adminUnread = false; await ticket.save() }
    else if (!isStaff(requester) && ticket.userUnread) { ticket.userUnread = false; await ticket.save() }

    return this.populate(ticketId)
  }

  /* ── Add a reply (owner or staff) ──────────────────── */
  async addMessage(ticketId: string, requester: Requester, body: string): Promise<ISupportTicket> {
    if (!Types.ObjectId.isValid(ticketId)) throw new SupportError('INVALID_ID', 'Invalid ticket id', 400)
    const ticket = await SupportTicketModel.findById(ticketId)
    if (!ticket) throw new SupportError('NOT_FOUND', 'Ticket not found', 404)
    this.assertAccess(ticket, requester)
    if (ticket.status === 'closed') throw new SupportError('TICKET_CLOSED', 'This ticket is closed. Open a new one if you still need help.', 400)

    const staff = isStaff(requester)
    ticket.messages.push({
      senderId:   new Types.ObjectId(requester.id),
      senderRole: requester.role,
      body:       body.trim(),
      createdAt:  new Date(),
    })
    ticket.lastMessageAt  = new Date()
    ticket.lastSenderRole = requester.role
    // staff reply → awaiting user; user reply → awaiting staff
    ticket.status      = staff ? 'pending' : 'open'
    ticket.userUnread  = staff ? true  : ticket.userUnread
    ticket.adminUnread = staff ? false : true
    await ticket.save()

    // Notify the client when staff replies (fire-and-forget)
    if (staff) {
      void notifSvc.create(String(ticket.userId), {
        kind:  'system',
        title: `Support replied: ${ticket.subject}`,
        body:  body.trim().slice(0, 140),
        link:  '/support',
      }).catch(err => logger.error({ err }, '[support] reply notification failed'))
    }

    return this.populate(ticketId)
  }

  /* ── Admin: change ticket status ───────────────────── */
  async setStatus(ticketId: string, status: SupportTicketStatus): Promise<ISupportTicket> {
    if (!Types.ObjectId.isValid(ticketId)) throw new SupportError('INVALID_ID', 'Invalid ticket id', 400)
    const ticket = await SupportTicketModel.findByIdAndUpdate(
      ticketId,
      { $set: { status } },
      { new: true },
    )
    if (!ticket) throw new SupportError('NOT_FOUND', 'Ticket not found', 404)
    return this.populate(ticketId)
  }

  /* ── helpers ───────────────────────────────────────── */
  private assertAccess(ticket: ISupportTicket, requester: Requester): void {
    if (isStaff(requester)) return
    if (String(ticket.userId) !== requester.id) {
      throw new SupportError('FORBIDDEN', 'You do not have access to this ticket', 403)
    }
  }

  private async populate(ticketId: string): Promise<ISupportTicket> {
    return SupportTicketModel
      .findById(ticketId)
      .populate('userId', 'name email avatarUrl')
      .populate('messages.senderId', 'name avatarUrl role')
      .exec() as unknown as ISupportTicket
  }
}
