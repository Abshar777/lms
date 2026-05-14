# Backend — Business Logic Reference

Key decision points, rules, and non-obvious behaviours in the backend.

---

## Authentication Logic

### Token issuance
- `register` and `login` both call `generateTokenPair(userId)` → issues access (15m) + refresh (30d) tokens
- Access token: signed JWT, sent as httpOnly cookie `lms_at` (`Path=/`)
- Refresh token: signed JWT → **hashed** (SHA-256) → stored in `RefreshToken` collection → sent as httpOnly cookie `lms_rt` (`Path=/api/v1/auth`)
- The stored value is always the *hash*, never the raw token

### Token rotation (refresh-reuse detection)
On `POST /auth/refresh`:
1. Read `lms_rt` cookie → verify JWT → extract `jti` (token ID)
2. Look up hashed token in DB → if not found or already revoked → **kill all sessions** for this user
3. If revoked but `revokedReason === 'rotation'` → reuse attack detected → revoke all user tokens
4. Revoke old token with `revokedReason: 'rotation'`, issue new pair
5. Update `lastUsedAt` on the new token

### Account lockout
- After 5 failed login attempts: lock account for 15 minutes
- `failedLoginAttempts` incremented on each wrong password
- Reset to 0 on successful login
- `lockedUntil` field checked before attempting password comparison

---

## Enrollment Logic

### Free vs Paid
```
enroll(userId, courseId):
  1. Load course (must be published)
  2. If course.price > 0 AND !course.isFree → throw 402
  3. findByUserCourse(userId, courseId) → return existing if found (idempotent)
  4. Create enrollment (status: 'active', progressPercent: 0)
  5. Increment course.enrolledCount
  6. Fire-and-forget: sendEnrollmentConfirmation email
```

### Progress recomputation
Triggered by `markComplete(userId, lessonId)`:
```
1. Upsert LessonProgress (isCompleted: true, completedAt: now)
2. Find enrollment for this course
3. Count total lessons in course (via LessonRepository)
4. Count completed lessons for user (via ProgressRepository)
5. progressPercent = Math.round(completed / total * 100)
6. Update enrollment.progressPercent
7. If progressPercent >= 100 AND status !== 'completed':
   → set status: 'completed', completedAt: now
   → fire-and-forget: sendCourseCompletion email
```

### Idempotency
`POST /enrollments` is idempotent:
- If enrollment already exists → return 200 with existing record (not 409)

---

## Review Logic

### Upsert (one review per user per course)
A unique compound index `{ userId: 1, courseId: 1 }` enforces one review per user.  
`upsertOne()` calls `findOneAndUpdate({ userId, courseId }, data, { upsert: true, new: true })`.

### Rating recomputation
After every submit/delete:
```
Course.ratingAvg = avg of all Review.rating for courseId
Course.ratingCount = count of all Reviews for courseId
```
Implemented via MongoDB aggregate `$avg` + `$count`.

### Submit guard
User must have a non-dropped enrollment (`status: 'active' | 'completed'`).  
No enrollment → 403.

---

## Coupon Validation

```
validate(code, courseId):
  1. Find coupon by code (case-insensitive, uppercase stored)
  2. Must be isActive: true
  3. Must not be expired (expiresAt > now, or no expiresAt)
  4. usedCount < maxUses (or maxUses: 0 = unlimited)
  5. appliesTo is empty (global) OR contains courseId
  6. Return { discountType, discountValue }
```

Discount application (in checkout):
- `percent`: `price * (1 - discountValue/100)`, min 0
- `fixed`: `price - discountValue`, min 0

---

## Email Fire-and-Forget Pattern

Emails never block the HTTP response. Pattern used:
```ts
void (async () => {
  try {
    const user = await UserModel.findById(userId).select('name email').exec()
    if (user) await sendSomeEmail(user.email, user.name, ...)
  } catch (err) {
    logger.warn({ err }, 'email failed')
  }
})()
```

Triggered for:
- Enrollment confirmation (free enrollment + paid order fulfillment)
- Course completion
- Live class registration
- Password reset
- Email verification

---

## Stripe / Order Fulfillment

```
POST /checkout/session:
  1. Load course → check published + price > 0
  2. Validate coupon if provided
  3. Create Stripe PaymentIntent or CheckoutSession
  4. Create Order (status: 'pending', stripePaymentIntentId)
  5. Return session URL / client_secret

POST /webhooks/stripe (payment_intent.succeeded):
  1. Verify Stripe signature
  2. Find Order by stripePaymentIntentId
  3. Update Order.status = 'paid'
  4. Call EnrollmentService.enroll(userId, courseId)
  5. Fire enrollment confirmation email
```

---

## Rate Limiting

| Limiter | Limit | Window | Applied to |
|---------|-------|--------|-----------|
| `apiRateLimit` | 200 req | 15 min | All `/api/v1/*` |
| `authRateLimit` | 10 req | 15 min | `/auth/login`, `/auth/register` |
| `searchRateLimit` | 30 req | 1 min | `GET /courses?search=` |

---

## Admin Role Guard

```ts
router.use(authenticate, requireRole('admin', 'instructor'))
```

- `authenticate`: reads `lms_at` cookie → verifies JWT → attaches `req.user`
- `requireRole('admin')`: checks `req.user.role` → 403 if not in list
- `requireAdmin`: shorthand for `requireRole('admin')`
- `requireStudent`: `requireRole('student')`
- `requireInstructor`: `requireRole('instructor')`

---

## BaseRepository

All repositories extend `BaseRepository<T>` which provides:
- `findById(id)`
- `findAll(filter, page, perPage, sort)` → `{ docs, meta: PaginationMeta }`
- `create_(dto)`
- `updateById(id, update)`
- `deleteById(id)`

Domain repositories add specialised methods:
```ts
class CourseRepository extends BaseRepository<ICourse> {
  findPublishedWithInstructor(filter, page, perPage, sort)
  findBySlug(slug)
}
```

---

## Audit Logging

Admin mutations (create/update/delete on courses, users, etc.) write audit log entries:
```ts
AuditLog { userId, action, resource, resourceId, changes, ip, userAgent }
```
GET `/audit-logs` returns paginated log for admins.

---

## Watch Time Recording

`POST /lessons/:id/watch-time { secs }`:
1. Upsert `LessonProgress.watchTimeSecs += secs`
2. If `watchTimeSecs >= lesson.durationMins * 60 * 0.9` (90% watched) → auto-mark complete
3. Client calls this endpoint at most every 15 seconds (debounced in frontend)
