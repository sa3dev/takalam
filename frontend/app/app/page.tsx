'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket, TranscriptionMessage, AudioResponseMessage } from '@/hooks/useWebSocket'
import { useAudioRecorder, blobToBase64, formatRecordingTime } from '@/hooks/useAudioRecorder'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import { RecordButton } from '@/components/RecordButton'
import { TranscriptItem } from '@/components/TranscriptItem'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { Card } from '@/components/Card'

interface Transcript {
  speaker: 'user' | 'assistant'
  text: string
  timestamp: string
}

export default function ConversationPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, token, isLoading } = useAuth()
  const [sessionId] = useState(() => `session-${Date.now()}`)
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  const handleTranscription = useCallback((message: TranscriptionMessage) => {
    if (!message.is_final) return
    const timestamp = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    setTranscripts(prev => [...prev, { speaker: message.speaker, text: message.text, timestamp }])
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

  const { isConnected, connectionError, sendAudioChunk, startSession, endSession } = useWebSocket({
    sessionId,
    token,
    onTranscription: handleTranscription,
    onAudioResponse: handleAudioResponse,
  })

  const handleAudioRecorded = useCallback(async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)
      const base64Audio = await blobToBase64(audioBlob)
      sendAudioChunk(base64Audio)
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
      <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-200px)] flex flex-col">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-calm-text">{t.home.title}</h2>
            <ConnectionStatus isConnected={isConnected} error={connectionError} />
          </div>
          <p className="text-calm-muted text-center mb-4">{t.home.subtitle}</p>
        </div>

        <Card className="flex-1 overflow-y-auto scrollbar-thin mb-6">
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

        <div className="flex flex-col items-center gap-4">
          {isRecording && (
            <div className="text-2xl font-mono text-red-500 font-bold">
              {formatRecordingTime(recordingTime)}
            </div>
          )}
          <RecordButton
            isRecording={isRecording}
            onClick={handleRecordButtonClick}
            disabled={!isConnected || isProcessing}
          />
          <p className="text-sm text-calm-muted">
            {isRecording ? t.home.recording : isProcessing ? t.home.processing : t.home.clickToRecord}
          </p>
          {transcripts.length > 0 && (
            <button onClick={handleEndSession} className="btn btn-secondary mt-4">
              {t.home.endSession}
            </button>
          )}
        </div>

        <audio ref={audioRef} className="hidden" />
      </div>
    </AppLayout>
  )
}
