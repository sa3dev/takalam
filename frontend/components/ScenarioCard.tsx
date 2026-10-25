'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { ScenarioArt } from '@/components/ScenarioArt'
import type { TranslationKeys } from '@/lib/i18n/translations'

type ScenarioCopyKey = Exclude<
  keyof TranslationKeys['scenarios'],
  'or' | 'backToScenarios' | 'heading' | 'subheading' | 'free' | 'freeBody' | 'goalLabel' | 'beginner' | 'intermediate'
>

interface ScenarioCardProps {
  id: string
  /** Narrow, fixed-width variant for a horizontal strip. */
  strip?: boolean
}

/** One situation: its picture, its name and a line about it. Opens the
 *  conversation already set in that situation. */
export function ScenarioCard({ id, strip = false }: ScenarioCardProps) {
  const { t } = useLanguage()
  const copy = t.scenarios[id as ScenarioCopyKey]
  if (!copy) return null

  return (
    <Link
      href={`/conversation?scenario=${encodeURIComponent(id)}`}
      data-umami-event="scenario-start"
      data-umami-event-scenario={id}
      className={`group block overflow-hidden rounded-2xl border border-calm-border bg-calm-surface shadow-sm no-underline transition active:scale-[0.98] hover:shadow-md ${
        strip ? 'w-40 shrink-0' : ''
      }`}
    >
      <div className="aspect-[3/2] overflow-hidden">
        <ScenarioArt id={id} />
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-semibold leading-tight text-calm-text">{copy.title}</div>
        <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-calm-muted">{copy.body}</div>
      </div>
    </Link>
  )
}
