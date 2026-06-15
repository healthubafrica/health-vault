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

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend)

interface LabBarsChartProps {
  data?: { labels: string[]; normal: number[]; flagged: number[] }
}

export function LabBarsChart({ data }: LabBarsChartProps) {
  if (!data || data.labels.length === 0) {
    return (
      <div className="h-[140px] flex items-center justify-center">
        <p className="text-xs font-medium text-gray-400">No lab results yet</p>
      </div>
    )
  }

  return (
    <div className="h-[140px]" aria-label="Lab results chart showing normal vs flagged values">
      <Bar
        data={{
          labels: data.labels,
          datasets: [
            {
              label: 'Normal',
              data: data.normal,
              backgroundColor: '#6DC43F',
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: 'Flagged',
              data: data.flagged,
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
