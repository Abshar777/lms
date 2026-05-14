# Client Frontend — Features

All features available in the student-facing application (`client/`, port 3000).

---

## Navigation & Layout

| Feature | Status | Location |
|---------|--------|----------|
| Sidebar layout (desktop ≥ lg) | ✅ | `ClientSidebar.tsx` |
| Mobile drawer (hamburger < lg) | ✅ | `ClientSidebar.tsx` + `ClientTopbar.tsx` |
| Topbar with nav tabs | ✅ | `ClientTopbar.tsx` |
| Collapsible sidebar (desktop) | ✅ | `useUIStore().toggleSidebar` |
| Layout switcher (sidebar ↔ topbar) | ✅ | `useUIStore().navLayout` |
| Right activity panel | ✅ | `RightSidebar.tsx` |
| Responsive (all breakpoints) | ✅ | via `useIsMobile()` hook |
| AI chat slide-out panel | ✅ | `AIChatPanel.tsx` |

---

## Authentication

| Feature | Status | Notes |
|---------|--------|-------|
| Email + password register | ✅ | `AuthPage.tsx` (multi-step) |
| Email + password login | ✅ | `AuthPage.tsx` |
| Logout (clears httpOnly cookies) | ✅ | `POST /auth/logout` |
| Persist session (refresh token) | ✅ | Auto-refresh via interceptor |
| Email verification banner | ✅ | `VerifyEmailBanner.tsx` |
| Forgot password flow | ❌ | Backend exists, no UI |
| Google OAuth | ❌ | Backend route exists, button is stub |
| TOTP 2FA setup / verify | ❌ | Backend exists, no UI |

---

## Course Catalogue

| Feature | Status | Notes |
|---------|--------|-------|
| Course grid (paginated) | ✅ | `/courses` page |
| Filter by level (beginner/intermediate/advanced) | ✅ | |
| Filter by category | ✅ | Fetched from API |
| Filter by price (free, $1-$29, $30-$99, $100+) | ✅ | |
| Filter by duration (< 1h, 1-3h, etc.) | ✅ | |
| Sort by (popular, rating, newest, price) | ✅ | |
| Live typeahead search (280ms debounce) | ✅ | In topbar |
| Full-text search page | ✅ | `/search?q=` |
| Prefix search mode | ✅ | `search_mode=prefix` |
| Content type filter (course/quiz/path/page) | ✅ | |

---

## Course Detail

| Feature | Status | Notes |
|---------|--------|-------|
| Course info (title, instructor, stats) | ✅ | `/courses/[slug]` |
| Curriculum outline (sections + lessons) | ✅ | Real API data |
| Enroll button (free courses) | ✅ | `useEnroll()` mutation |
| Enroll button (paid courses) | ⚠️ | Shows price + "Coming soon" |
| Rating histogram | ✅ | `useRatingHistogram()` |
| Review list (paginated) | ✅ | `CourseReviews.tsx` |
| Write review (enrolled only) | ✅ | `WriteReviewForm.tsx` |
| Mark review helpful | ✅ | `useVoteHelpful()` |
| Report review | ✅ | `useReportReview()` |
| Preview video | ✅ | If `previewUrl` set |

---

## Lesson Player

| Feature | Status | Notes |
|---------|--------|-------|
| Video player (`<video>`) | ✅ | `/learn/[slug]/[lessonId]` |
| Lesson sidebar (all lessons) | ✅ | `LessonSidebar.tsx` |
| Completed lessons (checkmarks) | ✅ | From progress API |
| Mark lesson complete button | ✅ | `useMarkLessonComplete()` |
| Auto-advance to next lesson | ✅ | On completion |
| Watch time recording (every 15s) | ✅ | `recordWatchTime()` |
| Resume from last position | ✅ | `useMyLessonProgress()` |
| Article lesson rendering | ✅ | `contentBody` rich text |
| Prev / Next navigation | ✅ | |

---

## My Learning

| Feature | Status | Notes |
|---------|--------|-------|
| All enrolled courses | ✅ | `/my-learning` |
| Filter by status (not started, in progress, completed) | ✅ | |
| Search enrolled courses | ✅ | |
| Continue learning (in-progress courses) | ✅ | With progress bar |
| Last lesson resume link | ✅ | `lastLessonId` |
| Progress percentage | ✅ | |
| Streak widget | ✅ | `StreakWidget.tsx` |

---

## Gamification

| Feature | Status | Notes |
|---------|--------|-------|
| Daily streaks | ✅ | `/streaks` page |
| Achievements / badges | ✅ | `/achievements` page |
| Favorites (toggle + list) | ✅ | `/favorites` page + topbar |
| Certificates (view) | ❌ | Backend exists, no UI |
| Leaderboard | ❌ | Not implemented |

---

## Settings

| Feature | Status | Notes |
|---------|--------|-------|
| Profile edit (name, bio, avatar) | ✅ | `/settings` |
| Password change | ✅ | |
| Email notification preferences | ✅ | |
| TOTP 2FA enable/disable | ❌ | No UI |

---

## Live Classes

| Feature | Status | Notes |
|---------|--------|-------|
| Live class list | ✅ | `/live-classes` |
| Schedule + join link | ✅ | |
| Enrollment confirmation email | ✅ | |

---

## Communication

| Feature | Status | Notes |
|---------|--------|-------|
| In-app notifications (bell) | ✅ | Real-time from API |
| Mark notification read / all read | ✅ | |
| AI chat panel | ✅ | Ollama backend |
| Discussion threads (below lessons) | ❌ | Backend exists, no UI |
| Course notes | ❌ | Backend exists, no UI |
| Bookmarks | ❌ | Backend exists, no UI |

---

## PWA

| Feature | Status |
|---------|--------|
| Install prompt | ✅ `InstallPrompt.tsx` |
| Offline support | ❌ |
