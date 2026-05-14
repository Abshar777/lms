import { BaseRepository } from './base.repository.ts'
import { CategoryModel, type ICategory } from '@/models/schema.ts'

export class CategoryRepository extends BaseRepository<ICategory> {
  constructor() {
    super(CategoryModel)
  }

  async listAll(): Promise<ICategory[]> {
    return this.findMany({}, { sort: { name: 1 } })
  }

  async findBySlug(slug: string): Promise<ICategory | null> {
    return this.findOne({ slug })
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { slug: slug.toLowerCase() }
    if (excludeId) filter['_id'] = { $ne: excludeId }
    return this.exists(filter)
  }

  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { name }
    if (excludeId) filter['_id'] = { $ne: excludeId }
    return this.exists(filter)
  }
}
