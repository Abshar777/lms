import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema, ZodError } from 'zod'
import { sendError } from '@/utils/response.ts'

type ValidationTarget = 'body' | 'query' | 'params'

/* ─────────────────────────────────────────────────────
   validate(schema, target?)
   ─────────────────────────────────────────────────────
   Factory middleware that validates req[target] against
   a Zod schema. Replaces the raw input with the parsed
   (coerced + stripped) data on success.

   Usage:
     router.post('/register', validate(registerSchema), authController.register)
     router.get('/courses',   validate(paginationSchema, 'query'), ...)
───────────────────────────────────────────────────── */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])

    if (!result.success) {
      const issues = formatZodError(result.error)
      sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 422, issues)
      return
    }

    /* Replace with parsed data (coercion, defaults, strips extras) */
    req[target] = result.data
    next()
  }
}

/* ─── Format Zod errors into a flat array ───────────
   Output: [{ field: 'email', message: 'Invalid email' }]
───────────────────────────────────────────────────── */
function formatZodError(error: ZodError) {
  return error.issues.map(issue => ({
    field:   issue.path.join('.') || 'root',
    message: issue.message,
  }))
}
