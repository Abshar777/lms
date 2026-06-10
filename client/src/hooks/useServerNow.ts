'use client'
import { useEffect, useRef, useState } from 'react'
import { apiGet } from '@/lib/axios'

/**
 * useServerNow — current time (epoch ms) anchored to the SERVER's clock.
 *
 * Countdowns like "class link unlocks in Xm" are already timezone-independent
 * (they subtract two absolute UTC instants), but they still trust the *device*
 * clock via Date.now(). If a user's computer clock is wrong, the countdown is
 * wrong. This hook:
 *   1. fetches the server time once (GET /health → { timestamp }),
 *   2. measures the offset between server time and the local clock
 *      (correcting for half the request round-trip), and
 *   3. ticks locally using that offset, re-syncing every 5 min.
 *
 * Result: the countdown is correct for every user worldwide — independent of
 * both their timezone AND a misconfigured device clock. Until the first sync
 * completes it falls back to the local clock.
 */
export function useServerNow(tickMs = 1000): number {
  const offsetRef = useRef(0)                       // serverNow − localNow (ms)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true

    const sync = async () => {
      try {
        const t0 = Date.now()
        const { timestamp } = await apiGet<{ timestamp: string }>('/health')
        const t1 = Date.now()
        const serverMs = new Date(timestamp).getTime()
        // Assume symmetric latency: server clock at t1 ≈ serverMs + rtt/2
        offsetRef.current = serverMs + (t1 - t0) / 2 - t1
        if (alive) setNow(Date.now() + offsetRef.current)
      } catch {
        /* network/time-sync failed → keep using the local clock */
      }
    }

    void sync()
    const tick   = setInterval(() => { if (alive) setNow(Date.now() + offsetRef.current) }, tickMs)
    const resync = setInterval(() => { void sync() }, 5 * 60_000)

    return () => { alive = false; clearInterval(tick); clearInterval(resync) }
  }, [tickMs])

  return now
}
