import Link from 'next/link'
import type { ReactNode } from 'react'

/** The frame shared by the sign-in screens: the way back, the wordmark, a line
 *  saying where you are. Same look as the login page. */
export function AuthShell({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm no-underline transition-colors"
            style={{ color: 'var(--muted)', fontFamily: 'var(--sans)' }}
          >
            <span>←</span>
            <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, color: 'var(--terra-deep)' }}>Takalam</span>
            <span style={{ fontFamily: '"Reem Kufi", serif', color: 'var(--terra)', fontSize: '12px' }}>تكلّم</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1
            className="mb-2"
            style={{ fontFamily: '"Reem Kufi", serif', fontSize: '48px', color: 'var(--terra-deep)', lineHeight: 1 }}
          >
            تكلم
          </h1>
          <p style={{ color: 'var(--muted)', fontFamily: 'var(--sans)', fontSize: '15px' }}>{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  )
}
