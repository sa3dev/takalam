'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useDialog } from '@/contexts/DialogContext'
import { AppLayout } from '@/components/AppLayout'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { confirm, alert } = useDialog()
  const { user, isLoading, logout, deleteAccount } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading || !user) return null

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  async function handleDeleteAccount() {
    if (!(await confirm({ message: t.mobile.deleteConfirm, confirmLabel: t.dialog.delete, danger: true }))) return
    try {
      await deleteAccount()
      router.push('/')
    } catch {
      await alert(t.mobile.deleteError)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-5 pb-8">
        <div className="mb-6 flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ background: 'var(--terra)' }}
            aria-hidden="true"
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-calm-text">{user.username}</h1>
            <p className="truncate text-sm text-calm-muted">{user.email}</p>
          </div>
        </div>

        <div className="card mb-4 !p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-calm-text">{t.mobile.interfaceLanguage}</span>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="card mb-4 !p-2">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-calm-muted">
            {t.mobile.legal}
          </p>
          {[
            { href: '/privacy', label: t.mobile.privacy },
            { href: '/terms', label: t.mobile.terms },
            { href: '/contact', label: t.mobile.contact },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-sm text-calm-text no-underline hover:bg-calm-bg"
            >
              {label}
              <span className="text-calm-muted">›</span>
            </Link>
          ))}
        </div>

        <button onClick={handleLogout} className="btn btn-secondary mb-8 w-full">
          {t.nav.logout}
        </button>

        <div className="border-t border-calm-border pt-6">
          <h2 className="mb-1 text-base font-semibold text-calm-text">{t.mobile.dangerTitle}</h2>
          <p className="mb-3 text-sm text-calm-muted">{t.mobile.dangerBody}</p>
          <button
            onClick={handleDeleteAccount}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            {t.mobile.deleteAccount}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
