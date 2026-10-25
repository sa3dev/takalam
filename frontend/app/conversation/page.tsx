'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { QuotaPill } from '@/components/QuotaPill'
import { PaywallModal } from '@/components/PaywallModal'
import { ScenarioPicker, FREE_CONVERSATION } from '@/components/ScenarioPicker'
import { track } from '@/lib/analytics'

interface Transcript {
  speaker: 'user' | 'assistant'
  text: string
  translation?: string
  timestamp: string
  /** Blob URLs of the spoken reply, one per sentence, kept so it can be played again. */
  audioUrls?: string[]
}

/** Rows as the transcriptions endpoint returns them. Translations are not
 *  persisted, so a restored line carries the Arabic alone. */
interface StoredTranscription {
  speaker: 'user' | 'assistant'
  text: string
  created_at: string
}

const SESSION_ID_KEY = 'takalam:session-id'
// The situation chosen for this tab's conversation: a scenario id, or 'free'.
const SCENARIO_KEY = 'takalam:scenario'

/** The situation asked for in the address (?scenario=restaurant, or =free).
 *  Arriving with one always means a new conversation, so it is read before
 *  anything is restored from the tab. */
function readRequestedScenario(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('scenario')
  return value && value.length <= 40 ? value : null
}

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
      if (readRequestedScenario()) window.sessionStorage.removeItem(SESSION_ID_KEY)
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
  // Null until the learner picks a situation (or free conversation); the
  // choice survives a reload with the session it belongs to.
  const [scenarioChoice, setScenarioChoice] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const requested = readRequestedScenario()
    try {
      if (requested) {
        window.sessionStorage.setItem(SCENARIO_KEY, requested)
        return requested
      }
      return window.sessionStorage.getItem(SCENARIO_KEY)
    } catch {
      return requested
    }
  })

  // The address has done its job once read: a reload must resume this
  // conversation, not start another one from the same link.
  useEffect(() => {
    if (readRequestedScenario()) router.replace('/conversation')
  }, [router])
  // Keep the current UI language in a ref so the recorder callback never sends a stale value
  const languageRef = useRef(language)
  useEffect(() => { languageRef.current = language }, [language])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUnlockedRef = useRef(false)
  const pendingActionRef = useRef<'cancel' | 'restart' | null>(null)
  const scenarioChoiceRef = useRef<string | null>(null)
  const startSessionRef = useRef<((scenarioId?: string, targetLang?: string) => void) | null>(null)
  const silentUrlRef = useRef<string | null>(null)
  const audioUrlsRef = useRef<string[]>([])
  const queueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)
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

  /** Play the queue one clip after the other. A reply arrives as several
   *  sentences, and each starts as the previous one ends. When the queue runs
   *  dry we just go idle: the next sentence to arrive restarts it. The error is
   *  surfaced, not swallowed: a refused play() is exactly how the voice used to
   *  go missing without a trace. */
  const playNext = useCallback(async () => {
    const el = audioRef.current
    const url = queueRef.current.shift()
    if (!el || !url) {
      isPlayingRef.current = false
      return
    }
    isPlayingRef.current = true
    try {
      el.src = url
      await el.play()
    } catch (error) {
      const name = error instanceof Error ? error.name : 'unknown'
      console.error('Audio playback failed:', error)
      track('audio-play-failed', { error: name })
      queueRef.current = []
      isPlayingRef.current = false
    }
  }, [])

  /** Enqueue clips, starting playback if nothing is playing. */
  const enqueueAudio = useCallback((urls: string[]) => {
    queueRef.current.push(...urls)
    if (!isPlayingRef.current) void playNext()
  }, [playNext])

  /** Replace whatever is playing with this reply, from its first sentence. */
  const replayAudio = useCallback((urls: string[]) => {
    queueRef.current = [...urls]
    isPlayingRef.current = false
    void playNext()
  }, [playNext])

  /** Browsers only let a page start sound inside a user gesture, and the reply
   *  arrives seconds after the click. Playing a silent clip on the click itself
   *  marks the element as allowed, so the reply can start by itself later. */
  const unlockAudio = useCallback(() => {
    const el = audioRef.current
    if (!el || audioUnlockedRef.current) return
    try {
      if (!silentUrlRef.current) {
        // 44-byte WAV header + 1 sample of silence
        const wav = new Uint8Array([
          82,73,70,70,38,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,
          64,31,0,0,128,62,0,0,2,0,16,0,100,97,116,97,2,0,0,0,0,0,
        ])
        silentUrlRef.current = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
      }
      el.src = silentUrlRef.current
      const attempt = el.play()
      if (attempt) attempt.then(() => { audioUnlockedRef.current = true }).catch(() => {})
    } catch {
      // unlocking is an optimisation; the replay button still works
    }
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
      audioUrlsRef.current.push(audioUrl)
      // The reply text arrived first, so the voice belongs to the last line the
      // assistant spoke. The first sentence starts a fresh list; the rest add to it.
      const isFirst = !message.index
      setTranscripts(prev => {
        const index = prev.map(item => item.speaker).lastIndexOf('assistant')
        if (index === -1) return prev
        return prev.map((item, i) => (
          i === index ? { ...item, audioUrls: isFirst ? [audioUrl] : [...(item.audioUrls ?? []), audioUrl] } : item
        ))
      })
      // A new reply interrupts what is left of the previous one.
      if (isFirst) {
        queueRef.current = []
        isPlayingRef.current = false
      }
      enqueueAudio([audioUrl])
    } catch (error) {
      console.error('Could not decode the spoken reply:', error)
    }
  }, [enqueueAudio])

  /** Rebuild the conversation the backend already holds. Reached after a
   *  reload, where the screen is empty but the session is not. */
  const handleSessionStarted = useCallback(async (message: WebSocketMessage) => {
    if (message.type === 'session_cancelled') {
      const action = pendingActionRef.current
      pendingActionRef.current = null
      resetConversation()
      if (action === 'restart') {
        // Same situation, from the first line: the server opens it again.
        const choice = scenarioChoiceRef.current
        startSessionRef.current?.(choice && choice !== FREE_CONVERSATION ? choice : undefined, languageRef.current)
      } else {
        // Leaving for good: nothing of it is remembered, and the way out
        // depends on where it began. A scene goes back to the situations, an
        // ordinary chat back to the home.
        const wasScene = !!scenarioChoiceRef.current && scenarioChoiceRef.current !== FREE_CONVERSATION
        leaveConversation(wasScene ? '/situations' : '/app')
      }
      return
    }
    if (message.type === 'busy') {
      pendingActionRef.current = null
      return
    }
    if (message.type !== 'session_started' || hasRestoredRef.current) return
    hasRestoredRef.current = true
    track('session-started')

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
  }, [router])

  const handleError = useCallback(() => {
    // Unblock the UI when the server rejects a turn (rate limit, processing error, …)
    setIsProcessing(false)
  }, [])

  const { quota, applyUsage } = useQuota(!!user)
  // Once the allowance is spent the server refuses every turn, so the mic is
  // disabled rather than left to invite a click it will punish.
  const outOfQuota = isOutOfQuota(quota)

  // Daily spoken-time thresholds, fired when the running total crosses them.
  // The first value seen (page load) only seeds the baseline, so reloading
  // mid-day does not replay milestones the user reached earlier.
  const lastUsedRef = useRef<number | null>(null)
  const used = quota?.spoken_seconds_used
  useEffect(() => {
    if (used === undefined) return
    const prev = lastUsedRef.current
    lastUsedRef.current = used
    if (prev === null) return
    for (const minutes of [2, 5, 10]) {
      if (prev < minutes * 60 && used >= minutes * 60) track(`spoken-${minutes}min`)
    }
  }, [used])

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

  const { isConnected, connectionError, sendAudioChunk, startSession, endSession, cancelSession } = useWebSocket({
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

  useEffect(() => { scenarioChoiceRef.current = scenarioChoice }, [scenarioChoice])
  useEffect(() => { startSessionRef.current = startSession }, [startSession])

  // Held back until a situation is chosen: the server opens the scene (for a
  // role-play) the moment the session starts, so it must know which one.
  useEffect(() => {
    if (!isConnected || !scenarioChoice) return
    startSession(scenarioChoice === FREE_CONVERSATION ? undefined : scenarioChoice, languageRef.current)
  }, [isConnected, scenarioChoice, startSession])

  function handleScenarioPick(choice: string) {
    try { window.sessionStorage.setItem(SCENARIO_KEY, choice) } catch { /* the choice just will not survive a reload */ }
    track('scenario-start', { scenario: choice })
    setScenarioChoice(choice)
  }

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  /** Drop everything remembered about this conversation and go elsewhere. */
  function leaveConversation(destination: string) {
    resetConversation()
    try {
      window.sessionStorage.removeItem(SESSION_ID_KEY)
      window.sessionStorage.removeItem(SCENARIO_KEY)
    } catch { /* nothing to clear */ }
    router.push(destination)
  }

  /** Empty the screen and the sound: what is left of a conversation that is gone. */
  function resetConversation() {
    setTranscripts([])
    setIsProcessing(false)
    queueRef.current = []
    isPlayingRef.current = false
    audioRef.current?.pause()
    audioUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    audioUrlsRef.current = []
  }

  function discardConversation(action: 'cancel' | 'restart', confirmFirst = true) {
    if (isProcessing) return
    if (confirmFirst && !confirm(action === 'cancel' ? t.home.cancelConfirm : t.home.restartConfirm)) return
    if (!isConnected) {
      // Nothing is running on the server to discard: just leave the screen.
      const wasScene = !!scenarioChoice && scenarioChoice !== FREE_CONVERSATION
      leaveConversation(wasScene ? '/situations' : '/app')
      return
    }
    track(action === 'cancel' ? 'session-cancel' : 'session-restart')
    pendingActionRef.current = action
    cancelSession()
  }

  // Blob URLs are kept so a reply can be replayed; release them with the page.
  useEffect(() => {
    const urls = audioUrlsRef.current
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [])

  function handleRecordButtonClick() {
    unlockAudio()
    // Speaking without choosing anything is the ordinary conversation: the
    // session starts now, free, and the situations are no longer offered.
    if (!scenarioChoice) {
      try { window.sessionStorage.setItem(SCENARIO_KEY, FREE_CONVERSATION) } catch { /* not kept across a reload */ }
      setScenarioChoice(FREE_CONVERSATION)
    }
    if (isRecording) stopRecording()
    else startRecording()
  }

  function handleEndSession() {
    if (confirm(t.home.endSessionConfirm)) {
      endSession()
      // Deliberately ended, so the id must not be inherited by the next
      // conversation — that is the one case where starting over is the point.
      try {
        window.sessionStorage.removeItem(SESSION_ID_KEY)
        window.sessionStorage.removeItem(SCENARIO_KEY)
      } catch { /* nothing to clear */ }
      router.push('/dashboard')
    }
  }

  if (isLoading || !user) return null

  // Leaving a scene you only just entered (the assistant spoke, you did not)
  // costs nothing, so it asks nothing; once you have spoken, it confirms.
  const hasSpoken = transcripts.some(item => item.speaker === 'user')

  const scenarioCopy = !scenarioChoice || scenarioChoice === FREE_CONVERSATION
    ? null
    : (t.scenarios as Record<string, { title: string; goal: string } | string>)[scenarioChoice]

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

  // What the menu offers depends on where the conversation is.
  const isScene = !!scenarioCopy && typeof scenarioCopy !== 'string'
  const menuItems: { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }[] = []
  if (started) {
    menuItems.push({ label: t.home.endSession, onSelect: handleEndSession })
    menuItems.push({ label: t.home.restart, onSelect: () => discardConversation('restart'), disabled: isProcessing })
  }
  if (isScene) {
    menuItems.push({
      label: `← ${t.scenarios.backToScenarios}`,
      onSelect: () => discardConversation('cancel', hasSpoken),
      disabled: isProcessing,
    })
  }
  if (started) {
    menuItems.push({ label: t.home.cancel, onSelect: () => discardConversation('cancel'), danger: true, disabled: isProcessing })
  }

  const paywallCta = outOfQuota && (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="max-w-xs text-sm text-calm-muted">
        {t.quota.wallTitle}
        {quota && ` — ${t.quota.resets.replace('{time}', formatResetTime(quota.resets_at, language))}`}
      </p>
      <button onClick={() => setIsPaywallOpen(true)} className="btn btn-primary">
        {t.quota.cta}
      </button>
    </div>
  )

  return (
    <AppLayout immersive>
      {/* The whole screen belongs to the conversation: no header, no tab bar.
          What was around it is folded into one slim bar and a menu. */}
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pb-4 pt-3">
        <div className="relative mb-2 flex shrink-0 items-center gap-2">
          <Link
            href="/app"
            aria-label={t.mobile.back}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-calm-border bg-calm-surface text-calm-text no-underline"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-base font-semibold text-calm-text">
              {isScene ? scenarioCopy.title : t.mobile.freeConversation}
            </h1>
            {isScene && (
              <p className="truncate text-xs text-calm-muted">
                {t.scenarios.goalLabel} : {scenarioCopy.goal}
              </p>
            )}
          </div>
          <QuotaPill quota={quota} />
          {menuItems.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen(open => !open)}
                aria-label="Menu"
                aria-expanded={menuOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-calm-border bg-calm-surface text-calm-text"
              >
                ⋯
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <ul className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-calm-border bg-calm-surface py-1 shadow-lg">
                    {menuItems.map(item => (
                      <li key={item.label}>
                        <button
                          type="button"
                          disabled={item.disabled}
                          onClick={() => { setMenuOpen(false); item.onSelect() }}
                          className={clsx(
                            'w-full px-4 py-2.5 text-left text-sm hover:bg-calm-bg disabled:opacity-50',
                            item.danger ? 'text-red-600' : 'text-calm-text'
                          )}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        {/* Only worth a line when something is wrong: a working connection is the
            normal state and takes no room. */}
        {!isConnected && (
          <div className="mb-2 flex shrink-0 justify-center">
            <ConnectionStatus isConnected={isConnected} error={connectionError} />
          </div>
        )}

        {transcripts.length === 0 ? (
          /* Nothing said yet: the microphone is the page. */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto py-4">
            <p className="text-center text-sm text-calm-muted">{hint}</p>
            <div className="my-6">
              <RecordButton
                size="lg"
                isRecording={isRecording}
                onClick={handleRecordButtonClick}
                disabled={!isConnected || isProcessing || outOfQuota}
              />
            </div>
            {isRecording && (
              <div className="text-2xl font-mono font-bold text-red-500 tabular-nums">
                {formatRecordingTime(recordingTime)}
              </div>
            )}
            {paywallCta}
            {/* Offered only until the conversation begins; the ordinary chat is
                the microphone above. */}
            {!scenarioChoice && <ScenarioPicker onPick={handleScenarioPick} />}
          </div>
        ) : (
          <>
            {/* min-h-0 is what makes flex-1 + overflow actually scroll here: without
                it the list grows to fit the transcript and pushes the microphone off. */}
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin sm:card">
              <div className="space-y-2">
                {transcripts.map((transcript, index) => (
                  <TranscriptItem
                    key={index}
                    speaker={transcript.speaker}
                    text={transcript.text}
                    translation={transcript.translation}
                    timestamp={transcript.timestamp}
                    onReplay={transcript.audioUrls?.length ? () => replayAudio(transcript.audioUrls!) : undefined}
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
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2 pt-3">
              {outOfQuota ? (
                paywallCta
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Waves active={isRecording} />
                    <RecordButton
                      isRecording={isRecording}
                      onClick={handleRecordButtonClick}
                      disabled={!isConnected || isProcessing}
                    />
                    <Waves active={isRecording} />
                  </div>
                  {/* A count says something the button cannot; the hint says what
                      the next press will do. */}
                  <p className="h-5 text-xs text-calm-muted tabular-nums">
                    {isRecording ? formatRecordingTime(recordingTime) : hint}
                  </p>
                </>
              )}
            </div>
          </>
        )}

        {/* The next clip starts when the current one ends. Bound here and not in an
            effect: this page renders nothing until the session resolves, so an
            effect would run before the element exists and never attach. */}
        <audio ref={audioRef} className="hidden" onEnded={() => { void playNext() }} />

        <PaywallModal
          open={isPaywallOpen}
          quota={quota}
          onClose={() => setIsPaywallOpen(false)}
        />
      </div>
    </AppLayout>
  )
}

/** Five bars either side of the microphone, moving only while it listens. */
function Waves({ active }: { active: boolean }) {
  const heights = [10, 18, 26, 18, 10]
  return (
    <div className="flex h-8 w-12 items-center justify-center gap-1" aria-hidden="true">
      {heights.map((height, i) => (
        <span
          key={i}
          className={clsx('w-1 rounded-full bg-primary-400 transition-opacity', active ? 'animate-pulse opacity-90' : 'opacity-0')}
          style={{ height, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  )
}
