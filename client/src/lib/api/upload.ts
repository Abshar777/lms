import { useMutation } from '@tanstack/react-query'
import { api as axios } from '@/lib/axios'

/* ── Types ─────────────────────────────────────────────────── */
export interface UploadImageResult {
  url:      string
  key:      string
  size:     number
}

export interface PresignResult {
  presignedUrl: string
  publicUrl:    string
  key:          string
}

/* ── API calls ──────────────────────────────────────────────── */

/**
 * Upload an image through the backend → R2.
 * Max 5 MB. Accepts JPEG, PNG, GIF, WebP.
 */
export async function uploadImage(file: File): Promise<UploadImageResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await axios.post<{ success: true; data: UploadImageResult }>(
    '/api/v1/uploads/image',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.data
}

/**
 * Request a presigned PUT URL for a direct client → R2 upload.
 * Use this for large files (videos, PDFs).
 */
export async function getPresignedUrl(
  filename:    string,
  contentType: string,
  folder = 'uploads',
): Promise<PresignResult> {
  const { data } = await axios.post<{ success: true; data: PresignResult }>(
    '/api/v1/uploads/presign',
    { filename, contentType, folder },
  )
  return data.data
}

/**
 * Upload a file directly to R2 via a presigned PUT URL.
 * Calls onProgress(0-100) as the upload progresses.
 */
export async function uploadToR2Direct(
  presignedUrl: string,
  file:         File,
  onProgress?:  (pct: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`R2 upload failed: ${xhr.status} ${xhr.statusText}`))
    })
    xhr.addEventListener('error', () => reject(new Error('Network error during R2 upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    xhr.send(file)
  })
}

/**
 * Full presigned video upload flow:
 *   1. Get presigned URL from backend
 *   2. PUT file directly to R2
 *   3. Return the public CDN URL
 */
export async function uploadVideo(
  file:        File,
  onProgress?: (pct: number) => void,
): Promise<PresignResult> {
  const result = await getPresignedUrl(file.name, file.type, 'videos')
  await uploadToR2Direct(result.presignedUrl, file, onProgress)
  return result
}

/* ── React Query hooks ──────────────────────────────────────── */

/**
 * Mutation for image uploads (small files — routed through backend).
 * Usage:
 *   const { mutateAsync, isPending } = useImageUpload()
 *   const { url } = await mutateAsync(file)
 */
export function useImageUpload() {
  return useMutation({
    mutationFn: (file: File) => uploadImage(file),
  })
}

/**
 * Mutation for video / large-file uploads (direct client → R2).
 * Supports progress tracking via `onProgress` in mutationFn options.
 *
 * Usage:
 *   const { mutateAsync } = usePresignedUpload()
 *   const { publicUrl } = await mutateAsync({ file, onProgress: setPct })
 */
export function usePresignedUpload() {
  return useMutation({
    mutationFn: ({
      file,
      folder,
      onProgress,
    }: {
      file:        File
      folder?:     string
      onProgress?: (pct: number) => void
    }) => {
      if (file.type.startsWith('video/')) {
        return uploadVideo(file, onProgress)
      }
      // Generic presign for any other large file
      return getPresignedUrl(file.name, file.type, folder).then(async (result) => {
        await uploadToR2Direct(result.presignedUrl, file, onProgress)
        return result
      })
    },
  })
}
