'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { languages } from '@/lib/i18n/translations'
import { clsx } from 'clsx'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = languages.find(l => l.code === language) || languages[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button — styled for dark header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
        style={{ color: 'var(--cream)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm font-medium hidden sm:block">{currentLang.code.toUpperCase()}</span>
        <svg
          className={clsx('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown — always on light card background */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-xl shadow-xl py-1 z-50"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        >
          {languages.map((lang) => {
            const active = lang.code === language
            return (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setIsOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors text-sm font-medium"
                style={{
                  color: active ? 'var(--terra-deep)' : 'var(--ink)',
                  background: active ? 'var(--terra-soft)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cream)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
                {active && (
                  <svg className="w-4 h-4 ml-auto" style={{ color: 'var(--terra)' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
