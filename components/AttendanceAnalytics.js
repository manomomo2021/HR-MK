import { useLanguage } from '../contexts/LanguageContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function AttendanceAnalytics({ stats }) {
  const { language } = useLanguage()
  const ar = (a, e) => language === 'ar' ? a : e

  const { present, absent, late, leave } = stats || { present: 0, absent: 0, late: 0, leave: 0 }
  const total = present + absent + late + leave || 1 // prevent div by zero

  // Doughnut Chart Data (Attendance Status Distribution)
  const doughnutData = {
    labels: [ar('حاضر', 'Present'), ar('متأخر', 'Late'), ar('غائب', 'Absent'), ar('إجازة', 'Leave')],
    datasets: [
      {
        data: [present, late, absent, leave],
        backgroundColor: [
          '#10b981', // emerald-500
          '#f59e0b', // amber-500
          '#ef4444', // rose-500
          '#6366f1', // indigo-500
        ],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw
            const percentage = Math.round((value / total) * 100)
            return ` ${value} (${percentage}%)`
          }
        }
      }
    }
  }

  // Bar Chart Data (Top 5 Departments Mock)
  const barData = {
    labels: [
      ar('تقنية المعلومات', 'IT'),
      ar('المبيعات', 'Sales'),
      ar('المالية', 'Finance'),
      ar('الموارد البشرية', 'HR'),
      ar('التشغيل', 'Ops')
    ],
    datasets: [
      {
        label: ar('نسبة الحضور', 'Attendance %'),
        data: [98, 96, 93, 91, 89],
        backgroundColor: [
          '#059669', // emerald-600
          '#2563eb', // blue-600
          '#d97706', // amber-600
          '#7c3aed', // violet-600
          '#0891b2', // cyan-600
        ],
        borderRadius: 8,
        barThickness: 12,
      },
    ],
  }

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (context) => ` ${context.raw}%` }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        max: 100,
        ticks: { font: { family: 'inherit', size: 10 } }
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: 'inherit', size: 10, weight: 'bold' } }
      }
    }
  }

  const legendItems = [
    { label: ar('حاضر', 'Present'), value: present, color: 'bg-emerald-500' },
    { label: ar('متأخر', 'Late'), value: late, color: 'bg-amber-500' },
    { label: ar('غائب', 'Absent'), value: absent, color: 'bg-rose-500' },
    { label: ar('إجازة', 'Leave'), value: leave, color: 'bg-indigo-500' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Distribution Chart */}
      <div className="bg-white border border-surface-200 rounded-3xl p-6 shadow-sm col-span-1">
        <h3 className="text-sm font-black text-surface-900 mb-6">{ar('توزيع حالات الحضور', 'Attendance Distribution')}</h3>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-surface-900">{total}</span>
              <span className="text-[9px] font-bold text-surface-500 uppercase">{ar('إجمالي', 'Total')}</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {legendItems.map((item, i) => {
              const perc = total > 0 ? Math.round((item.value / total) * 100) : 0
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                    <span className="text-xs text-surface-600 font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-surface-900">{item.value}</span>
                    <span className="text-[10px] text-surface-400 font-bold w-6 text-left">{perc}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Departments Chart */}
      <div className="bg-white border border-surface-200 rounded-3xl p-6 shadow-sm col-span-1 lg:col-span-2">
        <h3 className="text-sm font-black text-surface-900 mb-4">{ar('أعلى 5 إدارات بالحضور', 'Top 5 Departments')}</h3>
        <div className="h-40 w-full">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </div>
  )
}
