import { useState, useEffect } from 'react'

/**
 * Returns true when the viewport is narrower than `breakpoint` (default 1024 = Tailwind's `lg`).
 * Starts as `false` on the server (SSR-safe) and updates after mount.
 */
export function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
