'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ConfirmOptions {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Paints the confirming button in the warm red: for what cannot be undone. */
  danger?: boolean
}

interface DialogContextType {
  /** Resolves true when the learner confirms, false when they back out. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** A message with a single button. */
  alert: (message: string, title?: string) => Promise<void>
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

interface OpenDialog extends ConfirmOptions {
  hideCancel?: boolean
  resolve: (value: boolean) => void
}

/** The app's own confirmation and notice boxes, in place of the browser's
 *  confirm() and alert(), which look like nothing else on the screen. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const [dialog, setDialog] = useState<OpenDialog | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>(resolve => setDialog({ ...options, resolve })),
    []
  )

  const alert = useCallback(
    (message: string, title?: string) =>
      new Promise<void>(resolve =>
        setDialog({ message, title, hideCancel: true, resolve: () => resolve() })
      ),
    []
  )

  function close(result: boolean) {
    dialog?.resolve(result)
    setDialog(null)
  }

  useEffect(() => {
    if (!dialog) return
    confirmRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dialog.resolve(false)
        setDialog(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dialog])

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={dialog.title ? 'dialog-title' : undefined}
            aria-describedby="dialog-message"
            className="card w-fit max-w-[min(22rem,calc(100vw-2rem))] !p-5"
            style={{ minWidth: 'min(16rem, calc(100vw - 2rem))' }}
            onClick={e => e.stopPropagation()}
          >
            {dialog.title && (
              <h3 id="dialog-title" className="mb-2 text-lg font-bold text-calm-text">
                {dialog.title}
              </h3>
            )}
            <p id="dialog-message" className="mb-5 text-calm-muted">
              {dialog.message}
            </p>
            <div className="flex justify-end gap-2">
              {!dialog.hideCancel && (
                <button type="button" onClick={() => close(false)} className="btn btn-secondary !px-4 !py-2 text-sm">
                  {dialog.cancelLabel ?? t.dialog.cancel}
                </button>
              )}
              <button
                ref={confirmRef}
                type="button"
                onClick={() => close(true)}
                className={dialog.danger ? 'btn text-white !px-4 !py-2 text-sm' : 'btn btn-primary !px-4 !py-2 text-sm'}
                style={dialog.danger ? { background: 'var(--danger)' } : undefined}
              >
                {dialog.confirmLabel ?? (dialog.hideCancel ? t.dialog.ok : t.dialog.confirm)}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialog must be used within DialogProvider')
  return context
}
