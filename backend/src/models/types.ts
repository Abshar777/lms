/* ─────────────────────────────────────────────────────
   Re-export all document interfaces as canonical types.
   Import from here throughout the app — never directly
   from schema.ts — so the import path stays stable if
   models are split into separate files later.
───────────────────────────────────────────────────── */
export type {
  IUser          as User,
  IRefreshToken  as RefreshToken,
  ICategory      as Category,
  ICourse        as Course,
  ISection       as Section,
  ILesson        as Lesson,
  IEnrollment    as Enrollment,
  ILessonProgress as LessonProgress,
  IReview        as Review,
} from './schema.ts'

/* ─── SafeUser — user without passwordHash ───────────
   Used in API responses and JWT payloads
───────────────────────────────────────────────────── */
import type { IUser } from './schema.ts'

export type SafeUser = Omit<IUser, 'passwordHash'>

export function toSafeUser(user: IUser): SafeUser {
  const obj = user.toObject() as IUser & { passwordHash?: string }
  delete obj.passwordHash
  return obj as SafeUser
}
