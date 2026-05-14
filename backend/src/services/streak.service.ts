import { StreakRepository } from '@/repositories/streak.repository.ts'
import type { IUserStreak } from '@/models/schema.ts'

export class StreakService {
  private readonly streakRepo = new StreakRepository()

  /* ─────────────────────────────────────────────────────
     getToday — returns a YYYY-MM-DD string in UTC
     (consistent regardless of server locale)
  ───────────────────────────────────────────────────── */
  private today(): string {
    const d = new Date()
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }

  /** Returns the ISO Monday (YYYY-MM-DD) of the week containing a date string */
  private weekStart(dateStr: string): string {
    const d   = new Date(`${dateStr}T00:00:00Z`)
    const dow = d.getUTCDay() || 7   // 1=Mon … 7=Sun
    d.setUTCDate(d.getUTCDate() - (dow - 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }

  /** Call after any learning action (lesson complete, quiz pass) */
  async recordActivity(userId: string): Promise<IUserStreak> {
    const today    = this.today()
    const thisWeek = this.weekStart(today)
    let streak     = await this.streakRepo.findByUser(userId)

    if (!streak) {
      return this.streakRepo.upsertForUser(userId, {
        currentStreak:   1,
        longestStreak:   1,
        lastActiveDate:  today,
        totalDaysActive: 1,
        weekProgress:    1,
        weekStartDate:   thisWeek,
      })
    }

    const last = streak.lastActiveDate
    let { currentStreak, longestStreak, totalDaysActive, weekProgress, weekStartDate } = streak

    /* Week rollover */
    if (weekStartDate !== thisWeek) {
      weekProgress  = 0
      weekStartDate = thisWeek
    }

    /* Same day — just increment week progress, no streak extension */
    if (last === today) {
      weekProgress += 1
      return this.streakRepo.upsertForUser(userId, { weekProgress, weekStartDate, lastActiveDate: today })
    }

    /* Diff in calendar days */
    const lastDate  = new Date(`${last}T00:00:00Z`)
    const todayDate = new Date(`${today}T00:00:00Z`)
    const diffDays  = Math.round((todayDate.getTime() - lastDate.getTime()) / 86_400_000)

    if (diffDays === 1) {
      currentStreak   += 1
      longestStreak    = Math.max(longestStreak, currentStreak)
      totalDaysActive += 1
    } else if (diffDays > 1) {
      currentStreak   = 1   // streak broken
      totalDaysActive += 1
    }

    weekProgress += 1

    return this.streakRepo.upsertForUser(userId, {
      currentStreak,
      longestStreak,
      lastActiveDate: today,
      totalDaysActive,
      weekProgress,
      weekStartDate,
    })
  }

  async getStreak(userId: string): Promise<IUserStreak | null> {
    return this.streakRepo.findByUser(userId)
  }

  async updateGoal(userId: string, weeklyGoal: number): Promise<IUserStreak> {
    if (weeklyGoal < 1 || weeklyGoal > 50) {
      throw new Error('Weekly goal must be between 1 and 50')
    }
    return this.streakRepo.upsertForUser(userId, { weeklyGoal })
  }
}
