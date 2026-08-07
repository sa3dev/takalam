import { useEffect, useRef, useState, useCallback } from 'react'

export interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

export interface TranscriptionMessage {
  type: 'transcription'
  speaker: 'user' | 'assistant'
  text: string
  translation?: string
  is_final: boolean
}

export interface AudioResponseMessage {
  type: 'audio_response'
  audio_data: string
  format: string
}

/** Running total of speech metered today, pushed after each completed turn so
 * the gauge moves without polling. Plan and limit come from the quota endpoint. */
export interface QuotaUpdateMessage {
  type: 'quota_update'
  spoken_seconds_used: number
}

/** The free plan's daily allowance is spent: the turn was refused before any
 * provider call. Not routed through onError — this is a product limit with its
 * own screen, not a failure. */
export interface QuotaExceededMessage {
  type: 'quota_exceeded'
  spoken_seconds_used: number
  spoken_seconds_limit: number
  resets_at: string
}

export interface UseWebSocketOptions {
  sessionId: string
  isAuthenticated: boolean
  onMessage?: (message: WebSocketMessage) => void
  onTranscription?: (message: TranscriptionMessage) => void
  onAudioResponse?: (message: AudioResponseMessage) => void
  onQuotaUpdate?: (message: QuotaUpdateMessage) => void
  onQuotaExceeded?: (message: QuotaExceededMessage) => void
  onError?: (error: Error) => void
}

const MAX_RECONNECT_DELAY_MS = 30_000

export function useWebSocket({
  sessionId,
  isAuthenticated,
  onMessage,
  onTranscription,
  onAudioResponse,
  onQuotaUpdate,
  onQuotaExceeded,
  onError,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Keep callbacks and auth state in refs so connect() doesn't need them as deps
  const onMessageRef = useRef(onMessage)
  const onTranscriptionRef = useRef(onTranscription)
  const onAudioResponseRef = useRef(onAudioResponse)
  const onQuotaUpdateRef = useRef(onQuotaUpdate)
  const onQuotaExceededRef = useRef(onQuotaExceeded)
  const onErrorRef = useRef(onError)
  const isAuthenticatedRef = useRef(isAuthenticated)
  useEffect(() => {
    onMessageRef.current = onMessage
    onTranscriptionRef.current = onTranscription
    onAudioResponseRef.current = onAudioResponse
    onQuotaUpdateRef.current = onQuotaUpdate
    onQuotaExceededRef.current = onQuotaExceeded
    onErrorRef.current = onError
    isAuthenticatedRef.current = isAuthenticated
  })

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

  const connect = useCallback(async () => {
    if (!isAuthenticatedRef.current) return

    try {
      // Exchange auth cookie for a short-lived one-time WS ticket
      const ticketRes = await fetch('/api/ws-ticket', {
        method: 'POST',
        credentials: 'include',
      })
      if (!ticketRes.ok) {
        setConnectionError('Authentication failed')
        return
      }
      const { ticket } = await ticketRes.json()

      const ws = new WebSocket(`${WS_URL}/ws/${sessionId}?ticket=${ticket}`)

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
            onTranscriptionRef.current?.(message as unknown as TranscriptionMessage)
          } else if (message.type === 'audio_response') {
            onAudioResponseRef.current?.(message as unknown as AudioResponseMessage)
          } else if (message.type === 'quota_update') {
            onQuotaUpdateRef.current?.(message as unknown as QuotaUpdateMessage)
          } else if (message.type === 'quota_exceeded') {
            onQuotaExceededRef.current?.(message as unknown as QuotaExceededMessage)
          } else if (message.type === 'error' || message.type === 'rate_limited') {
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
        if (!isAuthenticatedRef.current) return
        // Exponential backoff: 1s, 2s, 4s, … capped at 30s
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, MAX_RECONNECT_DELAY_MS)
        reconnectAttemptsRef.current++
        reconnectTimeoutRef.current = setTimeout(connect, delay)
      }

      wsRef.current = ws
    } catch {
      setConnectionError('Failed to create connection')
    }
  }, [sessionId, WS_URL])

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

  const sendAudioChunk = useCallback((audioData: string, mimeType: string, targetLang?: string) => {
    sendMessage({ type: 'audio_chunk', audio_data: audioData, mime_type: mimeType, target_lang: targetLang })
  }, [sendMessage])

  const startSession = useCallback(() => {
    sendMessage({ type: 'start_session' })
  }, [sendMessage])

  const endSession = useCallback(() => {
    sendMessage({ type: 'end_session' })
  }, [sendMessage])

  // isAuthenticated has to be a dependency, not just a ref read inside connect():
  // the auth cookie is verified asynchronously, so on a page load this hook mounts
  // while the user is still null. Without a re-run when auth resolves, the single
  // connect() call bails out early and nothing ever retries — no socket, no
  // onclose, no backoff — leaving the UI on "connecting" forever. It only appeared
  // to work when arriving from the login form, which sets the user before /app
  // mounts. It also closes the socket on logout, which is the behaviour we want.
  useEffect(() => {
    if (!isAuthenticated) return
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect, isAuthenticated])

  return { isConnected, connectionError, sendMessage, sendAudioChunk, startSession, endSession, disconnect }
}
