'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { VAULT_ACCEPT_ATTR } from '@/lib/vault'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export function UploadDropzone({ onFilesSelected, disabled }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFilesSelected(files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFilesSelected(files)
    e.target.value = ''
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
      style={{
        borderColor: isDragOver ? '#6DC43F' : 'var(--color-border)',
        background: isDragOver ? 'var(--color-success-bg)' : 'var(--color-surface)',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <UploadCloud className="w-8 h-8" style={{ color: isDragOver ? '#6DC43F' : 'var(--color-text-faint)' }} />
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        Drag and drop files here, or click to browse
      </p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        PDF, Word, images, text, CSV, XML, JSON
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={VAULT_ACCEPT_ATTR}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  )
}
