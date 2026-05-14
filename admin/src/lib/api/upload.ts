'use client'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'

interface UploadResponse {
  success: true
  data: { url: string; filename: string; size: number }
}

async function uploadFile(endpoint: string, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<UploadResponse>(endpoint, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data.url
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => uploadFile('/uploads/image', file),
  })
}

export function useUploadVideo() {
  return useMutation({
    mutationFn: (file: File) => uploadFile('/uploads/video', file),
  })
}
