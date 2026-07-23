'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, User, Award, Star } from 'lucide-react'
import { providers as providersApi, type Provider } from '@/lib/api'
import { buildProviderDisplayName } from '@/lib/providerName'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function MiniCalendar() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<number | null>(null)

  const isViewingCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()
  const isViewingPastMonth =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth())

  // No real availability API is wired into this widget yet — every
  // non-past day is selectable rather than faking per-day availability.
  function isDaySelectable(day: number): boolean {
    if (isViewingPastMonth) return false
    if (isViewingCurrentMonth) return day >= today.getDate()
    return true
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstWeekday }, () => null)
  const cells = [...emptyDays, ...days]

  function goToPreviousMonth() {
    setSelected(null)
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  function goToNextMonth() {
    setSelected(null)
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            onClick={goToPreviousMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
          >
            <ChevronLeft size={14} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
        <span className="text-xs font-extrabold text-[var(--color-text)] uppercase tracking-wider">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div className="flex items-center gap-1">
          <button
            aria-label="Next month"
            onClick={goToNextMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
          >
            <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-[var(--color-text-faint)] py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          
          const isSelected = day === selected
          const selectable = isDaySelectable(day)

          let btnClass = "relative flex flex-col items-center justify-center h-8 w-8 mx-auto rounded-full text-xs font-semibold transition-all duration-150 "

          if (isSelected) {
            btnClass += "bg-[var(--color-primary)] text-white shadow-sm"
          } else if (selectable) {
            btnClass += "text-[var(--color-text)] hover:bg-[var(--color-primary-light)] cursor-pointer"
          } else {
            btnClass += "text-[var(--color-text-faint)] cursor-not-allowed"
          }

          return (
            <div key={`day-${day}`} className="relative flex flex-col items-center justify-center">
              <button
                aria-label={`${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`}
                aria-pressed={isSelected}
                onClick={() => { if (selectable) setSelected(day) }}
                disabled={!selectable}
                className={btnClass}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardPanel() {
  const router = useRouter()
  const [selectedTime, setSelectedTime] = useState('10:00 AM')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Provider[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await providersApi.search(searchQuery.trim())
        setSearchResults(res.data ?? [])
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectProvider(p: Provider) {
    setSelectedProvider(p)
    setSearchQuery(buildProviderDisplayName(p))
    setShowDropdown(false)
  }

  const displayName = selectedProvider
    ? buildProviderDisplayName(selectedProvider)
    : 'Any Available Provider'
  const displaySpecialty = selectedProvider?.specialty ?? 'TeleCore™ Consultation'

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Title */}
      <div>
        <h3 className="text-base font-extrabold text-[var(--color-text)]">
          Book a Service
        </h3>
      </div>

      {/* Search Input and Filter */}
      <div className="relative flex gap-2" ref={dropdownRef}>
        <div className="flex items-center gap-2 flex-1 h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
          <Search size={14} className="text-[var(--color-text-faint)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!e.target.value.trim()) setSelectedProvider(null)
            }}
            placeholder="Search doctor or specialty"
            className="bg-transparent border-none outline-none text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] w-full"
          />
        </div>
        <button
          aria-label="Filter Care Providers"
          onClick={() => router.push('/appointments')}
          title="Filter by specialty, availability, and more"
          className="w-10 h-10 flex items-center justify-center border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-text)] transition-colors"
        >
          <SlidersHorizontal size={14} />
        </button>

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-12 left-0 right-10 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
            {searchResults.map(p => (
              <button
                key={p.id}
                onClick={() => selectProvider(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-primary-light)] transition-colors text-left"
              >
                <Avatar seed={`${p.firstName} ${p.lastName}`} size="sm" shape="circle" alt={`${p.firstName} ${p.lastName}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" title={buildProviderDisplayName(p)} style={{ color: 'var(--color-text)' }}>
                    {buildProviderDisplayName(p)}
                  </p>
                  {p.specialty && (
                    <p className="text-[10px] truncate" title={p.specialty} style={{ color: 'var(--color-text-muted)' }}>{p.specialty}</p>
                  )}
                </div>
                {p.rating && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 shrink-0">
                    <Star size={8} className="fill-amber-500 stroke-none" /> {p.rating}
                  </span>
                )}
              </button>
            ))}
            {searchResults.length === 0 && (
              <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-muted)' }}>No providers found</p>
            )}
          </div>
        )}
        {showDropdown && searchQuery.trim() && searchResults.length === 0 && (
          <div className="absolute top-12 left-0 right-10 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg px-3 py-3">
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>No providers found</p>
          </div>
        )}
      </div>

      {/* Selected Provider Card */}
      <div className="flex gap-3.5 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <Avatar seed={displayName} size="md" shape="circle" alt={displayName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-[var(--color-text)] leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5">
            {displaySpecialty}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)] text-[9px] font-bold">
              <User size={8} /> {selectedProvider ? 'Verified' : 'Any'}
            </span>
            {selectedProvider?.rating && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-[#b59410] border border-[#b59410]/20 text-[9px] font-extrabold">
                <Star size={8} className="fill-[#b59410] stroke-none" /> {selectedProvider.rating}
              </span>
            )}
            {selectedProvider?.isAvailable === false && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[var(--color-error-bg)] text-[var(--color-emergency)] text-[9px] font-bold">
                Unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
          Select Date
        </p>
        <MiniCalendar />
      </div>

      {/* Time Selection */}
      <div className="border-t border-[var(--color-border)] pt-4 mb-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
          Select Time
        </p>
        <div className="flex flex-wrap gap-2">
          {['09:00 AM', '10:00 AM', '11:00 AM'].map(time => {
            const isActive = time === selectedTime
            return (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 border ${
                  isActive
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-faint)] hover:text-[var(--color-text)]'
                }`}
              >
                {time}
              </button>
            )
          })}
        </div>
      </div>

      {/* Book Button */}
      <Button
        variant="primary"
        fullWidth
        className="mt-auto rounded-2xl h-11 text-xs uppercase tracking-wider font-extrabold bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90"
        onClick={() => {
          const qs = selectedProvider ? `?providerId=${selectedProvider.id}` : ''
          toast.info(selectedProvider ? `Booking with ${displayName} — complete in Appointments` : 'Complete your booking in the Appointments tab')
          router.push(`/appointments${qs}`)
        }}
      >
        Confirm Booking
      </Button>
    </div>
  )
}
