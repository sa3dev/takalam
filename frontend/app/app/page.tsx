'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useScenarios } from '@/hooks/useScenarios'
import { AppLayout } from '@/components/AppLayout'
import { ScenarioCard } from '@/components/ScenarioCard'

// Same keys the conversation page keeps in the tab.
const SESSION_ID_KEY = 'takalam:session-id'
const SCENARIO_KEY = 'takalam:scenario'

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, isLoading } = useAuth()
  const scenarios = useScenarios()
  const [hasOngoing, setHasOngoing] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  // A conversation left open in this tab can be picked up where it stopped.
  useEffect(() => {
    try {
      setHasOngoing(!!window.sessionStorage.getItem(SESSION_ID_KEY) && !!window.sessionStorage.getItem(SCENARIO_KEY))
    } catch {
      setHasOngoing(false)
    }
  }, [])

  if (isLoading || !user) return null

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-5 pb-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-calm-text">
            {t.mobile.hello}, {user.username} !
          </h1>
          <p className="text-sm text-calm-muted">{t.mobile.askPractice}</p>
        </div>

        {hasOngoing && (
          <Link
            href="/conversation"
            className="mb-4 flex items-center justify-between rounded-2xl border border-primary-500 bg-primary-50 px-4 py-3 no-underline"
          >
            <div>
              <div className="text-sm font-semibold text-primary-700">{t.mobile.resume}</div>
              <div className="text-xs text-calm-muted">{t.mobile.resumeBody}</div>
            </div>
            <span className="text-primary-700">→</span>
          </Link>
        )}

        {/* The ordinary conversation, first and biggest. */}
        <div className="card mb-6 !p-5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: 'var(--terra)' }}
              aria-hidden="true"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-calm-text">{t.mobile.freeTitle}</h2>
              <p className="text-sm text-calm-muted">{t.mobile.freeBody}</p>
            </div>
          </div>
          <Link href="/conversation?scenario=free" className="btn btn-primary mt-4 w-full no-underline">
            {t.mobile.start}
          </Link>
        </div>

        {scenarios.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-calm-text">{t.mobile.popular}</h2>
              <Link href="/situations" className="text-sm font-medium text-primary-600 no-underline">
                {t.mobile.seeAll}
              </Link>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin">
              {scenarios.slice(0, 4).map(scenario => (
                <ScenarioCard key={scenario.id} id={scenario.id} strip />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}
