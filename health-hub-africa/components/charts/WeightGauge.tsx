'use client'

import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

interface WeightGaugeProps {
  value?: number
  min: number
  max: number
}

export function WeightGauge({ value, min, max }: WeightGaugeProps) {
  if (value == null) {
    return (
      <div className="flex flex-col items-center justify-center h-[170px]">
        <p className="text-xs font-medium text-gray-400">No weight readings yet</p>
      </div>
    )
  }

  const range = max - min
  const position = Math.max(0, Math.min(1, (value - min) / range))
  const filled = position
  const empty = 1 - position

  return (
    <div className="relative flex flex-col items-center" aria-label={`Weight gauge: ${value}kg, target range ${min}-${max}kg`}>
      <div className="w-[140px] h-[70px] overflow-hidden relative">
        <div className="absolute inset-0 -bottom-[70px]">
          <Doughnut
            data={{
              datasets: [{
                data: [filled, empty],
                backgroundColor: ['#6DC43F', 'rgba(0,0,0,0.08)'],
                borderWidth: 0,
                circumference: 180,
                rotation: -90,
              }],
            }}
            options={{
              responsive: false,
              cutout: '68%',
              plugins: { legend: { display: false }, tooltip: { enabled: false } },
              animation: { duration: 1200, easing: 'easeOutQuart' },
            }}
            width={140}
            height={140}
          />
        </div>
      </div>
      <div className="mt-1 text-center">
        <span className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          {value} kg
        </span>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Target {min}–{max} kg
        </p>
      </div>
    </div>
  )
}
