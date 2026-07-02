'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FileText, FileImage, FileSpreadsheet, File as FileIcon,
  Download, Pencil, RefreshCw, Trash2, MoreVertical,
} from 'lucide-react'
import { Pill } from '@/components/ui/Pill'
import type { VaultDocument } from '@/lib/api'
import { CATEGORY_LABELS } from '@/lib/vault'
import { formatBytes, formatDate } from '@/lib/utils'

function iconForMime(mime?: string | null) {
  if (!mime) return FileIcon
  if (mime.startsWith('image/')) return FileImage
  if (mime === 'text/csv') return FileSpreadsheet
  return FileText
}

interface DocumentRowProps {
  doc: VaultDocument
  onDownload: (doc: VaultDocument) => void
  onEdit: (doc: VaultDocument) => void
  onReplace: (doc: VaultDocument) => void
  onDelete: (doc: VaultDocument) => void
}

export function DocumentRow({ doc, onDownload, onEdit, onReplace, onDelete }: DocumentRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const Icon = iconForMime(doc.fileMimeType)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const runAction = (fn: () => void) => {
    setMenuOpen(false)
    fn()
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-bg)' }}>
        <Icon size={15} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{doc.title}</p>
          {doc.category && <Pill variant="neutral">{CATEGORY_LABELS[doc.category]}</Pill>}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {formatDate(doc.recordedAt)}
          {doc.fileSizeBytes != null && <> · {formatBytes(doc.fileSizeBytes)}</>}
        </p>
        {doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {doc.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          aria-label="Document actions"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-[var(--color-bg)] transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-9 z-10 w-40 rounded-xl border shadow-lg py-1"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <MenuItem icon={Download} label="Download" onClick={() => runAction(() => onDownload(doc))} />
            <MenuItem icon={Pencil} label="Edit" onClick={() => runAction(() => onEdit(doc))} />
            <MenuItem icon={RefreshCw} label="Replace" onClick={() => runAction(() => onReplace(doc))} />
            <MenuItem icon={Trash2} label="Delete" danger onClick={() => runAction(() => onDelete(doc))} />
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-left hover:bg-[var(--color-bg)] transition-colors"
      style={{ color: danger ? 'var(--color-emergency)' : 'var(--color-text)' }}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
