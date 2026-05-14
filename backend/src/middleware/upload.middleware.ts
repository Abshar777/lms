import multer, { type FileFilterCallback } from 'multer'
import type { Request } from 'express'

/* ── Memory storage ────────────────────────────────────────────
   Files land in req.file.buffer — the route handler streams
   them to Cloudflare R2.  Nothing touches local disk.
────────────────────────────────────────────────────────────── */

/* ── Image upload ───────────────────────────────────────────── */
const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req: Request, file, cb: FileFilterCallback) => {
    if (ALLOWED_IMAGE.has(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG, GIF or WebP images are allowed'))
  },
})

/* ── Video MIME validator ───────────────────────────────────────
   Videos are NOT buffered through the backend — the route
   handler issues a presigned PUT URL so the client uploads
   directly to R2.  This multer instance is kept for optional
   MIME-type pre-validation on small metadata-only requests.
────────────────────────────────────────────────────────────── */
export const ALLOWED_VIDEO = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',    // .mov
  'video/x-msvideo',   // .avi
  'video/x-matroska',  // .mkv
])
