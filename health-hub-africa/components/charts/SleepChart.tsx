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

const DATA = [7, 6, 8, 5, 7, 6.5, 7, 8, 6, 7, 5.5, 6]
const LABELS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']

export function SleepChart() {
  return (
    <div className="h-[80px]" aria-label="Monthly sleep hours chart, current 6 hours average">
      <Bar
        data={{
          labels: LABELS,
          datasets: [{
            data: DATA,
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
