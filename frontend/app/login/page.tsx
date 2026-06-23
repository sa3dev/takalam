'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/Card'

export default function LoginPage() {
  const router = useRouter()
  const { login, register, user, isLoading } = useAuth()
  const { t } = useLanguage()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/app')
    }
  }, [user, isLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, username, password)
      }
      router.push('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">تكلم</h1>
          <p className="text-calm-muted">
            {mode === 'login' ? 'Connexion à votre compte' : 'Créer un compte'}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-calm-text mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-calm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-calm-bg text-calm-text"
                placeholder="vous@exemple.com"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-calm-text mb-1">
                  Nom d&apos;utilisateur
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-calm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-calm-bg text-calm-text"
                  placeholder="votre_pseudo"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-calm-text mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-calm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-calm-bg text-calm-text"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Chargement...'
                : mode === 'login'
                ? 'Se connecter'
                : 'Créer le compte'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-calm-muted">
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <button
                  onClick={() => { setMode('register'); setError(null) }}
                  className="text-primary-600 hover:underline"
                >
                  S&apos;inscrire
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <button
                  onClick={() => { setMode('login'); setError(null) }}
                  className="text-primary-600 hover:underline"
                >
                  Se connecter
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
