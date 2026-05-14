import { Types } from 'mongoose'
import { ReviewRepository } from '@/repositories/review.repository.ts'
import { CourseRepository } from '@/repositories/course.repository.ts'
import { EnrollmentRepository } from '@/repositories/enrollment.repository.ts'

export class ReviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'ReviewError'
  }
}

export class ReviewService {
  private readonly reviewRepo = new ReviewRepository()
  private readonly courseRepo = new CourseRepository()
  private readonly enrollRepo = new EnrollmentRepository()

  async submit(
    userId: string,
    courseId: string,
    dto: { rating: number; comment?: string },
  ) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new ReviewError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }

    /* Must be enrolled (and not dropped) to review */
    const enrollment = await this.enrollRepo.findByUserCourse(userId, courseId)
    if (!enrollment || enrollment.status === 'dropped') {
      throw new ReviewError('NOT_ENROLLED', 'Only enrolled students can review this course', 403)
    }

    const review = await this.reviewRepo.upsertOne(userId, courseId, dto.rating, dto.comment)
    await this.courseRepo.recomputeRating(courseId)
    return review
  }

  async listForCourse(courseId: string, page: number, perPage: number) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new ReviewError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }
    return this.reviewRepo.findByCourse(courseId, page, perPage)
  }

  async listAll(page: number, perPage: number) {
    return this.reviewRepo.listAll(page, perPage)
  }

  async deleteOwn(userId: string, reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new ReviewError('INVALID_REVIEW_ID', 'Invalid review id', 400)
    }
    const review = await this.reviewRepo.findOwn(reviewId, userId)
    if (!review) {
      throw new ReviewError('REVIEW_NOT_FOUND', 'Review not found', 404)
    }
    const courseId = review.courseId
    await this.reviewRepo.hardDelete(reviewId)
    await this.courseRepo.recomputeRating(courseId)
  }

  /* Admin-only: delete any review (moderation). Bypasses the ownership
     check used by deleteOwn. */
  async adminDelete(reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new ReviewError('INVALID_REVIEW_ID', 'Invalid review id', 400)
    }
    const review = await this.reviewRepo.findById(reviewId)
    if (!review) {
      throw new ReviewError('REVIEW_NOT_FOUND', 'Review not found', 404)
    }
    const courseId = review.courseId
    await this.reviewRepo.hardDelete(reviewId)
    await this.courseRepo.recomputeRating(courseId)
  }

  /* 6.2 — instructor / admin replies to a review */
  async replyToReview(
    actorId:      string,
    actorRole:    string,
    reviewId:     string,
    reply:        string,
  ) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new ReviewError('INVALID_REVIEW_ID', 'Invalid review id', 400)
    }
    const review = await this.reviewRepo.findById(reviewId)
    if (!review) {
      throw new ReviewError('REVIEW_NOT_FOUND', 'Review not found', 404)
    }

    /* Instructors can only reply to reviews on their own courses */
    if (actorRole === 'instructor') {
      const course = await this.courseRepo.findById(review.courseId.toString())
      if (!course || course.instructorId.toString() !== actorId) {
        throw new ReviewError('FORBIDDEN', 'You can only reply to reviews on your own courses', 403)
      }
    }

    return this.reviewRepo.addInstructorReply(reviewId, actorId, reply)
  }

  /* 6.3 — helpful / report vote */
  async vote(
    userId:   string,
    reviewId: string,
    type:     'helpful' | 'report',
  ) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new ReviewError('INVALID_REVIEW_ID', 'Invalid review id', 400)
    }
    const review = await this.reviewRepo.findById(reviewId)
    if (!review) {
      throw new ReviewError('REVIEW_NOT_FOUND', 'Review not found', 404)
    }
    return this.reviewRepo.vote(userId, reviewId, type)
  }
}
