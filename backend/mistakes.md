# Backend — Mistakes & Lessons Learned

A running log of backend-specific bugs, wrong assumptions, and traps.

---

## Validation

### ❌ Zod enum fails on empty string query params
**Mistake**: `GET /courses?level=` sends `level=""` which fails `z.enum(['beginner','intermediate','advanced'])`.  
**Fix**: Use `z.string().optional()` for query params, then validate enum values inside the handler. Or preprocess: `z.preprocess(v => v === '' ? undefined : v, z.enum([...]).optional())`.

### ❌ Zod `.optional()` doesn't treat `""` as unset
**Mistake**: `z.string().min(1).optional()` on an env var set to `""` still fails min(1).  
**Fix**: Wrap with `opt()` preprocess helper in `config/env.ts`:
```ts
const opt = (s: z.ZodString) =>
  z.preprocess(v => (v === '' ? undefined : v), s.optional())
```

### ❌ `opt().default()` chaining
**Mistake**: `opt(z.string().url()).default('http://...')` — TypeScript error: `ZodEffects` has no `.default()`.  
**Fix**: Inline the preprocess instead of using the `opt()` wrapper.

---

## Auth & Security

### ❌ Storing raw refresh token in DB
**Mistake**: Saving the JWT string directly in `RefreshToken.token`.  
**Problem**: DB breach → all refresh tokens compromised.  
**Fix**: Store `SHA-256(tokenHash)` — the raw token is only in the cookie and never persisted.

### ❌ Missing `revokedReason` on revoke
**Mistake**: Just setting `isRevoked: true` without a reason.  
**Problem**: Can't distinguish "legitimate rotation" from "user logout" from "security revoke". The reuse-detection logic needs this: only `revokedReason === 'rotation'` should trigger kill-all-sessions.  
**Fix**: Always set `revokedReason` when revoking.

### ❌ `Secure` cookie flag in development
**Mistake**: Setting `Secure: true` unconditionally on cookies.  
**Problem**: Dev over HTTP (`localhost`) — browser rejects Secure cookies.  
**Fix**: `secure: env.NODE_ENV === 'production'`.

### ❌ Admin routes accessible to students
**Mistake**: Mounting student-facing routes inside the admin router (`router.use(authenticate, requireRole('admin'))`).  
**Problem**: Any route under that router inherits the admin role check → students get 403.  
**Fix**: Student-facing endpoints (e.g., coupon validation) must be in their own router with only `authenticate`.

---

## Express & Middleware

### ❌ Stripe webhook raw body parsed by `express.json()`
**Mistake**: Registering the Stripe webhook route after `app.use(express.json())`.  
**Problem**: Stripe signature verification requires the raw, unmodified body bytes. `express.json()` parses and re-serializes the body, changing whitespace → signature mismatch → 400.  
**Fix**: Register `app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }))` **before** `app.use(express.json())`.

### ❌ Sentry initialized after express import
**Mistake**: `import * as Sentry from '@sentry/node'` then `import express from 'express'` after `Sentry.init()` call.  
**Fix**: `Sentry.init()` must happen at the very top of `app.ts`, before **any** other import, so it can instrument all modules.

### ❌ Missing `next(err)` in async route handlers
**Mistake**: Throwing inside an async handler without `try/catch → next(err)`.  
**Problem**: Unhandled promise rejection — Express doesn't catch async throws automatically.  
**Fix**: All route handlers:
```ts
router.get('/path', async (req, res, next) => {
  try {
    // ...
  } catch (err) { next(err) }
})
```

---

## Database

### ❌ Missing indexes causing slow queries
**Mistake**: Querying by `userId + courseId` on Enrollment without a compound index.  
**Problem**: Full collection scan on large datasets.  
**Fix**: `EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true })` — also enforces one enrollment per user per course.

### ❌ `toJSON` transform not applied on `.lean()` queries
**Mistake**: Using `.lean()` (returns plain objects) expecting `id` instead of `_id`.  
**Problem**: `baseSchemaOptions.toJSON` transform only runs on Mongoose Documents, not lean objects.  
**Fix**: Either don't use `.lean()`, or manually map `_id` → `id` after the query.

### ❌ `select: false` fields returned in queries
**Mistake**: `UserSchema` has `passwordHash: { ..., select: false }` but a raw `.find()` can still pull it in with `.select('+passwordHash')`.  
**Fix**: Only add `+passwordHash` when explicitly needed (auth service password comparison).

---

## Business Logic

### ❌ Review submit without enrollment check
**Mistake**: Allowing any authenticated user to submit a review.  
**Problem**: Users who never took the course can leave reviews.  
**Fix**: Check `enrollment.status !== 'dropped'` before allowing submit.

### ❌ Email blocking HTTP response
**Mistake**: `await sendEmail(...)` inline in enrollment / completion logic.  
**Problem**: If SMTP is slow or down, the API call hangs or fails.  
**Fix**: Fire-and-forget: `void (async () => { await sendEmail(...) })()`.

### ❌ Enrollment `progressPercent` not recomputed on lesson delete
**Mistake**: When a lesson is deleted by admin, the total lesson count decreases, but no enrollments are recomputed.  
**Fix**: When deleting a lesson, trigger `recomputeProgress` for all enrolled users (or batch job). Currently not implemented — edge case to fix later.

---

## Repository / ORM

### ❌ `create_()` instead of `create()`
**Note**: The BaseRepository uses `create_()` (underscore suffix) to avoid shadowing Mongoose Model's `.create()` which has a different signature.  
**Don't confuse**: `this.model.create(dto)` vs `this.repo.create_(dto)`.

### ❌ `findAll()` returning wrong pagination
**Mistake**: Calling `.skip((page-1) * perPage).limit(perPage)` after `.count()` in separate queries → race condition on concurrent writes.  
**Fix**: Use aggregation pipeline with `$facet` for atomic count + data retrieval. (Currently using separate queries — acceptable for this scale.)

---

## Sentry

### ❌ `setupExpressErrorHandler` called before custom error handler
**Mistake**: `app.use(errorMiddleware)` then `Sentry.setupExpressErrorHandler(app)`.  
**Problem**: Sentry handler must see the error before it's formatted and sent to the client — if custom handler swallows the error first, Sentry never sees it.  
**Fix**: Sentry handler registered first, then custom handler:
```ts
if (SENTRY_DSN) Sentry.setupExpressErrorHandler(app)
app.use(errorMiddleware)
```
