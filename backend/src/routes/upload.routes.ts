import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate }  from '@/middleware/auth.middleware.ts'
import { imageUpload, videoUpload } from '@/middleware/upload.middleware.ts'
import { sendSuccess } from '@/utils/response.ts'
import { env } from '@/config/env.ts'

const router = Router()

/* ── All upload routes require a valid session ── */
router.use(authenticate)

/* ── Public URL prefix ───────────────────────────────────────
   env.BACKEND_PUBLIC_URL defaults to http://localhost:4000.
   Override in .env for production deployments.
────────────────────────────────────────────────────────────── */
function backendOrigin(): string {
  return env.BACKEND_PUBLIC_URL
}

/* ── POST /uploads/image ─────────────────────────────────────
   Accepts: multipart/form-data with field "file"
   Accepts: JPEG, PNG, GIF, WebP — max 5 MB
   Returns: { url: "https://…/uploads/images/filename.jpg" }
────────────────────────────────────────────────────────────── */
router.post(
  '/image',
  (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({
          success: false,
          error: { code: 'UPLOAD_ERROR', message: (err as Error).message },
        })
        return
      }
      next()
    })
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file was uploaded. Use the "file" field in your multipart form.' },
      })
      return
    }
    const url = `${backendOrigin()}/uploads/images/${req.file.filename}`
    sendSuccess(res, { url, filename: req.file.filename, size: req.file.size }, undefined, 201)
  },
)

/* ── POST /uploads/video ─────────────────────────────────────
   Accepts: multipart/form-data with field "file"
   Accepts: MP4, WebM, QuickTime, AVI, MKV — max 500 MB
   Returns: { url: "https://…/uploads/videos/filename.mp4" }
────────────────────────────────────────────────────────────── */
router.post(
  '/video',
  (req: Request, res: Response, next: NextFunction) => {
    videoUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({
          success: false,
          error: { code: 'UPLOAD_ERROR', message: (err as Error).message },
        })
        return
      }
      next()
    })
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file was uploaded. Use the "file" field in your multipart form.' },
      })
      return
    }
    const url = `${backendOrigin()}/uploads/videos/${req.file.filename}`
    sendSuccess(res, { url, filename: req.file.filename, size: req.file.size }, undefined, 201)
  },
)

export default router
