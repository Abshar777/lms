import { Types } from 'mongoose'
import { AssignmentRepository, AssignmentSubmissionRepository } from '@/repositories/assignment.repository.ts'
import { EnrollmentRepository } from '@/repositories/enrollment.repository.ts'
import { LessonModel, type IAssignment, type IAssignmentSubmission } from '@/models/schema.ts'

export class AssignmentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AssignmentError'
  }
}

export class AssignmentService {
  private readonly assignRepo     = new AssignmentRepository()
  private readonly submissionRepo = new AssignmentSubmissionRepository()
  private readonly enrollRepo     = new EnrollmentRepository()

  /* ── Admin: upsert assignment for a lesson ─────── */
  async upsert(
    lessonId: string,
    data: { title: string; instructions: string; dueDate?: Date; maxScore?: number },
  ): Promise<IAssignment> {
    const lesson = await LessonModel.findById(lessonId).exec()
    if (!lesson) throw new AssignmentError('LESSON_NOT_FOUND', 'Lesson not found', 404)
    if (lesson.type !== 'assignment') {
      throw new AssignmentError('WRONG_TYPE', 'Lesson must be type "assignment"', 400)
    }
    return this.assignRepo.upsertForLesson(lessonId, lesson.courseId.toString(), {
      title:        data.title.trim(),
      instructions: data.instructions.trim(),
      dueDate:      data.dueDate,
      maxScore:     data.maxScore ?? 100,
    })
  }

  async getByLesson(lessonId: string): Promise<IAssignment | null> {
    return this.assignRepo.findByLesson(lessonId)
  }

  async deleteByLesson(lessonId: string): Promise<void> {
    await this.assignRepo.deleteByLesson(lessonId)
  }

  /* ── Student: submit assignment ─────────────────── */
  async submit(
    userId: string,
    lessonId: string,
    data: { submissionUrl?: string; submissionText?: string },
  ): Promise<IAssignmentSubmission> {
    if (!data.submissionUrl && !data.submissionText) {
      throw new AssignmentError('EMPTY_SUBMISSION', 'Provide a URL or text submission', 400)
    }
    const assignment = await this.assignRepo.findByLesson(lessonId)
    if (!assignment) throw new AssignmentError('NOT_FOUND', 'Assignment not found', 404)

    const enrolled = await this.enrollRepo.findByUserCourse(userId, assignment.courseId.toString())
    if (!enrolled) throw new AssignmentError('NOT_ENROLLED', 'You must be enrolled to submit', 403)

    return this.submissionRepo.upsertSubmission(userId, assignment.id, assignment.courseId.toString(), data)
  }

  /* ── Student: get my submission ─────────────────── */
  async getMySubmission(userId: string, lessonId: string): Promise<IAssignmentSubmission | null> {
    const assignment = await this.assignRepo.findByLesson(lessonId)
    if (!assignment) return null
    return this.submissionRepo.findByUserAssignment(userId, assignment.id)
  }

  /* ── Admin/Instructor: list submissions for an assignment ─ */
  async listSubmissions(lessonId: string): Promise<IAssignmentSubmission[]> {
    const assignment = await this.assignRepo.findByLesson(lessonId)
    if (!assignment) throw new AssignmentError('NOT_FOUND', 'Assignment not found', 404)
    return this.submissionRepo.listByAssignment(assignment.id)
  }

  /* ── Admin/Instructor: grade a submission ─────── */
  async grade(
    submissionId: string,
    graderId: string,
    data: { grade: number; feedback?: string },
  ): Promise<IAssignmentSubmission> {
    const submission = await this.submissionRepo.findById(submissionId)
    if (!submission) throw new AssignmentError('NOT_FOUND', 'Submission not found', 404)

    const assignment = await this.assignRepo.findById(submission.assignmentId.toString())
    if (assignment && data.grade > assignment.maxScore) {
      throw new AssignmentError('GRADE_TOO_HIGH', `Grade cannot exceed maxScore (${assignment.maxScore})`, 400)
    }

    const updated = await this.submissionRepo.grade(submissionId, graderId, data.grade, data.feedback)
    if (!updated) throw new AssignmentError('NOT_FOUND', 'Submission not found', 404)
    return updated
  }
}
