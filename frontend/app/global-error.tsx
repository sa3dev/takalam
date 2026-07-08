'use client'

import { useEffect } from 'react'

// Catches errors in the root layout itself (AuthProvider, LanguageProvider, etc.)
// Must include <html> and <body> since it replaces the root layout entirely
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Takalam global error]', error)
  }, [error])

  return (
    <html lang="fr">
      <body style={{ margin: 0, background: '#faf7f2', fontFamily: 'sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 16px',
        }}>
          <p style={{ fontSize: '48px', color: '#b5541a', lineHeight: 1, marginBottom: '16px' }}>
            تكلم
          </p>
          <h1 style={{ fontSize: '22px', color: '#3d1a00', marginBottom: '8px' }}>
            Erreur critique
          </h1>
          <p style={{ color: '#888', fontSize: '15px', marginBottom: '32px', maxWidth: '360px' }}>
            L'application n'a pas pu démarrer. Rechargez la page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: '#b5541a',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  )
}
