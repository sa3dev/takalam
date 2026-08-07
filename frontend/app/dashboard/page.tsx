'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import { Card } from '@/components/Card'
import type { TranslationKeys } from '@/lib/i18n/translations'

interface Session {
  id: number
  started_at: string
  ended_at: string | null
  duration_seconds: number
}

interface Analytics {
  session_id: number
  grammar_corrections: Array<{ input: string; output: string; explanation: string }>
  vocabulary_new: string[]
  total_words_spoken: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, isLoading, deleteAccount } = useAuth()

  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) fetchSessions()
  }, [user])

  async function fetchSessions() {
    try {
      setIsFetching(true)
      const response = await fetch('/api/users/me/sessions', { credentials: 'include' })
      if (!response.ok) return
      const data: Session[] = await response.json()
      setSessions(data)
      if (data.length > 0) {
        setSelectedSession(data[0].id)
        fetchAnalytics(data[0].id)
      }
    } finally {
      setIsFetching(false)
    }
  }

  async function fetchAnalytics(sessionId: number) {
    setAnalytics(null)
    const response = await fetch(`/api/sessions/${sessionId}/analytics`, { credentials: 'include' })
    if (response.ok) {
      setAnalytics(await response.json())
    } else if (response.status === 404) {
      triggerAnalysis(sessionId)
    }
  }

  async function triggerAnalysis(sessionId: number) {
    await fetch(`/api/sessions/${sessionId}/analyze`, {
      method: 'POST',
      credentials: 'include',
    })
    // Poll once after 5s, then again after 10s if still not ready
    const poll = async (attempt: number) => {
      const res = await fetch(`/api/sessions/${sessionId}/analytics`, { credentials: 'include' })
      if (res.ok) {
        setAnalytics(await res.json())
      } else if (attempt < 3) {
        setTimeout(() => poll(attempt + 1), 5000)
      }
    }
    setTimeout(() => poll(1), 5000)
  }

  function handleSessionSelect(sessionId: number) {
    setSelectedSession(sessionId)
    fetchAnalytics(sessionId)
  }

  async function handleDeleteAccount() {
    if (!confirm('Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.')) return
    try {
      await deleteAccount()
      router.push('/')
    } catch {
      alert('Une erreur est survenue. Réessayez.')
    }
  }

  if (isLoading || !user) return null

  if (isFetching) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-calm-muted">{t.dashboard.analyzing}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-calm-text mb-2">{t.dashboard.title}</h1>
        <p className="text-calm-muted">{t.dashboard.subtitle}</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-calm-muted mb-4">{t.dashboard.noSessions}</p>
            <button onClick={() => router.push('/app')} className="btn btn-primary">
              {t.dashboard.startNewConversation}
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card title={t.dashboard.previousSessions}>
              <div className="space-y-2">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session.id)}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${
                      selectedSession === session.id
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-calm-bg hover:bg-calm-border'
                    }`}
                  >
                    <div className="font-medium text-calm-text">
                      {t.dashboard.session} #{session.id}
                    </div>
                    <div className="text-sm text-calm-muted">{formatDate(session.started_at)}</div>
                    <div className="text-xs text-calm-muted mt-1">
                      {t.dashboard.duration}: {formatDuration(session.duration_seconds, t)}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!analytics ? (
              <Card>
                <div className="text-center py-12">
                  <p className="text-calm-muted">{t.dashboard.analyzing}</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Counts, not scores: each of these is something we actually
                    observed, so none of them needs defending. */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard value={analytics.total_words_spoken} label={t.dashboard.wordsSpoken} />
                  <StatCard
                    value={formatDuration(sessions.find(s => s.id === selectedSession)?.duration_seconds ?? 0, t)}
                    label={t.dashboard.duration}
                  />
                  <StatCard value={analytics.vocabulary_new.length} label={t.dashboard.newWords} />
                </div>

                {analytics.grammar_corrections.length === 0 && analytics.vocabulary_new.length === 0 && (
                  <Card>
                    <div className="text-center py-8">
                      <p className="text-calm-text font-medium mb-1">{t.dashboard.nothingToReport}</p>
                      <p className="text-sm text-calm-muted">{t.dashboard.nothingToReportBody}</p>
                    </div>
                  </Card>
                )}

                {analytics.vocabulary_new.length > 0 && (
                  <Card title={t.dashboard.newWords}>
                    <div className="flex flex-wrap gap-2">
                      {analytics.vocabulary_new.map((word, index) => (
                        <span key={index} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm arabic">
                          {word}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                {analytics.grammar_corrections.length > 0 && (
                  <Card title={t.dashboard.grammarCorrections}>
                    <div className="space-y-4">
                      {analytics.grammar_corrections.map((correction, index) => (
                        <div key={index} className="border-r-4 border-primary-500 pr-4 py-2">
                          <div className="text-sm text-calm-muted mb-1">{t.dashboard.youSaid}</div>
                          <div className="text-base text-red-600 mb-2 arabic">{correction.input}</div>
                          <div className="text-sm text-calm-muted mb-1">{t.dashboard.better}</div>
                          <div className="text-base text-green-600 mb-2 arabic">{correction.output}</div>
                          <div className="text-sm text-calm-muted italic">{correction.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <div className="mt-12 pt-8 border-t border-calm-border">
        <h2 className="text-lg font-semibold text-calm-text mb-2">Zone dangereuse</h2>
        <p className="text-sm text-calm-muted mb-4">
          La suppression de votre compte efface définitivement toutes vos données (sessions, transcriptions, progression).
        </p>
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
        >
          Supprimer mon compte
        </button>
      </div>
    </div>
    </AppLayout>
  )
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <Card>
      <div className="text-center">
        <div className="text-3xl font-bold text-primary-600 tabular-nums">{value}</div>
        <div className="text-sm text-calm-muted mt-1">{label}</div>
      </div>
    </Card>
  )
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDuration(seconds: number, t: TranslationKeys): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}${t.dashboard.minutes} ${secs}${t.dashboard.seconds}`
}
