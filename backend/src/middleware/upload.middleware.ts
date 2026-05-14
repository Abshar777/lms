import multer, { type FileFilterCallback } from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import type { Request } from 'express'

/* ── Storage root ──────────────────────────────────────────────
   Placed at <project-root>/uploads/{images,videos}/
   Served statically as /uploads/* from app.ts.
────────────────────────────────────────────────────────────── */
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads')
const IMAGE_DIR    = path.join(UPLOADS_ROOT, 'images')
const VIDEO_DIR    = path.join(UPLOADS_ROOT, 'videos')

/* Ensure directories exist at startup */
fs.mkdirSync(IMAGE_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })

/* ── Unique filename helper ─────────────────────────────────── */
function uniqueName(original: string): string {
  const ext = path.extname(original).toLowerCase()
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
}

/* ── Image upload ───────────────────────────────────────────── */
const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

export const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGE_DIR),
    filename:    (_req, file, cb) => cb(null, uniqueName(file.originalname)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req: Request, file, cb: FileFilterCallback) => {
    if (ALLOWED_IMAGE.has(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG, GIF or WebP images are allowed'))
  },
})

/* ── Video upload ───────────────────────────────────────────── */
const ALLOWED_VIDEO = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',    // .mov
  'video/x-msvideo',   // .avi
  'video/x-matroska',  // .mkv
])

export const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
    filename:    (_req, file, cb) => cb(null, uniqueName(file.originalname)),
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req: Request, file, cb: FileFilterCallback) => {
    if (ALLOWED_VIDEO.has(file.mimetype)) cb(null, true)
    else cb(new Error('Only MP4, WebM, QuickTime, AVI or MKV videos are allowed'))
  },
})
