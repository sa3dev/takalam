'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKeys } from '@/lib/i18n/translations'

/** The ordinary chat, as opposed to a role-play situation. */
export const FREE_CONVERSATION = 'free'

type ScenarioId = Exclude<keyof TranslationKeys['scenarios'], 'heading' | 'subheading' | 'free' | 'freeBody' | 'goalLabel' | 'beginner' | 'intermediate'>

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
    <div className="mt-5 text-center">
      <p className="text-sm font-medium text-calm-text mb-2">{t.scenarios.heading}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {scenarios.map(scenario => {
          const copy = t.scenarios[scenario.id as ScenarioId]
          if (!copy) return null
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onPick(scenario.id)}
              title={`${t.scenarios.goalLabel} : ${copy.goal}`}
              className="px-3 py-1.5 text-sm rounded-full border border-calm-border bg-calm-bg text-calm-text hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              {copy.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}
