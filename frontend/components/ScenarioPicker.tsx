'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/Card'
import type { TranslationKeys } from '@/lib/i18n/translations'

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-calm-text mb-2">{t.scenarios.heading}</h2>
        <p className="text-calm-muted">{t.scenarios.subheading}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button type="button" onClick={() => onPick(FREE_CONVERSATION)} className="text-left">
          <Card className="h-full hover:border-primary-500 transition-colors">
            <div className="font-semibold text-calm-text mb-1">{t.scenarios.free}</div>
            <p className="text-sm text-calm-muted">{t.scenarios.freeBody}</p>
          </Card>
        </button>

        {scenarios.map(scenario => {
          const copy = t.scenarios[scenario.id as ScenarioId]
          if (!copy) return null
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onPick(scenario.id)}
              className="text-left"
            >
              <Card className="h-full hover:border-primary-500 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="font-semibold text-calm-text">{copy.title}</div>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                    {t.scenarios[scenario.level]}
                  </span>
                </div>
                <p className="text-sm text-calm-muted mb-2">{copy.body}</p>
                <p className="text-xs text-calm-muted">
                  <span className="font-medium">{t.scenarios.goalLabel} :</span> {copy.goal}
                </p>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
