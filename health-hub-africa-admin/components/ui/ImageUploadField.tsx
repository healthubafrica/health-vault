'use client'

import { useState } from 'react'
import { uploadCmsImage, pickImageFile } from '@/lib/cms-upload'
import { Button } from './Button'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploadFieldProps {
  label: string
  value?: string | null
  onChange: (url: string) => void
}

export function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    const file = await pickImageFile()
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadCmsImage(file)
      onChange(url)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-xl border flex items-center justify-center flex-shrink-0"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
          >
            <Upload className="w-4 h-4" style={{ color: 'var(--color-text-faint)' }} />
          </div>
        )}
        <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={handleUpload}>
          {value ? 'Replace' : 'Upload'} image
        </Button>
      </div>
    </div>
  )
}
