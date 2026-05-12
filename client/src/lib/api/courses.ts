'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { Course, PaginationMeta } from '@/types/index'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — identical to admin's seed.
// When the backend is running the queryFn bodies below call the real API via
// the axios instance. Toggle USE_MOCK to false once the backend is up.
// ─────────────────────────────────────────────────────────────────────────────
const USE_MOCK = true   // ← flip to false when backend is live

const MOCK_COURSES: Course[] = [
  {
    id: '1', title: 'UI/UX Design Mastery', slug: 'ui-ux-design-mastery',
    description: 'Learn everything about modern UI/UX design from wireframes to polished prototypes. Master Figma, user research, and interaction design principles used by top product designers.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=800',
    price: 49.99, isFree: false, status: 'published', level: 'intermediate',
    durationMins: 320, language: 'English', enrolledCount: 1240, ratingAvg: 4.8, ratingCount: 312,
    instructorId: 'i1', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z',
    instructor: { id: 'i1', name: 'Sarah Chen', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    tags: ['design', 'figma', 'ux'], category: { id: 'c1', name: 'Design' },
  },
  {
    id: '2', title: 'TypeScript from Zero to Hero', slug: 'typescript-zero-hero',
    description: 'Master TypeScript with real-world projects. Cover generics, utility types, decorators, and advanced patterns used in enterprise applications.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    price: 59.99, isFree: false, status: 'published', level: 'beginner',
    durationMins: 480, language: 'English', enrolledCount: 2100, ratingAvg: 4.9, ratingCount: 540,
    instructorId: 'i2', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-04-01T00:00:00Z',
    instructor: { id: 'i2', name: 'Alex Kim', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    tags: ['typescript', 'javascript'], category: { id: 'c2', name: 'Development' },
  },
  {
    id: '3', title: 'React Advanced Patterns', slug: 'react-advanced-patterns',
    description: 'Deep dive into advanced React patterns. Compound components, render props, custom hooks, context optimization, and performance tuning.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    price: 0, isFree: true, status: 'published', level: 'advanced',
    durationMins: 260, language: 'English', enrolledCount: 890, ratingAvg: 4.7, ratingCount: 198,
    instructorId: 'i2', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-03-10T00:00:00Z',
    instructor: { id: 'i2', name: 'Alex Kim', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    tags: ['react', 'patterns'], category: { id: 'c2', name: 'Development' },
  },
  {
    id: '5', title: 'Python for Data Science', slug: 'python-data-science',
    description: 'Complete Python data science bootcamp covering NumPy, Pandas, Matplotlib, Scikit-learn, and real-world ML projects from scratch.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
    price: 69.99, isFree: false, status: 'published', level: 'beginner',
    durationMins: 720, language: 'English', enrolledCount: 3400, ratingAvg: 4.6, ratingCount: 890,
    instructorId: 'i3', createdAt: '2023-10-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    instructor: { id: 'i3', name: 'Maya Patel', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    tags: ['python', 'data-science', 'ml'], category: { id: 'c3', name: 'Data Science' },
  },
  {
    id: '6', title: 'Full-Stack Next.js 15', slug: 'fullstack-nextjs-15',
    description: 'Build production-grade full-stack apps with Next.js 15 App Router, Server Actions, Prisma, and Vercel deployments.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14431b9?w=800',
    price: 79.99, isFree: false, status: 'published', level: 'intermediate',
    durationMins: 600, language: 'English', enrolledCount: 1750, ratingAvg: 4.9, ratingCount: 420,
    instructorId: 'i2', createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-05-01T00:00:00Z',
    instructor: { id: 'i2', name: 'Alex Kim', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    tags: ['nextjs', 'react', 'fullstack'], category: { id: 'c2', name: 'Development' },
  },
  {
    id: '7', title: 'Brand Identity Design', slug: 'brand-identity-design',
    description: 'Learn to create compelling brand identities from logo design to full brand guidelines. Master color theory, typography, and visual storytelling.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?w=800',
    price: 44.99, isFree: false, status: 'published', level: 'beginner',
    durationMins: 280, language: 'English', enrolledCount: 680, ratingAvg: 4.7, ratingCount: 145,
    instructorId: 'i1', createdAt: '2024-03-15T00:00:00Z', updatedAt: '2024-04-15T00:00:00Z',
    instructor: { id: 'i1', name: 'Sarah Chen', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    tags: ['branding', 'design', 'logo'], category: { id: 'c1', name: 'Design' },
  },
]

/* ─── Query keys ─────────────────────────────────── */
export const courseKeys = {
  all:      ['courses'] as const,
  list:     (p: object) => ['courses', 'list', p] as const,
  detail:   (slug: string) => ['courses', 'detail', slug] as const,
  featured: ['courses', 'featured'] as const,
}

type CoursesParams = {
  page?: number; per_page?: number; search?: string
  level?: string; category?: string; sort?: string; free?: boolean
}

/* ─── List ───────────────────────────────────────── */
export function useCourses(params: CoursesParams = {}) {
  return useQuery({
    queryKey: courseKeys.list(params),
    queryFn: async () => {
      if (!USE_MOCK) {
        const res = await api.get<{
          success: true
          data: Course[]
          meta: PaginationMeta
        }>('/courses', { params: { ...params, status: 'published' } })
        return { docs: res.data.data, meta: res.data.meta! }
      }

      // ── Mock path ──────────────────────────────── //
      await new Promise(r => setTimeout(r, 350))
      let list = [...MOCK_COURSES].filter(c => c.status === 'published')

      if (params.search)
        list = list.filter(c =>
          c.title.toLowerCase().includes(params.search!.toLowerCase()) ||
          c.description?.toLowerCase().includes(params.search!.toLowerCase()),
        )
      if (params.level && params.level !== 'all')
        list = list.filter(c => c.level === params.level)
      if (params.category && params.category !== 'all')
        list = list.filter(c => c.category?.name.toLowerCase() === params.category!.toLowerCase())
      if (params.free === true)
        list = list.filter(c => c.isFree)

      if (params.sort === 'popular')   list.sort((a, b) => b.enrolledCount - a.enrolledCount)
      if (params.sort === 'rating')    list.sort((a, b) => b.ratingAvg - a.ratingAvg)
      if (params.sort === 'newest')    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      if (params.sort === 'price_lo')  list.sort((a, b) => a.price - b.price)
      if (params.sort === 'price_hi')  list.sort((a, b) => b.price - a.price)

      const page = params.page ?? 1
      const per_page = params.per_page ?? 12
      const total_count = list.length
      const docs = list.slice((page - 1) * per_page, page * per_page)
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

/* ─── Single by slug ─────────────────────────────── */
export function useCourse(slug: string) {
  return useQuery({
    queryKey: courseKeys.detail(slug),
    queryFn: async () => {
      if (!USE_MOCK) {
        const res = await api.get<{ success: true; data: Course }>(`/courses/${slug}`)
        return res.data.data
      }
      await new Promise(r => setTimeout(r, 300))
      const course = MOCK_COURSES.find(c => c.slug === slug || c.id === slug)
      if (!course) throw new Error('Course not found')
      return course
    },
    enabled: !!slug,
    retry: false,
  })
}

/* ─── Featured (top 4 by enrollment) ────────────── */
export function useFeaturedCourses() {
  return useQuery({
    queryKey: courseKeys.featured,
    queryFn: async () => {
      if (!USE_MOCK) {
        const res = await api.get<{ success: true; data: Course[] }>('/courses', {
          params: { status: 'published', sort: 'enrolledCount:desc', per_page: 4 },
        })
        return res.data.data
      }
      await new Promise(r => setTimeout(r, 300))
      return MOCK_COURSES.filter(c => c.status === 'published')
        .sort((a, b) => b.enrolledCount - a.enrolledCount)
        .slice(0, 4)
    },
    staleTime: 60_000,
  })
}
