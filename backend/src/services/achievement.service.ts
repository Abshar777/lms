import {
  EnrollmentModel, LessonProgressModel, ReviewModel, UserModel, FavoriteModel,
  QuizAttemptModel, UserStreakModel,
} from '@/models/schema.ts'
import { Types } from 'mongoose'

/* ─────────────────────────────────────────────────────
   AchievementService — derived, no Achievement table
   ─────────────────────────────────────────────────────
   Computes every badge on the fly from existing data so
   we don't carry yet another model. Returns a list of
   achievement definitions, each with progress + earnedAt.
   Once the user hits target the badge is "earned".
───────────────────────────────────────────────────── */

export interface Achievement {
  id:           string
  title:        string
  description:  string
  iconKey:      'rocket' | 'flame' | 'trophy' | 'star' | 'medal' | 'crown' | 'heart' | 'graduation'
  target:       number
  progress:     number
  earned:       boolean
  earnedAt?:    Date | null  // best-effort timestamp when target was hit
}

export class AchievementService {

  async getForUser(userId: string): Promise<Achievement[]> {
    const uid = new Types.ObjectId(userId)

    /* Pull every input in parallel — keeps this cheap. */
    const [
      user,
      enrollmentCount,
      completedEnrollmentCount,
      firstCompletedEnrollment,
      lessonsCompletedCount,
      firstCompletedLesson,
      reviewCount,
      firstReview,
      favoriteCount,
      lessonsToday,
      quizPerfectCount,
      quizPassCount,
      streak,
    ] = await Promise.all([
      UserModel.findById(uid).select('createdAt').exec(),
      EnrollmentModel.countDocuments({ userId: uid }).exec(),
      EnrollmentModel.countDocuments({ userId: uid, status: 'completed' }).exec(),
      EnrollmentModel.findOne({ userId: uid, status: 'completed' }).sort({ completedAt: 1 }).select('completedAt').exec(),
      LessonProgressModel.countDocuments({ userId: uid, isCompleted: true }).exec(),
      LessonProgressModel.findOne({ userId: uid, isCompleted: true }).sort({ completedAt: 1 }).select('completedAt').exec(),
      ReviewModel.countDocuments({ userId: uid }).exec(),
      ReviewModel.findOne({ userId: uid }).sort({ createdAt: 1 }).select('createdAt').exec(),
      FavoriteModel.countDocuments({ userId: uid }).exec(),
      LessonProgressModel.countDocuments({
        userId: uid,
        isCompleted: true,
        completedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).exec(),
      QuizAttemptModel.countDocuments({ userId: uid, scorePercent: 100 }).exec(),
      QuizAttemptModel.countDocuments({ userId: uid, passed: true }).exec(),
      UserStreakModel.findOne({ userId: uid }).select('currentStreak longestStreak').exec(),
    ])

    const out: Achievement[] = []
    const earned = (target: number, current: number) => ({
      target,
      progress: Math.min(current, target),
      earned:   current >= target,
    })

    out.push({
      id:          'welcome',
      title:       'Welcome aboard',
      description: 'Created a LearnOS account.',
      iconKey:     'rocket',
      ...earned(1, user ? 1 : 0),
      earnedAt:    user?.createdAt ?? null,
    })

    out.push({
      id:          'first-step',
      title:       'First step',
      description: 'Completed your very first lesson.',
      iconKey:     'medal',
      ...earned(1, lessonsCompletedCount),
      earnedAt:    firstCompletedLesson?.completedAt ?? null,
    })

    out.push({
      id:          'graduation',
      title:       'Graduation day',
      description: 'Finished your first course end-to-end.',
      iconKey:     'graduation',
      ...earned(1, completedEnrollmentCount),
      earnedAt:    firstCompletedEnrollment?.completedAt ?? null,
    })

    out.push({
      id:          'collector',
      title:       'Course collector',
      description: 'Enrolled in 10 courses.',
      iconKey:     'star',
      ...earned(10, enrollmentCount),
    })

    out.push({
      id:          'high-five',
      title:       'High five',
      description: 'Completed 5 courses.',
      iconKey:     'trophy',
      ...earned(5, completedEnrollmentCount),
    })

    out.push({
      id:          'first-review',
      title:       'Voice of the learner',
      description: 'Posted your first course review.',
      iconKey:     'heart',
      ...earned(1, reviewCount),
      earnedAt:    firstReview?.createdAt ?? null,
    })

    out.push({
      id:          'quick-learner',
      title:       'Quick learner',
      description: 'Completed 5 lessons in a single day.',
      iconKey:     'flame',
      ...earned(5, lessonsToday),
    })

    out.push({
      id:          'lesson-marathon',
      title:       'Lesson marathon',
      description: 'Completed 25 lessons.',
      iconKey:     'crown',
      ...earned(25, lessonsCompletedCount),
    })

    out.push({
      id:          'curator',
      title:       'Curator',
      description: 'Saved 10 courses to your favorites.',
      iconKey:     'heart',
      ...earned(10, favoriteCount),
    })

    /* ── Quiz achievements ──────────────────────────── */
    out.push({
      id:          'quiz-starter',
      title:       'Quiz starter',
      description: 'Passed your first quiz.',
      iconKey:     'medal',
      ...earned(1, quizPassCount),
    })

    out.push({
      id:          'quiz-ace',
      title:       'Quiz ace',
      description: 'Scored 100% on a quiz.',
      iconKey:     'star',
      ...earned(1, quizPerfectCount),
    })

    out.push({
      id:          'quiz-master',
      title:       'Quiz master',
      description: 'Passed 10 quizzes.',
      iconKey:     'crown',
      ...earned(10, quizPassCount),
    })

    /* ── Streak achievements ─────────────────────────── */
    const currentStreak = streak?.currentStreak ?? 0
    const longestStreak = streak?.longestStreak ?? 0

    out.push({
      id:          'streak-7',
      title:       '7-day streak',
      description: 'Learn 7 days in a row.',
      iconKey:     'flame',
      ...earned(7, longestStreak),
    })

    out.push({
      id:          'streak-30',
      title:       '30-day streak',
      description: 'Learn 30 days in a row.',
      iconKey:     'flame',
      ...earned(30, longestStreak),
    })

    out.push({
      id:          'streak-100',
      title:       '100-day streak',
      description: 'Learn 100 days in a row — you\'re unstoppable!',
      iconKey:     'trophy',
      ...earned(100, longestStreak),
    })

    /* Suppress TS-unused warning on currentStreak — kept for future use */
    void currentStreak

    return out
  }
}
