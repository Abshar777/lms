# Backend — API Reference

Base URL: `http://localhost:4000/api/v1`  
All responses: `{ success: true, data: <T>, meta?: PaginationMeta }` or `{ success: false, error: { code, message } }`

---

## Auth — `/auth`

| Method | Path | Auth | Body / Params | Description |
|--------|------|------|---------------|-------------|
| POST | `/auth/register` | No | `{ name, email, password }` | Register. Sets `lms_at` + `lms_rt` cookies |
| POST | `/auth/login` | No | `{ email, password, totpCode? }` | Login. Sets cookies. Rate limited (5/15m) |
| POST | `/auth/logout` | Cookie | — | Revokes refresh token, clears cookies |
| POST | `/auth/refresh` | Cookie (lms_rt) | — | Rotates refresh token, issues new access token |
| GET  | `/auth/me` | Cookie | — | Returns current user (SafeUser shape) |
| POST | `/auth/forgot-password` | No | `{ email }` | Sends reset email |
| POST | `/auth/reset-password` | No | `{ token, password }` | Resets password |
| GET  | `/auth/verify-email` | No | `?token=` | Verifies email address |
| POST | `/auth/resend-verification` | Cookie | — | Resends verification email |
| GET  | `/auth/google` | No | — | Initiates Google OAuth |
| GET  | `/auth/google/callback` | No | — | Google OAuth callback |
| POST | `/auth/totp/setup` | Cookie | — | Generates TOTP QR code |
| POST | `/auth/totp/enable` | Cookie | `{ code }` | Enables TOTP after verification |
| POST | `/auth/totp/disable` | Cookie | `{ code }` | Disables TOTP |

---

## Courses — `/courses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/courses` | No | List published courses. Params: `page, per_page, search, search_mode, level, category, sort, free, duration_min, duration_max, price_min, price_max` |
| GET | `/courses/:slug` | No | Course detail + sections + lessons outline |
| GET | `/courses/:slug/rating-histogram` | No | `{ histogram: {1..5: count}, total, avg }` |
| GET | `/courses/:slug/progress` | Cookie | Enrollment summary for current user |
| GET | `/courses/:courseId/reviews` | No | Paginated reviews. Params: `page, per_page` |
| POST | `/courses/:courseId/reviews` | Cookie | Submit / upsert review `{ rating, comment? }` |

---

## Categories — `/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | No | All categories `[{ id, name, slug, description?, icon? }]` |

---

## Enrollments — `/enrollments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enrollments` | Cookie | Enroll in course `{ courseId }`. Idempotent. Paid courses → 402 |
| GET  | `/enrollments/me` | Cookie | My enrollments (courseId populated) |
| GET  | `/enrollments/activity` | Cookie | Recent lesson activity. Params: `limit` |

---

## Lessons — `/lessons`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/lessons/:id/complete` | Cookie | Mark lesson complete. Returns `{ progressPercent, status }` |
| POST | `/lessons/:id/watch-time` | Cookie | Record watch time `{ secs }` |
| GET  | `/lessons/:id/progress` | Cookie | `{ watchTimeSecs, isCompleted, completedAt }` |

---

## Reviews — `/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reviews/:id/helpful` | Cookie | Vote review as helpful |
| POST | `/reviews/:id/report` | Cookie | Report review |
| DELETE | `/reviews/:id` | Cookie (owner) | Delete own review |

---

## Favorites — `/favorites`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/favorites` | Cookie | List favorite courses |
| POST | `/favorites` | Cookie | Toggle favorite `{ courseId }` |

---

## Achievements — `/achievements`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/achievements/me` | Cookie | My earned achievements |
| GET | `/achievements` | No | All possible achievements |

---

## Streaks — `/streaks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/streaks/me` | Cookie | `{ current, longest, lastActivityDate, weekActivity }` |

---

## Notifications — `/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET   | `/notifications` | Cookie | Paginated list. Params: `per_page` |
| GET   | `/notifications/unread-count` | Cookie | `{ count: number }` |
| PATCH | `/notifications/:id/read` | Cookie | Mark one read |
| PATCH | `/notifications/read-all` | Cookie | Mark all read |

---

## Live Classes — `/live-classes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/live-classes` | No | Upcoming sessions |
| POST | `/live-classes` | Cookie (instructor) | Create session |
| POST | `/live-classes/:id/register` | Cookie | Register for session |

---

## Discussion — (mounted at `/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/lessons/:lessonId/threads` | Cookie | Q&A threads for a lesson |
| POST | `/lessons/:lessonId/threads` | Cookie | Post a question |
| POST | `/threads/:id/reply` | Cookie | Reply to thread |

---

## Notes — (mounted at `/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/lessons/:lessonId/notes` | Cookie | My notes for a lesson |
| POST | `/lessons/:lessonId/notes` | Cookie | Create/update note |

---

## Bookmarks — (mounted at `/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/lessons/:lessonId/bookmarks` | Cookie | My bookmarks |
| POST | `/lessons/:lessonId/bookmarks` | Cookie | Add bookmark |

---

## Learning Paths — `/learning-paths`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/learning-paths` | No | Published paths |
| GET  | `/learning-paths/:slug` | No | Path detail |
| POST | `/learning-paths` | Cookie (instructor) | Create path |
| PATCH | `/learning-paths/:id` | Cookie (owner) | Update path |
| DELETE | `/learning-paths/:id` | Cookie (owner) | Delete path |
| GET  | `/learning-paths/admin/list` | Cookie (admin) | All paths (admin) |

---

## Quizzes — `/quizzes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/quizzes/:lessonId` | Cookie | Quiz questions for lesson |
| POST | `/quizzes/:lessonId/submit` | Cookie | Submit answers |

---

## Assignments — `/assignments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/assignments/:lessonId` | Cookie | Assignment for lesson |
| POST | `/assignments/:lessonId/submit` | Cookie | Submit work |

---

## Certificates — `/certificates`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/certificates/me` | Cookie | My certificates |
| GET | `/certificates/:id` | No | Verify certificate |

---

## Orders — `/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/orders/me` | Cookie | My order history |

---

## Coupons — `/coupons`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/coupons/validate` | Cookie | Validate coupon `?code=&courseId=` |

---

## Checkout — `/checkout`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkout/session` | Cookie | Create Stripe checkout session `{ courseId, couponCode? }` |

---

## Webhooks — `/webhooks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/stripe` | Stripe signature | Handles `payment_intent.succeeded`, etc. |

---

## AI — `/ai`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | Cookie | Chat with Ollama `{ message, history? }` |

---

## Uploads — `/uploads`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/uploads/image` | Cookie | Upload image → returns `{ url }` |
| POST | `/uploads/video` | Cookie | Upload video → returns `{ url }` |

---

## Admin — `/admin`

All require `authenticate + requireRole('admin')`.

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/admin/stats` | Platform stats |
| GET  | `/admin/analytics/enrollments` | Enrollment timeseries. Params: `days` |
| GET  | `/admin/analytics/top-courses` | Top N courses by enrollment |
| GET  | `/admin/analytics/completion` | Completion rate stats |
| GET  | `/admin/analytics/revenue` | Revenue timeseries |
| GET  | `/admin/users` | Paginated users. Params: `role, page, per_page, search` |
| PATCH | `/admin/users/:id` | Update user `{ role?, isActive?, isVerified? }` |
| GET  | `/admin/courses` | Paginated courses (all statuses) |
| POST | `/admin/courses` | Create course |
| GET  | `/admin/courses/:id` | Single course (admin) |
| PATCH | `/admin/courses/:id` | Update course |
| DELETE | `/admin/courses/:id` | Delete course |
| POST | `/admin/courses/bulk` | Bulk action `{ ids, action: 'publish'|'archive'|'delete' }` |
| GET  | `/admin/orders` | All orders |
| GET  | `/admin/coupons` | All coupons |
| POST | `/admin/coupons` | Create coupon |
| PATCH | `/admin/coupons/:id` | Update coupon |
| DELETE | `/admin/coupons/:id` | Delete coupon |

---

## Audit Logs — `/audit-logs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit-logs` | Cookie (admin) | Paginated admin actions log |

---

## Health / Readiness

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Always 200 with uptime |
| GET | `/ready` | 200 only when MongoDB connected |
