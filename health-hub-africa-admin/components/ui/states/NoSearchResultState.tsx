'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SearchX, FilterX, ArrowLeft, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface NoSearchResultStateProps {
  searchTerm?: string
  suggestions?: string[]
  onSelectSuggestion?: (term: string) => void
  onClearSearch?: () => void
  onResetFilters?: () => void
  className?: string
}

export function NoSearchResultState({
  searchTerm = 'Cardiology Specialist',
  suggestions = ['General Practitioner', 'Triage Queue', 'Active Beds', 'On-Call Doctors'],
  onSelectSuggestion,
  onClearSearch,
  onResetFilters,
  className = '',
}: NoSearchResultStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-8 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-sm ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-light,#EBF5EC)] flex items-center justify-center text-[var(--color-primary,#137333)] mb-4 shadow-inner">
        <SearchX className="w-8 h-8" />
      </div>

      <h3 className="text-base font-bold text-[var(--color-text)] mb-1">
        No provider results found
      </h3>

      <p className="text-xs text-[var(--color-text-muted)] max-w-xs mb-4 leading-relaxed">
        We couldn't find any staff or clinical records matching{' '}
        <span className="font-semibold text-[var(--color-text)] bg-[var(--color-bg,#F4F6F5)] px-2 py-0.5 rounded-md border border-[var(--color-border)]">
          "{searchTerm}"
        </span>
      </p>

      {suggestions.length > 0 && (
        <div className="w-full mb-6">
          <p className="text-[11px] font-bold text-[var(--color-text-faint,#9CA3AF)] uppercase tracking-wider mb-2.5">
            Suggested search terms:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSelectSuggestion && onSelectSuggestion(suggestion)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg,#F4F6F5)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary,#137333)] hover:text-[var(--color-primary,#137333)] transition-all cursor-pointer flex items-center gap-1"
              >
                <Tag className="w-3 h-3 text-[var(--color-primary,#137333)]" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {onResetFilters && (
          <Button size="sm" variant="secondary" onClick={onResetFilters} className="gap-1.5">
            <FilterX className="w-3.5 h-3.5" />
            Reset Filters
          </Button>
        )}
        {onClearSearch && (
          <Button size="sm" onClick={onClearSearch} className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Clear Search
          </Button>
        )}
      </div>
    </motion.div>
  )
}
