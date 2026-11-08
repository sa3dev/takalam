'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { Card } from '@/components/Card'

const INPUT =
  'w-full px-3 py-2 border border-calm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-calm-bg text-calm-text'

function ResetForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmation) {
      setError('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      })
      if (response.status === 400) {
        setError('Ce lien est invalide ou a expiré. Demandez-en un nouveau.')
      } else if (!response.ok) {
        setError('La modification a échoué. Vérifiez que le mot de passe fait au moins 8 caractères.')
      } else {
        // The link signed the person in: a full load lets the app pick the session up.
        window.location.assign('/app')
        return
      }
    } catch {
      setError('La modification a échoué. Réessayez.')
    }
    setIsSubmitting(false)
  }

  if (!token) {
    return (
      <Card>
        <div className="text-center">
          <p className="mb-4 text-sm text-calm-muted">Ce lien n&apos;est pas valide.</p>
          <Link href="/forgot-password" className="text-sm text-primary-600 hover:underline">
            Demander un nouveau lien
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-calm-text mb-1">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={INPUT}
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-calm-muted">8 caractères au minimum.</p>
        </div>
        <div>
          <label htmlFor="confirmation" className="block text-sm font-medium text-calm-text mb-1">
            Confirmez le mot de passe
          </label>
          <input
            id="confirmation"
            type="password"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={INPUT}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}{' '}
            {error.startsWith('Ce lien') && (
              <Link href="/forgot-password" className="underline">Nouveau lien</Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enregistrement…' : 'Changer le mot de passe'}
        </button>
      </form>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthShell subtitle="Nouveau mot de passe">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  )
}
