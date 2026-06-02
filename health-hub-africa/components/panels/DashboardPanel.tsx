'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, User, Award, Star } from 'lucide-react'

function MiniCalendar() {
  const [selected, setSelected] = useState(18)
  const available = [14, 16, 18, 20, 22, 25, 27]
  const full = [15, 19, 23]
  
  // May 2026 calendar data
  // May 2026 starts on Friday (5 empty slots: Sun, Mon, Tue, Wed, Thu)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: 5 }, () => null)
  const cells = [...emptyDays, ...days]

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
        </div>
        <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
          May 2026
        </span>
        <div className="flex items-center gap-1">
          <button
            aria-label="Next month"
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          
          const isSelected = day === selected
          const isCritical = day === 17
          const isAvail = available.includes(day)
          const isFull = full.includes(day)

          let btnClass = "relative flex flex-col items-center justify-center h-8 w-8 mx-auto rounded-full text-xs font-semibold transition-all duration-150 "
          let style: React.CSSProperties = {}

          if (isSelected) {
            btnClass += "bg-[var(--color-primary)] text-white shadow-sm"
          } else if (isCritical) {
            btnClass += "bg-[#C0392B] text-white shadow-sm hover:bg-[#a93226]"
          } else if (isFull) {
            btnClass += "text-gray-300 cursor-not-allowed"
          } else if (isAvail) {
            btnClass += "text-gray-700 hover:bg-gray-100 cursor-pointer"
          } else {
            btnClass += "text-gray-300 cursor-not-allowed"
          }

          return (
            <div key={`day-${day}`} className="relative flex flex-col items-center justify-center">
              {isCritical && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7px] font-extrabold text-[#C0392B] bg-[#FDECEA] px-1 rounded-sm tracking-tighter whitespace-nowrap scale-90 border border-[#C0392B]/10 z-10">
                  CRITICAL FIX
                </span>
              )}
              <button
                aria-label={`${day} May`}
                aria-pressed={isSelected}
                onClick={() => {
                  if (isAvail || isCritical) {
                    setSelected(day)
                  }
                }}
                disabled={isFull && !isCritical && !isAvail}
                className={btnClass}
                style={style}
              >
                {day}
              </button>
              {isAvail && !isSelected && !isCritical && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#137333]" />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 border-t border-[var(--color-border)] pt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#137333]" />
          <span className="text-[10px] font-semibold text-gray-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#374151]" />
          <span className="text-[10px] font-semibold text-gray-500">Full Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <span className="text-[10px] font-semibold text-gray-500">Not Available</span>
        </div>
      </div>
    </div>
  )
}

export function DashboardPanel() {
  const [selectedTime, setSelectedTime] = useState('10:00 AM')

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Title */}
      <div>
        <h3 className="text-base font-extrabold text-gray-800">
          Book a Service
        </h3>
      </div>

      {/* Search Input and Filter */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2 flex-1 h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search doctor"
            className="bg-transparent border-none outline-none text-xs text-[var(--color-text)] placeholder-gray-400 w-full"
          />
        </div>
        <button
          aria-label="Filter Care Providers"
          className="w-10 h-10 flex items-center justify-center border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Selected Doctor Card */}
      <div className="flex gap-3.5 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <Avatar seed="Dr. Kelechi Asobie" size="md" shape="circle" alt="Dr. Kelechi Asobie" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-gray-800 leading-tight">
            Dr. Kelechi Asobie
          </p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            TeleCore™ Consultation
          </p>
          
          {/* Doctor attributes */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 text-gray-600 text-[9px] font-bold">
              <User size={8} /> +100
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 text-gray-600 text-[9px] font-bold">
              <Award size={8} /> +4 Yrs
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-[#b59410] border border-[#b59410]/20 text-[9px] font-extrabold">
              <Star size={8} className="fill-[#b59410] stroke-none" /> 4.9 (40)
            </span>
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-3">
          Select Date
        </p>
        <MiniCalendar />
      </div>

      {/* Time Selection */}
      <div className="border-t border-[var(--color-border)] pt-4 mb-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-3">
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
                    : 'bg-white border-[var(--color-border)] text-gray-500 hover:border-gray-400 hover:text-gray-700'
                }`}
              >
                {time}
              </button>
            )
          })}
        </div>
      </div>

      {/* Book Button */}
      <Button variant="primary" fullWidth className="mt-auto rounded-2xl h-11 text-xs uppercase tracking-wider font-extrabold bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90">
        Confirm Booking
      </Button>
    </div>
  )
}
