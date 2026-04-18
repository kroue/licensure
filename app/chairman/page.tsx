'use client'
import { mockStudents, modelMetrics } from '@/lib/data'
import { TrendingUp, TrendingDown, Users, BarChart3, CheckCircle, AlertTriangle, Brain } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const passed = mockStudents.filter(s => s.prediction === 'PASSED').length
const failed = mockStudents.filter(s => s.prediction === 'FAILED').length
const total = mockStudents.length
const passRate = ((passed / total) * 100).toFixed(1)

const pieData = [
  { name: 'Predicted Pass', value: passed },
  { name: 'Predicted Fail', value: failed },
]
const PIE_COLORS = ['#0B2C5D', '#F2B705']

const examYearData = [
  { year: '2021', passed: 18, failed: 7 },
  { year: '2022', passed: 22, failed: 5 },
  { year: '2023', passed: 25, failed: 8 },
  { year: '2024', passed: passed, failed: failed },
]

export default function ChairmanDashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Prediction Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of student licensure exam predictions · Batch 2024</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Students', value: total, sub: 'Current batch', icon: Users, color: '#0B2C5D', bg: '#e8edf5' },
          { label: 'Predicted to Pass', value: passed, sub: `${passRate}% pass rate`, icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'At-Risk Students', value: failed, sub: 'Need intervention', icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Model Accuracy', value: `${(modelMetrics.accuracy * 100).toFixed(1)}%`, sub: 'Random Forest · 10-fold CV', icon: Brain, color: '#F2B705', bg: '#fefce8' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
                <p className="text-gray-400 text-xs mt-1">{sub}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-1">Predictions by Exam Year</h3>
          <p className="text-gray-400 text-xs mb-5">Historical pass/fail prediction trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={examYearData} barGap={4}>
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="passed" name="Predicted Pass" fill="#0B2C5D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" name="Predicted Fail" fill="#F2B705" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-1">Current Batch Breakdown</h3>
          <p className="text-gray-400 text-xs mb-4">Pass vs Fail distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pass Rate</span>
              <span className="font-bold" style={{ color: '#0B2C5D' }}>{passRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full" style={{ width: `${passRate}%`, backgroundColor: '#0B2C5D' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-1">Model Performance Summary</h3>
        <p className="text-gray-400 text-xs mb-5">Random Forest · 10-Fold Cross-Validation (10 iterations)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Accuracy', value: modelMetrics.accuracy, color: '#0B2C5D' },
            { label: 'Precision', value: modelMetrics.precision, color: '#1d4ed8' },
            { label: 'Recall', value: modelMetrics.recall, color: '#16a34a' },
            { label: 'Specificity', value: modelMetrics.specificity, color: '#7c3aed' },
            { label: 'F1-Score', value: modelMetrics.f1Score, color: '#ea580c' },
            { label: 'ROC AUC', value: modelMetrics.rocAuc, color: '#F2B705' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-3 rounded-lg bg-gray-50">
              <div className="text-2xl font-bold" style={{ color }}>{(value * 100).toFixed(1)}%</div>
              <div className="text-gray-500 text-xs mt-1 font-medium">{label}</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className="h-1.5 rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
