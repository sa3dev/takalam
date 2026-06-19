import { useEffect, useRef, useState, useCallback } from 'react'

export interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

export interface TranscriptionMessage {
  type: 'transcription'
  speaker: 'user' | 'assistant'
  text: string
  is_final: boolean
}

export interface AudioResponseMessage {
  type: 'audio_response'
  audio_data: string
  format: string
}

export interface UseWebSocketOptions {
  sessionId: string
  token: string | null
  onMessage?: (message: WebSocketMessage) => void
  onTranscription?: (message: TranscriptionMessage) => void
  onAudioResponse?: (message: AudioResponseMessage) => void
  onError?: (error: Error) => void
}

const MAX_RECONNECT_DELAY_MS = 30_000

export function useWebSocket({
  sessionId,
  token,
  onMessage,
  onTranscription,
  onAudioResponse,
  onError,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Keep callbacks in refs so connect() doesn't need them as deps — prevents infinite reconnect loop
  const onMessageRef = useRef(onMessage)
  const onTranscriptionRef = useRef(onTranscription)
  const onAudioResponseRef = useRef(onAudioResponse)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onMessageRef.current = onMessage
    onTranscriptionRef.current = onTranscription
    onAudioResponseRef.current = onAudioResponse
    onErrorRef.current = onError
  })

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

  const connect = useCallback(() => {
    if (!token) return

    try {
      const ws = new WebSocket(`${WS_URL}/ws/${sessionId}?token=${token}`)

      ws.onopen = () => {
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data as string)
          onMessageRef.current?.(message)
          if (message.type === 'transcription') {
            onTranscriptionRef.current?.(message as TranscriptionMessage)
          } else if (message.type === 'audio_response') {
            onAudioResponseRef.current?.(message as AudioResponseMessage)
          } else if (message.type === 'error') {
            setConnectionError(message.message as string)
            onErrorRef.current?.(new Error(message.message as string))
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onerror = () => {
        setConnectionError('Connection error')
        onErrorRef.current?.(new Error('WebSocket connection error'))
      }

      ws.onclose = () => {
        setIsConnected(false)
        // Exponential backoff: 1s, 2s, 4s, … capped at 30s
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, MAX_RECONNECT_DELAY_MS)
        reconnectAttemptsRef.current++
        reconnectTimeoutRef.current = setTimeout(connect, delay)
      }

      wsRef.current = ws
    } catch {
      setConnectionError('Failed to create connection')
    }
  }, [sessionId, token, WS_URL])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendAudioChunk = useCallback((audioData: string) => {
    sendMessage({ type: 'audio_chunk', audio_data: audioData })
  }, [sendMessage])

  const startSession = useCallback(() => {
    sendMessage({ type: 'start_session' })
  }, [sendMessage])

  const endSession = useCallback(() => {
    sendMessage({ type: 'end_session' })
  }, [sendMessage])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { isConnected, connectionError, sendMessage, sendAudioChunk, startSession, endSession, disconnect }
}
