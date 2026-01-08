'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/Card'
import { format } from 'date-fns'

interface Session {
  id: number
  started_at: string
  ended_at: string | null
  duration_seconds: number
}

interface Analytics {
  session_id: number
  grammar_corrections: Array<{
    input: string
    output: string
    explanation: string
  }>
  vocabulary_new: string[]
  fluency_score: number | null
  confidence_level: number | null
  total_words_spoken: number
}

export default function DashboardPage() {
  const { t } = useLanguage()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const userId = 1 // TODO: Get from auth

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/api/users/${userId}/sessions`)
      const data = await response.json()
      setSessions(data)

      // Auto-select most recent session
      if (data.length > 0) {
        setSelectedSession(data[0].id)
        fetchAnalytics(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchAnalytics(sessionId: number) {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/analytics`)

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        // Analytics not yet available, trigger analysis
        await triggerAnalysis(sessionId)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  async function triggerAnalysis(sessionId: number) {
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}/analyze`, {
        method: 'POST'
      })

      // Poll for results after a delay
      setTimeout(() => fetchAnalytics(sessionId), 5000)
    } catch (error) {
      console.error('Error triggering analysis:', error)
    }
  }

  function handleSessionSelect(sessionId: number) {
    setSelectedSession(sessionId)
    setAnalytics(null)
    fetchAnalytics(sessionId)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-calm-muted">{t.dashboard.analyzing}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-calm-text mb-2">
          {t.dashboard.title}
        </h1>
        <p className="text-calm-muted">
          {t.dashboard.subtitle}
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-calm-muted mb-4">
              {t.dashboard.noSessions}
            </p>
            <a href="/" className="btn btn-primary">
              {t.dashboard.startNewConversation}
            </a>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
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
                    <div className="text-sm text-calm-muted">
                      {formatDate(session.started_at)}
                    </div>
                    <div className="text-xs text-calm-muted mt-1">
                      {t.dashboard.duration}: {formatDuration(session.duration_seconds, t)}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {!analytics ? (
              <Card>
                <div className="text-center py-12">
                  <p className="text-calm-muted">
                    {t.dashboard.analyzing}
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ScoreCard
                    title={t.dashboard.fluency}
                    score={analytics.fluency_score}
                    color="blue"
                  />
                  <ScoreCard
                    title={t.dashboard.confidence}
                    score={analytics.confidence_level}
                    color="green"
                  />
                  <Card>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary-600">
                        {analytics.total_words_spoken}
                      </div>
                      <div className="text-sm text-calm-muted mt-1">
                        {t.dashboard.wordsSpoken}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* New Vocabulary */}
                {analytics.vocabulary_new.length > 0 && (
                  <Card title={t.dashboard.newWords}>
                    <div className="flex flex-wrap gap-2">
                      {analytics.vocabulary_new.map((word, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm arabic"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Grammar Corrections */}
                {analytics.grammar_corrections.length > 0 && (
                  <Card title={t.dashboard.grammarCorrections}>
                    <div className="space-y-4">
                      {analytics.grammar_corrections.map((correction, index) => (
                        <div
                          key={index}
                          className="border-r-4 border-primary-500 pr-4 py-2"
                        >
                          <div className="text-sm text-calm-muted mb-1">
                            {t.dashboard.youSaid}
                          </div>
                          <div className="text-base text-red-600 mb-2 arabic">
                            {correction.input}
                          </div>
                          <div className="text-sm text-calm-muted mb-1">
                            {t.dashboard.better}
                          </div>
                          <div className="text-base text-green-600 mb-2 arabic">
                            {correction.output}
                          </div>
                          <div className="text-sm text-calm-muted italic">
                            {correction.explanation}
                          </div>
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
    </div>
  )
}

// Score Card Component
function ScoreCard({ title, score, color }: { title: string; score: number | null; color: string }) {
  const percentage = score || 0

  return (
    <Card>
      <div className="text-center">
        <div className="text-sm text-calm-muted mb-2">{title}</div>
        <div className="relative w-20 h-20 mx-auto mb-2">
          <svg className="transform -rotate-90 w-20 h-20">
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-calm-border"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - percentage / 100)}`}
              className={`text-${color}-500`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{percentage}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Utility functions
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatDuration(seconds: number, t: any): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}${t.dashboard.minutes} ${secs}${t.dashboard.seconds}`
}
