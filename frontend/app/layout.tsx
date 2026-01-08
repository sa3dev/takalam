import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AppLayout } from '@/components/AppLayout'

export const metadata: Metadata = {
  title: 'Takalam - تكلم',
  description: 'Assistant vocal bienveillant pour l\'apprentissage de l\'arabe',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar">
      <body>
        <LanguageProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </LanguageProvider>
      </body>
    </html>
  )
}
