'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  useWebSocket,
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

export default function ConversationPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { user, isLoading } = useAuth()
  const [sessionId] = useState(() => `session-${Date.now()}`)
  // Keep the current UI language in a ref so the recorder callback never sends a stale value
  const languageRef = useRef(language)
  useEffect(() => { languageRef.current = language }, [language])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

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
      router.push('/dashboard')
    }
  }

  if (isLoading || !user) return null

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 h-full flex flex-col">
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-calm-text">{t.home.title}</h2>
            <ConnectionStatus isConnected={isConnected} error={connectionError} />
          </div>
          {/* Onboarding line — retired once the conversation starts, where the
              transcript needs the room more than the instructions do. */}
          {transcripts.length === 0 && (
            <p className="text-calm-muted text-center">{t.home.subtitle}</p>
          )}
          <div className="max-w-sm mx-auto w-full">
            <QuotaGauge quota={quota} />
          </div>
        </div>

        {/* min-h-0 is what makes flex-1 + overflow actually scroll here: without
            it the card grows to fit the transcript and pushes the controls off. */}
        <Card className="flex-1 min-h-0 overflow-y-auto scrollbar-thin mb-4">
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
              {/* The wall is a dead end without this: the modal is only pushed
                  by the server when a turn is refused, and turns are now
                  blocked before they can be sent. */}
              <button onClick={() => setIsPaywallOpen(true)} className="btn btn-primary">
                {t.quota.cta}
              </button>
            </>
          ) : (
            <p className="text-sm text-calm-muted">
              {isRecording ? t.home.recording : isProcessing ? t.home.processing : t.home.clickToRecord}
            </p>
          )}
          {transcripts.length > 0 && (
            <button onClick={handleEndSession} className="btn btn-secondary mt-1">
              {t.home.endSession}
            </button>
          )}
        </div>

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
