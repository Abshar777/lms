# Client Frontend — Developer Workflow

---

## Daily Development

```bash
cd client
npm run dev        # starts on http://localhost:3000
npm run build      # production build
npm run type-check # tsc --noEmit (must pass before commit)
npx tsc --noEmit   # same
```

> Always run `tsc --noEmit` before committing. Both frontends must pass clean.

---

## Adding a New Feature (end-to-end checklist)

### 1. Backend first
- Add route file in `backend/src/routes/`
- Register in `backend/src/routes/index.ts`
- Write service in `backend/src/services/`
- Add repository methods in `backend/src/repositories/`
- Test manually with curl / Postman

### 2. Add API hook in client
```ts
// client/src/lib/api/my-feature.ts
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/axios'

export const myFeatureKeys = {
  all: ['my-feature'] as const,
  list: (p: object) => ['my-feature', 'list', p] as const,
}

export function useMyFeatureList() {
  return useQuery({
    queryKey: myFeatureKeys.all,
    queryFn:  () => apiGet<MyItem[]>('/my-feature'),
    staleTime: 30_000,
  })
}
```

### 3. Create the page
```
client/src/app/(dashboard)/my-feature/page.tsx
```

### 4. Add to navigation
- `ClientSidebar.tsx` → add to `navItems`
- `ClientTopbar.tsx` → add to `TOPBAR_TABS` (and `SIDEBAR_TABS` if relevant)

### 5. Type-check
```bash
npx tsc --noEmit
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Pages | `page.tsx` | `my-learning/page.tsx` |
| Layouts | `layout.tsx` | `(dashboard)/layout.tsx` |
| Components | `PascalCase.tsx` | `CourseCard.tsx` |
| API hooks | `camelCase.ts` | `enrollments.ts` |
| Stores | `*.store.ts` | `ui.store.ts` |
| Hooks | `use*.ts` | `useIsMobile.ts` |

---

## Import Aliases

The `@` alias maps to `src/`:
```ts
import { useUIStore } from '@/store/ui.store'
import { apiGet } from '@/lib/axios'
import type { Course } from '@/types/index'
```

---

## Key Decisions & Patterns

### Never use `fetch()` directly
Always use `apiGet / apiPost / apiPatch / apiDelete` from `@/lib/axios`. They:
- Attach the base URL automatically
- Send cookies (`withCredentials: true`)
- Unwrap the `{ success, data }` envelope
- Throw on `success: false` (TanStack Query handles the error)

### Never store auth tokens in state or localStorage
Auth is fully cookie-based. The browser sends `lms_at` automatically with every request.

### `useIsMobile()` for responsive logic in JS
```tsx
const isMobile = useIsMobile()  // false on SSR, correct after hydration
const left = isMobile ? 0 : (sidebarCollapsed ? 68 : 240)
```

### Query invalidation after mutations
After any mutation that changes visible data, invalidate the relevant query keys:
```ts
qc.invalidateQueries({ queryKey: enrollmentKeys.mine })
```

### Optimistic updates (not yet used, but the pattern)
```ts
return useMutation({
  mutationFn: ...,
  onMutate: async (variables) => {
    await qc.cancelQueries({ queryKey: ... })
    const prev = qc.getQueryData(...)
    qc.setQueryData(..., /* optimistic update */)
    return { prev }
  },
  onError: (_, __, context) => {
    qc.setQueryData(..., context?.prev)
  },
})
```

---

## Environment Setup

```env
# client/.env.local (create from .env.example)
NEXT_PUBLIC_API_URL=          # leave blank for default localhost:4000 proxy
NEXT_PUBLIC_SENTRY_DSN=       # optional
```

---

## Common Tasks

### Add a new nav item
```ts
// ClientSidebar.tsx
const navItems = [
  ...
  { label: 'My New Page', href: '/my-new-page', icon: SomeIcon },
]

// ClientTopbar.tsx  
const TOPBAR_TABS = [
  ...
  { label: 'My New Page', href: '/my-new-page', icon: SomeIcon },
]
```

### Add a toast notification
```ts
import { useUIStore } from '@/store/ui.store'
const { pushToast } = useUIStore()
pushToast({ kind: 'success', title: 'Enrolled!', body: 'Good luck.' })
```

### Loading state pattern
```tsx
if (isLoading) return <LoadingSkeleton />
if (error)    return <ErrorMessage />
if (!data)    return null
return <YourContent data={data} />
```

---

## TypeScript Rules

- All API response shapes typed via interfaces in `src/lib/api/*.ts`
- Shared domain types in `src/types/index.ts` (`Course`, `PaginationMeta`, `ApiSuccess`, `ApiError`)
- `tsc --noEmit` must pass — no `// @ts-ignore` or `any` unless absolutely necessary
- Use `unknown` instead of `any` when type is genuinely unknown
