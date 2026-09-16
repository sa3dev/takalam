'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import {
  useWebSocket,
  WebSocketMessage,
  TranscriptionMessage,
  AudioResponseMessage,
  QuotaUpdateMessage,
  QuotaExceededMessage,
} from '@/hooks/useWebSocket'
import { useAudioRecorder, blobToBase64, formatRecordingTime } from '@/hooks/useAudioRecorder'
import { useQuota, isOutOfQuota, formatResetTime } from '@/hooks/useQuota'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import { RecordButton } from '@/components/RecordButton'
import { TranscriptItem } from '@/components/TranscriptItem'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { QuotaGauge } from '@/components/QuotaGauge'
import { PaywallModal } from '@/components/PaywallModal'
import { Card } from '@/components/Card'

interface Transcript {
  speaker: 'user' | 'assistant'
  text: string
  translation?: string
  timestamp: string
}

/** Rows as the transcriptions endpoint returns them. Translations are not
 *  persisted, so a restored line carries the Arabic alone. */
interface StoredTranscription {
  speaker: 'user' | 'assistant'
  text: string
  created_at: string
}

const SESSION_ID_KEY = 'takalam:session-id'

function formatTimestamp(value: string): string {
  // The API serialises naive UTC. Without the marker a browser reads it as
  // local time, and every restored line shows an hour or two off.
  const iso = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

export default function ConversationPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { user, isLoading } = useAuth()
  // Kept in sessionStorage, not minted per mount: a reload used to hand the
  // backend a brand new id, which meant a blank screen, a second row in the
  // dashboard, and an assistant that had forgotten the last five minutes. The
  // id belongs to the tab, so closing it still starts a fresh conversation.
  const [sessionId] = useState(() => {
    const fresh = () => `session-${Date.now()}`
    if (typeof window === 'undefined') return fresh()
    try {
      const stored = window.sessionStorage.getItem(SESSION_ID_KEY)
      if (stored) return stored
      const created = fresh()
      window.sessionStorage.setItem(SESSION_ID_KEY, created)
      return created
    } catch {
      // Private mode, storage disabled — a conversation that cannot survive a
      // reload is still better than a page that will not load at all.
      return fresh()
    }
  })
  // Keep the current UI language in a ref so the recorder callback never sends a stale value
  const languageRef = useRef(language)
  useEffect(() => { languageRef.current = language }, [language])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  // Restoring happens once per mount. The automatic retry sends start_session
  // again on every reconnect, and refetching then would race with turns already
  // on screen — mid-conversation the list in memory is the authority.
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  const handleTranscription = useCallback((message: TranscriptionMessage) => {
    if (!message.is_final) return
    const timestamp = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    setTranscripts(prev => [...prev, { speaker: message.speaker, text: message.text, translation: message.translation, timestamp }])
    if (message.speaker === 'user') setIsProcessing(true)
    else setIsProcessing(false)
  }, [])

  const handleAudioResponse = useCallback(async (message: AudioResponseMessage) => {
    try {
      const byteCharacters = atob(message.audio_data)
      const byteArray = new Uint8Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i)
      }
      const audioBlob = new Blob([byteArray], { type: 'audio/mp3' })
      const audioUrl = URL.createObjectURL(audioBlob)
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        await audioRef.current.play()
        audioRef.current.onended = () => URL.revokeObjectURL(audioUrl)
      }
    } catch {
      // audio playback errors are non-fatal
    }
  }, [])

  /** Rebuild the conversation the backend already holds. Reached after a
   *  reload, where the screen is empty but the session is not. */
  const handleSessionStarted = useCallback(async (message: WebSocketMessage) => {
    if (message.type !== 'session_started' || hasRestoredRef.current) return
    hasRestoredRef.current = true

    const dbSessionId = message.db_session_id
    if (typeof dbSessionId !== 'number') return

    try {
      const res = await fetch(`/api/sessions/${dbSessionId}/transcriptions`, { credentials: 'include' })
      if (!res.ok) return
      const rows: StoredTranscription[] = await res.json()
      if (rows.length === 0) return
      setTranscripts(prev => (prev.length > 0 ? prev : rows.map(row => ({
        speaker: row.speaker,
        text: row.text,
        timestamp: formatTimestamp(row.created_at),
      }))))
    } catch {
      // Nothing to restore is not a failure — the conversation simply starts here.
    }
  }, [])

  const handleError = useCallback(() => {
    // Unblock the UI when the server rejects a turn (rate limit, processing error, …)
    setIsProcessing(false)
  }, [])

  const { quota, applyUsage } = useQuota(!!user)
  // Once the allowance is spent the server refuses every turn, so the mic is
  // disabled rather than left to invite a click it will punish.
  const outOfQuota = isOutOfQuota(quota)

  const handleQuotaUpdate = useCallback((message: QuotaUpdateMessage) => {
    applyUsage(message.spoken_seconds_used)
  }, [applyUsage])

  const handleQuotaExceeded = useCallback((message: QuotaExceededMessage) => {
    // The turn was refused before any provider call, so nothing is coming back:
    // release the UI, settle the gauge on the real total, then show the wall.
    setIsProcessing(false)
    applyUsage(message.spoken_seconds_used)
    setIsPaywallOpen(true)
  }, [applyUsage])

  const { isConnected, connectionError, sendAudioChunk, startSession, endSession } = useWebSocket({
    sessionId,
    isAuthenticated: !!user,
    onMessage: handleSessionStarted,
    onTranscription: handleTranscription,
    onAudioResponse: handleAudioResponse,
    onQuotaUpdate: handleQuotaUpdate,
    onQuotaExceeded: handleQuotaExceeded,
    onError: handleError,
  })

  const handleAudioRecorded = useCallback(async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)
      const base64Audio = await blobToBase64(audioBlob)
      sendAudioChunk(base64Audio, audioBlob.type || 'audio/webm', languageRef.current)
    } catch {
      setIsProcessing(false)
    }
  }, [sendAudioChunk])

  const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder({
    onAudioData: handleAudioRecorded,
  })

  useEffect(() => {
    if (isConnected) startSession()
  }, [isConnected, startSession])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  function handleRecordButtonClick() {
    if (isRecording) stopRecording()
    else startRecording()
  }

  function handleEndSession() {
    if (confirm(t.home.endSessionConfirm)) {
      endSession()
      // Deliberately ended, so the id must not be inherited by the next
      // conversation — that is the one case where starting over is the point.
      try { window.sessionStorage.removeItem(SESSION_ID_KEY) } catch { /* nothing to clear */ }
      router.push('/dashboard')
    }
  }

  if (isLoading || !user) return null

  // Everything above the transcript is introduction, and an introduction has
  // done its job once the conversation exists. From the first exchange the page
  // rearranges itself around the transcript: the heading goes, the gauge folds
  // into one line, and the controls stop stacking — around 200 vertical pixels
  // handed back to the only part anyone is reading.
  const started = transcripts.length > 0

  const hint = isRecording
    ? t.home.recording
    : isProcessing
    ? t.home.processing
    : t.home.clickToRecord

  return (
    <AppLayout>
      <div className={clsx('max-w-4xl mx-auto px-4 h-full flex flex-col', started ? 'py-3' : 'py-6')}>
        {started ? (
          <div className="flex items-center gap-4 mb-2 shrink-0">
            <ConnectionStatus isConnected={isConnected} error={connectionError} />
            <div className="ml-auto w-40 sm:w-52 shrink-0">
              <QuotaGauge quota={quota} compact />
            </div>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-calm-text">{t.home.title}</h2>
              <ConnectionStatus isConnected={isConnected} error={connectionError} />
            </div>
            <p className="text-calm-muted text-center">{t.home.subtitle}</p>
            <div className="max-w-sm mx-auto w-full">
              <QuotaGauge quota={quota} />
            </div>
          </div>
        )}

        {/* min-h-0 is what makes flex-1 + overflow actually scroll here: without
            it the card grows to fit the transcript and pushes the controls off. */}
        <Card className={clsx('flex-1 min-h-0 overflow-y-auto scrollbar-thin', started ? 'mb-3' : 'mb-4')}>
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-calm-muted">
              <p className="text-center">
                {t.home.noConversation}<br />
                {t.home.clickToStart}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transcripts.map((transcript, index) => (
                <TranscriptItem
                  key={index}
                  speaker={transcript.speaker}
                  text={transcript.text}
                  translation={transcript.translation}
                  timestamp={transcript.timestamp}
                />
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-calm-surface border border-calm-border rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-calm-muted rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-calm-muted rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-calm-muted rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </Card>

        {started ? (
          /* One row: the microphone, and beside it the words that would
             otherwise cost two more. */
          <div className="flex items-center justify-center gap-4 shrink-0">
            <RecordButton
              isRecording={isRecording}
              onClick={handleRecordButtonClick}
              disabled={!isConnected || isProcessing || outOfQuota}
            />
            <div className="flex flex-col items-start gap-1.5 min-w-0">
              {outOfQuota ? (
                <p className="text-sm text-calm-muted max-w-xs">
                  {t.quota.wallTitle}
                  {quota && ` — ${t.quota.resets.replace('{time}', formatResetTime(quota.resets_at, language))}`}
                </p>
              ) : (
                <span
                  className={clsx(
                    'text-sm tabular-nums',
                    isRecording ? 'font-mono font-bold text-red-500' : 'text-calm-muted'
                  )}
                >
                  {isRecording ? formatRecordingTime(recordingTime) : hint}
                </span>
              )}
              <div className="flex items-center gap-2">
                {/* The wall is a dead end without this: the modal is only pushed
                    by the server when a turn is refused, and turns are now
                    blocked before they can be sent. */}
                {outOfQuota && (
                  <button onClick={() => setIsPaywallOpen(true)} className="btn btn-primary">
                    {t.quota.cta}
                  </button>
                )}
                <button onClick={handleEndSession} className="btn btn-secondary">
                  {t.home.endSession}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 shrink-0">
            {isRecording && (
              <div className="text-2xl font-mono text-red-500 font-bold">
                {formatRecordingTime(recordingTime)}
              </div>
            )}
            <RecordButton
              isRecording={isRecording}
              onClick={handleRecordButtonClick}
              disabled={!isConnected || isProcessing || outOfQuota}
            />
            {outOfQuota ? (
              <>
                <p className="text-sm text-calm-muted text-center max-w-xs">
                  {t.quota.wallTitle}
                  {quota && ` — ${t.quota.resets.replace('{time}', formatResetTime(quota.resets_at, language))}`}
                </p>
                <button onClick={() => setIsPaywallOpen(true)} className="btn btn-primary">
                  {t.quota.cta}
                </button>
              </>
            ) : (
              <p className="text-sm text-calm-muted">{hint}</p>
            )}
          </div>
        )}

        <audio ref={audioRef} className="hidden" />

        <PaywallModal
          open={isPaywallOpen}
          quota={quota}
          onClose={() => setIsPaywallOpen(false)}
        />
      </div>
    </AppLayout>
  )
}
