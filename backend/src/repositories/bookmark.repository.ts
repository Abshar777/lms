import { Types } from 'mongoose'
import { VideoBookmarkModel, type IVideoBookmark } from '@/models/schema.ts'

export class BookmarkRepository {
  async create(data: {
    userId:   string | Types.ObjectId
    lessonId: string | Types.ObjectId
    courseId: string | Types.ObjectId
    timeSecs: number
    label?:   string
  }): Promise<IVideoBookmark> {
    const doc = new VideoBookmarkModel({
      userId:   new Types.ObjectId(data.userId.toString()),
      lessonId: new Types.ObjectId(data.lessonId.toString()),
      courseId: new Types.ObjectId(data.courseId.toString()),
      timeSecs: data.timeSecs,
      label:    data.label,
    })
    return doc.save()
  }

  async findById(id: string | Types.ObjectId): Promise<IVideoBookmark | null> {
    return VideoBookmarkModel.findById(id).exec()
  }

  async listByUserLesson(
    userId:   string | Types.ObjectId,
    lessonId: string | Types.ObjectId,
  ): Promise<IVideoBookmark[]> {
    return VideoBookmarkModel
      .find({
        userId:   new Types.ObjectId(userId.toString()),
        lessonId: new Types.ObjectId(lessonId.toString()),
      })
      .sort({ timeSecs: 1 })
      .exec()
  }

  async listByUserCourse(
    userId:   string | Types.ObjectId,
    courseId: string | Types.ObjectId,
  ): Promise<IVideoBookmark[]> {
    return VideoBookmarkModel
      .find({
        userId:   new Types.ObjectId(userId.toString()),
        courseId: new Types.ObjectId(courseId.toString()),
      })
      .populate('lessonId', 'title')
      .sort({ createdAt: -1 })
      .exec()
  }

  async deleteByIdAndUser(
    id:     string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<boolean> {
    const res = await VideoBookmarkModel.deleteOne({
      _id:    new Types.ObjectId(id.toString()),
      userId: new Types.ObjectId(userId.toString()),
    }).exec()
    return res.deletedCount > 0
  }
}
