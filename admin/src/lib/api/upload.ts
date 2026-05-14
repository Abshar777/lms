'use client'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'

/* ── Types ─────────────────────────────────────────────────── */
export interface UploadImageResult {
  url:  string
  key:  string
  size: number
}

export interface PresignResult {
  presignedUrl: string
  publicUrl:    string
  key:          string
}

/* ── Image: backend receives file → uploads to R2 → returns CDN URL ── */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<{ success: true; data: UploadImageResult }>(
    '/uploads/image',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data.url
}

/* ── Presign: backend returns PUT URL → client uploads directly to R2 ── */
export async function getPresignedUrl(
  filename:    string,
  contentType: string,
  folder = 'uploads',
): Promise<PresignResult> {
  const res = await api.post<{ success: true; data: PresignResult }>(
    '/uploads/presign',
    { filename, contentType, folder },
  )
  return res.data.data
}

/* ── Upload a file directly to R2 via presigned URL (with progress) ── */
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

/* ── Video: presigned URL flow (no large file through backend) ── */
export async function uploadVideo(
  file:        File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const result = await getPresignedUrl(file.name, file.type, 'videos')
  await uploadToR2Direct(result.presignedUrl, file, onProgress)
  return result.publicUrl
}

/* ── React Query hooks ── */
export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => uploadImage(file),
  })
}

export function useUploadVideo(onProgress?: (pct: number) => void) {
  return useMutation({
    mutationFn: (file: File) => uploadVideo(file, onProgress),
  })
}
