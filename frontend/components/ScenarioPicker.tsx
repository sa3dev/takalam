'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ScenarioArt } from '@/components/ScenarioArt'
import type { TranslationKeys } from '@/lib/i18n/translations'

/** The ordinary chat, as opposed to a role-play situation. */
export const FREE_CONVERSATION = 'free'

type ScenarioId = Exclude<keyof TranslationKeys['scenarios'], 'or' | 'backToScenarios' | 'heading' | 'subheading' | 'free' | 'freeBody' | 'goalLabel' | 'beginner' | 'intermediate'>

interface ScenarioInfo {
  id: string
  level: 'beginner' | 'intermediate'
}

interface ScenarioPickerProps {
  onPick: (scenarioId: string) => void
}

export function ScenarioPicker({ onPick }: ScenarioPickerProps) {
  const { t } = useLanguage()
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/scenarios', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : []))
      .then((data: ScenarioInfo[]) => { if (!cancelled) setScenarios(data) })
      // Without the list, free conversation is still on offer.
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="mt-5">
      {/* Two ways in, kept visibly apart: the ordinary chat above, a situation below. */}
      <div className="flex items-center gap-3 my-5" role="separator">
        <hr className="flex-1 border-calm-border" />
        <span className="text-xs uppercase tracking-wider text-calm-muted">{t.scenarios.or}</span>
        <hr className="flex-1 border-calm-border" />
      </div>
      <p className="text-sm font-medium text-calm-text mb-3 text-center">{t.scenarios.heading}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {scenarios.map(scenario => {
          const copy = t.scenarios[scenario.id as ScenarioId]
          if (!copy) return null
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onPick(scenario.id)}
              title={`${t.scenarios.goalLabel} : ${copy.goal}`}
              className="group overflow-hidden rounded-xl border border-calm-border bg-calm-surface text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-500 hover:shadow-md"
            >
              <div className="aspect-[3/2] overflow-hidden">
                <ScenarioArt id={scenario.id} />
              </div>
              <div className="px-3 py-2">
                <div className="text-sm font-semibold text-calm-text leading-tight">{copy.title}</div>
                <div className="mt-0.5 text-xs text-calm-muted leading-snug line-clamp-2">{copy.body}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
