import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { UserRole, CourseStatus, LessonType, EnrollmentStatus } from '@/types/index.ts'

/* ─────────────────────────────────────────────────────
   Shared schema transform
   ─────────────────────────────────────────────────────
   Applied to every schema's toJSON / toObject:
   • Exposes id (string) instead of _id (ObjectId)
   • Removes __v (version key)
───────────────────────────────────────────────────── */
const baseTransform = (_doc: Document, ret: Record<string, unknown>) => {
  ret['id'] = (ret['_id'] as Types.ObjectId).toString()
  delete ret['_id']
  delete ret['__v']
  return ret
}

const baseSchemaOptions = {
  timestamps: true,
  toJSON:   { virtuals: true, transform: baseTransform },
  toObject: { virtuals: true, transform: baseTransform },
}

/* ─────────────────────────────────────────────────────
   USER
───────────────────────────────────────────────────── */
export interface IUser extends Document {
  id:            string
  name:          string
  email:         string
  passwordHash?: string
  avatarUrl?:    string
  role:          UserRole
  isVerified:    boolean
  isActive:      boolean
  /* OAuth */
  provider?:     string
  providerId?:   string
  /* Profile */
  bio?:          string
  headline?:     string
  websiteUrl?:   string
  /* Meta */
  lastLoginAt?:  Date
  createdAt:     Date
  updatedAt:     Date
}

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true, trim: true, maxlength: 120 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },   // excluded from queries by default
    avatarUrl:    { type: String },
    role:         { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
    isVerified:   { type: Boolean, default: false },
    isActive:     { type: Boolean, default: true },
    provider:     { type: String },
    providerId:   { type: String },
    bio:          { type: String },
    headline:     { type: String, maxlength: 255 },
    websiteUrl:   { type: String },
    lastLoginAt:  { type: Date },
  },
  baseSchemaOptions,
)

UserSchema.index({ email: 1 })
UserSchema.index({ provider: 1, providerId: 1 })

export const UserModel = mongoose.model<IUser>('User', UserSchema)

/* ─────────────────────────────────────────────────────
   REFRESH TOKEN
───────────────────────────────────────────────────── */
export interface IRefreshToken extends Document {
  id:         string
  userId:     Types.ObjectId
  tokenHash:  string
  isRevoked:  boolean
  expiresAt:  Date
  createdAt:  Date
  updatedAt:  Date
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    isRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  baseSchemaOptions,
)

RefreshTokenSchema.index({ userId: 1 })
RefreshTokenSchema.index({ tokenHash: 1 })
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })  // TTL index — auto-deletes

export const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)

/* ─────────────────────────────────────────────────────
   CATEGORY
───────────────────────────────────────────────────── */
export interface ICategory extends Document {
  id:          string
  name:        string
  slug:        string
  description?: string
  icon?:       string
  createdAt:   Date
  updatedAt:   Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name:        { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    slug:        { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    icon:        { type: String },
  },
  baseSchemaOptions,
)

export const CategoryModel = mongoose.model<ICategory>('Category', CategorySchema)

/* ─────────────────────────────────────────────────────
   COURSE
───────────────────────────────────────────────────── */
export interface ICourse extends Document {
  id:             string
  title:          string
  slug:           string
  description?:   string
  thumbnailUrl?:  string
  previewUrl?:    string
  price:          number
  isFree:         boolean
  status:         CourseStatus
  level?:         string
  durationMins:   number
  language:       string
  tags?:          string[]
  instructorId:   Types.ObjectId
  categoryId?:    Types.ObjectId
  /* Denormalized stats */
  enrolledCount:  number
  ratingAvg:      number
  ratingCount:    number
  createdAt:      Date
  updatedAt:      Date
}

const CourseSchema = new Schema<ICourse>(
  {
    title:         { type: String, required: true, trim: true, maxlength: 255 },
    slug:          { type: String, required: true, unique: true, lowercase: true },
    description:   { type: String },
    thumbnailUrl:  { type: String },
    previewUrl:    { type: String },
    price:         { type: Number, default: 0, min: 0 },
    isFree:        { type: Boolean, default: false },
    status:        { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    level:         { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    durationMins:  { type: Number, default: 0 },
    language:      { type: String, default: 'English' },
    tags:          [{ type: String }],
    instructorId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId:    { type: Schema.Types.ObjectId, ref: 'Category' },
    enrolledCount: { type: Number, default: 0 },
    ratingAvg:     { type: Number, default: 0 },
    ratingCount:   { type: Number, default: 0 },
  },
  baseSchemaOptions,
)

CourseSchema.index({ slug: 1 })
CourseSchema.index({ instructorId: 1 })
CourseSchema.index({ categoryId: 1 })
CourseSchema.index({ status: 1 })
CourseSchema.index({ title: 'text', description: 'text', tags: 'text' })  // full-text search

export const CourseModel = mongoose.model<ICourse>('Course', CourseSchema)

/* ─────────────────────────────────────────────────────
   SECTION  (course chapter)
───────────────────────────────────────────────────── */
export interface ISection extends Document {
  id:        string
  courseId:  Types.ObjectId
  title:     string
  order:     number
  createdAt: Date
  updatedAt: Date
}

const SectionSchema = new Schema<ISection>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title:    { type: String, required: true, trim: true, maxlength: 255 },
    order:    { type: Number, default: 0 },
  },
  baseSchemaOptions,
)

SectionSchema.index({ courseId: 1, order: 1 })

export const SectionModel = mongoose.model<ISection>('Section', SectionSchema)

/* ─────────────────────────────────────────────────────
   LESSON
───────────────────────────────────────────────────── */
export interface ILesson extends Document {
  id:           string
  sectionId:    Types.ObjectId
  courseId:     Types.ObjectId
  title:        string
  type:         LessonType
  contentUrl?:  string
  contentBody?: string
  durationMins: number
  order:        number
  isFree:       boolean
  createdAt:    Date
  updatedAt:    Date
}

const LessonSchema = new Schema<ILesson>(
  {
    sectionId:   { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    courseId:    { type: Schema.Types.ObjectId, ref: 'Course',  required: true },
    title:       { type: String, required: true, trim: true, maxlength: 255 },
    type:        { type: String, enum: ['video', 'article', 'quiz'], default: 'video' },
    contentUrl:  { type: String },
    contentBody: { type: String },
    durationMins: { type: Number, default: 0 },
    order:       { type: Number, default: 0 },
    isFree:      { type: Boolean, default: false },
  },
  baseSchemaOptions,
)

LessonSchema.index({ courseId: 1, order: 1 })
LessonSchema.index({ sectionId: 1 })

export const LessonModel = mongoose.model<ILesson>('Lesson', LessonSchema)

/* ─────────────────────────────────────────────────────
   ENROLLMENT
───────────────────────────────────────────────────── */
export interface IEnrollment extends Document {
  id:              string
  userId:          Types.ObjectId
  courseId:        Types.ObjectId
  status:          EnrollmentStatus
  progressPercent: number
  enrolledAt:      Date
  completedAt?:    Date
  createdAt:       Date
  updatedAt:       Date
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    userId:          { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    courseId:        { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status:          { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    enrolledAt:      { type: Date, default: Date.now },
    completedAt:     { type: Date },
  },
  baseSchemaOptions,
)

EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true })  // one enrollment per user/course
EnrollmentSchema.index({ userId: 1 })
EnrollmentSchema.index({ courseId: 1 })

export const EnrollmentModel = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema)

/* ─────────────────────────────────────────────────────
   LESSON PROGRESS
───────────────────────────────────────────────────── */
export interface ILessonProgress extends Document {
  id:             string
  userId:         Types.ObjectId
  lessonId:       Types.ObjectId
  courseId:       Types.ObjectId
  isCompleted:    boolean
  watchTimeSecs:  number
  completedAt?:   Date
  createdAt:      Date
  updatedAt:      Date
}

const LessonProgressSchema = new Schema<ILessonProgress>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    lessonId:      { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    courseId:      { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    isCompleted:   { type: Boolean, default: false },
    watchTimeSecs: { type: Number, default: 0 },
    completedAt:   { type: Date },
  },
  baseSchemaOptions,
)

LessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true })
LessonProgressSchema.index({ userId: 1, courseId: 1 })

export const LessonProgressModel = mongoose.model<ILessonProgress>('LessonProgress', LessonProgressSchema)

/* ─────────────────────────────────────────────────────
   REVIEW
───────────────────────────────────────────────────── */
export interface IReview extends Document {
  id:        string
  userId:    Types.ObjectId
  courseId:  Types.ObjectId
  rating:    number
  comment?:  string
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    comment:  { type: String },
  },
  baseSchemaOptions,
)

ReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true })  // one review per user/course
ReviewSchema.index({ courseId: 1 })

export const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema)
