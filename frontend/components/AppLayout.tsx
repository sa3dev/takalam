'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { BottomNav } from './BottomNav'
import { ReactNode } from 'react'

const icon = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  situations: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  progress: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
}

/** `immersive` gives a phone's whole screen to the page: no header, no tab bar.
 *  From the md breakpoint up the sidebar is always there. */
export function AppLayout({ children, immersive = false }: { children: ReactNode; immersive?: boolean }) {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const navLinks = [
    { href: '/app', label: t.nav.home, icon: icon.home, match: ['/app'] },
    { href: '/situations', label: t.nav.situations, icon: icon.situations, match: ['/situations'] },
    { href: '/conversation?scenario=free', label: t.mobile.freeConversation, icon: icon.mic, match: ['/conversation'] },
    { href: '/dashboard', label: t.nav.progress, icon: icon.progress, match: ['/dashboard'] },
    { href: '/profile', label: t.nav.profile, icon: icon.profile, match: ['/profile'] },
  ]

  return (
    // Locked to the viewport (dvh, so mobile URL bars don't cut it off) with the
    // scrolling delegated to <main>: pages that want to fill the screen exactly,
    // like the conversation, can ask for h-full instead of guessing the chrome.
    <div className="h-[100dvh] flex overflow-hidden" style={{ background: 'var(--cream)' }}>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col"
        style={{ background: 'var(--cream-2)', borderRight: '1px solid var(--line)' }}
      >
        <Link href="/app" className="flex items-center gap-3 px-6 pb-6 pt-7 no-underline">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            {[6, 12, 18, 24, 30].map((x, i) => {
              const h = [10, 20, 28, 18, 8][i]
              return <rect key={x} x={x - 1.5} y={17 - h / 2} width="3" height={h} rx="1.5" fill="var(--terra)" />
            })}
          </svg>
          <div className="leading-none">
            <div style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontSize: '24px', color: 'var(--clay-d)', letterSpacing: '-0.02em' }}>
              Takalam
            </div>
            <div style={{ fontFamily: '"Reem Kufi", serif', fontSize: '15px', color: 'var(--terra)', marginTop: '4px' }}>
              تكلّم
            </div>
          </div>
        </Link>

        <nav className="flex flex-col gap-1 px-3">
          {navLinks.map(({ href, label, icon: path, match }) => {
            const active = match.includes(pathname)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium no-underline transition-colors"
                style={{
                  fontFamily: 'var(--sans)',
                  color: active ? 'var(--terra-deep)' : 'var(--muted)',
                  background: active ? 'var(--terra-soft)' : 'transparent',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {path}
                </svg>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* The skyline closes the sidebar; the legal links sit just above it. */}
        <div className="mt-auto">
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-6 pb-3 text-xs" style={{ color: 'var(--faint)' }}>
            <Link href="/privacy" className="no-underline hover:underline" style={{ color: 'inherit' }}>{t.mobile.privacy}</Link>
            <Link href="/terms" className="no-underline hover:underline" style={{ color: 'inherit' }}>{t.mobile.terms}</Link>
            <Link href="/contact" className="no-underline hover:underline" style={{ color: 'inherit' }}>{t.mobile.contact}</Link>
          </div>
          <div
            className="h-44"
            aria-hidden="true"
            style={{
              backgroundImage: 'url(/home/hero.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: '85% 100%',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 45%)',
              maskImage: 'linear-gradient(to bottom, transparent, black 45%)',
            }}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">

        {/* ── Phone header ── */}
        <header
          className={immersive ? 'hidden' : 'md:hidden'}
          style={{ background: 'var(--clay-d)', borderBottom: '1px solid var(--clay)' }}
        >
          <div className="mx-auto flex items-center gap-4 px-4 py-3">
            <Link href="/app" className="flex items-baseline gap-2 shrink-0 no-underline">
              <span style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontSize: '23px', color: 'var(--cream)', letterSpacing: '-0.02em' }}>
                Takalam
              </span>
              <span style={{ fontFamily: '"Reem Kufi", serif', fontSize: '19px', color: 'var(--terra-soft)' }}>
                تكلّم
              </span>
            </Link>
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* ── Desktop top bar: language and account, out of the way ── */}
        <div className="hidden md:flex items-center justify-end gap-3 px-8 py-4">
          <LanguageSwitcher tone="light" />
          {user && (
            <>
              <Link
                href="/profile"
                title={user.username}
                aria-label={t.nav.profile}
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold no-underline"
                style={{ background: 'var(--terra-soft)', color: 'var(--terra-deep)' }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={logout}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ fontFamily: 'var(--sans)', border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--card)' }}
              >
                {t.nav.logout}
              </button>
            </>
          )}
        </div>

        {/* min-h-0 lets this shrink below its content so the overflow lands here
            rather than on the page: one scrollbar, and the tab bar stays put. */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Phones: the four places of the app, under the thumb. */}
        {!immersive && <BottomNav />}
      </div>
    </div>
  )
}
