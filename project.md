# LearnOS — Project Overview

## What Is It?

LearnOS is a full-stack Learning Management System (LMS) consisting of three applications:

| App | Purpose | Port | Tech |
|-----|---------|------|------|
| `backend` | REST API server | 4000 | Express, Mongoose, Bun |
| `client`  | Student-facing web app | 3000 | Next.js 15, TanStack Query |
| `admin`   | Admin/instructor dashboard | 3001 | Next.js 15, TanStack Query |

---

## Tech Stack

### Backend
- **Runtime**: Bun
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose
- **Auth**: JWT (access + refresh tokens), httpOnly cookies, bcrypt
- **Validation**: Zod (routes + env)
- **Email**: Nodemailer
- **Payments**: Stripe (checkout + webhooks)
- **AI**: Ollama (local LLM, `llama3.2:3b`)
- **Observability**: Sentry, Pino logger
- **Security**: Helmet, CORS, rate limiting

### Frontend (both client + admin)
- **Framework**: Next.js 15 App Router
- **Language**: TypeScript
- **State/Data**: TanStack Query v5 (server state), Zustand (UI state)
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS v3
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios (with `withCredentials: true`)
- **Error tracking**: Sentry (`@sentry/nextjs`)

---

## Directory Structure

```
lms/
├── backend/
│   ├── src/
│   │   ├── config/         # env.ts (Zod), cors.ts
│   │   ├── controllers/    # thin HTTP layer, calls services
│   │   ├── middleware/     # auth, validate, error, rateLimit
│   │   ├── models/         # schema.ts (all Mongoose models)
│   │   ├── repositories/   # base.repository.ts + domain repos
│   │   ├── routes/         # one file per domain
│   │   ├── scripts/        # seed.ts
│   │   ├── services/       # business logic
│   │   ├── types/          # shared TS types
│   │   └── utils/          # logger, jwt, hash, response, email
│   └── uploads/            # served at /uploads/*
├── client/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   │   ├── (auth)/     # login, register (no sidebar)
│   │   │   └── (dashboard)/# protected pages with sidebar
│   │   ├── components/     # UI + feature components
│   │   ├── hooks/          # useIsMobile, etc.
│   │   ├── lib/
│   │   │   ├── api/        # TanStack Query hooks
│   │   │   └── axios.ts    # configured Axios instance
│   │   ├── store/          # Zustand ui.store.ts
│   │   └── types/          # index.ts (shared types)
├── admin/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/     # login
│   │   │   └── (dashboard)/# admin pages
│   │   ├── components/
│   │   ├── hooks/          # useIsMobile
│   │   ├── lib/api/        # TanStack Query hooks
│   │   ├── store/          # ui.store.ts
│   │   └── types/
└── design-system/          # shared Tailwind tokens
```

---

## Core User Flows

### Student
1. Register / Log in → `lms_at` + `lms_rt` cookies set
2. Browse course catalogue → filter by level, category, price
3. Open course detail → see curriculum outline
4. Enroll (free) → redirect to lesson player
5. Watch lesson → progress tracked every 15s
6. Mark lesson complete → progress bar advances
7. Complete course → completion email sent
8. Submit review → visible on course page

### Admin
1. Log in (role check enforced) → dashboard stats
2. Manage courses (create / edit / publish / archive / bulk)
3. View students + instructors (verify, toggle active)
4. Review orders + coupons
5. Check audit logs

---

## API Base URLs

| Environment | Client proxies to | Direct backend |
|-------------|------------------|----------------|
| Development | `/api/v1/*` → `http://localhost:4000/api/v1/*` | `http://localhost:4000` |
| Production  | Set `NEXT_PUBLIC_API_URL` | Set `BACKEND_PUBLIC_URL` |

All API routes are prefixed with `/api/v1/`.

---

## Feature Status Summary

| Area | Status |
|------|--------|
| Auth (cookie-based JWT) | ✅ Complete |
| Course catalogue + search | ✅ Complete |
| Lesson player + progress | ✅ Complete |
| Enrollment (free) | ✅ Complete |
| Reviews | ✅ Complete |
| Favorites, Streaks, Achievements | ✅ Complete |
| Admin CRUD (courses, users) | ✅ Complete |
| Email notifications | ✅ Complete |
| Sentry error tracking | ✅ Complete |
| Responsive (mobile) | ✅ Complete |
| Payments / Stripe | ⚠️ Backend complete, frontend stub |
| Google OAuth | ⚠️ Backend route, no frontend UI |
| Quiz / Assignment UI | ⚠️ Backend routes, no frontend |
| Certificates download | ⚠️ Backend route, no frontend |
| Discussion / Notes / Bookmarks | ⚠️ Backend routes, no frontend |
