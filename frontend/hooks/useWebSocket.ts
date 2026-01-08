import { useEffect, useRef, useState, useCallback } from 'react'

export interface WebSocketMessage {
  type: string
  [key: string]: any
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
  onMessage?: (message: WebSocketMessage) => void
  onTranscription?: (message: TranscriptionMessage) => void
  onAudioResponse?: (message: AudioResponseMessage) => void
  onError?: (error: Error) => void
}

export function useWebSocket({
  sessionId,
  onMessage,
  onTranscription,
  onAudioResponse,
  onError
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws/${sessionId}`)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)

          // Call generic message handler
          onMessage?.(message)

          // Call specific handlers
          if (message.type === 'transcription') {
            onTranscription?.(message as TranscriptionMessage)
          } else if (message.type === 'audio_response') {
            onAudioResponse?.(message as AudioResponseMessage)
          } else if (message.type === 'error') {
            setConnectionError(message.message)
            onError?.(new Error(message.message))
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('Connection error')
        onError?.(new Error('WebSocket connection error'))
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)

        // Attempt reconnection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, 3000)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setConnectionError('Failed to create connection')
    }
  }, [sessionId, WS_URL, onMessage, onTranscription, onAudioResponse, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [isConnected])

  const sendAudioChunk = useCallback((audioData: string) => {
    sendMessage({
      type: 'audio_chunk',
      audio_data: audioData
    })
  }, [sendMessage])

  const startSession = useCallback((userId: number = 1) => {
    sendMessage({
      type: 'start_session',
      user_id: userId
    })
  }, [sendMessage])

  const endSession = useCallback(() => {
    sendMessage({
      type: 'end_session'
    })
  }, [sendMessage])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionError,
    sendMessage,
    sendAudioChunk,
    startSession,
    endSession,
    disconnect
  }
}
