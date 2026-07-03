'use client'

import { useEffect, useState } from 'react'

export function useBoardForgePolling<T>(poller: () => Promise<T>, { enabled = true, intervalMs = 1500 } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let canceled = false
    async function tick() {
      try {
        const next = await poller()
        if (!canceled) setData(next)
      } catch (err) {
        if (!canceled) setError(err instanceof Error ? err.message : String(err))
      }
    }
    tick()
    const timer = window.setInterval(tick, intervalMs)
    return () => {
      canceled = true
      window.clearInterval(timer)
    }
  }, [enabled, intervalMs, poller])

  return { data, error }
}
