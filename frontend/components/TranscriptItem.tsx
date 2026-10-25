'use client'

import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'

interface TranscriptItemProps {
  speaker: 'user' | 'assistant'
  text: string
  translation?: string
  timestamp?: string
  /** Present once the spoken version of this reply has arrived. */
  onReplay?: () => void
}

/** The model sometimes marks words with **stars**. Show them as emphasis rather
 *  than as punctuation, and drop any stray mark left over. */
function renderEmphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part.replace(/[*_`#]+/g, '')
  )
}

export function TranscriptItem({ speaker, text, translation, timestamp, onReplay }: TranscriptItemProps) {
  const { t } = useLanguage()
  const isUser = speaker === 'user'

  return (
    <div
      className={clsx(
        'flex mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-calm-surface text-calm-text border border-calm-border rounded-bl-sm'
        )}
      >
        {/* Speaker label */}
        <div className="text-xs opacity-70 mb-1 font-medium">
          {isUser ? t.home.you : t.home.assistant}
        </div>

        {/* Message text */}
        <p className="text-lg arabic">{renderEmphasis(text)}</p>

        {/* Translation of the assistant's Arabic reply, in the user's UI language */}
        {translation && (
          <p className="text-sm opacity-70 mt-1.5 pt-1.5 border-t border-current/10 italic" dir="ltr">
            {translation}
          </p>
        )}

        {(timestamp || onReplay) && (
          <div className="flex items-center justify-between gap-3 mt-1">
            {/* A click is a user gesture, so this also plays what the browser
                refused to start on its own. */}
            {onReplay ? (
              <button
                type="button"
                onClick={onReplay}
                aria-label={t.home.replay}
                title={t.home.replay}
                className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                {t.home.replay}
              </button>
            ) : <span />}
            {timestamp && <span className="text-xs opacity-60">{timestamp}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
