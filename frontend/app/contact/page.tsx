import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — Takalam',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen py-16 px-4" style={{ background: 'var(--cream)', fontFamily: 'var(--sans)' }}>
      <div className="max-w-2xl mx-auto">

        <div className="mb-10">
          <Link href="/" className="text-sm no-underline" style={{ color: 'var(--terra)' }}>
            ← Takalam
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--disp)', color: 'var(--terra-deep)' }}>
          Contact
        </h1>
        <p className="text-base mb-10" style={{ color: 'var(--muted)' }}>
          Une question, une idée, un souci ? Takalam est en bêta : vos retours comptent vraiment.
        </p>

        <div className="space-y-8 text-base leading-relaxed" style={{ color: 'var(--text)' }}>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>Nous écrire</h2>
            <p>
              <a href="mailto:contact@takalamapp.com" style={{ color: 'var(--terra)' }}>contact@takalamapp.com</a>
            </p>
            <p className="mt-2" style={{ color: 'var(--muted)' }}>
              Nous répondons en général sous quelques jours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--terra-deep)' }}>Vos données</h2>
            <p>
              Pour exercer vos droits (accès, portabilité, effacement), écrivez à{' '}
              <a href="mailto:privacy@takalamapp.com" style={{ color: 'var(--terra)' }}>privacy@takalamapp.com</a>.
              Plus de détails dans la{' '}
              <Link href="/privacy" style={{ color: 'var(--terra)' }}>politique de confidentialité</Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
