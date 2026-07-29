'use client'

import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'

interface TranscriptItemProps {
  speaker: 'user' | 'assistant'
  text: string
  translation?: string
  timestamp?: string
}

export function TranscriptItem({ speaker, text, translation, timestamp }: TranscriptItemProps) {
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
          'max-w-[70%] rounded-2xl px-4 py-3 shadow-sm',
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
        <p className="text-base leading-relaxed arabic">{text}</p>

        {/* Translation of the assistant's Arabic reply, in the user's UI language */}
        {translation && (
          <p className="text-sm opacity-70 mt-1.5 pt-1.5 border-t border-current/10 italic" dir="ltr">
            {translation}
          </p>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div className="text-xs opacity-60 mt-1 text-left">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  )
}
