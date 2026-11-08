'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { Card } from '@/components/Card'

const INPUT =
  'w-full px-3 py-2 border border-calm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-calm-bg text-calm-text'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limited'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (response.status === 429) return setStatus('limited')
      setStatus(response.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <AuthShell subtitle="Mot de passe oublié">
      <Card>
        {status === 'sent' ? (
          <div className="text-center">
            <h2 className="mb-2 text-lg font-semibold text-calm-text">Vérifiez votre boîte mail</h2>
            <p className="mb-4 text-sm text-calm-muted">
              Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient de lui
              être envoyé. Il est valable 1 heure. Pensez à regarder dans vos courriers indésirables.
            </p>
            <Link href="/login" className="text-sm text-primary-600 hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-calm-muted">
              Indiquez l&apos;adresse email de votre compte : nous vous enverrons un lien pour choisir un nouveau
              mot de passe.
            </p>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-calm-text mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={INPUT}
                placeholder="vous@exemple.com"
              />
            </div>

            {status === 'error' && (
              <div role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                L&apos;envoi a échoué. Vérifiez l&apos;adresse et réessayez.
              </div>
            )}
            {status === 'limited' && (
              <div role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Trop de demandes pour le moment. Réessayez dans un moment.
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending' || !email}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <div className="text-center text-sm">
              <Link href="/login" className="text-primary-600 hover:underline">Retour à la connexion</Link>
            </div>
          </form>
        )}
      </Card>
    </AuthShell>
  )
}
