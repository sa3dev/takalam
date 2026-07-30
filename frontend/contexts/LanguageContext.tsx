'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language, TranslationKeys } from '@/lib/i18n/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr')

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('takalam-language') as Language
    if (savedLang && translations[savedLang]) {
      setLanguageState(savedLang)
    }
  }, [])

  // Save language to localStorage when it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('takalam-language', lang)
  }

  const value: LanguageContextType = {
    language,
    setLanguage,
    // French is the reference locale (TranslationKeys is derived from it), so a
    // section not yet translated falls back to it instead of crashing on an
    // undefined group. Shipping a locale one section behind beats blocking it.
    t: { ...translations.fr, ...translations[language] }
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
