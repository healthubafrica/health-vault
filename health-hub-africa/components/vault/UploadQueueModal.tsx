'use client'

import { useEffect, useState } from 'react'
import { X, FileText, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { CategorySelect } from './CategorySelect'
import { TagInput } from './TagInput'
import type { DocumentCategory } from '@/lib/api'
import type { UploadEntry, UploadEntryInput } from '@/lib/hooks/useDocumentUpload'
import { formatBytes } from '@/lib/utils'

interface UploadQueueModalProps {
  files: File[]
  entries: UploadEntry[]
  defaultCategory?: DocumentCategory
  onStartUpload: (inputs: UploadEntryInput[]) => void
  onRetry: (id: string) => void
  onClose: () => void
}

function stripExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

export function UploadQueueModal({
  files,
  entries,
  defaultCategory,
  onStartUpload,
  onRetry,
  onClose,
}: UploadQueueModalProps) {
  const [staged, setStaged] = useState<UploadEntryInput[]>([])
  const [phase, setPhase] = useState<'staging' | 'uploading'>('staging')

  // New files were dropped/selected — (re)build the staging list.
  useEffect(() => {
    if (files.length === 0) return
    setStaged(
      files.map((file) => ({
        file,
        title: stripExtension(file.name),
        category: defaultCategory ?? 'miscellaneous',
        tags: [],
        description: '',
      })),
    )
    setPhase('staging')
    // defaultCategory intentionally excluded — only re-stage when the file
    // selection itself changes, not when the toolbar's active filter does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const updateStaged = (index: number, changes: Partial<UploadEntryInput>) => {
    setStaged((prev) => prev.map((s, i) => (i === index ? { ...s, ...changes } : s)))
  }

  const removeStaged = (index: number) => {
    setStaged((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    if (staged.length === 0) return
    onStartUpload(staged)
    setPhase('uploading')
  }

  const allDone = entries.length > 0 && entries.every((e) => e.status === 'done' || e.status === 'error')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {phase === 'staging'
              ? `Upload ${staged.length} file${staged.length === 1 ? '' : 's'}`
              : 'Uploading'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {phase === 'staging'
            ? staged.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-3 space-y-2"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-faint)' }} />
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {entry.file.name} · {formatBytes(entry.file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeStaged(i)}
                      aria-label="Remove file"
                      style={{ color: 'var(--color-text-faint)' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <FormInput
                    label="Title"
                    value={entry.title}
                    onChange={(e) => updateStaged(i, { title: e.target.value })}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <CategorySelect
                      label="Category"
                      value={entry.category}
                      onChange={(category) => updateStaged(i, { category })}
                    />
                    <TagInput tags={entry.tags} onChange={(tags) => updateStaged(i, { tags })} />
                  </div>
                  <FormInput
                    label="Description (optional)"
                    value={entry.description ?? ''}
                    onChange={(e) => updateStaged(i, { description: e.target.value })}
                  />
                </div>
              ))
            : entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border p-3 space-y-2"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.status === 'done' && (
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#6DC43F' }} />
                      )}
                      {entry.status === 'error' && (
                        <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
                      )}
                      {(entry.status === 'pending' ||
                        entry.status === 'uploading' ||
                        entry.status === 'saving') && (
                        <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-faint)' }} />
                      )}
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {entry.title || entry.file.name}
                      </p>
                    </div>
                    {entry.status === 'error' && (
                      <button
                        onClick={() => onRetry(entry.id)}
                        className="flex items-center gap-1 text-xs font-semibold shrink-0"
                        style={{ color: '#6DC43F' }}
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                  {entry.status === 'uploading' && (
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--color-border)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${entry.progress}%`, background: '#6DC43F' }}
                      />
                    </div>
                  )}
                  {entry.status === 'saving' && (
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Saving…
                    </p>
                  )}
                  {entry.status === 'error' && (
                    <p className="text-[11px]" style={{ color: '#EF4444' }}>
                      {entry.error}
                    </p>
                  )}
                </div>
              ))}
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {phase === 'staging' ? (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={staged.length === 0}>
                Upload {staged.length} file{staged.length === 1 ? '' : 's'}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onClose} disabled={!allDone}>
              {allDone ? 'Done' : 'Uploading…'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
