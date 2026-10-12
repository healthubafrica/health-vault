'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/authStore'

interface Props {
  disabled?: boolean
  /** Called after the photo was removed server-side and the auth store updated. */
  onRemoved?: () => void
  className?: string
}

/** Confirms, calls DELETE /auth/me/profile-photo, then clears the store avatar (the stored file is kept). */
export function RemovePhotoButton({ disabled, onRemoved, className }: Props) {
  const [removing, setRemoving] = useState(false)

  const handleClick = async () => {
    if (!window.confirm('Your current picture will stop being used as your avatar. The file itself is kept, and you can upload a new picture any time. Continue?')) return
    setRemoving(true)
    try {
      await auth.removeProfilePhoto()
      useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, profilePhotoUrl: null } : s.user }))
      await useAuthStore.getState().fetchMe()
      onRemoved?.()
      toast.success('Profile photo removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove photo')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || removing}
      className={
        className ??
        'inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors hover:bg-[var(--color-bg)] disabled:opacity-50'
      }
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-emergency)' }}
    >
      {removing ? 'Removing…' : 'Remove photo'}
    </button>
  )
}
