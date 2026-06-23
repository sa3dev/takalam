'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ReactNode } from 'react'

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const navLinks = [
    { href: '/app', label: t.nav.home },
    { href: '/dashboard', label: t.nav.dashboard },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>

      {/* ── Header ── */}
      <header style={{ background: 'var(--clay-d)', borderBottom: '1px solid var(--clay)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center gap-4">

          {/* Brand — same style as landing page nav */}
          <Link href="/app" className="flex items-baseline gap-2 shrink-0 no-underline mr-4">
            <span style={{
              fontFamily: 'var(--disp)',
              fontWeight: 700,
              fontSize: '23px',
              color: 'var(--cream)',
              letterSpacing: '-0.02em',
            }}>
              Takalam
            </span>
            <span style={{
              fontFamily: '"Reem Kufi", serif',
              fontSize: '19px',
              color: 'var(--terra-soft)',
            }}>
              تكلّم
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex gap-1 flex-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all no-underline"
                  style={{
                    fontFamily: 'var(--sans)',
                    color: active ? 'var(--cream)' : 'var(--terra-soft)',
                    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            <LanguageSwitcher />
            {user && (
              <>
                <span
                  className="text-sm hidden sm:block"
                  style={{ color: 'var(--terra-soft)', fontFamily: 'var(--sans)' }}
                >
                  {user.username}
                </span>
                <LogoutButton onClick={logout} label={t.nav.logout} />
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        background: 'var(--cream-2)',
        borderTop: '1px solid var(--line)',
        padding: '20px 40px',
      }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <span style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontSize: '15px', color: 'var(--terra-deep)' }}>
            Takalam{' '}
            <span style={{ fontFamily: '"Reem Kufi", serif', color: 'var(--terra)', fontWeight: 500, fontSize: '13px' }}>
              تكلّم
            </span>
          </span>
          <p style={{ fontSize: '13px', color: 'var(--faint)', fontFamily: 'var(--sans)' }}>
            {t.footer.tagline}
          </p>
        </div>
      </footer>
    </div>
  )
}

function LogoutButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="text-sm px-3 py-1.5 rounded-full font-medium transition-all"
      style={{
        fontFamily: 'var(--sans)',
        border: '1.5px solid rgba(255,255,255,0.25)',
        color: 'var(--cream)',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
      }}
    >
      {label}
    </button>
  )
}
