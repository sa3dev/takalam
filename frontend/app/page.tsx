'use client'

import { useState, useEffect, useRef } from 'react'
import { useWebSocket, TranscriptionMessage, AudioResponseMessage } from '@/hooks/useWebSocket'
import { useAudioRecorder, blobToBase64, formatRecordingTime } from '@/hooks/useAudioRecorder'
import { useLanguage } from '@/contexts/LanguageContext'
import { RecordButton } from '@/components/RecordButton'
import { TranscriptItem } from '@/components/TranscriptItem'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { Card } from '@/components/Card'

interface Transcript {
  speaker: 'user' | 'assistant'
  text: string
  timestamp: string
}

export default function HomePage() {
  const { t } = useLanguage()
  const [sessionId] = useState(() => `session-${Date.now()}`)
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // WebSocket connection
  const {
    isConnected,
    connectionError,
    sendAudioChunk,
    startSession,
    endSession
  } = useWebSocket({
    sessionId,
    onTranscription: handleTranscription,
    onAudioResponse: handleAudioResponse
  })

  // Audio recorder
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording
  } = useAudioRecorder({
    onAudioData: handleAudioRecorded
  })

  // Start session on connect
  useEffect(() => {
    if (isConnected) {
      startSession(1) // TODO: Use real user ID
    }
  }, [isConnected, startSession])

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  function handleTranscription(message: TranscriptionMessage) {
    if (message.is_final) {
      const timestamp = new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
      })

      setTranscripts(prev => [
        ...prev,
        {
          speaker: message.speaker,
          text: message.text,
          timestamp
        }
      ])

      if (message.speaker === 'user') {
        setIsProcessing(true)
      } else {
        setIsProcessing(false)
      }
    }
  }

  async function handleAudioResponse(message: AudioResponseMessage) {
    try {
      // Decode base64 audio
      const audioBlob = base64ToBlob(message.audio_data, 'audio/mp3')
      const audioUrl = URL.createObjectURL(audioBlob)

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  async function handleAudioRecorded(audioBlob: Blob) {
    try {
      setIsProcessing(true)

      // Convert to base64
      const base64Audio = await blobToBase64(audioBlob)

      // Send via WebSocket
      sendAudioChunk(base64Audio)
    } catch (error) {
      console.error('Error sending audio:', error)
      setIsProcessing(false)
    }
  }

  function handleRecordButtonClick() {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  function handleEndSession() {
    if (confirm(t.home.endSessionConfirm)) {
      endSession()
      // Redirect to dashboard
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-calm-text">
            {t.home.title}
          </h2>
          <ConnectionStatus isConnected={isConnected} error={connectionError} />
        </div>

        <p className="text-calm-muted text-center mb-4">
          {t.home.subtitle}
        </p>
      </div>

      {/* Transcript Area */}
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

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4">
        {/* Recording timer */}
        {isRecording && (
          <div className="text-2xl font-mono text-red-500 font-bold">
            {formatRecordingTime(recordingTime)}
          </div>
        )}

        {/* Record button */}
        <RecordButton
          isRecording={isRecording}
          onClick={handleRecordButtonClick}
          disabled={!isConnected || isProcessing}
        />

        {/* Status text */}
        <p className="text-sm text-calm-muted">
          {isRecording
            ? t.home.recording
            : isProcessing
            ? t.home.processing
            : t.home.clickToRecord}
        </p>

        {/* End session button */}
        {transcripts.length > 0 && (
          <button
            onClick={handleEndSession}
            className="btn btn-secondary mt-4"
          >
            {t.home.endSession}
          </button>
        )}
      </div>

      {/* Hidden audio player */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}

// Utility function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}
