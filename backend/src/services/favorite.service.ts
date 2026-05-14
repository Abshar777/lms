import { Types } from 'mongoose'
import { FavoriteRepository } from '@/repositories/favorite.repository.ts'
import { CourseRepository } from '@/repositories/course.repository.ts'

export class FavoriteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'FavoriteError'
  }
}

export class FavoriteService {
  private readonly repo       = new FavoriteRepository()
  private readonly courseRepo = new CourseRepository()

  async add(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new FavoriteError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }
    const course = await this.courseRepo.findById(courseId)
    if (!course) throw new FavoriteError('COURSE_NOT_FOUND', 'Course not found', 404)
    return this.repo.upsert(userId, courseId)
  }

  async remove(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new FavoriteError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }
    return this.repo.remove(userId, courseId)
  }

  async listMine(userId: string, page: number, perPage: number) {
    return this.repo.listForUser(userId, { page, perPage })
  }

  /* Used by course detail page to render the heart filled/empty */
  async exists(userId: string, courseId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(courseId)) return false
    return this.repo.exists_(userId, courseId)
  }
}
