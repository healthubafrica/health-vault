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

const DATA = [88, 92, 85, 90, 94, 88, 91, 87, 93, 90, 89, 92, 86, 91, 88, 93, 90, 87, 92, 90]

export function HeartRateChart() {
  return (
    <div className="h-[80px]" aria-label="Heart rate trend chart, current 90 bpm">
      <Line
        data={{
          labels: DATA.map((_, i) => i),
          datasets: [{
            data: DATA,
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
