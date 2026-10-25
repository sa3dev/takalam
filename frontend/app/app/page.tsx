'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useScenarios } from '@/hooks/useScenarios'
import { useQuota } from '@/hooks/useQuota'
import { QuotaGauge } from '@/components/QuotaGauge'
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
  const { quota } = useQuota(!!user)
  const [sessions, setSessions] = useState<{ duration_seconds: number }[]>([])
  const [hasOngoing, setHasOngoing] = useState(false)
  const [heroAttempt, setHeroAttempt] = useState(0)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  // What the progress card on a wide screen adds up: only what was really done.
  useEffect(() => {
    if (!user) return
    fetch('/api/users/me/sessions?limit=100', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : []))
      .then(setSessions)
      .catch(() => {})
  }, [user])

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
      <div className="mx-auto max-w-3xl px-4 pb-10 md:max-w-7xl md:px-8">
        {/* Greeting over a picture. The cream veil runs from the left, where the
            words sit, so they stay readable on whatever the picture turns out to be. */}
        <div
          className="relative -mx-4 mb-8 overflow-hidden px-4 pb-12 pt-12 sm:mx-0 sm:mt-4 sm:rounded-2xl md:mb-10 md:min-h-[320px] md:rounded-3xl md:px-12 md:pb-16 md:pt-16"
          style={{ background: 'linear-gradient(135deg, var(--terra-soft), var(--cream))' }}
        >
          {heroAttempt < HERO_EXTENSIONS.length && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/home/hero.${HERO_EXTENSIONS[heroAttempt]}`}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover md:object-right"
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
            <h1 className="text-2xl font-bold text-calm-text md:max-w-xl md:text-5xl md:leading-tight">
              {t.mobile.hello}, <span style={{ color: 'var(--terra-deep)' }}>{user.username}</span> !
            </h1>
            <p className="mt-1 text-sm text-calm-muted md:mt-3 md:max-w-md md:text-lg">{t.mobile.askPractice}</p>
            {/* On a wide screen the two ways in are right here; on a phone the
                cards below do the same job. */}
            <div className="mt-8 hidden gap-3 md:flex">
              <Link
                href="/conversation?scenario=free"
                data-umami-event="scenario-start"
                data-umami-event-scenario="free"
                className="btn btn-primary gap-2 !px-7 !py-3.5 no-underline shadow-lg"
              >
                {t.mobile.speakNow} →
              </Link>
              <Link href="/situations" className="btn btn-secondary !bg-[var(--card)] !px-7 !py-3.5 no-underline">
                {t.mobile.chooseSituation}
              </Link>
            </div>
          </div>
        </div>

        {hasOngoing && (
          <Link
            href="/conversation"
            className="mb-6 flex items-center justify-between rounded-2xl border border-primary-500 bg-primary-50 px-4 py-3 no-underline"
          >
            <div>
              <div className="text-sm font-semibold text-primary-700">{t.mobile.resume}</div>
              <div className="text-xs text-calm-muted">{t.mobile.resumeBody}</div>
            </div>
            <span className="text-primary-700">→</span>
          </Link>
        )}

        {/* Wide screens: the ordinary chat, the situations and the progress, side by side. */}
        <div className="md:grid md:grid-cols-12 md:items-start md:gap-6">

        {/* The ordinary conversation, first and biggest. */}
        <div className="card mb-10 !p-5 md:col-span-4 md:mb-0 md:!p-6"
          style={{ background: 'linear-gradient(160deg, var(--terra), var(--terra-deep))', color: 'var(--cream)', border: 'none' }}>
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--cream)', color: 'var(--terra-deep)' }}
              aria-hidden="true"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>{t.mobile.freeTitle}</h2>
              <p className="text-sm" style={{ color: 'color-mix(in oklch, var(--cream) 80%, transparent)' }}>{t.mobile.freeBody}</p>
            </div>
          </div>
          <Link
            href="/conversation?scenario=free"
            data-umami-event="scenario-start"
            data-umami-event-scenario="free"
            className="btn mt-4 w-full no-underline"
            style={{ background: 'var(--cream)', color: 'var(--terra-deep)' }}
          >
            {t.mobile.start}
          </Link>
        </div>

        {scenarios.length > 0 && (
          <section className="md:col-span-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-calm-text">{t.mobile.popular}</h2>
              <Link href="/situations" className="text-sm font-medium text-primary-600 no-underline">
                {t.mobile.seeAll}
              </Link>
            </div>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-thin md:hidden">
              {scenarios.slice(0, 4).map(scenario => (
                <ScenarioCard key={scenario.id} id={scenario.id} strip />
              ))}
            </div>
            <div className="hidden grid-cols-3 gap-3 md:grid">
              {scenarios.slice(0, 6).map(scenario => (
                <ScenarioCard key={scenario.id} id={scenario.id} tile />
              ))}
            </div>
          </section>
        )}

        {/* Only what is real: time spoken, conversations held, and today's allowance. */}
        <aside className="card hidden !p-5 md:col-span-3 md:block">
          <Link href="/dashboard" className="mb-4 flex items-center justify-between no-underline">
            <h2 className="text-base font-semibold text-calm-text">{t.nav.progress}</h2>
            <span className="text-calm-muted">→</span>
          </Link>
          <dl className="mb-4 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-calm-muted">{t.mobile.practiceTime}</dt>
              <dd className="text-lg font-bold tabular-nums text-calm-text">
                {Math.round(sessions.reduce((total, s) => total + s.duration_seconds, 0) / 60)} min
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-calm-muted">{t.mobile.conversations}</dt>
              <dd className="text-lg font-bold tabular-nums text-calm-text">{sessions.length}</dd>
            </div>
          </dl>
          <QuotaGauge quota={quota} />
        </aside>

        </div>
      </div>
    </AppLayout>
  )
}
