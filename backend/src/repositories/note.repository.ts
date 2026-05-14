import { Types } from 'mongoose'
import { LessonNoteModel, type ILessonNote } from '@/models/schema.ts'

export class NoteRepository {
  async upsert(
    userId:   string | Types.ObjectId,
    lessonId: string | Types.ObjectId,
    courseId: string | Types.ObjectId,
    body:     string,
  ): Promise<ILessonNote> {
    const doc = await LessonNoteModel.findOneAndUpdate(
      {
        userId:   new Types.ObjectId(userId.toString()),
        lessonId: new Types.ObjectId(lessonId.toString()),
      },
      { courseId: new Types.ObjectId(courseId.toString()), body },
      { new: true, upsert: true },
    ).exec()
    return doc!
  }

  async findByUserLesson(
    userId:   string | Types.ObjectId,
    lessonId: string | Types.ObjectId,
  ): Promise<ILessonNote | null> {
    return LessonNoteModel.findOne({
      userId:   new Types.ObjectId(userId.toString()),
      lessonId: new Types.ObjectId(lessonId.toString()),
    }).exec()
  }

  async listByUserCourse(
    userId:   string | Types.ObjectId,
    courseId: string | Types.ObjectId,
  ): Promise<ILessonNote[]> {
    return LessonNoteModel
      .find({
        userId:   new Types.ObjectId(userId.toString()),
        courseId: new Types.ObjectId(courseId.toString()),
      })
      .populate('lessonId', 'title order')
      .sort({ createdAt: -1 })
      .exec()
  }

  async deleteByUserLesson(
    userId:   string | Types.ObjectId,
    lessonId: string | Types.ObjectId,
  ): Promise<void> {
    await LessonNoteModel.deleteOne({
      userId:   new Types.ObjectId(userId.toString()),
      lessonId: new Types.ObjectId(lessonId.toString()),
    }).exec()
  }
}
