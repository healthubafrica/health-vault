'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { CategorySelect } from './CategorySelect'
import type { DocumentCategory, DocumentListParams } from '@/lib/api'

const SORT_OPTIONS: Array<{ value: `${NonNullable<DocumentListParams['sort']>}:${NonNullable<DocumentListParams['order']>}`; label: string }> = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'title:asc', label: 'Title (A–Z)' },
  { value: 'title:desc', label: 'Title (Z–A)' },
  { value: 'fileSizeBytes:desc', label: 'Largest first' },
  { value: 'fileSizeBytes:asc', label: 'Smallest first' },
]

interface VaultToolbarProps {
  query: DocumentListParams
  onChange: (query: DocumentListParams) => void
}

const SEARCH_DEBOUNCE_MS = 350

export function VaultToolbar({ query, onChange }: VaultToolbarProps) {
  const [searchDraft, setSearchDraft] = useState(query.q ?? '')

  // Debounce search input so we don't refetch on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchDraft !== (query.q ?? '')) {
        onChange({ ...query, q: searchDraft || undefined, page: 1 })
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

  const sortValue = `${query.sort ?? 'createdAt'}:${query.order ?? 'desc'}`

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-faint)' }} />
        <FormInput
          placeholder="Search documents…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="w-full sm:w-48">
        <CategorySelect
          value={query.category ?? ''}
          allowEmpty
          emptyLabel="All categories"
          onChange={(category) => onChange({ ...query, category: category || undefined, page: 1 })}
        />
      </div>
      <div className="w-full sm:w-44">
        <FormSelect
          value={sortValue}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(':') as [
              NonNullable<DocumentListParams['sort']>,
              NonNullable<DocumentListParams['order']>,
            ]
            onChange({ ...query, sort, order, page: 1 })
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormSelect>
      </div>
    </div>
  )
}
