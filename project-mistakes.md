# Project Mistakes & Lessons Learned

A running log of bugs, wrong assumptions, and traps that cost time. Read before making changes.

---

## Auth & Cookies

### ❌ Storing tokens in localStorage
**Mistake**: Earlier versions wrote `access_token` to `localStorage` in `axios.ts`.  
**Problem**: XSS-vulnerable. Doesn't work with SSR. Cookies are the correct approach.  
**Fix**: Both `admin/src/lib/axios.ts` and `client/src/lib/axios.ts` use `withCredentials: true` and drop all localStorage token writes. The cookie is sent automatically.

### ❌ Reading `lms_at` cookie in middleware and trying to verify JWT
**Mistake**: Next.js middleware ran `verifyJWT()` on the cookie.  
**Problem**: Middleware runs on the edge runtime which can't use Node crypto modules.  
**Fix**: Middleware only checks cookie *presence* (`cookies().has('lms_at')`). JWT verification happens only in the API (backend).

### ❌ Refresh token in request body / header
**Mistake**: Sending refresh token as JSON body `{ refreshToken: "..." }`.  
**Problem**: Forces client to store the token somewhere accessible to JS.  
**Fix**: Refresh token is httpOnly cookie `lms_rt` with `Path=/api/v1/auth`. Backend reads from `req.cookies.lms_rt`.

### ❌ Using `next-auth` 
**Mistake**: Initial architecture used `next-auth` for session management.  
**Problem**: Conflicts with custom httpOnly cookie auth; adds unnecessary complexity; `__Secure-next-auth.session-token` cookie clashes.  
**Fix**: Removed `next-auth` from both frontends. Custom auth flow with `lms_at` / `lms_rt`.

---

## Backend Validation

### ❌ `STRIPE_SECRET_KEY=` (blank) crashing server startup
**Mistake**: Stripe key set to empty string in `.env`.  
**Problem**: `z.string().min(1).optional()` does not treat `""` as `undefined` — Zod sees an empty string and fails the min(1) check.  
**Fix**: The `opt()` preprocess helper in `backend/src/config/env.ts` converts `""` → `undefined` before Zod validates.
```ts
const opt = (schema: z.ZodString) =>
  z.preprocess(v => (v === '' ? undefined : v), schema.optional())
```

### ❌ Using `opt().default()` chaining
**Mistake**: `opt(z.string().url()).default('http://...')` fails because `opt()` returns `ZodEffects`, which doesn't have `.default()`.  
**Fix**: Inline the preprocess: `z.preprocess(v => (v === '' ? undefined : v), z.string().url().default('http://...'))`

### ❌ Clean query params not stripped before sending
**Mistake**: Sending `level=` (empty string) to the backend causes Zod `enum` validation failure.  
**Fix**: Use the `clean()` helper (defined in both `courses.ts` API files) to strip empty/null/false values before sending query params.

---

## API Route Structure

### ❌ Coupon validation behind admin role guard
**Mistake**: `GET /admin/coupons/validate` was registered inside `admin.routes.ts` which applies `authenticate + requireRole('admin', 'instructor')` globally.  
**Problem**: Students trying to validate coupon codes at checkout received 403.  
**Fix**: Created `backend/src/routes/coupons.routes.ts` with only `authenticate` (no role check), mounted at `/coupons`. Client calls `/coupons/validate` not `/admin/coupons/validate`.

### ❌ `sendError` parameter order
**Mistake**: Calling `sendError(res, 'MESSAGE', 'CODE', 400)` instead of the correct parameter order.  
**Fix**: Signature is `sendError(res, code, message, status)` — code first, message second.

---

## Frontend / React

### ❌ `window.matchMedia` during SSR
**Mistake**: Accessing `window.matchMedia(...)` at module level or directly in component body.  
**Problem**: `window` does not exist during Next.js server-side rendering → crash.  
**Fix**: `useIsMobile()` hook wraps the `matchMedia` call inside `useEffect(() => {...}, [])` so it only runs in the browser. Starts as `false` on the server.

### ❌ `marginLeft` on main content not resetting to 0 on mobile
**Mistake**: `marginLeft: sidebarCollapsed ? 68 : 240` applied regardless of viewport.  
**Problem**: On mobile, the sidebar is hidden — but the content was still offset 240px to the right.  
**Fix**: `const left = isMobile ? 0 : (sidebarCollapsed ? 68 : 240)` using the `useIsMobile()` hook.

### ❌ Demo login fallback
**Mistake**: `AdminLoginForm` and `LoginForm` had a catch block that silently "logged in" with mock data on API failure.  
**Problem**: Hid real errors; gave false impression login worked.  
**Fix**: Removed. Real errors are shown directly.

### ❌ Dropdown overflow on mobile
**Mistake**: Notification and avatar dropdowns had fixed widths (`w-80`, `w-60`).  
**Problem**: On small screens these overflowed the viewport.  
**Fix**: `w-[calc(100vw-2rem)] sm:w-80` — full width minus 1rem padding each side on mobile, fixed width on sm+.

---

## Responsive Design

### ❌ Sidebar always visible (no mobile support)
**Mistake**: Both sidebars used `className="fixed ... flex"` — always visible regardless of viewport.  
**Problem**: On mobile the sidebar overlapped all content.  
**Fix**: `hidden lg:flex` on desktop sidebar + separate `AnimatePresence` mobile drawer controlled by `mobileNavOpen` Zustand state.

### ❌ Nav tabs overflowing on small screens
**Mistake**: `<div className="flex h-[40px]">` containing many tabs with no overflow handling.  
**Problem**: Tabs were clipped or caused horizontal scroll on the whole page.  
**Fix**: `overflow-x-auto scrollbar-none` on the tabs row.

### ❌ Table horizontal overflow without wrapper
**Mistake**: `<table className="w-full min-w-[680px]">` directly inside a card with no scroll wrapper.  
**Problem**: Table caused horizontal scroll on the whole page.  
**Fix**: Wrap table in `<div className="overflow-x-auto">`.

---

## Email Service

### ❌ Email send blocking the HTTP response
**Mistake**: `await sendEnrollmentConfirmation(...)` directly in the enrollment service.  
**Problem**: If email fails (SMTP down), the enrollment API call fails too.  
**Fix**: Fire-and-forget pattern: `void (async () => { await sendEmail(...) })()` — errors are logged but don't bubble.

---

## Tailwind

### ❌ `scrollbar-none` not a built-in Tailwind utility
**Mistake**: Using `scrollbar-none` class expecting it to work out of the box.  
**Problem**: Tailwind v3 doesn't include scrollbar utilities by default.  
**Fix**: Added a custom plugin to both `tailwind.config.ts` files:
```ts
plugin(({ addUtilities }) => {
  addUtilities({
    '.scrollbar-none': {
      'scrollbar-width': 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    },
  })
})
```
