import Link from 'next/link'
import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'

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
        <p className="text-base mb-8" style={{ color: 'var(--muted)' }}>
          Une question, une idée, un souci ? Takalam est en bêta : vos retours comptent vraiment.
          Nous répondons en général sous quelques jours.
        </p>

        <ContactForm />

        <p className="mt-8 text-sm" style={{ color: 'var(--muted)' }}>
          Les informations que vous saisissez ne servent qu&apos;à traiter votre demande. Plus de détails
          dans la <Link href="/privacy" style={{ color: 'var(--terra)' }}>politique de confidentialité</Link>.
        </p>
      </div>
    </div>
  )
}
