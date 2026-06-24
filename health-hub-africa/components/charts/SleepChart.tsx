'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip)

interface SleepChartProps {
  data?: number[]
  labels?: string[]
}

export function SleepChart({ data, labels }: SleepChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[80px] flex items-center justify-center">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">No sleep data yet</p>
      </div>
    )
  }

  return (
    <div className="h-[80px]" aria-label={`Sleep hours chart, latest ${data[data.length - 1]} hours`}>
      <Bar
        data={{
          labels: labels ?? data.map((_, i) => String(i)),
          datasets: [{
            data,
            backgroundColor: '#50aca5',
            borderRadius: 4,
            borderSkipped: false,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          animation: { duration: 1000, easing: 'easeOutQuart' },
        }}
      />
    </div>
  )
}
