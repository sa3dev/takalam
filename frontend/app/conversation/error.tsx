'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[Takalam conversation error]', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: 'var(--cream)', fontFamily: 'var(--sans)' }}
    >
      <p style={{ fontFamily: '"Reem Kufi", serif', fontSize: '40px', color: 'var(--terra)', lineHeight: 1 }}>
        تكلم
      </p>

      <h1 className="mt-6 mb-2 text-xl font-bold" style={{ color: 'var(--terra-deep)', fontFamily: 'var(--disp)' }}>
        La conversation a rencontré un problème
      </h1>

      <p className="mb-2 max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
        Cela peut être dû à une coupure réseau ou à un problème audio.
        Votre progression a été sauvegardée.
      </p>

      <p className="mb-8 text-sm" style={{ color: 'var(--muted)' }}>
        Vous pouvez relancer la conversation ou consulter votre tableau de bord.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--terra)', color: 'var(--cream)', fontFamily: 'var(--sans)' }}
        >
          Relancer
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ border: '1.5px solid var(--line)', color: 'var(--terra-deep)', fontFamily: 'var(--sans)', background: 'transparent' }}
        >
          Tableau de bord
        </button>
      </div>
    </div>
  )
}
