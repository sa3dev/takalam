'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

const icons = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  situations: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
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

/** The four places of the app, within thumb's reach. Phones only: from the md
 *  breakpoint the header carries the same links. */
export function BottomNav() {
  const { t } = useLanguage()
  const pathname = usePathname()

  const tabs = [
    { href: '/app', label: t.nav.home, icon: icons.home, match: ['/app', '/conversation'] },
    { href: '/situations', label: t.nav.situations, icon: icons.situations, match: ['/situations'] },
    { href: '/dashboard', label: t.nav.progress, icon: icons.progress, match: ['/dashboard'] },
    { href: '/profile', label: t.nav.profile, icon: icons.profile, match: ['/profile'] },
  ]

  return (
    <nav
      className="md:hidden shrink-0 border-t border-calm-border bg-calm-surface"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, icon, match }) => {
          const active = match.includes(pathname)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium no-underline"
                style={{ color: active ? 'var(--terra-deep)' : 'var(--muted)' }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {icon}
                </svg>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
