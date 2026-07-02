'use client'

import { FormSelect } from '@/components/ui/FormInput'
import type { DocumentCategory } from '@/lib/api'
import { CATEGORY_LABELS, VAULT_CATEGORIES } from '@/lib/vault'

interface CategorySelectProps {
  value: DocumentCategory | ''
  onChange: (category: DocumentCategory) => void
  label?: string
  allowEmpty?: boolean
  emptyLabel?: string
}

export function CategorySelect({
  value,
  onChange,
  label,
  allowEmpty = false,
  emptyLabel = 'All categories',
}: CategorySelectProps) {
  return (
    <FormSelect
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as DocumentCategory)}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {VAULT_CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {CATEGORY_LABELS[cat]}
        </option>
      ))}
    </FormSelect>
  )
}
