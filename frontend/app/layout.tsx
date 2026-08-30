import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'

// metadataBase is what turns the generated opengraph-image into the absolute URL
// every scraper demands; without it Next emits a relative path and the card
// arrives with no picture. It follows the deployed domain, so a preview
// deployment advertises itself rather than production.
const siteUrl = process.env.NEXT_PUBLIC_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
  : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Takalam - تكلم',
  description: "Assistant vocal bienveillant pour l'apprentissage de l'arabe",
  openGraph: {
    type: 'website',
    siteName: 'Takalam',
    locale: 'fr_FR',
    url: siteUrl,
    title: 'Takalam — osez parler arabe, vraiment',
    description:
      "Votre partenaire de conversation par IA vocale. Vous parlez, il répond, vous progressez — sans jugement, sans public.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Takalam — osez parler arabe, vraiment',
    description:
      "Votre partenaire de conversation par IA vocale. Vous parlez, il répond, vous progressez — sans jugement, sans public.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&family=Reem+Kufi:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
