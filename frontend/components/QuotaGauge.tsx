'use client'

import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatResetTime, type Quota } from '@/hooks/useQuota'

interface QuotaGaugeProps {
  quota: Quota | null
}

/** Seconds → "m:ss", the way a speaking allowance is read out loud. */
function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Below this, the bar warns — but in amber, never red: running low on practice
 * time is not a mistake, and this product exists to keep speaking unstressful. */
const LOW_REMAINING_SECONDS = 120

export function QuotaGauge({ quota }: QuotaGaugeProps) {
  const { t, language } = useLanguage()

  // Render nothing until the real numbers arrive — an empty bar that fills in
  // a moment later reads as "you already used something".
  if (!quota) return null

  if (quota.spoken_seconds_limit === null) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-calm-muted">
        <span className="w-2 h-2 rounded-full bg-primary-500" />
        <span>{t.quota.proLabel}</span>
      </div>
    )
  }

  const limit = quota.spoken_seconds_limit
  const used = Math.min(quota.spoken_seconds_used, limit)
  const remaining = Math.max(0, limit - quota.spoken_seconds_used)
  const percentUsed = limit > 0 ? Math.min(100, (used / limit) * 100) : 100
  const isLow = remaining <= LOW_REMAINING_SECONDS

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-sm text-calm-muted">{t.quota.label}</span>
        <span className={clsx('text-sm font-medium tabular-nums', isLow ? 'text-amber-600' : 'text-calm-text')}>
          {formatDuration(remaining)} {t.quota.remaining}
        </span>
      </div>

      <div
        className="h-2 w-full rounded-full bg-calm-border overflow-hidden"
        role="progressbar"
        aria-label={t.quota.label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            isLow ? 'bg-amber-500' : 'bg-primary-500'
          )}
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      <p className="mt-1.5 text-xs text-calm-muted">
        {t.quota.resets.replace('{time}', formatResetTime(quota.resets_at, language))}
      </p>
    </div>
  )
}
