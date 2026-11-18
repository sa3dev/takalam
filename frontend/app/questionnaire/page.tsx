'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import { track } from '@/lib/analytics'

// Written in French only: it is a short questionnaire for the people testing
// the product, not a feature of the app, so it is not run through the
// translations. Every question is optional; a half-filled form is kept.

type Answers = Record<string, string | number>

interface Choice { value: string; label: string }

const USAGE: Choice[] = [
  { value: '1', label: '1 fois' },
  { value: '2-3', label: '2 à 3 fois' },
  { value: '4+', label: '4 fois ou plus' },
]
const LEVEL: Choice[] = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'understand', label: 'Je comprends mais je parle peu' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]
const ARABIC: Choice[] = [
  { value: 'fusha', label: "L'arabe littéraire (livres, infos, Coran)" },
  { value: 'dialect', label: 'Un dialecte' },
  { value: 'both', label: 'Les deux' },
  { value: 'unsure', label: 'Je ne sais pas' },
]

export default function QuestionnairePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [answers, setAnswers] = useState<Answers>({})
  const [loaded, setLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login?next=/questionnaire')
  }, [user, isLoading, router])

  // Reopening the page shows what was already answered, so it can be completed.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/users/me/survey', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && data?.answers) setAnswers(data.answers) })
      .catch(() => { /* an empty form is a fine start */ })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [user])

  if (isLoading || !user || !loaded) return null

  const set = (key: string, value: string | number) => {
    setSaved(false)
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError(false)
    try {
      const res = await fetch('/api/users/me/survey', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // A deselected choice is an empty string: not an answer, so not sent.
        body: JSON.stringify(Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== ''))),
      })
      if (!res.ok) throw new Error('save failed')
      track('survey-sent')
      setSaved(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const text = (key: string) => String(answers[key] ?? '')

  return (
    <AppLayout>
      <form onSubmit={submit} className="max-w-xl mx-auto px-4 py-5 pb-10">
        <h1 className="text-2xl font-bold text-calm-text mb-2">Ton avis sur Takalam</h1>
        <p className="text-calm-muted mb-6">
          Je construis Takalam et j&apos;ai besoin de ton avis honnête, y compris le négatif. Rien de ce que tu écris
          ne me vexera. Ça prend environ 5 minutes, et tu peux sauter n&apos;importe quelle question.
        </p>

        {saved && (
          <div role="status" className="card mb-6 !p-4 border-terra">
            <p className="font-semibold text-calm-text">Merci, c&apos;est enregistré !</p>
            <p className="text-sm text-calm-muted">Tu peux revenir sur cette page pour modifier ou compléter tes réponses.</p>
          </div>
        )}

        <Section title="Ton usage">
          <Radio label="Combien de fois as-tu utilisé Takalam, à peu près ?" name="usage_count" choices={USAGE} value={text('usage_count')} onChange={set} />
          <Long label="Pourquoi voulais-tu apprendre à parler arabe ? Avec qui voudrais-tu le parler ?" name="goal" value={text('goal')} onChange={set} />
          <Radio label="Ton niveau avant de commencer" name="level" choices={LEVEL} value={text('level')} onChange={set} />
          <Radio label="Quel arabe voulais-tu parler ?" name="arabic_type" choices={ARABIC} value={text('arabic_type')} onChange={set} />
          {(text('arabic_type') === 'dialect' || text('arabic_type') === 'both') && (
            <Short label="Lequel ? (marocain, algérien, égyptien, levantin…)" name="arabic_type_detail" value={text('arabic_type_detail')} onChange={set} />
          )}
        </Section>

        <Section title="Ce qui a marché ou non">
          <Long label="Raconte ta dernière conversation en quelques phrases. Qu'est-ce qui s'est passé ?" name="last_conversation" value={text('last_conversation')} onChange={set} />
          <Long label="À quel moment t'es-tu senti à l'aise ? À quel moment mal à l'aise ou perdu ?" name="comfort" value={text('comfort')} onChange={set} />
          <Rating label="La voix de l'IA : compréhensible, naturelle, pas trop rapide ?" name="voice_rating" value={Number(answers.voice_rating) || 0} onChange={set} />
          <Long label="Un commentaire sur la voix ?" name="voice_comment" value={text('voice_comment')} onChange={set} />
          <Long label="T'est-il arrivé de ne pas être compris, ou de ne pas comprendre l'IA ? Qu'est-ce qui s'est passé ?" name="not_understood" value={text('not_understood')} onChange={set} />
          <Long label="As-tu rencontré un bug, un blocage, ou un moment où tu as voulu arrêter ?" name="bug" value={text('bug')} onChange={set} />
        </Section>

        <Section title="La valeur">
          <Long label="Si Takalam disparaissait demain, que ferais-tu à la place pour parler arabe ?" name="if_gone" value={text('if_gone')} onChange={set} />
          <Long label="Qu'est-ce qui te manque pour l'utiliser tous les jours ?" name="missing_daily" value={text('missing_daily')} onChange={set} />
          <Long label="Quelle situation voudrais-tu pouvoir travailler et qui n'existe pas ? (ex. : appeler un médecin, parler à un collègue)" name="missing_situation" value={text('missing_situation')} onChange={set} />
        </Section>

        <Section title="Pour finir">
          <Short label="En un mot, comment décrirais-tu Takalam à un ami ?" name="one_word" value={text('one_word')} onChange={set} />
          <Long label="Un dernier conseil, ou une chose que je n'ai pas demandée ?" name="advice" value={text('advice')} onChange={set} />
        </Section>

        {error && (
          <p role="alert" className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>
            L&apos;envoi a échoué. Réessaie dans un instant.
          </p>
        )}
        <button type="submit" disabled={isSaving} className="btn btn-primary w-full">
          {isSaving ? 'Envoi…' : saved ? 'Enregistrer les modifications' : 'Envoyer mes réponses'}
        </button>
      </form>
    </AppLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mb-5">
      <h2 className="text-lg font-bold text-calm-text mb-4">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

type OnChange = (key: string, value: string | number) => void

function Label({ id, children }: { id: string; children: React.ReactNode }) {
  return <label htmlFor={id} className="block text-sm font-medium text-calm-text mb-2">{children}</label>
}

function Radio({ label, name, choices, value, onChange }: { label: string; name: string; choices: Choice[]; value: string; onChange: OnChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-calm-text mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map(c => (
          <button
            key={c.value}
            type="button"
            aria-pressed={value === c.value}
            onClick={() => onChange(name, value === c.value ? '' : c.value)}
            className={clsx(
              'rounded-full border px-4 py-2 text-sm transition-colors',
              value === c.value ? 'border-terra-deep bg-terra-soft text-calm-text font-semibold' : 'border-calm-border bg-calm-surface text-calm-muted hover:bg-cream-2',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Rating({ label, name, value, onChange }: { label: string; name: string; value: number; onChange: OnChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-calm-text mb-2">{label}</legend>
      <div className="flex items-center gap-2">
        <span className="text-xs text-calm-muted">Pas bien</span>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${n} sur 5`}
            onClick={() => onChange(name, value === n ? '' : n)}
            className={clsx(
              'h-10 w-10 rounded-full border text-sm font-semibold transition-colors',
              value === n ? 'border-terra-deep bg-terra-deep text-white' : 'border-calm-border bg-calm-surface text-calm-muted hover:bg-cream-2',
            )}
          >
            {n}
          </button>
        ))}
        <span className="text-xs text-calm-muted">Très bien</span>
      </div>
    </fieldset>
  )
}

const fieldClass = 'w-full rounded-xl border border-calm-border bg-calm-surface p-3 text-calm-text'

function Long({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: OnChange }) {
  return (
    <div>
      <Label id={`q-${name}`}>{label}</Label>
      <textarea id={`q-${name}`} rows={3} maxLength={1500} value={value} onChange={e => onChange(name, e.target.value)} className={fieldClass} />
    </div>
  )
}

function Short({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: OnChange }) {
  return (
    <div>
      <Label id={`q-${name}`}>{label}</Label>
      <input id={`q-${name}`} type="text" maxLength={200} value={value} onChange={e => onChange(name, e.target.value)} className={fieldClass} />
    </div>
  )
}
