import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate }    from '@/middleware/auth.middleware.ts'
import { imageUpload, ALLOWED_VIDEO } from '@/middleware/upload.middleware.ts'
import { sendSuccess }     from '@/utils/response.ts'
import {
  uploadToR2,
  generatePresignedPutUrl,
  deleteFromR2,
  makeKey,
} from '@/services/r2.service.ts'
import { transcodeToHLS }  from '@/services/hls.service.ts'

const router = Router()

/* ── All upload routes require a valid session ── */
router.use(authenticate)

/* ── POST /uploads/image ─────────────────────────────────────
   Accepts: multipart/form-data with field "file"
   Accepts: JPEG, PNG, GIF, WebP — max 5 MB
   Flow:    multer (memoryStorage) → uploadToR2 → return CDN URL
   Returns: { url, key, size }
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
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file was uploaded. Use the "file" field in your multipart form.' },
      })
      return
    }

    try {
      const key = makeKey(req.file.originalname, 'images')
      const url = await uploadToR2(req.file.buffer, key, req.file.mimetype)
      sendSuccess(res, { url, key, size: req.file.size }, undefined, 201)
    } catch (err) {
      res.status(500).json({
        success: false,
        error: { code: 'R2_ERROR', message: (err as Error).message },
      })
    }
  },
)

/* ── POST /uploads/presign ───────────────────────────────────
   For large files (videos, PDFs) — client uploads directly to R2.
   Body: { filename: string, contentType: string, folder?: string }
   Returns: { presignedUrl, publicUrl, key }
   The client PUTs the file to presignedUrl, then stores publicUrl.
────────────────────────────────────────────────────────────── */
const presignBody = z.object({
  filename:    z.string().min(1),
  contentType: z.string().min(1),
  folder:      z.string().default('uploads'),
})

router.post('/presign', async (req: Request, res: Response) => {
  const parsed = presignBody.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Validation error' },
    })
    return
  }

  const { filename, contentType, folder } = parsed.data

  // Validate video MIME types when folder is videos
  if (folder === 'videos' && !ALLOWED_VIDEO.has(contentType)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_TYPE', message: 'Only MP4, WebM, QuickTime, AVI or MKV videos are allowed' },
    })
    return
  }

  try {
    const key    = makeKey(filename, folder)
    const result = await generatePresignedPutUrl(key, contentType)
    sendSuccess(res, result, undefined, 201)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'R2_ERROR', message: (err as Error).message },
    })
  }
})

/* ── POST /uploads/video (convenience alias) ─────────────────
   Same as /presign with folder=videos.
   Body: { filename: string, contentType: string }
   Returns: { presignedUrl, publicUrl, key }
────────────────────────────────────────────────────────────── */
router.post('/video', async (req: Request, res: Response) => {
  const parsed = z.object({
    filename:    z.string().min(1),
    contentType: z.string().min(1),
  }).safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Validation error' },
    })
    return
  }

  const { filename, contentType } = parsed.data

  if (!ALLOWED_VIDEO.has(contentType)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_TYPE', message: 'Only MP4, WebM, QuickTime, AVI or MKV videos are allowed' },
    })
    return
  }

  try {
    const key    = makeKey(filename, 'videos')
    const result = await generatePresignedPutUrl(key, contentType)
    sendSuccess(res, result, undefined, 201)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'R2_ERROR', message: (err as Error).message },
    })
  }
})

/* ── POST /uploads/transcode ─────────────────────────────────
   Transcodes a video already on R2 to HLS (360p / 720p / 1080p).
   Body: { key: string }  — the R2 key of the source MP4
   Returns: { hlsUrl }    — public URL of master.m3u8
   Note: This is a long-running operation (30 s – 3 min depending on video length).
────────────────────────────────────────────────────────────── */
router.post('/transcode', async (req: Request, res: Response) => {
  const parsed = z.object({ key: z.string().min(1) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Validation error' },
    })
    return
  }

  try {
    const hlsUrl = await transcodeToHLS(parsed.data.key)
    sendSuccess(res, { hlsUrl }, undefined, 201)
  } catch (err) {
    console.error('[transcode] FFmpeg error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'TRANSCODE_ERROR', message: (err as Error).message },
    })
  }
})

/* ── DELETE /uploads/:key ────────────────────────────────────
   Deletes an object from R2 by its key.
   Param: key — URL-encoded R2 object key (e.g. images/1234-abc.jpg)
   Returns: { deleted: true }
────────────────────────────────────────────────────────────── */
router.delete('/:key(*)', async (req: Request, res: Response) => {
  const key = Array.isArray(req.params['key']) ? req.params['key'][0] : req.params['key']
  if (!key) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_KEY', message: 'Provide the R2 object key in the URL path.' },
    })
    return
  }

  try {
    await deleteFromR2(key)
    sendSuccess(res, { deleted: true, key })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'R2_ERROR', message: (err as Error).message },
    })
  }
})

export default router
