'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ReactNode } from 'react'

export function AppLayout({ children }: { children: ReactNode }) {
  const { t, language } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-calm-surface border-b border-calm-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-600">
              تكلم
            </h1>
            <div className="flex items-center gap-4">
              <nav className="flex gap-4">
                <a href="/app" className="text-calm-text hover:text-primary-600 transition-colors">
                  {t.nav.home}
                </a>
                <a href="/dashboard" className="text-calm-text hover:text-primary-600 transition-colors">
                  {t.nav.dashboard}
                </a>
              </nav>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-calm-surface border-t border-calm-border py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-calm-muted text-sm">
          <p>{t.footer.tagline}</p>
        </div>
      </footer>
    </div>
  )
}
