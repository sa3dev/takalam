'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'
import { track } from '@/lib/analytics'

type Rating = 'good' | 'ok' | 'bad'

const FACES: { rating: Rating; emoji: string }[] = [
  { rating: 'bad', emoji: '😕' },
  { rating: 'ok', emoji: '🙂' },
  { rating: 'good', emoji: '😄' },
]

interface FeedbackModalProps {
  /** Row id of the conversation that just ended. */
  sessionId: number
  /** Called once the learner is done or skips: the caller leaves the page. */
  onClose: () => void
}

async function sendFeedback(sessionId: number, rating: Rating, comment?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rating, comment: comment || null }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Asked once, as a conversation ends: one tap, then a few words if they want.
 *  The tap is saved at once, so stopping after it still leaves a signal; and
 *  nothing here can hold the learner back — skipping is always one click. */
export function FeedbackModal({ sessionId, onClose }: FeedbackModalProps) {
  const { t } = useLanguage()
  const [rating, setRating] = useState<Rating | null>(null)
  const [comment, setComment] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const closedRef = useRef(false)

  const close = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close])

  // A short thank-you, then on to the dashboard.
  useEffect(() => {
    if (!isDone) return
    const timer = setTimeout(close, 1100)
    return () => clearTimeout(timer)
  }, [isDone, close])

  const choose = (value: Rating) => {
    setRating(value)
    track('feedback-sent', { rating: value })
    // Fire and forget: a lost tap must never get in the learner's way.
    void sendFeedback(sessionId, value)
  }

  const submit = async () => {
    if (!rating) return
    const text = comment.trim()
    if (!text) {
      setIsDone(true)
      return
    }
    setIsSending(true)
    await sendFeedback(sessionId, rating, text)
    setIsSending(false)
    setIsDone(true)
  }

  const prompt = rating === 'good' ? t.feedback.promptGood : t.feedback.promptBad

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="card w-full max-w-md text-center"
      >
        {isDone ? (
          <p id="feedback-title" className="py-6 text-lg font-semibold text-calm-text">
            {t.feedback.thanks}
          </p>
        ) : (
          <>
            <h3 id="feedback-title" className="text-xl font-bold text-calm-text mb-5">
              {t.feedback.title}
            </h3>

            <div className="flex justify-center gap-4 mb-5" role="group" aria-label={t.feedback.title}>
              {FACES.map(({ rating: value, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(value)}
                  aria-label={t.feedback[value]}
                  aria-pressed={rating === value}
                  className={clsx(
                    'flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 text-4xl transition-all',
                    rating === value
                      ? 'border-terra-deep bg-terra-soft'
                      : 'border-calm-border bg-calm-surface hover:bg-cream-2',
                  )}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>

            {rating && (
              <div className="text-left mb-4">
                <label htmlFor="feedback-comment" className="block text-sm font-medium text-calm-text mb-2">
                  {prompt}
                </label>
                <textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder={t.feedback.placeholder}
                  autoFocus
                  className="w-full rounded-xl border border-calm-border bg-calm-surface p-3 text-calm-text"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {rating && (
                <button type="button" onClick={submit} disabled={isSending} className="btn btn-primary w-full">
                  {t.feedback.send}
                </button>
              )}
              <button type="button" onClick={close} className="btn btn-secondary w-full">
                {t.feedback.skip}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
