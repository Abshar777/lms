# Backend — Feature Implementation Status

---

## Auth Domain

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Register + login | `auth.service.ts` | ✅ | httpOnly cookies |
| JWT access + refresh tokens | `utils/jwt.ts` | ✅ | 15m / 30d TTL |
| Token rotation with reuse detection | `auth.service.ts` | ✅ | SHA-256 hash stored |
| Account lockout (5 attempts, 15m) | `auth.service.ts` | ✅ | |
| Logout + revoke | `auth.service.ts` | ✅ | |
| Email verification | `auth.service.ts` | ✅ | Nodemailer |
| Password reset | `auth.service.ts` | ✅ | Signed token |
| Google OAuth | `auth.routes.ts` | ⚠️ | Route exists, strategy not wired |
| TOTP 2FA | `totp.service.ts` | ✅ | Full setup/enable/disable |
| Active sessions | `auth.routes.ts` | ✅ | Via RefreshToken model |

---

## Course Domain

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Course list (paginated + filtered) | `course.service.ts` | ✅ | level, category, price, duration, free, sort |
| Full-text search | `courses.routes.ts` | ✅ | MongoDB $text index |
| Prefix search | `courses.routes.ts` | ✅ | $regex `^query` |
| Course detail + outline | `course.service.ts` | ✅ | Sections + lessons populated |
| Rating histogram | `course.service.ts` | ✅ | |
| Course CRUD (admin) | `admin.routes.ts` | ✅ | |
| Bulk action (publish/archive/delete) | `admin.service.ts` | ✅ | |

---

## Enrollment Domain

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Free course enrollment (idempotent) | `enrollment.service.ts` | ✅ | |
| Paid course guard → 402 | `enrollment.service.ts` | ✅ | |
| My enrollments (populated) | `enrollment.service.ts` | ✅ | |
| EnrollmentSummary for player | `enrollment.service.ts` | ✅ | |
| Recent activity feed | `enrollment.service.ts` | ✅ | |
| Progress recomputation | `enrollment.service.ts` | ✅ | |
| Course completion detection | `enrollment.service.ts` | ✅ | |
| `lastLessonId` tracking | `progress.service.ts` | ✅ | |

---

## Lesson Progress Domain

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Mark lesson complete | `progress.service.ts` | ✅ | |
| Watch time recording | `progress.service.ts` | ✅ | |
| Auto-complete at 90% watch | `progress.service.ts` | ✅ | |
| Resume position (watchTimeSecs) | `progress.service.ts` | ✅ | |

---

## Review Domain

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Submit/upsert review | `review.service.ts` | ✅ | One per user per course |
| Enrollment guard | `review.service.ts` | ✅ | Must be enrolled |
| Rating recomputation | `review.service.ts` | ✅ | |
| Paginated review list | `review.service.ts` | ✅ | |
| Delete own review | `review.service.ts` | ✅ | |
| Helpful votes | `review.service.ts` | ✅ | |
| Report review | `review.service.ts` | ✅ | |
| Instructor reply | `review.service.ts` | ✅ | |
| Admin moderation | `admin.routes.ts` | ✅ | |

---

## Payments

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Stripe checkout session | `checkout.routes.ts` | ✅ | |
| Stripe webhook (payment_intent.succeeded) | `webhooks.routes.ts` | ✅ | |
| Order creation (pending → paid) | `order.service.ts` | ✅ | |
| Order fulfillment → enrollment | `order.service.ts` | ✅ | |
| Coupon validation | `coupons.routes.ts` | ✅ | Public route |
| Coupon admin CRUD | `admin.routes.ts` | ✅ | |
| Refunds | — | ❌ | Not implemented |

---

## Gamification

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Streaks (daily tracking) | `streaks.routes.ts` | ✅ | |
| Achievements (earn on events) | `achievements.routes.ts` | ✅ | |
| Favorites (toggle) | `favorites.routes.ts` | ✅ | |
| Certificates (generate on completion) | `certificates.routes.ts` | ✅ | |
| Leaderboard | — | ❌ | Not implemented |

---

## Communication

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| In-app notifications | `notifications.routes.ts` | ✅ | |
| Enrollment confirmation email | `enrollment.service.ts` | ✅ | Fire-and-forget |
| Course completion email | `enrollment.service.ts` | ✅ | Fire-and-forget |
| Live class scheduling email | `liveClasses.routes.ts` | ✅ | |
| Password reset email | `auth.service.ts` | ✅ | |
| Email verification | `auth.service.ts` | ✅ | |
| Welcome email | — | ❌ | Not implemented |
| Discussion threads | `discussion.routes.ts` | ✅ | Backend complete |
| Notes | `notes.routes.ts` | ✅ | Backend complete |
| Bookmarks | `bookmarks.routes.ts` | ✅ | Backend complete |

---

## AI

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Ollama chat | `ai.routes.ts` | ✅ | `llama3.2:3b` by default |
| Streaming responses | `ai.routes.ts` | ⚠️ | Non-streaming only currently |

---

## Infrastructure

| Feature | File | Status |
|---------|------|--------|
| Env validation (Zod) | `config/env.ts` | ✅ |
| Rate limiting (3 levels) | `middleware/rateLimit.middleware.ts` | ✅ |
| CSP / Helmet security | `app.ts` | ✅ |
| CORS (multi-origin) | `config/cors.ts` | ✅ |
| Pino logging | `utils/logger.ts` | ✅ |
| Sentry error tracking | `app.ts` | ✅ |
| File uploads | `upload.routes.ts` | ✅ |
| DB seed script | `scripts/seed.ts` | ✅ |
| Health + readiness endpoints | `routes/index.ts` | ✅ |
| Audit log | `auditlog.routes.ts` | ✅ |

---

## Data Models (Mongoose)

All in `backend/src/models/schema.ts`:

| Model | Key fields |
|-------|-----------|
| `User` | name, email, passwordHash, role, isVerified, twoFactorEnabled |
| `RefreshToken` | userId, tokenHash, isRevoked, revokedReason, expiresAt |
| `Course` | title, slug, price, isFree, status, instructorId, categoryId, enrolledCount, ratingAvg |
| `Section` | courseId, title, order |
| `Lesson` | courseId, sectionId, title, type, contentUrl, durationMins, order, isFree |
| `Enrollment` | userId, courseId, status, progressPercent, lastLessonId, completedAt |
| `LessonProgress` | userId, lessonId, courseId, isCompleted, watchTimeSecs |
| `Review` | userId, courseId, rating, comment, instructorReply, helpfulVotes |
| `Category` | name, slug, description, icon |
| `Order` | userId, courseId, amount, status, stripePaymentIntentId |
| `Coupon` | code, discountType, discountValue, maxUses, usedCount, expiresAt |
| `Notification` | userId, title, body, link, readAt |
| `Favorite` | userId, courseId |
| `Achievement` | userId, kind, earnedAt |
| `Streak` | userId, current, longest, lastActivityDate |
| `Certificate` | userId, courseId, issuedAt, verifyCode |
| `AuditLog` | userId, action, resource, resourceId, changes |
