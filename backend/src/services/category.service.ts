import { Types } from 'mongoose'
import { CategoryRepository } from '@/repositories/category.repository.ts'
import type { ICategory } from '@/models/schema.ts'

export class CategoryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'CategoryError'
  }
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

export class CategoryService {
  private readonly repo = new CategoryRepository()

  async listAll() {
    return this.repo.listAll()
  }

  async create(input: { name: string; description?: string; icon?: string; slug?: string }): Promise<ICategory> {
    const name = input.name.trim()
    if (!name) throw new CategoryError('INVALID_NAME', 'Name is required', 400)
    const slug = (input.slug?.trim() || slugify(name)).toLowerCase()
    if (await this.repo.nameExists(name)) {
      throw new CategoryError('NAME_TAKEN', 'A category with this name already exists.', 409)
    }
    if (await this.repo.slugExists(slug)) {
      throw new CategoryError('SLUG_TAKEN', 'A category with this slug already exists.', 409)
    }
    return this.repo.create({ name, slug, description: input.description, icon: input.icon } as Partial<ICategory>)
  }

  async update(id: string, input: Partial<{ name: string; description: string; icon: string; slug: string }>): Promise<ICategory> {
    if (!Types.ObjectId.isValid(id)) throw new CategoryError('INVALID_ID', 'Invalid id', 400)
    const existing = await this.repo.findById(id)
    if (!existing) throw new CategoryError('CATEGORY_NOT_FOUND', 'Category not found.', 404)

    const data: Partial<ICategory> = {}
    if (input.name !== undefined) {
      const n = input.name.trim()
      if (n && n !== existing.name && await this.repo.nameExists(n, id)) {
        throw new CategoryError('NAME_TAKEN', 'A category with this name already exists.', 409)
      }
      data.name = n
    }
    if (input.slug !== undefined) {
      const s = input.slug.toLowerCase().trim()
      if (s && s !== existing.slug && await this.repo.slugExists(s, id)) {
        throw new CategoryError('SLUG_TAKEN', 'A category with this slug already exists.', 409)
      }
      data.slug = s
    }
    if (input.description !== undefined) data.description = input.description
    if (input.icon        !== undefined) data.icon        = input.icon
    const updated = await this.repo.updateById(id, data)
    if (!updated) throw new CategoryError('CATEGORY_NOT_FOUND', 'Category not found.', 404)
    return updated
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new CategoryError('INVALID_ID', 'Invalid id', 400)
    const ok = await this.repo.hardDelete(id)
    if (!ok) throw new CategoryError('CATEGORY_NOT_FOUND', 'Category not found.', 404)
  }
}
