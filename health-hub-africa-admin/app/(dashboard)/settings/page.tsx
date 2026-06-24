'use client'

import { Suspense } from 'react'
import { SettingsTabs } from './SettingsTabs'

export default function SettingsPage() {
  return (
    <div className="max-w-[1200px]">
      <div className="mb-5">
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage your account, security, and platform preferences
        </p>
      </div>

      <Suspense fallback={null}>
        <SettingsTabs />
      </Suspense>
    </div>
  )
}
