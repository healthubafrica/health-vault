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

const DATA = [3800, 4200, 3900, 4100, 4000, 4300, 3950, 4150, 4000, 3850, 4100, 4000]

export function BloodCellsChart() {
  return (
    <div className="h-[80px]" aria-label="Blood cell count chart, current 4000 per microliter">
      <Bar
        data={{
          labels: DATA.map((_, i) => i),
          datasets: [{
            data: DATA,
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
