'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CARD_GATEWAYS, DEFAULT_GATEWAY, type CardGateway } from '@/lib/payments/gateway'

interface GatewayPickerDialogProps {
  open: boolean
  /** What is being paid for, e.g. "SilverCare (monthly)". */
  summary: string
  /** True while the checkout is being created — locks the dialog. */
  busy?: boolean
  onClose: () => void
  onConfirm: (gateway: CardGateway) => void
}

/**
 * Asks the patient which card gateway to pay with. Paystack is preselected
 * each time it opens. Rendered in a portal so it sits above any transformed
 * or overflow-clipped ancestor (the onboarding card, for one).
 */
export function GatewayPickerDialog({ open, summary, busy = false, onClose, onConfirm }: GatewayPickerDialogProps) {
  const [selected, setSelected] = useState<CardGateway>(DEFAULT_GATEWAY)
  const defaultRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSelected(DEFAULT_GATEWAY)
    defaultRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gateway-picker-title"
        className="w-full max-w-sm rounded-2xl shadow-xl p-6 flex flex-col gap-4"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="gateway-picker-title"
              className="text-base font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
            >
              Choose how to pay
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1 disabled:opacity-40"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <fieldset className="flex flex-col gap-2" disabled={busy}>
          <legend className="sr-only">Payment method</legend>
          {CARD_GATEWAYS.map((g) => {
            const checked = selected === g
            return (
              <label
                key={g}
                className="flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[var(--color-primary)]"
                style={{
                  borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
                  background: checked ? 'var(--color-primary-light)' : 'var(--color-bg)',
                }}
              >
                <input
                  ref={g === DEFAULT_GATEWAY ? defaultRef : undefined}
                  type="radio"
                  name="gateway"
                  value={g}
                  checked={checked}
                  onChange={() => setSelected(g)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                  style={{ borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)' }}
                >
                  {checked && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{g}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pay securely with {g}</span>
                </span>
              </label>
            )
          })}
        </fieldset>

        <Button fullWidth disabled={busy} onClick={() => onConfirm(selected)}>
          {busy ? 'Redirecting…' : `Continue with ${selected}`}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
