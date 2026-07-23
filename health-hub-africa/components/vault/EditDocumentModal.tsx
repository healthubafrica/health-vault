'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { CategorySelect } from './CategorySelect'
import { TagInput } from './TagInput'
import { documents, type VaultDocument, type DocumentCategory } from '@/lib/api'

interface EditDocumentModalProps {
  document: VaultDocument | null
  onClose: () => void
  onSaved: (doc: VaultDocument) => void
}

export function EditDocumentModal({ document, onClose, onSaved }: EditDocumentModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('miscellaneous')
  const [tags, setTags] = useState<string[]>([])
  const [providerVisibility, setProviderVisibility] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!document) return
    setTitle(document.title)
    setDescription(document.description ?? '')
    setCategory(document.category ?? 'miscellaneous')
    setTags(document.tags)
    setProviderVisibility(document.providerVisibility)
  }, [document])

  if (!document) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await documents.update(document.id, {
        title: title.trim() || document.title,
        description: description.trim() || undefined,
        category,
        tags,
        providerVisibility,
      })
      toast.success('Document updated')
      onSaved(res.data)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Edit document
          </h2>
          <button onClick={onClose} className="p-2 -m-2" style={{ color: 'var(--color-text-muted)' }} aria-label="Close" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <FormInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <CategorySelect label="Category" value={category} onChange={setCategory} />
          <TagInput tags={tags} onChange={setTags} />
          <FormInput
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label
            className="flex items-center gap-2 text-sm pt-1"
            title="When on, any care provider assigned to you can view this document."
            style={{ color: 'var(--color-text)' }}
          >
            <input
              type="checkbox"
              checked={providerVisibility}
              onChange={(e) => setProviderVisibility(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Visible to my care providers
          </label>
        </div>
        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
