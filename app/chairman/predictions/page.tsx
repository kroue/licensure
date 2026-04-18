'use client'
import { useState } from 'react'
import { mockStudents, getFeatureImportance, Student } from '@/lib/data'
import { Search, Eye, X, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react'

export default function PredictionsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL')
  const [selected, setSelected] = useState<Student | null>(null)

  const filtered = mockStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || s.prediction === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Student Predictions</h1>
        <p className="text-gray-500 text-sm mt-1">Licensure exam outcome predictions · Civil Engineering 2024</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or student ID..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PASSED', 'FAILED'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={filter === f ? { backgroundColor: '#0B2C5D' } : {}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ backgroundColor: '#f8fafc' }}>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Student</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Student ID</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Exam Year</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">GWA</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Prediction</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Confidence</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{s.studentId}</td>
                  <td className="px-5 py-3.5 text-gray-600">{s.examYear}</td>
                  <td className="px-5 py-3.5 text-gray-600">{s.gwa.toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      s.prediction === 'PASSED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {s.prediction === 'PASSED' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {s.prediction}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{
                          width: `${s.probability * 100}%`,
                          backgroundColor: s.prediction === 'PASSED' ? '#16a34a' : '#dc2626'
                        }} />
                      </div>
                      <span className="text-xs text-gray-500">{(s.probability * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => setSelected(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-80"
                      style={{ backgroundColor: '#0B2C5D' }}>
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {mockStudents.length} students
        </div>
      </div>

      {/* Detail Modal */}
      {selected && <StudentDetailModal student={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StudentDetailModal({ student: s, onClose }: { student: Student; onClose: () => void }) {
  const features = getFeatureImportance(s)
  const isPassed = s.prediction === 'PASSED'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{s.name}</h2>
            <p className="text-gray-500 text-sm">{s.studentId} · CE {s.examYear}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Prediction Result */}
          <div className={`rounded-xl p-4 flex items-center gap-4 ${isPassed ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
              {isPassed ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
                  Predicted to {s.prediction}
                </span>
              </div>
              <p className="text-sm text-gray-500">Model confidence: {(s.probability * 100).toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: isPassed ? '#16a34a' : '#dc2626' }}>
                {(s.probability * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-400">confidence</div>
            </div>
          </div>

          {/* Contributing Predictors */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#0B2C5D' }} />
              Contributing Predictors
            </h3>
            <p className="text-gray-400 text-xs mb-4">Feature contributions to the prediction result (SHAP-inspired)</p>
            <div className="space-y-3">
              {features.map(f => (
                <div key={f.feature}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{f.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 font-mono">{f.label}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        f.impact === 'positive' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {f.impact === 'positive'
                          ? <><TrendingUp className="w-3 h-3" /> Favorable</>
                          : <><TrendingDown className="w-3 h-3" /> Unfavorable</>}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${f.score * 100}%`,
                        backgroundColor: f.impact === 'positive' ? '#16a34a' : '#dc2626'
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Details */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Student Profile</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Age', s.age],
                ['Gender', s.gender],
                ['Latin Honors', s.graduatedWithLatin],
                ['Months of Prep', `${s.monthsPrep} months`],
                ["Father's Education", s.fatherEducationalAttainment],
                ["Mother's Education", s.motherEducationalAttainment],
                ["Father's Income", `₱${s.fatherMonthlyIncome.toLocaleString()}/mo`],
                ["Mother's Income", `₱${s.motherMonthlyIncome.toLocaleString()}/mo`],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-gray-400 text-xs">{label}</div>
                  <div className="font-medium text-gray-700 mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
