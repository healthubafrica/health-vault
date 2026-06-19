import { Construction } from 'lucide-react'

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <div
        className="rounded-2xl border p-12 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <Construction className="w-8 h-8 mb-3" style={{ color: 'var(--color-text-faint)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          This section is under construction
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
          Check back soon
        </p>
      </div>
    </div>
  )
}
