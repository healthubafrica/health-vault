'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import { FormSelect } from '@/components/ui/FormInput'
import { useAdminPrefsStore } from '@/lib/stores/adminPrefsStore'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'yo', label: 'Yorùbá' },
  { value: 'ha', label: 'Hausa' },
  { value: 'ig', label: 'Igbo' },
  { value: 'sw', label: 'Kiswahili' },
  { value: 'tw', label: 'Twi' },
]

const DATE_FORMATS = [
  { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY (31/12/2026)' },
  { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY (12/31/2026)' },
  { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD (2026-12-31)' },
]

export function AppearanceTab() {
  const { language, dateFormat, set } = useAdminPrefsStore()

  return (
    <Card>
      <CardTitle>Appearance</CardTitle>
      <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-faint)' }}>
        These preferences are saved on this device only.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        <FormSelect
          label="Language"
          value={language}
          onChange={(e) => set({ language: e.target.value })}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Date format"
          value={dateFormat}
          onChange={(e) => set({ dateFormat: e.target.value })}
        >
          {DATE_FORMATS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </FormSelect>
      </div>
    </Card>
  )
}
