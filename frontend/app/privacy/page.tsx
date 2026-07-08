import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Takalam',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-16 px-4" style={{ background: 'var(--cream)', fontFamily: 'var(--sans)' }}>
      <div className="max-w-2xl mx-auto">

        <div className="mb-10">
          <Link href="/" className="text-sm no-underline" style={{ color: 'var(--terra)' }}>
            ← Takalam
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--disp)', color: 'var(--terra-deep)' }}>
          Politique de confidentialité
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>
          Dernière mise à jour : juillet 2026
        </p>

        <div className="space-y-8 text-base leading-relaxed" style={{ color: 'var(--text)' }}>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>1. Qui sommes-nous</h2>
            <p>
              Takalam est une application d'apprentissage de l'arabe par la conversation vocale.
              Cette politique explique quelles données sont collectées, pourquoi, et comment vous pouvez les supprimer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>2. Données collectées</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>Adresse email et nom d'utilisateur</strong> — à la création du compte.</li>
              <li><strong>Enregistrements audio</strong> — envoyés en temps réel pour la transcription. Ils ne sont pas stockés sur nos serveurs ; ils sont transmis à Groq (service tiers) pour transcription et supprimés immédiatement après.</li>
              <li><strong>Transcriptions de vos conversations</strong> — le texte de vos échanges avec l'assistant est conservé pour générer vos analyses de progression.</li>
              <li><strong>Métriques de progression</strong> — scores de fluidité, corrections grammaticales, vocabulaire appris.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>3. Pourquoi ces données</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Authentification et sécurité de votre compte.</li>
              <li>Fonctionnement de l'assistant vocal (transcription → réponse IA → synthèse vocale).</li>
              <li>Affichage de votre tableau de bord de progression.</li>
            </ul>
            <p className="mt-3">Aucune donnée n'est vendue à des tiers ni utilisée à des fins publicitaires.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>4. Services tiers</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>Groq</strong> — transcription audio (STT) et génération de réponses (LLM). Les données audio et textuelles transitent par leurs serveurs. Consultez la <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)' }}>politique de Groq</a>.</li>
              <li><strong>Microsoft Edge TTS</strong> — synthèse vocale. Le texte des réponses est envoyé à Microsoft pour génération audio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>5. Conservation des données</h2>
            <p>
              Vos transcriptions et métriques sont conservées tant que votre compte est actif.
              L'historique de conversation en temps réel est supprimé automatiquement après 1 heure d'inactivité.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>6. Vos droits (RGPD)</h2>
            <p className="mb-3">
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>Droit d'accès</strong> — vos données sont visibles dans votre tableau de bord.</li>
              <li><strong>Droit à l'effacement</strong> — vous pouvez supprimer votre compte et toutes vos données depuis les paramètres de votre compte. La suppression est immédiate et irréversible.</li>
              <li><strong>Droit à la portabilité</strong> — contactez-nous pour obtenir une copie de vos données.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>7. Cookies</h2>
            <p>
              Takalam utilise un seul cookie <code>takalam_token</code> — un cookie de session HttpOnly nécessaire à votre authentification.
              Il n'y a aucun cookie publicitaire ni cookie de tracking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>8. Contact</h2>
            <p>
              Pour toute question relative à vos données, contactez-nous à{' '}
              <a href="mailto:privacy@takalam.app" style={{ color: 'var(--terra)' }}>privacy@takalam.app</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
