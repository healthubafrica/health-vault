'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Calendar,
  FlaskConical,
  CreditCard,
  FileText,
  Video,
  AlertTriangle,
  Settings,
  CheckCheck,
  X,
  BellOff,
} from 'lucide-react'
import { notifications, type AppNotification, type NotificationCategory } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { formatRelativeTime } from '@/lib/utils'

// ── Category icon + colour mapping ────────────────────────────────────────────

const CATEGORY_META: Record<
  NotificationCategory,
  { icon: React.ElementType; color: string; bg: string }
> = {
  appointment: { icon: Calendar,     color: '#6DC43F', bg: 'rgba(109,196,63,0.12)' },
  lab:         { icon: FlaskConical, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  payment:     { icon: CreditCard,   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  record:      { icon: FileText,     color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)' },
  telecare:    { icon: Video,        color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
  alert:       { icon: AlertTriangle,color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  system:      { icon: Settings,     color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

// ── Fallback notifications shown when API hasn't returned data yet ─────────────
// (real data replaces these once the API call resolves)

const FALLBACK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'f1',
    category: 'appointment',
    title: 'Appointment Confirmed',
    body: 'Your appointment with Dr. Adeyemi on Thursday 31 July at 10:00 AM has been confirmed.',
    isRead: false,
    actionUrl: '/appointments',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'f2',
    category: 'lab',
    title: 'Lab Results Ready',
    body: 'Your Full Blood Count (FBC) results from CareTest™ are now available to view.',
    isRead: false,
    actionUrl: '/labs',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'f3',
    category: 'payment',
    title: 'Payment Successful',
    body: 'Your BasicCare subscription payment of ₦15,000 has been processed successfully.',
    isRead: true,
    actionUrl: '/payments',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'f4',
    category: 'alert',
    title: 'Health Alert',
    body: 'Your last recorded blood pressure (142/92 mmHg) is above the recommended range. Please consult your provider.',
    isRead: false,
    actionUrl: '/dashboard',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'f5',
    category: 'telecare',
    title: 'TeleCare™ Session Starting',
    body: 'Your virtual consultation with Dr. Nwosu begins in 15 minutes. Join from the TeleCare™ screen.',
    isRead: true,
    actionUrl: '/telecare',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({
  item,
  onRead,
}: {
  item: AppNotification
  onRead: (id: string) => void
}) {
  const router = useRouter()
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.system
  const Icon = meta.icon

  const handleClick = () => {
    if (!item.isRead) onRead(item.id)
    if (item.actionUrl) router.push(item.actionUrl)
  }

  return (
    <motion.button
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-bg)] border-b last:border-b-0 ${
        !item.isRead ? 'bg-[var(--color-bg)]/60' : ''
      }`}
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Category icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: meta.bg }}
      >
        <Icon size={15} style={{ color: meta.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-xs leading-snug line-clamp-1 ${
              !item.isRead ? 'font-bold' : 'font-semibold'
            }`}
            style={{ color: 'var(--color-text)' }}
          >
            {item.title}
          </p>
          {!item.isRead && (
            <span className="w-2 h-2 rounded-full bg-[#C0392B] shrink-0 mt-1" />
          )}
        </div>
        <p
          className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {item.body}
        </p>
        <p className="text-[10px] mt-1.5 font-medium" style={{ color: 'var(--color-text-faint, #9CA3AF)' }}>
          {formatRelativeTime(item.createdAt)}
        </p>
      </div>
    </motion.button>
  )
}

// ── NotificationsPanel ────────────────────────────────────────────────────────

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

export function NotificationsPanel({ isOpen, onClose, anchorRef }: NotificationsPanelProps) {
  const { data, refetch } = useApi(() => notifications.list({ limit: 20 }))
  const panelRef = useRef<HTMLDivElement>(null)

  // Use live data if available, otherwise show fallback notifications
  const rawItems = data?.data ?? FALLBACK_NOTIFICATIONS
  const [localItems, setLocalItems] = useState<AppNotification[]>(rawItems)

  // Sync state when API data resolves
  useEffect(() => {
    setLocalItems(data?.data ?? FALLBACK_NOTIFICATIONS)
  }, [data])

  const unreadCount = localItems.filter((n) => !n.isRead).length

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose, anchorRef])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleMarkRead = useCallback(async (id: string) => {
    setLocalItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    try { await notifications.markRead(id) } catch { /* optimistic — ignore error */ }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    setLocalItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await notifications.markAllRead()
      refetch()
    } catch { /* optimistic */ }
  }, [refetch])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute right-0 top-full mt-2 z-50 w-[360px] rounded-[20px] border shadow-2xl overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <Bell size={15} style={{ color: 'var(--color-text)' }} />
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#C0392B] text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                  style={{ color: '#6DC43F' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {localItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <BellOff size={28} style={{ color: 'var(--color-text-faint, #9CA3AF)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  You're all caught up!
                </p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-faint, #9CA3AF)' }}>
                  No new notifications
                </p>
              </div>
            ) : (
              localItems.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  onRead={handleMarkRead}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {localItems.length > 0 && (
            <div
              className="px-4 py-3 border-t text-center"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                onClick={onClose}
                className="text-[11px] font-semibold"
                style={{ color: '#6DC43F' }}
              >
                View all notifications →
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
