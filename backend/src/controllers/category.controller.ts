import type { Request, Response, NextFunction } from 'express'
import { CategoryService } from '@/services/category.service.ts'
import { sendSuccess } from '@/utils/response.ts'

export class CategoryController {
  private readonly service = new CategoryService()

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const docs = await this.service.listAll()
      sendSuccess(res, docs)
    } catch (err) {
      next(err)
    }
  }
}
