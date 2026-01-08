'use client'

import { clsx } from 'clsx'

interface RecordButtonProps {
  isRecording: boolean
  onClick: () => void
  disabled?: boolean
}

export function RecordButton({ isRecording, onClick, disabled }: RecordButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative w-24 h-24 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2',
        isRecording
          ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 scale-110'
          : 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Outer pulse ring when recording */}
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-50" />
        </>
      )}

      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center h-full">
        {isRecording ? (
          <div className="w-6 h-6 bg-white rounded-sm" />
        ) : (
          <svg
            className="w-10 h-10 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </button>
  )
}
