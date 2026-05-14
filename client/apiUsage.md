# Client Frontend — API Usage Reference

All API calls go through the Axios instance at `src/lib/axios.ts` (base URL `/api/v1`, `withCredentials: true`).  
Next.js rewrites `/api/v1/*` → `http://localhost:4000/api/v1/*` (configured in `next.config.ts`).

---

## Axios Helpers

```ts
import { api, apiGet, apiPost, apiPatch, apiDelete } from '@/lib/axios'

apiGet<T>(path, params?)      // GET  — unwraps { success, data }
apiPost<T>(path, body?)       // POST — unwraps { success, data }
apiPatch<T>(path, body?)      // PATCH
apiDelete<T>(path)            // DELETE
```

The raw `api` instance is used when you need the full Axios response (e.g., to read `meta` for pagination).

---

## Courses (`src/lib/api/courses.ts`)

### `useCourses(params)` — list with filters
```
GET /api/v1/courses
Params: page, per_page, search, search_mode, level, category, sort, free,
        instructor, duration_min, duration_max, price_min, price_max
Returns: { docs: Course[], meta: PaginationMeta }
```

### `useCourse(slug)` — course detail + outline
```
GET /api/v1/courses/:slug
Returns: { course: Course, sections: Section[], lessons: LessonOutline[] }
```

### `useRatingHistogram(slug)` — star distribution
```
GET /api/v1/courses/:slug/rating-histogram
Returns: { histogram: { '1'...'5': number }, total: number, avg: number }
```

### `useFeaturedCourses()` — top 4 by enrollment
```
GET /api/v1/courses?sort=popular&per_page=4
Returns: Course[]
```

---

## Categories (`src/lib/api/categories.ts`)

### `useCategories()` — all categories
```
GET /api/v1/categories
Returns: Category[]
Cache: 5 minutes staleTime
```

---

## Enrollments (`src/lib/api/enrollments.ts`)

### `useMyEnrollments()` — all enrollments for current user
```
GET /api/v1/enrollments/me
Returns: MyEnrollment[]  (courseId may be populated as Course object)
```

### `useCourseProgress(slug)` — enrollment summary for a course
```
GET /api/v1/courses/:slug/progress
Returns: EnrollmentSummary {
  isEnrolled, enrollmentId, progressPercent, status,
  lastLessonId, certificateId, completedLessons
}
```

### `useMyActivity(limit)` — recent lesson activity (right sidebar)
```
GET /api/v1/enrollments/activity?limit=8
Returns: { items: ActivityItem[], week: { lessonsCompleted, minutesWatched } }
```

### `useEnroll()` — enroll in a course
```
POST /api/v1/enrollments
Body: { courseId: string }
Returns: { enrollment: MyEnrollment }
Side effects: invalidates enrollments.mine, courses
```

---

## Lesson Progress (`src/lib/api/progress.ts`)

### `useMarkLessonComplete(slug)` — mark a lesson done
```
POST /api/v1/lessons/:lessonId/complete
Returns: { progressPercent: number, status: 'active' | 'completed' }
Side effects: invalidates course progress + enrollments.mine
```

### `recordWatchTime(lessonId, secs)` — fire-and-forget watch time
```
POST /api/v1/lessons/:lessonId/watch-time
Body: { secs: number }
Note: never throws — swallows errors silently
```

### `useMyLessonProgress(lessonId)` — resume position
```
GET /api/v1/lessons/:lessonId/progress
Returns: { watchTimeSecs: number, isCompleted: boolean, completedAt: string | null }
Cache: staleTime: 0, refetchOnMount: 'always'
```

---

## Reviews (`src/lib/api/reviews.ts`)

### `useCourseReviews(courseId, page, perPage)` — paginated review list
```
GET /api/v1/courses/:courseId/reviews?page=1&per_page=5
Returns: { docs: Review[], meta: PaginationMeta }
```

### `useSubmitReview(courseId)` — submit or update review (upsert)
```
POST /api/v1/courses/:courseId/reviews
Body: { rating: number, comment?: string }
Requires: active enrollment
Side effects: invalidates reviews for course, courses list
```

### `useVoteHelpful(courseId)` — mark review as helpful
```
POST /api/v1/reviews/:reviewId/helpful
```

### `useReportReview(courseId)` — report a review
```
POST /api/v1/reviews/:reviewId/report
```

---

## Auth (`src/lib/api/user.ts`)

### `useCurrentUser()` — get logged-in user
```
GET /api/v1/auth/me
Returns: User { id, name, email, role, avatarUrl, headline, ... }
```

### `logout()` — clear cookies + server session
```
POST /api/v1/auth/logout
Side effect: clears lms_at + lms_rt cookies
```

---

## Notifications (`src/lib/api/notifications.ts`)

### `useNotifications(params)` — paginated list
```
GET /api/v1/notifications?per_page=8
Returns: { items: Notification[], unreadCount: number }
```

### `useUnreadCount()` — badge count
```
GET /api/v1/notifications/unread-count
Returns: number
```

### `useMarkRead()` — mark one notification read
```
PATCH /api/v1/notifications/:id/read
```

### `useMarkAllRead()` — mark all read
```
PATCH /api/v1/notifications/read-all
```

---

## Live Typeahead (inline in `ClientTopbar.tsx`)

```
GET /api/v1/courses?search=<query>&search_mode=prefix&per_page=5
Debounce: 280ms, min 2 chars
```

---

## Inline API calls (not in separate hook files)

These are called directly via `api.get/post` inside components:

| Location | Endpoint | Purpose |
|----------|----------|---------|
| `Checkout` page | `POST /api/v1/checkout/session` | Create Stripe session |
| `Checkout` page | `GET /api/v1/coupons/validate?code=&courseId=` | Validate coupon |
| `Favorites` page | `GET /api/v1/favorites` | List favorites |
| `Favorites` page | `POST /api/v1/favorites` | Toggle favorite |
| `Streaks` page | `GET /api/v1/streaks/me` | Get streak data |
| `Achievements` page | `GET /api/v1/achievements/me` | Get achievements |
| `AIChatPanel` | `POST /api/v1/ai/chat` | Send AI message |
| `LiveClasses` page | `GET /api/v1/live-classes` | List sessions |

---

## Query Key Conventions

```ts
// Courses
courseKeys.all             = ['courses']
courseKeys.list(params)    = ['courses', 'list', params]
courseKeys.detail(slug)    = ['courses', 'detail', slug]
courseKeys.featured        = ['courses', 'featured']

// Enrollments
enrollmentKeys.mine                = ['enrollments', 'mine']
enrollmentKeys.forCourse(slug)     = ['enrollments', 'course', slug]

// Reviews
reviewKeys.forCourse(courseId)     = ['reviews', 'course', courseId]

// Categories
categoryKeys.all                   = ['categories']
```

---

## Error Handling Pattern

```ts
// axios interceptor in lib/axios.ts
// 401 → redirect to /login
// All other errors → propagate to TanStack Query (caught by error boundaries)
```
