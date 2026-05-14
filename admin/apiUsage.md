# Admin Frontend — API Usage Reference

All API calls go through `src/lib/axios.ts` (base URL `/api/v1`, `withCredentials: true`).  
The admin app calls the backend **directly** (no Next.js rewrite) using `NEXT_PUBLIC_API_URL` or falling back to `http://localhost:4000`.

---

## Axios Instance

```ts
import { api } from '@/lib/axios'
// api.get / api.post / api.patch / api.delete
// All include cookies automatically (withCredentials: true)
// 401 → redirect to /login
```

---

## Stats & Analytics (`src/lib/api/stats.ts`)

### `useAdminStats()` — dashboard summary
```
GET /api/v1/admin/stats
Returns: { totalCourses, publishedCourses, draftCourses, totalStudents,
           totalInstructors, totalEnrollments, totalReviews, revenueEstimate }
```

### `useEnrollmentsTimeseries(days?)` — enrollment chart
```
GET /api/v1/admin/analytics/enrollments?days=30
Returns: [{ date: string, count: number }]
```

### `useTopCourses(limit?)` — top N courses
```
GET /api/v1/admin/analytics/top-courses?limit=5
Returns: [{ id, title, slug, enrolledCount, ratingAvg, thumbnailUrl? }]
```

### `useCompletionStats()` — funnel stats
```
GET /api/v1/admin/analytics/completion
Returns: { totalEnrollments, completed, active, dropped, completionRate }
```

### `useRevenueTimeseries(days?)` — revenue chart
```
GET /api/v1/admin/analytics/revenue?days=30
Returns: [{ date: string, amount: number }]  // amount in cents
```

### `useAdminOrders(page, status)` — all orders
```
GET /api/v1/admin/orders?page=1&per_page=20&status=all
Returns: { orders: AdminOrder[], meta: PaginationMeta }
```

### `useAdminCoupons(page)` — all coupons
```
GET /api/v1/admin/coupons?page=1&per_page=20
Returns: { coupons: AdminCoupon[], meta: PaginationMeta }
```

### `useAdminLearningPaths(page)` — all learning paths
```
GET /api/v1/learning-paths/admin/list?page=1&per_page=20
Returns: { paths: AdminLearningPath[], meta: PaginationMeta }
```

---

## Courses (`src/lib/api/courses.ts`)

### `useCourses(params)` — paginated course list (all statuses)
```
GET /api/v1/admin/courses
Params: page, per_page, search, status, sort
Returns: { docs: Course[], meta: PaginationMeta }
```

### `useCourse(id)` — single course
```
GET /api/v1/admin/courses/:id
Returns: Course
```

### `useCreateCourse()` — create course
```
POST /api/v1/admin/courses
Body: CourseFormValues { title, description, price, isFree, status, level?, categoryId?, tags? }
Returns: Course
Side effects: invalidates courseKeys.all + admin stats
```

### `useUpdateCourse()` — update course
```
PATCH /api/v1/admin/courses/:id
Body: Partial<CourseFormValues>
Returns: Course
Side effects: invalidates courseKeys.all + courseKeys.detail(id) + admin stats
```

### `useDeleteCourse()` — delete course
```
DELETE /api/v1/admin/courses/:id
Side effects: invalidates courseKeys.all + admin stats
```

### `useBulkCourses()` — bulk action
```
POST /api/v1/admin/courses/bulk
Body: { ids: string[], action: 'publish' | 'archive' | 'delete' }
Returns: { affected: number }
Side effects: invalidates courseKeys.all + admin stats
```

---

## Users (`src/lib/api/users.ts`)

### `useUsers(role, params)` — paginated users
```
GET /api/v1/admin/users?role=student&page=1&per_page=20&search=
Returns: { docs: AdminUser[], meta: PaginationMeta }
```

### `useUpdateUser()` — update user role / status
```
PATCH /api/v1/admin/users/:id
Body: { role?, isActive?, isVerified? }
Returns: AdminUser
Side effects: invalidates admin users + admin stats
```

---

## Categories (`src/lib/api/categories.ts`)

### `useCategories()` — all categories
```
GET /api/v1/categories
Returns: Category[]
```

### `useCreateCategory()` — create
```
POST /api/v1/categories
Body: { name, slug, description?, icon? }
```

### `useUpdateCategory()` — update
```
PATCH /api/v1/categories/:id
```

### `useDeleteCategory()` — delete
```
DELETE /api/v1/categories/:id
```

---

## Reviews (`src/lib/api/reviews.ts`)

### `useAdminReviews(params)` — all reviews
```
GET /api/v1/admin/reviews?page=1&per_page=20&search=
Returns: { docs: AdminReview[], meta: PaginationMeta }
```

### `useDeleteReview()` — admin delete
```
DELETE /api/v1/admin/reviews/:id
```

---

## Learning Paths

### `useCreateLearningPath()` — create path
```
POST /api/v1/learning-paths
Body: { title, description?, thumbnailUrl?, status?, courses?: [...] }
Side effects: invalidates ['admin', 'learning-paths']
```

### `useUpdateLearningPath()` — update
```
PATCH /api/v1/learning-paths/:id
Side effects: invalidates ['admin', 'learning-paths']
```

### `useDeleteLearningPath()` — delete
```
DELETE /api/v1/learning-paths/:id
Side effects: invalidates ['admin', 'learning-paths']
```

---

## Auth (inline in components)

### Login
```
POST /api/v1/auth/login
Body: { email, password }
Returns: { data: { user: { role } } }
Note: on success, lms_at + lms_rt cookies are set by the server
```

### Get current user
```
GET /api/v1/auth/me
Used by: useCurrentUser() in lib/api/user.ts
```

### Logout
```
POST /api/v1/auth/logout
Used by: logout() in lib/api/user.ts
```

---

## Query Key Namespaces

```ts
// All admin keys are prefixed with 'admin'
['admin', 'courses', 'list', params]
['admin', 'courses', 'detail', id]
['admin', 'stats']
['admin', 'analytics', 'enrollments', days]
['admin', 'analytics', 'top-courses', limit]
['admin', 'analytics', 'completion']
['admin', 'analytics', 'revenue', days]
['admin', 'users', role, params]
['admin', 'orders', page, status]
['admin', 'coupons', page]
['admin', 'learning-paths', page]
['categories']
```

---

## Inline API calls (not in hook files)

| Location | Endpoint | Purpose |
|----------|----------|---------|
| `CourseForm` image upload | `POST /api/v1/uploads/image` | Upload thumbnail |
| `CourseForm` video upload | `POST /api/v1/uploads/video` | Upload preview |
| `AuditLogsPage` | `GET /api/v1/audit-logs` | Audit log list |
| `CouponModal` | `POST/PATCH /api/v1/admin/coupons` | Inline mutation |
