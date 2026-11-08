'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const TOPICS = [
  { value: 'question', label: 'Une question' },
  { value: 'bug', label: 'Un problème technique' },
  { value: 'data', label: 'Mes données personnelles' },
  { value: 'suggestion', label: 'Une suggestion' },
]

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'limited'

const fieldStyle = {
  background: 'var(--card)',
  border: '1.5px solid var(--line)',
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
} as const

/** The public contact form: no account needed, nothing to install. */
export function ContactForm() {
  const { user } = useAuth()
  const [topic, setTopic] = useState('question')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // the trap: left empty by every person
  const [status, setStatus] = useState<Status>('idle')

  // A signed-in learner should not have to type what we already know.
  useEffect(() => {
    if (user?.email) setEmail(current => current || user.email)
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, email, message, website }),
      })
      if (response.status === 429) return setStatus('limited')
      if (!response.ok) return setStatus('error')
      setStatus('sent')
      setMessage('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="card text-center">
        <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--terra-deep)' }}>
          Message envoyé
        </h2>
        <p style={{ color: 'var(--muted)' }}>
          Merci ! Nous vous répondrons à l&apos;adresse indiquée dès que possible.
        </p>
      </div>
    )
  }

  const tooShort = message.trim().length < 10

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="topic" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Votre message concerne
        </label>
        <select
          id="topic"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          className="w-full rounded-xl px-4 py-3"
          style={fieldStyle}
        >
          {TOPICS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Votre adresse email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          className="w-full rounded-xl px-4 py-3"
          style={fieldStyle}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--faint)' }}>
          Uniquement pour vous répondre.
        </p>
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Votre message
        </label>
        <textarea
          id="message"
          required
          rows={6}
          maxLength={4000}
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full rounded-xl px-4 py-3"
          style={fieldStyle}
        />
        {topic === 'data' && (
          <p className="mt-1 text-xs" style={{ color: 'var(--faint)' }}>
            Pour une demande d&apos;accès, de portabilité ou d&apos;effacement, indiquez l&apos;adresse email de votre compte.
          </p>
        )}
      </div>

      {/* Out of sight and out of the tab order: only a robot fills this in. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
        <label>
          Ne pas remplir
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={e => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm" style={{ color: 'var(--danger-deep)' }}>
          L&apos;envoi a échoué. Vérifiez votre adresse email et réessayez.
        </p>
      )}
      {status === 'limited' && (
        <p role="alert" className="text-sm" style={{ color: 'var(--danger-deep)' }}>
          Vous avez envoyé plusieurs messages récemment. Réessayez dans un moment.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending' || tooShort || !email}
        className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'sending' ? 'Envoi…' : 'Envoyer'}
      </button>
    </form>
  )
}
