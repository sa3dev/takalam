'use client'

import { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatResetTime, type Quota } from '@/hooks/useQuota'

type PlanChoice = 'monthly' | 'annual'

interface PaywallModalProps {
  open: boolean
  quota: Quota | null
  onClose: () => void
}

export function PaywallModal({ open, quota, onClose }: PaywallModalProps) {
  const { t, language } = useLanguage()
  // Deliberately no pre-selected plan: this screen exists to measure which
  // billing period people actually want, and a default would answer for them.
  const [choice, setChoice] = useState<PlanChoice | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)

  // Every reopening is a fresh question — a user who came back after being
  // walled again should see the choice, not last time's thank-you screen.
  useEffect(() => {
    if (open) {
      setChoice(null)
      setIsSaving(false)
      setHasRecorded(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const submitInterest = useCallback(async () => {
    if (!choice) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/users/me/upgrade-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_choice: choice }),
      })
      if (!res.ok) throw new Error('could not record interest')
      setHasRecorded(true)
    } catch {
      // Leave the user on the choice screen with a live button so the click can
      // simply be repeated. Nothing was charged, so there is nothing to undo.
      setIsSaving(false)
    }
  }, [choice])

  if (!open) return null

  // Both bodies name the moment the allowance returns; keep them on the same
  // clock as the gauge rather than repeating a "midnight" that is only true in
  // UTC. Falls back to an empty slot if the quota fetch failed.
  const withResetTime = (template: string) =>
    template.replace('{time}', quota ? formatResetTime(quota.resets_at, language) : '')

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(amount)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="card w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        {hasRecorded ? (
          <div className="text-center">
            <h3 id="paywall-title" className="text-xl font-bold text-calm-text mb-3">
              {t.quota.thanksTitle}
            </h3>
            <p className="text-calm-muted mb-6">{withResetTime(t.quota.thanksBody)}</p>
            <button onClick={onClose} className="btn btn-primary w-full" autoFocus>
              {t.quota.close}
            </button>
          </div>
        ) : (
          <>
            <h3 id="paywall-title" className="text-xl font-bold text-calm-text mb-2">
              {t.quota.wallTitle}
            </h3>
            <p className="text-calm-muted mb-6">{withResetTime(t.quota.wallBody)}</p>

            {quota && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <PlanOption
                  label={t.quota.monthly}
                  price={formatPrice(quota.pro_price_monthly_eur)}
                  period={t.quota.perMonth}
                  selected={choice === 'monthly'}
                  onSelect={() => setChoice('monthly')}
                />
                <PlanOption
                  label={t.quota.annual}
                  price={formatPrice(quota.pro_price_annual_eur)}
                  period={t.quota.perYear}
                  hint={t.quota.annualHint}
                  selected={choice === 'annual'}
                  onSelect={() => setChoice('annual')}
                />
              </div>
            )}

            <p className="text-sm text-calm-muted mb-6">{t.quota.proFeatures}</p>

            <button
              onClick={submitInterest}
              disabled={!choice || isSaving}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t.quota.ctaPending : t.quota.cta}
            </button>
            <button onClick={onClose} className="btn btn-secondary w-full mt-2">
              {t.quota.notNow}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface PlanOptionProps {
  label: string
  price: string
  period: string
  hint?: string
  selected: boolean
  onSelect: () => void
}

function PlanOption({ label, price, period, hint, selected, onSelect }: PlanOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'rounded-xl border p-4 text-center transition-colors',
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-calm-border hover:bg-calm-bg'
      )}
    >
      <div className="text-sm text-calm-muted mb-1">{label}</div>
      <div className="text-lg font-bold text-calm-text">
        {price}
        <span className="text-sm font-normal text-calm-muted">{period}</span>
      </div>
      {hint && <div className="text-xs text-primary-600 mt-1">{hint}</div>}
    </button>
  )
}
