# Client Frontend — Components Reference

---

## Layout Components (`src/components/layout/`)

### `ClientSidebar.tsx`
Desktop sidebar (`hidden lg:flex`) + mobile drawer (`AnimatePresence`).
- **Props**: none (reads from `useUIStore`)
- **State**: `sidebarCollapsed`, `mobileNavOpen`, `setMobileNav`
- **Internal**: `SidebarContent` (shared between desktop and mobile), `CollapseToggle` (desktop only)
- **Nav items**: My Learning, Catalog, Learning Paths, Achievements, Streaks
- **Bottom**: Settings + User row with logout

### `ClientTopbar.tsx`
Fixed header with two rows: search/actions (60px) + nav tabs (40px).
- **Props**: none
- **State**: `navLayout`, `sidebarCollapsed`, `setMobileNav`
- **Features**: Live typeahead search, notifications bell, AI chat toggle, profile link, hamburger (mobile)
- **Tabs**: `SIDEBAR_TABS` (when sidebar layout) or `TOPBAR_TABS` (when topbar layout)
- **Animations**: slide-in from top on mount, tab underline `layoutId`

### `RightSidebar.tsx`
Right-side activity panel showing recent lesson activity.
- Toggleable via `useUIStore().toggleRightPanel`
- Width: 320px, offset from right

### `RightSidebarToggle.tsx`
Floating button to open/close the right sidebar.

### `AIChatPanel.tsx`
Slide-out panel for AI Q&A (Ollama backend).
- **Props**: `open: boolean`, `onClose: () => void`
- Calls `POST /api/v1/ai/chat`

---

## Auth Components (`src/components/auth/`)

### `AuthPage.tsx`
Multi-step unified login + register page.
- **Props**: `initialMode: 'login' | 'register'`
- Steps: email → password → (name for register)
- Handles: login, register, step transitions

### `VerifyEmailBanner.tsx`
Banner shown inside the dashboard when email is unverified.
- Calls `POST /api/v1/auth/resend-verification`

---

## Course Components (`src/components/courses/`)

### `CourseCard.tsx`
Card shown in the catalogue grid.
- **Props**: `course: Course`
- Shows: thumbnail, title, instructor, rating, duration, price
- Links to `/courses/[slug]`

### `CourseReviews.tsx`
Review list + rating histogram + write review form.
- **Props**: `courseId: string, slug: string`
- Uses: `useCourseReviews()`, `useSubmitReview()`, `useRatingHistogram()`
- Shows write form only if enrolled

### `WriteReviewForm.tsx`
Star picker + textarea for submitting a review.
- **Props**: `courseId: string, onSuccess: () => void`

---

## Learn Components (`src/components/learn/`)

### `LessonSidebar.tsx`
Vertical lesson list inside the player layout.
- **Props**: `sections, lessons, currentLessonId, completedIds`
- Collapsible sections, completed checkmarks, active highlight

### `LessonPlayer.tsx`
Main player area: video element + article body + complete button.
- **Props**: `lesson: LessonOutline, slug: string`
- Tracks: `onTimeUpdate` → `recordWatchTime` (every 15s)
- Button: "Mark complete" → `useMarkLessonComplete()`
- Resume: `useMyLessonProgress()` → sets `video.currentTime`

---

## UI Components (`src/components/ui/`)

### `StreakWidget.tsx`
Displays current streak, weekly goal, and streak calendar.
- Calls `GET /api/v1/streaks/me`

### `Toaster.tsx`
Toast notification stack.
- Reads from `useUIStore().toasts`
- Auto-dismisses after timeout

### `InstallPrompt.tsx`
PWA "Add to Home Screen" prompt.
- Uses `beforeinstallprompt` event

### `PageHeader.tsx`
Shared page header with title, subtitle, badge, and action slot.
- **Props**: `title, subtitle?, badge?, actions?`

---

## PWA (`src/components/pwa/`)

### `InstallPrompt.tsx`
Browser-native install prompt wrapper.
- Listens for `beforeinstallprompt` event
- Shows a custom UI card

---

## Component Patterns to Follow

### Adding a new page
1. Create `src/app/(dashboard)/new-page/page.tsx`
2. Add to `navItems` in `ClientSidebar.tsx` and `TOPBAR_TABS` in `ClientTopbar.tsx`
3. Add a TanStack Query hook in `src/lib/api/new-page.ts`
4. Use `useQuery` / `useMutation` — never fetch directly in components

### Adding a new mutation
```ts
// In src/lib/api/something.ts
export function useDoSomething() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MyDto) => apiPost<MyResult>('/something', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relevant', 'key'] })
    },
  })
}

// In component
const doSomething = useDoSomething()
doSomething.mutate(data)
```
