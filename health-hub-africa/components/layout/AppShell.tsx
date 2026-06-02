'use client'

import { useAppStore } from '@/lib/store'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { RightPanel } from './RightPanel'
import { MobileBottomNav } from './MobileBottomNav'
import { MobilePanelSheet } from './MobilePanelSheet'
import { PageTransition } from './PageTransition'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden p-0 md:p-[16px_20px] gap-0 md:gap-3"
      style={{ background: 'var(--color-outer-bg)' }}
    >
      {/* Sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden md:rounded-[20px] bg-[var(--color-bg)]">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 md:p-5 focus:outline-none"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Right panel — hidden below lg */}
      <RightPanel />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Mobile panel sheet */}
      <MobilePanelSheet />
    </div>
  )
}
