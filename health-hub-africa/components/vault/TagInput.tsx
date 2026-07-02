'use client'

import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 30

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  label?: string
}

export function TagInput({ tags, onChange, label = 'Tags' }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const commitDraft = () => {
    const tag = draft.trim().slice(0, MAX_TAG_LENGTH)
    setDraft('')
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return
    onChange([...tags, tag])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-10 px-2.5 py-1.5 rounded-xl border transition-all duration-150 focus-within:border-[#6DC43F] focus-within:ring-2 focus-within:ring-[#6DC43F]/20"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            placeholder={tags.length === 0 ? 'Add tags (press Enter)' : ''}
            maxLength={MAX_TAG_LENGTH}
            className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
          />
        )}
      </div>
    </div>
  )
}
