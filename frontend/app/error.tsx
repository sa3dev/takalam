'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Takalam error]', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: 'var(--cream)', fontFamily: 'var(--sans)' }}
    >
      <p style={{ fontFamily: '"Reem Kufi", serif', fontSize: '48px', color: 'var(--terra)', lineHeight: 1 }}>
        تكلم
      </p>

      <h1
        className="mt-6 mb-2 text-2xl font-bold"
        style={{ fontFamily: 'var(--disp)', color: 'var(--terra-deep)' }}
      >
        Quelque chose s'est mal passé
      </h1>

      <p className="mb-8 max-w-sm" style={{ color: 'var(--muted)', fontSize: '15px' }}>
        Une erreur inattendue s'est produite. Vous pouvez réessayer ou revenir à l'accueil.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--terra)',
            color: 'var(--cream)',
            fontFamily: 'var(--sans)',
          }}
        >
          Réessayer
        </button>
        <Link
          href="/app"
          className="px-5 py-2 rounded-lg text-sm font-medium no-underline transition-colors"
          style={{
            border: '1.5px solid var(--line)',
            color: 'var(--terra-deep)',
            fontFamily: 'var(--sans)',
          }}
        >
          Retour à l'accueil
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs" style={{ color: 'var(--faint)' }}>
          Référence : {error.digest}
        </p>
      )}
    </div>
  )
}
