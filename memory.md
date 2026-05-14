# LMS Project Memory

> Fast-reference card for AI assistants and developers. Read this before touching any file.

---

## Monorepo Layout

```
lms/
├── backend/          Express + Mongoose + Bun  → http://localhost:4000
├── client/           Next.js 15 (student app)  → http://localhost:3000
├── admin/            Next.js 15 (admin app)    → http://localhost:3001
└── design-system/    Shared Tailwind tokens
```

---

## How to Run

```bash
# Backend
cd backend && bun --watch src/index.ts

# Client (student)
cd client && npm run dev        # port 3000

# Admin
cd admin && npm run dev         # port 3001

# Seed the database
cd backend && bun run seed
```

---

## Critical Conventions

### API envelope (backend always returns this)
```json
{ "success": true,  "data": <payload>, "meta": <pagination?> }
{ "success": false, "error": { "code": "SNAKE_CASE", "message": "human string" } }
```

### Cookie auth (httpOnly, not localStorage)
| Cookie   | TTL  | Path           | Scope     |
|----------|------|----------------|-----------|
| `lms_at` | 15 m | `/`            | access    |
| `lms_rt` | 30 d | `/api/v1/auth` | refresh   |

### Query key namespaces
- Client:  `['courses', ...]`, `['enrollments', ...]`, `['reviews', ...]`
- Admin:   `['admin', 'courses', ...]`, `['admin', 'stats']`, `['admin', 'users', ...]`

### `clean()` helper (both frontends)
Both `client/src/lib/api/courses.ts` and `admin/src/lib/api/courses.ts` export a `clean()` function that strips `null`, `undefined`, `''`, and `false` from query params before sending to the backend, preventing Zod validation errors.

---

## Auth Guard Pattern

```
client/src/middleware.ts  → checks `lms_at` cookie presence only (no JWT verify)
admin/src/middleware.ts   → same, plus redirects non-admin after API call
AdminGuard (component)    → useCurrentUser() → requireAdmin or redirect
```

---

## Backend Error Handling

Every domain has its own error class:
```ts
class AuthError extends Error {
  constructor(public code: string, message: string, public statusCode = 400)
}
```
`errorMiddleware` maps `instanceof` checks → HTTP status. Copy this pattern for new domains.

---

## File Upload

- Backend serves uploaded files at `/uploads/images/:file` and `/uploads/videos/:file`
- Files stored on disk at `backend/uploads/`
- URL format: `${BACKEND_PUBLIC_URL}/uploads/images/abc123.jpg`
- No auth on upload routes — filenames are random hex (unguessable)

---

## Environment Variables

See `backend/.env.example` for all required vars.  
Key ones: `DATABASE_URL`, `JWT_ACCESS_SECRET` (≥32 chars), `JWT_REFRESH_SECRET` (≥32 chars), `CLIENT_URL`, `ADMIN_URL`.

Empty strings in `.env` are treated as unset (Zod `opt()` preprocess helper in `backend/src/config/env.ts`).

---

## Important Gotchas

1. **Stripe keys as empty string** → Zod rejects. Use `STRIPE_SECRET_KEY=` (blank) which the `opt()` helper converts to `undefined`.
2. **Cookie `Secure` flag** → only set in production. Dev over HTTP works fine.
3. **`bcrypt` not `bcryptjs`** → backend uses `bcrypt` (native bindings, faster).
4. **`withCredentials: true`** on all axios instances → browser sends cookies automatically.
5. **Next.js rewrite** → `client/next.config.ts` proxies `/api/v1/*` → `http://localhost:4000/api/v1/*`. Never hard-code the backend URL in client code.
6. **`scrollbar-none`** → custom Tailwind utility added to both tailwind configs via plugin.
7. **`useIsMobile()`** → SSR-safe hook (starts `false`, updates after mount). Use this, never `window.innerWidth` directly.
8. **Mobile layout** → both sidebars use `hidden lg:flex` on desktop + `AnimatePresence` drawer on mobile. Left margin is `0` on mobile, `68 or 240` on desktop.
