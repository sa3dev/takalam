'use client'

import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'

interface ConnectionStatusProps {
  isConnected: boolean
  error?: string | null
}

export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  const { t } = useLanguage()

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
        isConnected
          ? 'bg-green-50 text-green-700 border border-green-200'
          : error
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      )}
    >
      {/* Status indicator */}
      <div
        className={clsx(
          'w-2 h-2 rounded-full',
          isConnected
            ? 'bg-green-500 animate-pulse'
            : error
            ? 'bg-red-500'
            : 'bg-yellow-500 animate-pulse'
        )}
      />

      {/* Status text */}
      <span className="font-medium">
        {isConnected
          ? t.home.connected
          : error
          ? `${t.home.error}: ${error}`
          : t.home.connecting}
      </span>
    </div>
  )
}
