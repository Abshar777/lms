import { AuditLogModel, type IAuditLog, type AuditAction } from '@/models/schema.ts'
import { Types } from 'mongoose'

export interface CreateAuditLogDto {
  actorId:    string | Types.ObjectId
  actorEmail: string
  actorRole:  string
  action:     AuditAction
  entity:     string
  entityId?:  string
  meta?:      Record<string, unknown>
  ip?:        string
  userAgent?: string
}

export class AuditLogRepository {
  async create(dto: CreateAuditLogDto): Promise<IAuditLog> {
    return AuditLogModel.create({
      actorId:    new Types.ObjectId(String(dto.actorId)),
      actorEmail: dto.actorEmail,
      actorRole:  dto.actorRole,
      action:     dto.action,
      entity:     dto.entity,
      entityId:   dto.entityId,
      meta:       dto.meta,
      ip:         dto.ip,
      userAgent:  dto.userAgent,
    })
  }

  async list(page: number, perPage: number, filter: {
    actorId?: string
    action?:  string
    entity?:  string
  } = {}): Promise<{ docs: IAuditLog[]; totalCount: number }> {
    const q: Record<string, unknown> = {}
    if (filter.actorId && Types.ObjectId.isValid(filter.actorId)) {
      q['actorId'] = new Types.ObjectId(filter.actorId)
    }
    if (filter.action) q['action'] = filter.action
    if (filter.entity) q['entity'] = filter.entity

    const [docs, totalCount] = await Promise.all([
      AuditLogModel.find(q).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).exec(),
      AuditLogModel.countDocuments(q).exec(),
    ])
    return { docs, totalCount }
  }
}
