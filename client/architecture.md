# Client Frontend — Architecture

---

## App Router Structure

```
client/src/app/
├── layout.tsx                    # Root: QueryProvider, fonts, Sentry
├── providers.tsx                 # QueryClient setup
├── (auth)/                       # Auth layout group (no sidebar)
│   ├── layout.tsx                # Clean layout
│   ├── login/page.tsx            # → AuthPage (initialMode="login")
│   └── register/page.tsx         # → AuthPage (initialMode="register")
└── (dashboard)/                  # Protected layout group
    ├── layout.tsx                # DashboardLayout (sidebar + topbar)
    ├── page.tsx                  # Redirect → /my-learning
    ├── my-learning/page.tsx      # Enrolled courses
    ├── courses/
    │   ├── page.tsx              # Catalogue
    │   └── [slug]/page.tsx       # Course detail
    ├── learn/
    │   └── [slug]/[lessonId]/page.tsx  # Lesson player
    ├── search/page.tsx
    ├── categories/page.tsx
    ├── learning-paths/page.tsx
    ├── achievements/page.tsx
    ├── streaks/page.tsx
    ├── favorites/page.tsx
    ├── live-classes/page.tsx
    ├── orders/page.tsx
    └── settings/page.tsx
```

---

## Data Flow

```
User action
  → React component
    → TanStack Query hook (src/lib/api/*.ts)
      → Axios (src/lib/axios.ts)
        → Next.js rewrite /api/v1/* → localhost:4000
          → Express backend
        ← JSON { success, data, meta }
      ← unwrapped data
    ← query result { data, isLoading, error }
  ← rendered UI
```

---

## State Management

### Server State — TanStack Query
All remote data lives in TanStack Query. No Redux, no Context API for API data.

```ts
// Reading
const { data, isLoading, error } = useCourses(params)

// Mutating
const enroll = useEnroll()
enroll.mutate(courseId)

// Invalidating on success
qc.invalidateQueries({ queryKey: enrollmentKeys.mine })
```

### UI State — Zustand (`src/store/ui.store.ts`)
```ts
// Persisted (localStorage key: 'lms-client-ui')
sidebarCollapsed: boolean    // desktop sidebar width
navLayout: 'sidebar'|'topbar'
rightPanelOpen: boolean

// Transient (not persisted)
mobileNavOpen: boolean       // controls mobile drawer
```

---

## Routing & Auth Guard

```
src/middleware.ts
  If NOT authenticated (no lms_at cookie):
    → redirect to /login?redirect=<currentPath>
  If authenticated on /login or /register:
    → redirect to /my-learning
```

The middleware only checks cookie *presence*. Full JWT validation happens in the backend on every API call.

---

## Component Architecture

```
layout components (layout/)
  ClientSidebar         — nav + user row
  ClientTopbar          — search + notifications + tabs
  RightSidebar          — activity panel
  AIChatPanel           — slide-out AI chat

feature components (courses/, learn/, auth/, etc.)
  CourseCard            — grid card with thumbnail, stats
  CourseReviews         — review list + write form
  LessonSidebar         — player nav (sections + lessons)
  LessonPlayer          — video element + controls
  AuthPage              — multi-step register/login form

ui components (ui/)
  StreakWidget           — daily streak display
  Toaster               — toast notifications
  InstallPrompt         — PWA install banner
```

---

## Key Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useIsMobile(bp?)` | `hooks/useIsMobile.ts` | SSR-safe viewport check |
| `useCurrentUser()` | `lib/api/user.ts` | Logged-in user data |
| `useCourses(params)` | `lib/api/courses.ts` | Paginated course list |
| `useCourse(slug)` | `lib/api/courses.ts` | Course detail + outline |
| `useMyEnrollments()` | `lib/api/enrollments.ts` | Student's enrollments |
| `useCourseProgress(slug)` | `lib/api/enrollments.ts` | Enrollment + progress |
| `useMarkLessonComplete(slug)` | `lib/api/progress.ts` | Mark lesson done |
| `useNotifications()` | `lib/api/notifications.ts` | Bell notifications |
| `useUIStore()` | `store/ui.store.ts` | UI state |

---

## Environment Variables (client-side)

```env
NEXT_PUBLIC_API_URL=          # Optional; next.config.ts falls back to localhost:4000
NEXT_PUBLIC_SENTRY_DSN=       # Optional; Sentry tracking
```

Backend URL is **never** exposed in client code — the Next.js rewrite handles it.

---

## Performance Patterns

- `staleTime: 30_000` on course lists (30s cache before refetch)
- `staleTime: 5 * 60_000` on categories (rarely change)
- `staleTime: 0` on lesson progress (always fresh on mount)
- Framer Motion `optimizePackageImports: ['lucide-react', 'framer-motion']` in next.config.ts
- Images: `next/image` with remote patterns for GitHub, Google, Unsplash avatars
- `withSentryConfig` wraps `nextConfig` for source map uploads
