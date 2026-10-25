'use client'

import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Quota } from '@/hooks/useQuota'

/** Seconds → "m:ss". */
function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, '0')}`
}

const LOW_REMAINING_SECONDS = 120

/** The time left to speak today, as small as it can be while staying in view:
 *  one number over a hairline bar. For screens where the conversation owns the
 *  space; the full gauge stays on the pages that have room for it. */
export function QuotaPill({ quota }: { quota: Quota | null }) {
  const { t } = useLanguage()
  if (!quota) return null

  if (quota.spoken_seconds_limit === null) {
    return (
      <span className="shrink-0 text-xs font-medium text-calm-muted" title={t.quota.proLabel}>
        ∞
      </span>
    )
  }

  const limit = quota.spoken_seconds_limit
  const remaining = Math.max(0, limit - quota.spoken_seconds_used)
  const percentUsed = limit > 0 ? Math.min(100, (Math.min(quota.spoken_seconds_used, limit) / limit) * 100) : 100
  const isLow = remaining <= LOW_REMAINING_SECONDS

  return (
    <div
      className="w-12 shrink-0 text-center"
      title={`${t.quota.label} : ${formatDuration(remaining)} ${t.quota.remaining}`}
      role="progressbar"
      aria-label={t.quota.label}
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(quota.spoken_seconds_used, limit)}
    >
      <div className={clsx('text-xs font-semibold tabular-nums leading-none', isLow ? 'text-amber-600' : 'text-calm-muted')}>
        {formatDuration(remaining)}
      </div>
      <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-calm-border">
        <div
          className={clsx('h-full rounded-full transition-[width] duration-500', isLow ? 'bg-amber-500' : 'bg-primary-500')}
          style={{ width: `${100 - percentUsed}%` }}
        />
      </div>
    </div>
  )
}
