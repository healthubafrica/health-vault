'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { documents } from '@/lib/api'
import { useDocumentUpload } from '@/lib/hooks/useDocumentUpload'

/**
 * Lets a patient hand a provider a photo or document mid-call (a rash, an
 * old prescription, an insurance card) without leaving the call. Reuses the
 * existing Vault upload pipeline and the document visibility flag that
 * EditDocumentModal already exposes — no new sharing mechanism, no new
 * backend surface.
 */
export function InCallShareButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { start } = useDocumentUpload({
    onEntryDone: async (doc) => {
      try {
        await documents.update(doc.id, { providerVisibility: true })
        toast.success('Shared with your provider')
      } catch {
        toast.error('Uploaded, but could not mark it visible to your provider — check My Vault')
      } finally {
        setBusy(false)
      }
    },
  })

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    start([{ file, title: file.name, category: 'miscellaneous', tags: ['telecare'] }])
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors disabled:opacity-60"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
        Share a document
      </button>
    </>
  )
}
