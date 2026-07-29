'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Inbox,
  Loader2,
  AlertTriangle,
  WifiOff,
  SignalLow,
  SearchX,
  Lock,
  CheckSquare,
  ShieldAlert,
  CheckCircle2,
  Code,
  Sparkles,
  Layers,
} from 'lucide-react'
import {
  EmptyState,
  CardSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  DashboardSkeleton,
  ErrorState,
  NoInternetState,
  SlowNetworkState,
  NoSearchResultState,
  SessionExpiredState,
  FormValidationState,
  PermissionDeniedState,
  SuccessState,
} from '@/components/ui/states'

const UI_STATES = [
  { id: '1', title: '1. Empty State', icon: Inbox, key: 'empty' },
  { id: '2', title: '2. Loading - Skeleton', icon: Loader2, key: 'skeleton' },
  { id: '3', title: '3. Error State', icon: AlertTriangle, key: 'error' },
  { id: '4', title: '4. No Internet', icon: WifiOff, key: 'offline' },
  { id: '5', title: '5. Slow Network', icon: SignalLow, key: 'slow' },
  { id: '6', title: '6. No Search Result', icon: SearchX, key: 'search' },
  { id: '7', title: '7. Session Expired', icon: Lock, key: 'session' },
  { id: '8', title: '8. Form Validation', icon: CheckSquare, key: 'validation' },
  { id: '9', title: '9. Permission Denied', icon: ShieldAlert, key: 'permission' },
  { id: '10', title: '10. Success State', icon: CheckCircle2, key: 'success' },
]

export default function UIStatesPublicPage() {
  const [activeTab, setActiveTab] = useState('empty')
  const [skeletonVariant, setSkeletonVariant] = useState<'card' | 'table' | 'profile' | 'dashboard'>('card')
  const [emptyVariant, setEmptyVariant] = useState<'card' | 'inline' | 'full'>('card')
  const [errorVariant, setErrorVariant] = useState<'card' | 'inline' | 'full'>('card')
  const [slowVariant, setSlowVariant] = useState<'card' | 'banner'>('card')
  const [activeSearchTerm, setActiveSearchTerm] = useState('Cardiothoracic Surgery')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">UI States Design System</h1>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Comprehensive suite of 10 essential user interface feedback states built for Health Hub Africa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success)]/20 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            10/10 States Implemented
          </span>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Grid: Navigation & Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* State Selector Sidebar */}
        <div className="lg:col-span-4 p-4 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1 shadow-sm">
          <p className="text-[11px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider px-3 py-2">
            Select UI State:
          </p>
          {UI_STATES.map((state) => {
            const Icon = state.icon
            const isActive = activeTab === state.key
            return (
              <button
                key={state.key}
                onClick={() => setActiveTab(state.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[var(--color-primary)]'}`} />
                  <span>{state.title}</span>
                </div>
                {isActive && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
              </button>
            )
          })}
        </div>

        {/* Display Canvas */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-8 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-bg)]/40 min-h-[500px] flex items-center justify-center relative">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {/* 1. Empty State */}
              {activeTab === 'empty' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-2 pb-4 border-b border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)] font-semibold">Variant:</span>
                    {(['card', 'inline', 'full'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setEmptyVariant(v)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize ${
                          emptyVariant === v
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <EmptyState
                    variant={emptyVariant}
                    title="No Consultations Scheduled"
                    description="You currently have no pending telecare patient consultations for today."
                    badgeText="Clean State"
                    primaryActionLabel="Schedule Telecare"
                    onPrimaryAction={() => showToast('Action Triggered: Schedule Telecare')}
                    secondaryActionLabel="Refresh List"
                    onSecondaryAction={() => showToast('Action Triggered: Refresh List')}
                  />
                </div>
              )}

              {/* 2. Skeleton State */}
              {activeTab === 'skeleton' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-center gap-2 pb-4 border-b border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)] font-semibold">Skeleton Pattern:</span>
                    {(['card', 'table', 'profile', 'dashboard'] as const).map((pattern) => (
                      <button
                        key={pattern}
                        onClick={() => setSkeletonVariant(pattern)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize ${
                          skeletonVariant === pattern
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}
                      >
                        {pattern}
                      </button>
                    ))}
                  </div>

                  {skeletonVariant === 'card' && <CardSkeleton />}
                  {skeletonVariant === 'table' && <TableSkeleton rows={4} />}
                  {skeletonVariant === 'profile' && <ProfileSkeleton />}
                  {skeletonVariant === 'dashboard' && <DashboardSkeleton />}
                </div>
              )}

              {/* 3. Error State */}
              {activeTab === 'error' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-2 pb-4 border-b border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)] font-semibold">Display Mode:</span>
                    {(['card', 'inline', 'full'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setErrorVariant(v)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize ${
                          errorVariant === v
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <ErrorState
                    variant={errorVariant}
                    title="Failed to Load Clinical Vitals"
                    message="Unable to fetch telemetry from server instance 'hha-db-east-01'."
                    onRetry={() => showToast('Retrying database fetch...')}
                  />
                </div>
              )}

              {/* 4. No Internet */}
              {activeTab === 'offline' && (
                <NoInternetState
                  onCheckConnection={() => showToast('Ping connection test executed.')}
                />
              )}

              {/* 5. Slow Network */}
              {activeTab === 'slow' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-2 pb-4 border-b border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)] font-semibold">Style:</span>
                    {(['card', 'banner'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setSlowVariant(v)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize ${
                          slowVariant === v
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <SlowNetworkState
                    variant={slowVariant}
                    latencyMs={3420}
                    onEnableLiteMode={(enabled) => showToast(`Lite Mode: ${enabled ? 'ON' : 'OFF'}`)}
                    onRetry={() => showToast('Reloading throttled resources...')}
                  />
                </div>
              )}

              {/* 6. No Search Result */}
              {activeTab === 'search' && (
                <NoSearchResultState
                  searchTerm={activeSearchTerm}
                  onSelectSuggestion={(term) => {
                    setActiveSearchTerm(term)
                    showToast(`Search updated to: "${term}"`)
                  }}
                  onClearSearch={() => {
                    setActiveSearchTerm('')
                    showToast('Search query cleared')
                  }}
                  onResetFilters={() => showToast('All search filters reset')}
                />
              )}

              {/* 7. Session Expired */}
              {activeTab === 'session' && (
                <SessionExpiredState
                  userEmail="dr.obire@healthhub.africa"
                  timeoutSeconds={180}
                  onReauthenticate={async (passcode) => {
                    showToast('Authenticating passcode...')
                    return passcode.length >= 4
                  }}
                  onLogout={() => showToast('User logged out.')}
                />
              )}

              {/* 8. Form Validation */}
              {activeTab === 'validation' && <FormValidationState />}

              {/* 9. Permission Denied */}
              {activeTab === 'permission' && (
                <PermissionDeniedState
                  requiredRole="Chief Medical Officer"
                  currentRole="Practitioner (Read Only)"
                  onRequestAccess={(reason) => showToast(`Request submitted: "${reason}"`)}
                  onGoBack={() => showToast('Navigating back...')}
                />
              )}

              {/* 10. Success State */}
              {activeTab === 'success' && (
                <SuccessState
                  title="Medical Report Generated Successfully"
                  message="Patient clinical summary has been compiled and saved to MyVault Plus."
                  referenceId="VAL-2026-884-OCT"
                  onPrimaryAction={() => showToast('Opening medical report...')}
                  onSecondaryAction={() => showToast('Downloading PDF file...')}
                />
              )}
            </motion.div>
          </div>

          {/* Component Usage Code Snippet */}
          <div className="p-5 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text)]">
              <span className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-[var(--color-primary)]" />
                Component Usage Import
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-faint)]">
                @/components/ui/states
              </span>
            </div>
            <pre className="p-3 text-[11px] font-mono rounded-xl bg-black/90 text-green-400 overflow-x-auto border border-white/10">
              {`import { ${
                activeTab === 'empty'
                  ? 'EmptyState'
                  : activeTab === 'skeleton'
                  ? 'CardSkeleton, TableSkeleton'
                  : activeTab === 'error'
                  ? 'ErrorState'
                  : activeTab === 'offline'
                  ? 'NoInternetState'
                  : activeTab === 'slow'
                  ? 'SlowNetworkState'
                  : activeTab === 'search'
                  ? 'NoSearchResultState'
                  : activeTab === 'session'
                  ? 'SessionExpiredState'
                  : activeTab === 'validation'
                  ? 'FormValidationState'
                  : activeTab === 'permission'
                  ? 'PermissionDeniedState'
                  : 'SuccessState'
              } } from '@/components/ui/states'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
