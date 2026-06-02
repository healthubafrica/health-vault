'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { LAB_CHART_DATA } from '@/lib/data/labs'

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend)

export function LabBarsChart() {
  return (
    <div className="h-[140px]" aria-label="Lab results chart showing normal vs flagged values">
      <Bar
        data={{
          labels: LAB_CHART_DATA.labels,
          datasets: [
            {
              label: 'Normal',
              data: LAB_CHART_DATA.normal,
              backgroundColor: '#6DC43F',
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: 'Flagged',
              data: LAB_CHART_DATA.flagged,
              backgroundColor: '#C0392B',
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
            tooltip: { enabled: true },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { display: false },
          },
          animation: { duration: 1000, easing: 'easeOutQuart' },
        }}
      />
    </div>
  )
}
