'use client'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

interface ChatPayload {
  message:    string
  history:    ChatMessage[]
  lessonId?:  string
  courseSlug?: string
}

interface ChatResponse {
  success: true
  data: { reply: string }
}

export function useAIChat() {
  return useMutation({
    mutationFn: async (payload: ChatPayload) => {
      try {
        const res = await api.post<ChatResponse>('/ai/chat', payload)
        return res.data.data.reply
      } catch (err: unknown) {
        /* Prefer the backend's human-readable message over the generic axios status text */
        const backendMsg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message
        if (backendMsg) throw new Error(backendMsg)
        throw err
      }
    },
  })
}
