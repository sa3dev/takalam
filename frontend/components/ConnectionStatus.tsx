'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface ConnectionStatusProps {
  isConnected: boolean
  error?: string | null
}

// Palette-native rather than Tailwind's stock green/yellow/red, which sat on the
// terracotta interface like a system dialog dropped on top of it. Connected is
// deliberately the quietest of the three: it is the normal state and shouldn't
// ask for attention.
const TONES = {
  connected:  { bg: 'var(--cream-2)',     fg: 'var(--muted)',       dot: 'var(--terra)' },
  connecting: { bg: 'var(--terra-soft)',  fg: 'var(--clay)',        dot: 'var(--terra-deep)' },
  error:      { bg: 'var(--danger-soft)', fg: 'var(--danger-deep)', dot: 'var(--danger)' },
} as const

export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  const { t } = useLanguage()

  const state = isConnected ? 'connected' : error ? 'error' : 'connecting'
  const tone = TONES[state]
  const label = isConnected
    ? t.home.connected
    : error
    ? `${t.home.error} : ${error}`
    : t.home.connecting

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm max-w-[60%] shrink-0"
      style={{ background: tone.bg, color: tone.fg, fontFamily: 'var(--sans)' }}
      role="status"
      aria-live="polite"
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${state === 'error' ? '' : 'animate-pulse'}`}
        style={{ background: tone.dot }}
      />
      {/* Server messages can be long; truncate rather than let the row wrap and
          push the gauge and the transcript down the page. */}
      <span className="font-medium truncate" title={label}>
        {label}
      </span>
    </div>
  )
}
