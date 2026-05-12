'use client'

import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Users, Trophy, Flame, GraduationCap, Play, Star } from 'lucide-react'

/* ─── Rotating taglines ─────────────────────────── */
const taglines = ['Without Limits', 'At Your Pace', 'That Sticks', 'That Transforms']

/* ─── Floating stat cards ────────────────────────── */
const statCards = [
  {
    id: 1,
    icon: Users,
    value: '24K+',
    label: 'Active Learners',
    sub: 'Joined this month',
    accent: '#FF6B1A',
    bg: 'rgba(255, 107, 26, 0.15)',
    border: 'rgba(255, 107, 26, 0.30)',
    /* top-left corner, clear of faces */
    position: { top: '10%', left: '5%' },
    rotate: -3,
    floatY: [-5, 5],
    delay: 0,
  },
  {
    id: 2,
    icon: Trophy,
    value: '94%',
    label: 'Completion Rate',
    sub: 'Industry-leading',
    accent: '#2F6BFF',
    bg: 'rgba(47, 107, 255, 0.15)',
    border: 'rgba(47, 107, 255, 0.30)',
    /* top-right corner */
    position: { top: '8%', right: '4%' },
    rotate: 4,
    floatY: [6, -6],
    delay: 0.35,
  },
  {
    id: 3,
    icon: Flame,
    value: '🔥 12',
    label: 'Day Streak',
    sub: 'Keep it going!',
    accent: '#0ECC8E',
    bg: 'rgba(14, 204, 142, 0.15)',
    border: 'rgba(14, 204, 142, 0.30)',
    /* right-center — sits on edge */
    position: { top: '42%', right: '3%' },
    rotate: -2,
    floatY: [-4, 7],
    delay: 0.6,
  },
]

/* ─── Avatar stack ───────────────────────────────── */
const avatarColors    = ['#FF6B1A', '#2F6BFF', '#0ECC8E', '#A78BFA', '#F59E0B']
const avatarInitials  = ['A', 'B', 'C', 'D', 'E']

/* ─── Course preview ─────────────────────────────── */
const courseCards = [
  { title: 'UI/UX Mastery',    color: '#FF6B1A', progress: 68 },
  { title: 'TypeScript Pro',   color: '#2F6BFF', progress: 45 },
]

/* ─── Stagger variants ───────────────────────────── */
const bottomContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } },
}
const bottomItem = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

export function AuthHeroPanel() {
  const [taglineIndex, setTaglineIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  /* Rotate tagline every 2.5 s */
  useEffect(() => {
    const id = setInterval(() => setTaglineIndex(i => (i + 1) % taglines.length), 2500)
    return () => clearInterval(id)
  }, [])

  /* Subtle parallax on mouse move */
  const mouseX   = useMotionValue(0)
  const mouseY   = useMotionValue(0)
  const imgX     = useTransform(mouseX, [-0.5, 0.5], [-8, 8])
  const imgY     = useTransform(mouseY, [-0.5, 0.5], [-6, 6])
  const smoothX  = useSpring(imgX, { stiffness: 60, damping: 18 })
  const smoothY  = useSpring(imgY, { stiffness: 60, damping: 18 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width  - 0.5)
    mouseY.set((e.clientY - rect.top)  / rect.height - 0.5)
  }
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0) }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative h-full w-full overflow-hidden select-none"
    >

      {/* ══ 1. BACKGROUND IMAGE (parallax) ══════════ */}
      <motion.div
        className="absolute inset-0"
        style={{ x: smoothX, y: smoothY, scale: 1.06 }}
      >
        <img
          src="/auth.png"
          alt=""
          className="h-full w-full object-[0rem_-3rem]  object-cover"
          draggable={false}
        />
      </motion.div>

      {/* ══ 2. LAYERED OVERLAYS ═════════════════════ */}

      {/* Top vignette — logo readability */}
      {/* <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: '35%',
          background: 'linear-gradient(to bottom, rgba(8,10,20,0.72) 0%, transparent 100%)',
        }}
      /> */}

      {/* Bottom vignette — text readability */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: '52%',
          background:
            'linear-gradient(to top, rgba(6,8,18,0.97) 0%, rgba(6,8,18,0.88) 30%, rgba(6,8,18,0.55) 60%, transparent 100%)',
        }}
      />

      {/* Subtle colour tint over full image */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{ background: 'rgba(10,12,24,0.18)' }}
      />

      {/* ══ 3. LOGO — top-left ══════════════════════ */}
      <motion.div
        className="absolute left-8 top-8 z-30 flex items-center gap-2.5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}
        >
          <GraduationCap size={18} color="#fff" strokeWidth={2} />
        </div>
        <span
          className="text-white tracking-tight"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 18 }}
        >
          LearnOS
        </span>
      </motion.div>

      {/* ══ 4. FLOATING STAT CARDS ══════════════════ */}
      {statCards.map(card => (
        <FloatingStatCard key={card.id} card={card} />
      ))}

      {/* ══ 5. BOTTOM TEXT BLOCK ════════════════════ */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 px-10 pb-10"
        variants={bottomContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Label */}
        <motion.p
          variants={bottomItem}
          className="mb-2 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{ color: '#FF6B1A' }}
        >
          The Learning Platform
        </motion.p>

        {/* Heading with rotating word */}
        <motion.h1
          variants={bottomItem}
          className="mb-3 leading-[1.06] text-white"
          style={{
            fontFamily: 'Bricolage Grotesque, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(32px, 3.2vw, 46px)',
            letterSpacing: '-0.03em',
          }}
        >
          Learn
          <br />
          <span className="relative inline-block">
            <AnimatePresence mode="wait">
              <motion.span
                key={taglineIndex}
                initial={{ y: 28, opacity: 0, filter: 'blur(6px)' }}
                animate={{ y: 0,  opacity: 1, filter: 'blur(0px)' }}
                exit={{   y: -22, opacity: 0, filter: 'blur(4px)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="inline-block"
                style={{ color: '#FF6B1A' }}
              >
                {taglines[taglineIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={bottomItem}
          className="mb-5 max-w-[360px] leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.58)', fontSize: 14 }}
        >
          Join thousands of learners building real skills through expert-led courses,
          hands-on projects, and a community that grows with you.
        </motion.p>

        {/* Social proof row */}
        <motion.div variants={bottomItem} className="mb-6 flex items-center gap-4">
          {/* Avatars */}
          <div className="flex items-center">
            {avatarColors.map((color, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] text-[11px] font-bold text-white"
                style={{
                  background:  `linear-gradient(135deg, ${color}, ${color}88)`,
                  borderColor: 'rgba(6,8,18,0.9)',
                  marginLeft:  i === 0 ? 0 : -9,
                  zIndex:      avatarColors.length - i,
                  position:    'relative',
                }}
              >
                {avatarInitials[i]}
              </div>
            ))}
          </div>
          {/* Stars + count */}
          <div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />
              ))}
              <span className="ml-1 text-sm font-bold text-white">4.9</span>
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              From 8,400+ reviews
            </p>
          </div>
        </motion.div>

        {/* Course preview strip */}
        <motion.div variants={bottomItem} className="flex gap-3">
          {courseCards.map((course, i) => (
            <motion.div
              key={course.title}
              className="flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5"
              style={{
                background:    'rgba(255,255,255,0.07)',
                border:        '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
              whileHover={{ background: 'rgba(255,255,255,0.11)', y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${course.color}28` }}
              >
                <Play size={12} color={course.color} fill={course.color} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{course.title}</p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: course.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${course.progress}%` }}
                    transition={{ duration: 1.1, delay: 0.9 + i * 0.15, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </div>
              <span className="text-[12px] font-semibold" style={{ color: course.color }}>
                {course.progress}%
              </span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Floating glassmorphism stat card
───────────────────────────────────────────────────── */
function FloatingStatCard({ card }: { card: (typeof statCards)[number] }) {
  const Icon = card.icon
  return (
    <motion.div
      className="absolute z-30"
      style={card.position as React.CSSProperties}
      initial={{ opacity: 0, scale: 0.82, rotate: card.rotate - 6 }}
      animate={{
        opacity:  1,
        scale:    1,
        rotate:   card.rotate,
        y:        card.floatY,
      }}
      transition={{
        opacity:  { duration: 0.45, delay: 0.7 + card.delay },
        scale:    { type: 'spring', stiffness: 260, damping: 20, delay: 0.7 + card.delay },
        rotate:   { type: 'spring', stiffness: 180, damping: 28, delay: 0.7 + card.delay },
        y: {
          duration:   3.8 + card.delay,
          repeat:     Infinity,
          repeatType: 'reverse',
          ease:       'easeInOut',
          delay:      card.delay,
        },
      }}
    >
      <div
        className="flex min-w-[144px] flex-col gap-1 rounded-2xl px-4 py-3"
        style={{
          background:           'rgba(8, 10, 20, 0.68)',
          border:               `1px solid ${card.border}`,
          backdropFilter:       'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow:            `0 8px 32px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: card.bg }}
          >
            <Icon size={13} color={card.accent} strokeWidth={2} />
          </div>
          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {card.label}
          </span>
        </div>
        <p
          className="text-xl font-bold leading-none tracking-tight text-white"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          {card.value}
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
          {card.sub}
        </p>
      </div>
    </motion.div>
  )
}
