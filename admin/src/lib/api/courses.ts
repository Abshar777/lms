'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { Course, CourseFormValues, PaginationMeta } from '@/types/index'

// ─────────────────────────────────────────────────────────────────────────────
// Toggle this flag when the backend is live
// ─────────────────────────────────────────────────────────────────────────────
const USE_MOCK = true

type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

const MOCK_SEED: Course[] = [
  { id: '1', title: 'UI/UX Design Mastery',        slug: 'ui-ux-design-mastery',    description: 'Learn everything about modern UI/UX design.',          thumbnailUrl: 'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=400',  price: 49.99, isFree: false, status: 'published', level: 'intermediate', durationMins: 320, language: 'English', enrolledCount: 1240, ratingAvg: 4.8, ratingCount: 312, instructorId: 'i1', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z', instructor: { id: 'i1', name: 'Sarah Chen' }, tags: ['design', 'figma', 'ux'] },
  { id: '2', title: 'TypeScript from Zero to Hero', slug: 'typescript-zero-hero',    description: 'Master TypeScript with real-world projects.',           thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400',  price: 59.99, isFree: false, status: 'published', level: 'beginner',      durationMins: 480, language: 'English', enrolledCount: 2100, ratingAvg: 4.9, ratingCount: 540, instructorId: 'i2', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z', instructor: { id: 'i2', name: 'Alex Kim' },   tags: ['typescript', 'javascript'] },
  { id: '3', title: 'React Advanced Patterns',      slug: 'react-advanced-patterns', description: 'Deep dive into advanced React patterns.',               thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400',  price: 0,     isFree: true,  status: 'published', level: 'advanced',      durationMins: 260, language: 'English', enrolledCount: 890,  ratingAvg: 4.7, ratingCount: 198, instructorId: 'i2', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-03-10T00:00:00Z', instructor: { id: 'i2', name: 'Alex Kim' },   tags: ['react', 'patterns'] },
  { id: '4', title: 'Node.js Microservices',        slug: 'nodejs-microservices',    description: 'Build scalable microservices with Node.js.',           price: 79.99, isFree: false, status: 'draft',     level: 'advanced',      durationMins: 560, language: 'English', enrolledCount: 0,    ratingAvg: 0,   ratingCount: 0,   instructorId: 'i1', createdAt: '2024-04-10T00:00:00Z', updatedAt: '2024-04-10T00:00:00Z', instructor: { id: 'i1', name: 'Sarah Chen' }, tags: ['nodejs', 'microservices'] },
  { id: '5', title: 'Python for Data Science',      slug: 'python-data-science',     description: 'Complete Python data science bootcamp.',               thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400',  price: 69.99, isFree: false, status: 'archived',  level: 'beginner',      durationMins: 720, language: 'English', enrolledCount: 3400, ratingAvg: 4.6, ratingCount: 890, instructorId: 'i3', createdAt: '2023-10-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', instructor: { id: 'i3', name: 'Maya Patel' }, tags: ['python', 'data-science'] },
]

let mockCourses = [...MOCK_SEED]

/* ─── Query keys ─────────────────────────────────── */
export const courseKeys = {
  all:    ['courses'] as const,
  list:   (p: object) => ['courses', 'list', p] as const,
  detail: (id: string) => ['courses', 'detail', id] as const,
}

/* ─── List ───────────────────────────────────────── */
export function useCourses(params: {
  page?: number; per_page?: number; search?: string; status?: string; sort?: string
} = {}) {
  return useQuery({
    queryKey: courseKeys.list(params),
    queryFn: async () => {
      if (!USE_MOCK) {
        const res = await api.get<{ success: true; data: Course[]; meta: PaginationMeta }>('/courses', { params })
        return { docs: res.data.data, meta: res.data.meta }
      }

      await new Promise(r => setTimeout(r, 400))
      let filtered = [...mockCourses]
      if (params.search)
        filtered = filtered.filter(c => c.title.toLowerCase().includes(params.search!.toLowerCase()))
      if (params.status && params.status !== 'all')
        filtered = filtered.filter(c => c.status === params.status)

      const page = params.page ?? 1
      const per_page = params.per_page ?? 10
      const total_count = filtered.length
      const docs = filtered.slice((page - 1) * per_page, page * per_page)
      return {
        docs,
        meta: {
          total_count, page, per_page,
          total_pages: Math.ceil(total_count / per_page),
          has_next: page < Math.ceil(total_count / per_page),
          has_prev: page > 1,
        } as PaginationMeta,
      }
    },
    staleTime: 30_000,
  })
}

/* ─── Single ─────────────────────────────────────── */
export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: async () => {
      if (!USE_MOCK) {
        const res = await api.get<{ success: true; data: Course }>(`/courses/${id}`)
        return res.data.data
      }
      await new Promise(r => setTimeout(r, 300))
      const course = mockCourses.find(c => c.id === id)
      if (!course) throw new Error('Course not found')
      return course
    },
    enabled: !!id,
    retry: false,
  })
}

/* ─── Create ─────────────────────────────────────── */
export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CourseFormValues): Promise<Course> => {
      if (!USE_MOCK) {
        const res = await api.post<{ success: true; data: Course }>('/courses', data)
        return res.data.data
      }
      await new Promise(r => setTimeout(r, 600))
      const newCourse: Course = {
        id: String(Date.now()), title: data.title, slug: data.slug,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || undefined,
        previewUrl: data.previewUrl || undefined,
        price: data.isFree ? 0 : data.price,
        isFree: data.isFree, status: data.status,
        level: (data.level as CourseLevel) || undefined,
        durationMins: 0, language: data.language,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        instructorId: 'i1', categoryId: data.categoryId || undefined,
        enrolledCount: 0, ratingAvg: 0, ratingCount: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        instructor: { id: 'i1', name: 'Admin User' },
      }
      mockCourses = [newCourse, ...mockCourses]
      return newCourse
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  })
}

/* ─── Update ─────────────────────────────────────── */
export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CourseFormValues> }): Promise<Course> => {
      if (!USE_MOCK) {
        const res = await api.patch<{ success: true; data: Course }>(`/courses/${id}`, data)
        return res.data.data
      }
      await new Promise(r => setTimeout(r, 600))
      const idx = mockCourses.findIndex(c => c.id === id)
      if (idx === -1) throw new Error('Course not found')
      const updated: Course = {
        ...mockCourses[idx]!,
        ...data,
        level: (data.level != null && (data.level as string) !== '')
          ? (data.level as CourseLevel)
          : mockCourses[idx]!.level,
        tags: data.tags
          ? data.tags.split(',').map(t => t.trim())
          : mockCourses[idx]!.tags,
        updatedAt: new Date().toISOString(),
      }
      mockCourses[idx] = updated
      return updated
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: courseKeys.all })
      qc.invalidateQueries({ queryKey: courseKeys.detail(id) })
    },
  })
}

/* ─── Delete ─────────────────────────────────────── */
export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!USE_MOCK) {
        await api.delete(`/courses/${id}`)
        return
      }
      await new Promise(r => setTimeout(r, 500))
      mockCourses = mockCourses.filter(c => c.id !== id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  })
}
