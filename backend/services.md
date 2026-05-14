# Backend — Services Reference

Each service encapsulates business logic for one domain. Controllers call services; services call repositories. Services never touch `req`/`res`.

---

## `AuthService` (`services/auth.service.ts`)

### Methods
| Method | Description |
|--------|-------------|
| `register(dto, meta?)` | Creates user, hashes password, issues token pair |
| `login(dto, meta?)` | Verifies credentials + lockout, issues token pair |
| `logout(refreshToken, userId)` | Revokes refresh token |
| `refresh(rawRefreshToken, meta?)` | Rotates token pair, detects reuse |
| `me(userId)` | Returns SafeUser for current user |
| `forgotPassword(email)` | Sends reset email with signed token |
| `resetPassword(token, newPassword)` | Verifies token, updates passwordHash |
| `verifyEmail(token)` | Verifies email address |
| `resendVerification(userId)` | Resends verification email |

### Error class
```ts
class AuthError extends Error {
  constructor(public code: string, message: string, public statusCode = 400)
}
```

---

## `CourseService` (`services/course.service.ts`)

### Methods
| Method | Description |
|--------|-------------|
| `listPublished(params)` | Paginated public course list with populate |
| `getBySlug(slug)` | Course + sections + lessons outline |
| `getRatingHistogram(courseId)` | Star distribution |
| `getProgress(userId, slug)` | EnrollmentSummary for the player |

---

## `CategoryService` (`services/category.service.ts`)

| Method | Description |
|--------|-------------|
| `listAll()` | All categories (no pagination) |

---

## `EnrollmentService` (`services/enrollment.service.ts`)

| Method | Description |
|--------|-------------|
| `enroll(userId, courseId)` | Create enrollment, bump count, send email |
| `listMyEnrollments(userId)` | All enrollments with populated course |
| `getEnrollmentSummary(userId, slug)` | `EnrollmentSummary` for course detail page |
| `getActivity(userId, limit)` | Recent LessonProgress items |
| `recomputeProgress(userId, courseId)` | Called after mark-complete; may fire completion email |

---

## `ProgressService` (`services/progress.service.ts`)

| Method | Description |
|--------|-------------|
| `markComplete(userId, lessonId)` | Upsert progress, trigger recompute |
| `recordWatchTime(userId, lessonId, secs)` | Increment watchTimeSecs |
| `getLessonProgress(userId, lessonId)` | Single lesson progress |

---

## `ReviewService` (`services/review.service.ts`)

| Method | Description |
|--------|-------------|
| `submit(userId, courseId, dto)` | Upsert review (enrollment required) |
| `listForCourse(courseId, page, perPage)` | Paginated reviews |
| `deleteOwn(userId, reviewId)` | Delete review (ownership check) |
| `voteHelpful(userId, reviewId)` | Toggle helpful vote |
| `report(userId, reviewId)` | Flag review |
| `recomputeRating(courseId)` | Aggregate avg + count, update Course |

---

## `AdminService` (`services/admin.service.ts`)

| Method | Description |
|--------|-------------|
| `getStats()` | Platform-wide counts |
| `getEnrollmentsTimeseries(days)` | Daily enrollment counts |
| `getTopCourses(limit)` | Top N by enrollment |
| `getCompletionStats()` | Completion / active / dropped counts |
| `getRevenueTimeseries(days)` | Daily revenue (from paid orders) |
| `listUsers(role, params)` | Paginated user list |
| `updateUser(id, dto)` | Update role / active / verified |
| `listCourses(params)` | All courses (all statuses) for admin |
| `createCourse(dto)` | Create with validation |
| `updateCourse(id, dto)` | Update with audit log |
| `deleteCourse(id)` | Soft-delete or hard-delete |
| `bulkCourses(ids, action)` | publish / archive / delete many |
| `listOrders(params)` | All orders paginated |
| `listCoupons(page)` | All coupons paginated |
| `createCoupon(dto)` | Create coupon |
| `updateCoupon(id, dto)` | Update coupon |
| `deleteCoupon(id)` | Delete coupon |

---

## `UserService` (`services/user.service.ts`)

| Method | Description |
|--------|-------------|
| `getProfile(userId)` | Full user profile |
| `updateProfile(userId, dto)` | Update name, bio, headline, avatarUrl |
| `changePassword(userId, currentPw, newPw)` | Verifies current, hashes new |

---

## `TotpService` (`services/totp.service.ts`)

| Method | Description |
|--------|-------------|
| `setup(userId)` | Generates TOTP secret + QR code URL |
| `enable(userId, code)` | Verifies code, enables 2FA |
| `disable(userId, code)` | Verifies code, disables 2FA |
| `verify(userId, code)` | Verifies TOTP code during login |

---

## `EmailService` (`services/email.service.ts`)

Nodemailer transport (SMTP). All functions are standalone exports (not a class).

| Function | Trigger |
|----------|---------|
| `sendVerifyEmail(to, name, token)` | After registration |
| `sendPasswordReset(to, name, token)` | Forgot password |
| `sendEnrollmentConfirmation(to, name, courseTitle, courseUrl)` | Free enrollment + paid order |
| `sendCourseCompletion(to, name, courseTitle, courseUrl)` | When progress = 100% |
| `sendLiveClassReminder(to, name, title, date, joinUrl)` | Before live class |

All email calls are fire-and-forget (wrapped in `void (async () => {...})()`).

---

## Service Instantiation Pattern

Services are instantiated **once** per request in the controller file:
```ts
// In controller or route handler
const enrollmentSvc = new EnrollmentService()
```

No dependency injection framework — Mongoose models are module singletons so all repos access the same connection.

---

## Adding a New Service

```ts
// backend/src/services/thing.service.ts
import { ThingRepository } from '@/repositories/thing.repository.ts'
import { logger } from '@/utils/logger.ts'

export class ThingError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) {
    super(message)
    this.name = 'ThingError'
  }
}

export class ThingService {
  private readonly repo = new ThingRepository()

  async doSomething(userId: string, dto: SomeDto) {
    // business logic here
    // throw new ThingError('CODE', 'message', 422) on failure
  }
}
```

Register in `errorMiddleware` to map `ThingError` → HTTP response.
