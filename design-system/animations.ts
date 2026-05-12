/**
 * LMS Design System — Framer Motion Animation Presets
 *
 * Usage:
 *   import { fadeUp, staggerContainer } from '@/design-system/animations'
 *   <motion.div variants={fadeUp} initial="hidden" animate="visible" />
 */

import type { Variants, Transition } from 'framer-motion'

/* ─────────────────────────────────────────
   SHARED TRANSITIONS
───────────────────────────────────────── */

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
}

export const springBounce: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 25,
}

export const easeTransition: Transition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
}

export const slowTransition: Transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1],
}

/* ─────────────────────────────────────────
   FADE VARIANTS
───────────────────────────────────────── */

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: easeTransition },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
}

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ...easeTransition, duration: 0.3 } },
  exit:    { opacity: 0, y: 8, transition: { duration: 0.2 } },
}

export const fadeDown: Variants = {
  hidden:  { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: easeTransition },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

/* ─────────────────────────────────────────
   SCALE VARIANTS
───────────────────────────────────────── */

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: springBounce },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
}

export const scaleInCenter: Variants = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: springBounce },
  exit:    { opacity: 0, scale: 0.92, transition: { duration: 0.18 } },
}

/* ─────────────────────────────────────────
   SLIDE VARIANTS
───────────────────────────────────────── */

export const slideInLeft: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: springTransition },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.2 } },
}

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: springTransition },
  exit:    { opacity: 0, x: 16, transition: { duration: 0.2 } },
}

export const slideInBottom: Variants = {
  hidden:  { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: 0, transition: springTransition },
  exit:    { opacity: 0, y: '100%', transition: { duration: 0.25 } },
}

/* ─────────────────────────────────────────
   STAGGER VARIANTS (parent + children)
───────────────────────────────────────── */

export const staggerContainer: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren:  0.05,
      delayChildren:    0.05,
    },
  },
}

export const staggerContainerFast: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.03,
      delayChildren:   0.02,
    },
  },
}

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...springTransition },
  },
}

export const staggerItemFade: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

/* ─────────────────────────────────────────
   PAGE TRANSITION
───────────────────────────────────────── */

export const pageTransition: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
}

/* ─────────────────────────────────────────
   HOVER / TAP STATES (use with whileHover/whileTap)
───────────────────────────────────────── */

export const hoverLift = {
  whileHover: { y: -3, transition: springTransition },
  whileTap:   { y: 0,  scale: 0.98, transition: { duration: 0.1 } },
}

export const hoverScale = {
  whileHover: { scale: 1.03, transition: springBounce },
  whileTap:   { scale: 0.97, transition: { duration: 0.1 } },
}

export const hoverGrow = {
  whileHover: { scale: 1.06, transition: springBounce },
  whileTap:   { scale: 0.95, transition: { duration: 0.08 } },
}

export const tapShrink = {
  whileTap: { scale: 0.96, transition: { duration: 0.08 } },
}

/* ─────────────────────────────────────────
   CARD HOVER ANIMATION
   Apply to motion.div wrapping cards
───────────────────────────────────────── */

export const cardHover: Variants = {
  rest:  { y: 0, boxShadow: 'var(--shadow-sm)', transition: springTransition },
  hover: { y: -4, boxShadow: 'var(--shadow-md)', transition: springTransition },
}

/* ─────────────────────────────────────────
   SIDEBAR ANIMATION
───────────────────────────────────────── */

export const sidebarVariants: Variants = {
  open:   { width: 240, transition: springTransition },
  closed: { width: 72,  transition: springTransition },
}

export const sidebarLabelVariants: Variants = {
  open:   { opacity: 1, x: 0,   display: 'block', transition: { delay: 0.1, duration: 0.15 } },
  closed: { opacity: 0, x: -8,  transitionEnd: { display: 'none' } },
}

/* ─────────────────────────────────────────
   MODAL / SHEET ANIMATION
───────────────────────────────────────── */

export const overlayVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18, delay: 0.05 } },
}

export const modalVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.92, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: springBounce },
  exit:    { opacity: 0, scale: 0.95, y: 8,  transition: { duration: 0.18 } },
}

export const sheetVariants: Variants = {
  hidden:  { x: '100%' },
  visible: { x: 0, transition: springTransition },
  exit:    { x: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
}

/* ─────────────────────────────────────────
   NOTIFICATION / TOAST
───────────────────────────────────────── */

export const toastVariants: Variants = {
  hidden:  { opacity: 0, x: 32, scale: 0.94 },
  visible: { opacity: 1, x: 0,  scale: 1, transition: springBounce },
  exit:    { opacity: 0, x: 32, scale: 0.96, transition: { duration: 0.18 } },
}

/* ─────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────── */

export const progressBarVariants = (targetWidth: number): Variants => ({
  hidden:  { width: 0, opacity: 0 },
  visible: {
    width: `${targetWidth}%`,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.1 },
  },
})

/* ─────────────────────────────────────────
   COUNT UP ANIMATION (use with useMotionValue)
───────────────────────────────────────── */

export const countUpTransition: Transition = {
  duration: 1.2,
  ease: [0.4, 0, 0.2, 1],
}

/* ─────────────────────────────────────────
   CHART BAR ANIMATION
───────────────────────────────────────── */

export const barVariants = (height: number): Variants => ({
  hidden:  { scaleY: 0, originY: 1 },
  visible: {
    scaleY: 1,
    originY: 1,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  },
})

export const staggerBars: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

/* ─────────────────────────────────────────
   SKELETON LOADING
───────────────────────────────────────── */

export const skeletonVariants: Variants = {
  loading: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 1.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/* ─────────────────────────────────────────
   DROPDOWN / POPOVER
───────────────────────────────────────── */

export const dropdownVariants: Variants = {
  hidden:  { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { ...springBounce, duration: 0.2 } },
  exit:    { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } },
}

/* ─────────────────────────────────────────
   ACCORDION / COLLAPSIBLE
───────────────────────────────────────── */

export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded:  {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: { height: { ...springTransition }, opacity: { duration: 0.2, delay: 0.1 } },
  },
}
