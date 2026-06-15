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

interface BloodCellsChartProps {
  data?: number[]
}

export function BloodCellsChart({ data }: BloodCellsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[80px] flex items-center justify-center">
        <p className="text-xs font-medium text-gray-400">No blood test results yet</p>
      </div>
    )
  }

  return (
    <div className="h-[80px]" aria-label={`Red blood cell count chart, latest ${data[data.length - 1]}`}>
      <Bar
        data={{
          labels: data.map((_, i) => String(i)),
          datasets: [{
            data,
            backgroundColor: '#C0392B',
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
