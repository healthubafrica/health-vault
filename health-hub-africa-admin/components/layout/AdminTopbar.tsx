'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { Pill } from '@/components/ui/Pill'
import { LogOut, Bell } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  coordinator: 'Coordinator',
}

export function AdminTopbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-5 border-b flex-shrink-0"
      style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}
    >
      {/* Left: role tag */}
      <div className="flex items-center gap-2">
        <Pill variant="success">{ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? 'Staff'}</Pill>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-3">
        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--color-bg)]"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <Avatar name={user?.fullName ?? user?.email} src={user?.profilePhotoUrl ?? undefined} size="sm" />
          {user && (
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
                {user.fullName ?? user.email}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {user.email}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--color-error-bg)]"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
