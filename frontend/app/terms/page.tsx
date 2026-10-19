import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Takalam",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-4" style={{ background: 'var(--cream)', fontFamily: 'var(--sans)' }}>
      <div className="max-w-2xl mx-auto">

        <div className="mb-10">
          <Link href="/" className="text-sm no-underline" style={{ color: 'var(--terra)' }}>
            ← Takalam
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--disp)', color: 'var(--terra-deep)' }}>
          Conditions d&apos;utilisation
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>
          Dernière mise à jour : octobre 2026
        </p>

        <div className="space-y-8 text-base leading-relaxed" style={{ color: 'var(--text)' }}>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>1. Le service</h2>
            <p>
              Takalam est un partenaire de conversation par IA vocale pour s&apos;entraîner à parler arabe.
              En créant un compte, vous acceptez ces conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>2. Version bêta</h2>
            <p>
              Takalam est en bêta. Le service peut évoluer, être interrompu ou contenir des erreurs.
              Les tarifs affichés sont indicatifs : rien n&apos;est facturé pour l&apos;instant, et vous serez
              prévenu avant toute évolution payante.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>3. Votre compte</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Vous êtes responsable de la confidentialité de votre mot de passe.</li>
              <li>Vous pouvez supprimer votre compte et vos données à tout moment depuis votre espace.</li>
              <li>Un usage abusif du service (automatisation, contournement des limites) peut entraîner la suspension du compte.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>4. Offre gratuite</h2>
            <p>
              L&apos;offre gratuite inclut une durée de conversation quotidienne limitée. Cette durée peut être
              ajustée ; la limite en vigueur est toujours affichée dans l&apos;application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>5. Réponses de l&apos;IA</h2>
            <p>
              Les réponses sont générées par une intelligence artificielle et peuvent comporter des erreurs de
              langue ou de fond. Takalam est un outil d&apos;entraînement, pas une référence linguistique officielle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>6. Données personnelles</h2>
            <p>
              Le traitement de vos données est décrit dans notre{' '}
              <Link href="/privacy" style={{ color: 'var(--terra)' }}>politique de confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>7. Responsabilité</h2>
            <p>
              Le service est fourni « en l&apos;état », sans garantie de disponibilité continue. Notre responsabilité
              ne saurait être engagée pour les dommages indirects liés à son utilisation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>8. Contact</h2>
            <p>
              Une question sur ces conditions ? Écrivez-nous via la{' '}
              <Link href="/contact" style={{ color: 'var(--terra)' }}>page contact</Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
