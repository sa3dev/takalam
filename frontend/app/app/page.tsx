'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useScenarios } from '@/hooks/useScenarios'
import { AppLayout } from '@/components/AppLayout'
import { ScenarioCard } from '@/components/ScenarioCard'

// A picture dropped in public/home/hero.(webp|jpg|png) sits behind the greeting;
// until one exists the soft gradient below stands in.
const HERO_EXTENSIONS = ['webp', 'jpg', 'png']

// Same keys the conversation page keeps in the tab.
const SESSION_ID_KEY = 'takalam:session-id'
const SCENARIO_KEY = 'takalam:scenario'

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, isLoading } = useAuth()
  const scenarios = useScenarios()
  const [hasOngoing, setHasOngoing] = useState(false)
  const [heroAttempt, setHeroAttempt] = useState(0)

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
      <div className="max-w-3xl mx-auto px-4 pb-8">
        {/* Greeting over a picture. The cream veil runs from the left, where the
            words sit, so they stay readable on whatever the picture turns out to be. */}
        <div
          className="relative -mx-4 mb-5 overflow-hidden px-4 pb-8 pt-8 sm:mx-0 sm:mt-4 sm:rounded-2xl"
          style={{ background: 'linear-gradient(135deg, var(--terra-soft), var(--cream))' }}
        >
          {heroAttempt < HERO_EXTENSIONS.length && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/home/hero.${HERO_EXTENSIONS[heroAttempt]}`}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setHeroAttempt(a => a + 1)}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, color-mix(in oklch, var(--cream) 92%, transparent) 0%, color-mix(in oklch, var(--cream) 70%, transparent) 45%, transparent 100%)',
            }}
          />
          <div className="relative">
            <h1 className="text-2xl font-bold text-calm-text">
              {t.mobile.hello}, {user.username} !
            </h1>
            <p className="text-sm text-calm-muted">{t.mobile.askPractice}</p>
          </div>
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
