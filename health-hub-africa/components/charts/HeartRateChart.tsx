'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

interface HeartRateChartProps {
  data?: number[]
}

export function HeartRateChart({ data }: HeartRateChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[80px] flex items-center justify-center">
        <p className="text-xs font-medium text-gray-400">No heart rate readings yet</p>
      </div>
    )
  }

  return (
    <div className="h-[80px]" aria-label={`Heart rate trend chart, latest ${data[data.length - 1]} bpm`}>
      <Line
        data={{
          labels: data.map((_, i) => i),
          datasets: [{
            data,
            borderColor: '#50aca5',
            backgroundColor: 'rgba(80,172,165,0.08)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
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
