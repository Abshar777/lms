import { Types } from 'mongoose'
import { LearningPathRepository } from '@/repositories/learningpath.repository.ts'
import { buildPaginationMeta, parsePagination } from '@/utils/response.ts'

export class LearningPathError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'LearningPathError'
  }
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export class LearningPathService {
  private readonly repo = new LearningPathRepository()

  async listPublished(params: {
    page?:       number
    per_page?:   number
    categoryId?: string
  }) {
    const { page, per_page } = parsePagination({ page: params.page, per_page: params.per_page })
    const { docs, total } = await this.repo.listPublished(page, per_page, params.categoryId)
    return { paths: docs, meta: buildPaginationMeta(total, page, per_page) }
  }

  async getBySlug(slug: string) {
    const path = await this.repo.findBySlug(slug, true)
    if (!path || path.status !== 'published') {
      throw new LearningPathError('PATH_NOT_FOUND', 'Learning path not found', 404)
    }
    return path
  }

  /* ── Admin CRUD ────────────────────────────────────── */

  async adminList(params: { page?: number; per_page?: number }) {
    const { page, per_page } = parsePagination({ page: params.page, per_page: params.per_page })
    const { docs, total } = await this.repo.listAll(page, per_page)
    return { paths: docs, meta: buildPaginationMeta(total, page, per_page) }
  }

  async adminCreate(instructorId: string, dto: {
    title:        string
    description?: string
    thumbnailUrl?: string
    categoryId?:  string
    status?:      'draft' | 'published'
    courses?:     { courseId: string; order: number; isPrerequisite?: boolean }[]
  }) {
    const slug = toSlug(dto.title)
    const existing = await this.repo.findBySlug(slug)
    if (existing) throw new LearningPathError('SLUG_EXISTS', 'A learning path with this title already exists', 409)

    const data: Record<string, unknown> = {
      title:        dto.title.trim(),
      slug,
      instructorId: new Types.ObjectId(instructorId),
      status:       dto.status ?? 'draft',
    }
    if (dto.description)   data['description']   = dto.description
    if (dto.thumbnailUrl)  data['thumbnailUrl']   = dto.thumbnailUrl
    if (dto.categoryId)    data['categoryId']     = new Types.ObjectId(dto.categoryId)
    if (dto.courses?.length) {
      data['courses'] = dto.courses.map(c => ({
        courseId:       new Types.ObjectId(c.courseId),
        order:          c.order,
        isPrerequisite: c.isPrerequisite ?? false,
      }))
    }

    return this.repo.create(data as Parameters<typeof this.repo.create>[0])
  }

  async adminUpdate(id: string, dto: {
    title?:        string
    description?:  string
    thumbnailUrl?: string
    categoryId?:   string
    status?:       'draft' | 'published'
    courses?:      { courseId: string; order: number; isPrerequisite?: boolean }[]
  }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new LearningPathError('INVALID_ID', 'Invalid learning path id', 400)
    }
    const patch: Record<string, unknown> = {}
    if (dto.title)         patch['title']        = dto.title.trim()
    if (dto.description != null) patch['description'] = dto.description
    if (dto.thumbnailUrl != null) patch['thumbnailUrl'] = dto.thumbnailUrl
    if (dto.categoryId)   patch['categoryId']    = new Types.ObjectId(dto.categoryId)
    if (dto.status)       patch['status']        = dto.status
    if (dto.courses)      patch['courses']       = dto.courses.map(c => ({
      courseId:       new Types.ObjectId(c.courseId),
      order:          c.order,
      isPrerequisite: c.isPrerequisite ?? false,
    }))

    const updated = await this.repo.update(id, patch as Parameters<typeof this.repo.update>[1])
    if (!updated) throw new LearningPathError('PATH_NOT_FOUND', 'Learning path not found', 404)
    return updated
  }

  async adminDelete(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new LearningPathError('INVALID_ID', 'Invalid learning path id', 400)
    }
    await this.repo.deleteById(id)
  }
}
