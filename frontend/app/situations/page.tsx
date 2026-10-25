'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useScenarios } from '@/hooks/useScenarios'
import { AppLayout } from '@/components/AppLayout'
import { ScenarioCard } from '@/components/ScenarioCard'

export default function SituationsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, isLoading } = useAuth()
  const scenarios = useScenarios()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading || !user) return null

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-5 pb-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-calm-text">{t.mobile.situationsTitle}</h1>
          <p className="text-sm text-calm-muted">{t.mobile.situationsSubtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {scenarios.map(scenario => (
            <ScenarioCard key={scenario.id} id={scenario.id} />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
