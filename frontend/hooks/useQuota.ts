import { useCallback, useEffect, useState } from 'react'

export interface Quota {
  plan: string
  spoken_seconds_used: number
  /** Daily allowance in seconds; null on Pro, which has no product limit. */
  spoken_seconds_limit: number | null
  /** ISO timestamp of the next UTC midnight. */
  resets_at: string
  pro_price_monthly_eur: number
  pro_price_annual_eur: number
}

/** The reset instant in the reader's own clock. The server counts days in UTC,
 * which is 2am in Paris in summer — announcing "midnight" to everyone was simply
 * wrong for most of the planet. The API returns an absolute instant, so the
 * honest thing is to render it where the user lives. */
export function formatResetTime(resetsAt: string, language: string): string {
  const date = new Date(resetsAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** Free plans only: the day's allowance is spent and turns will be refused. */
export function isOutOfQuota(quota: Quota | null): boolean {
  if (!quota || quota.spoken_seconds_limit === null) return false
  return quota.spoken_seconds_used >= quota.spoken_seconds_limit
}

export function useQuota(enabled: boolean) {
  const [quota, setQuota] = useState<Quota | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/quota', { credentials: 'include' })
      if (!res.ok) return
      setQuota(await res.json())
    } catch {
      // The gauge is informational — a failed fetch leaves it hidden rather
      // than blocking the conversation.
    }
  }, [])

  useEffect(() => {
    if (enabled) refresh()
  }, [enabled, refresh])

  /** Apply the running total pushed by the server after each turn. */
  const applyUsage = useCallback((usedSeconds: number) => {
    setQuota(prev => {
      if (!prev) return prev
      // A total lower than what we already had means the UTC day rolled over
      // while the page stayed open: refetch so `resets_at` isn't left in the
      // past. Cheap, and it only ever happens once a day.
      if (usedSeconds < prev.spoken_seconds_used) {
        refresh()
        return prev
      }
      return { ...prev, spoken_seconds_used: usedSeconds }
    })
  }, [refresh])

  return { quota, applyUsage, refresh }
}
