'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Eye, Search, SlidersHorizontal, TrendingUp, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  createAuditLog,
  getLatestPredictionRunAnalytics,
  getPredictionRowsAnalyticsByRunId,
  type PredictionRowAnalytics,
} from '@/lib/firebase'

type RiskLevelFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

type DisplayRow = {
  id: string
  studentId: string
  name: string
  email: string
  yearLevel: string
  gpa: number
  prediction: 'PASSED' | 'FAILED'
  confidence: number
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  raw: Record<string, unknown>
  predictors: PredictorItem[]
}

type PredictorItem = {
  key: string
  label: string
  valueLabel: string
  score: number
  impact: 'positive' | 'neutral' | 'negative'
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function toDisplayRow(source: PredictionRowAnalytics, index: number): DisplayRow {
  const student = source.student as Record<string, unknown>

  const studentId = String(student['Student_Code'] ?? student['studentId'] ?? `row-${index + 1}`)
  const name = String(student['Student_Name'] ?? student['name'] ?? 'Unknown Student')
  const gpaValue = toNumber(student['GWA'] ?? student['gpa'])
  const gpa = gpaValue ?? 0
  const predictionRaw = String(student['prediction'] ?? '').toUpperCase()
  const prediction: 'PASSED' | 'FAILED' = predictionRaw === 'FAILED' ? 'FAILED' : 'PASSED'
  const probability = toNumber(student['probability']) ?? 0
  const confidence = Math.max(probability, 1 - probability)
  const riskScore = prediction === 'FAILED' ? probability : 1 - probability
  const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = riskScore >= 0.7 ? 'HIGH' : riskScore >= 0.4 ? 'MEDIUM' : 'LOW'

  const yearLevelRaw = student['Year_Level'] ?? student['YearLevel'] ?? student['yearLevel']
  const examYear = student['Exam_year'] ?? student['examYear']
  const yearLevel = yearLevelRaw ? String(yearLevelRaw) : examYear ? `Exam ${String(examYear)}` : '4th Year'
  const email = String(student['Email'] ?? student['email'] ?? 'N/A')

  const savedPredictors = Array.isArray(source.contributingPredictors)
    ? source.contributingPredictors
        .map((item, itemIndex) => ({
          key: String(item.key ?? `saved-${itemIndex}`),
          label: String(item.label ?? 'Predictor'),
          valueLabel: String(item.valueLabel ?? '-'),
          score: typeof item.score === 'number' ? Math.max(0, Math.min(1, item.score)) : 0.3,
          impact: item.impact === 'positive' || item.impact === 'negative' || item.impact === 'neutral'
            ? item.impact
            : 'neutral',
        }))
        .sort((a, b) => b.score - a.score)
    : []

  return {
    id: `${source.runId}-${studentId}-${index}`,
    studentId,
    name,
    email,
    yearLevel,
    gpa,
    prediction,
    confidence,
    riskLevel,
    raw: student,
    predictors: savedPredictors,
  }
}

function buildPredictorsFallback(row: DisplayRow): PredictorItem[] {
  const student = row.raw
  const gwa = toNumber(student['GWA'] ?? student['gpa']) ?? 0
  const mste = toNumber(student['MSTE_AVE']) ?? 0
  const psad = toNumber(student['PSAD_AVE']) ?? 0
  const hpge = toNumber(student['HPGE_AVE']) ?? 0
  const monthsPrep = toNumber(student['Months_prep']) ?? 0
  const age = toNumber(student['Age']) ?? 0

  const asPct = (score: number) => Math.max(0, Math.min(100, Math.round(score * 100)))
  const positive = (score: number): PredictorItem['impact'] => (score >= 0.6 ? 'positive' : score >= 0.35 ? 'neutral' : 'negative')

  const predictors: PredictorItem[] = [
    { key: 'gwa', label: 'GWA', valueLabel: gwa > 0 ? gwa.toFixed(2) : '-', score: Math.max(0, Math.min(1, (4.0 - gwa) / 3.0)), impact: 'positive' },
    { key: 'mste', label: 'MSTE Aligned Subjects', valueLabel: mste > 0 ? mste.toFixed(2) : '-', score: Math.max(0, Math.min(1, mste / 4.0)), impact: positive(mste / 4.0) },
    { key: 'psad', label: 'PSAD Aligned Subjects', valueLabel: psad > 0 ? psad.toFixed(2) : '-', score: Math.max(0, Math.min(1, psad / 4.0)), impact: positive(psad / 4.0) },
    { key: 'hpge', label: 'HPGE Aligned Subjects', valueLabel: hpge > 0 ? hpge.toFixed(2) : '-', score: Math.max(0, Math.min(1, hpge / 4.0)), impact: positive(hpge / 4.0) },
    { key: 'months', label: 'Months of Exam Preparation', valueLabel: monthsPrep > 0 ? String(monthsPrep) : '-', score: Math.max(0, Math.min(1, monthsPrep / 10)), impact: positive(monthsPrep / 10) },
    { key: 'age', label: 'Age', valueLabel: age > 0 ? String(age) : '-', score: Math.max(0, Math.min(1, (age - 18) / 12)), impact: 'neutral' },
    {
      key: 'gender',
      label: 'Gender',
      valueLabel: String(student['Gender'] ?? '-'),
      score: 0.3,
      impact: 'neutral',
    },
    {
      key: 'exam-year',
      label: 'Exam Year',
      valueLabel: String(student['Exam_year'] ?? '-'),
      score: 0.25,
      impact: 'neutral',
    },
  ]

  return predictors
    .map((item) => ({ ...item, score: asPct(item.score) / 100 }))
    .sort((a, b) => b.score - a.score)
}

export default function PredictionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<DisplayRow[]>([])
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevelFilter>('ALL')
  const [selected, setSelected] = useState<DisplayRow | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const latest = await getLatestPredictionRunAnalytics({ uid: user.uid, role: user.role })
        if (!latest?.id) {
          setRows([])
          return
        }

        const analyticsRows = await getPredictionRowsAnalyticsByRunId(latest.id, {
          uid: user.uid,
          role: user.role,
        })

        setRows(analyticsRows.map((item, index) => toDisplayRow(item, index)))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load student predictions from Firestore.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [user?.role, user?.uid])

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !normalized
        || row.name.toLowerCase().includes(normalized)
        || row.studentId.toLowerCase().includes(normalized)

      const matchesRisk = riskFilter === 'ALL' || row.riskLevel === riskFilter
      return matchesSearch && matchesRisk
    })
  }, [rows, riskFilter, search])

  const handleViewDetails = (row: DisplayRow) => {
    setSelected(row)

    if (!user?.uid) return
    void createAuditLog({
      action: 'View Student Details',
      details: `Accessed prediction profile for ${row.studentId}`,
      status: 'Success',
      actor: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      metadata: {
        studentId: row.studentId,
      },
    })
  }

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Student Prediction Details</h1>
        <p className="text-sm text-gray-600 mt-2">Detailed prediction results and risk classification for each student</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or student ID..."
              className="h-12 w-full rounded-xl border border-gray-300 pl-12 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          <div className="h-12 w-12 rounded-xl border border-gray-300 flex items-center justify-center text-gray-400">
            <SlidersHorizontal className="h-5 w-5" />
          </div>

          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value as RiskLevelFilter)}
            className="h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-700 bg-white focus:outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['STUDENT ID', 'NAME', 'EMAIL', 'YEAR LEVEL', 'GPA', 'PREDICTION', 'CONFIDENCE', 'ACTIONS'].map((header) => (
                  <th key={header} className="text-left px-8 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.map((row) => (
                <tr key={row.id} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-8 py-5 text-sm text-gray-700">{row.studentId}</td>
                  <td className="px-8 py-5 text-sm text-gray-700">{row.name}</td>
                  <td className="px-8 py-5 text-sm text-gray-500">{row.email}</td>
                  <td className="px-8 py-5 text-sm text-gray-500">{row.yearLevel}</td>
                  <td className="px-8 py-5 text-sm text-gray-700">{row.gpa.toFixed(1)}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex rounded-full px-4 py-1 text-sm font-medium ${
                      row.prediction === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {row.prediction === 'PASSED' ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-gray-700">{Math.round(row.confidence * 100)}%</td>
                  <td className="px-8 py-5 text-sm text-gray-700">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(row)}
                      className="inline-flex items-center gap-2 text-[#0B2C5D] hover:opacity-80"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={8} className="px-8 py-10 text-sm text-gray-500 text-center">Loading predictions from Firestore...</td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-8 py-10 text-sm text-gray-500 text-center">No prediction rows found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 text-sm">
          {error}
        </section>
      )}

      {selected && <PredictionDetailsModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function PredictionDetailsModal({ row, onClose }: { row: DisplayRow; onClose: () => void }) {
  const predictors = useMemo(() => {
    if (row.predictors.length > 0) return row.predictors
    return buildPredictorsFallback(row)
  }, [row])
  const confidencePct = Math.round(row.confidence * 100)

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <h2 className="text-3xl font-medium text-[#0B2C5D] inline-flex items-center gap-3">
            <BarChart3 className="h-7 w-7" />
            Student Prediction Analysis
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-8 py-7 space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[#0B2C5D]">
            <div>
              <p className="text-3xl text-gray-600">Student ID</p>
              <p className="text-4xl font-medium mt-2">{row.studentId}</p>
            </div>
            <div>
              <p className="text-3xl text-gray-600">Full Name</p>
              <p className="text-4xl font-medium mt-2">{row.name}</p>
            </div>
            <div>
              <p className="text-3xl text-gray-600">Email</p>
              <p className="text-4xl font-medium mt-2 break-all">{row.email}</p>
            </div>
            <div>
              <p className="text-3xl text-gray-600">Year Level</p>
              <p className="text-4xl font-medium mt-2">{row.yearLevel}</p>
            </div>
            <div>
              <p className="text-3xl text-gray-600">GPA</p>
              <p className="text-4xl font-medium mt-2">{row.gpa.toFixed(1)}</p>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-7">
            <h3 className="text-4xl font-medium text-[#0B2C5D] mb-6">Prediction Result</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="text-3xl text-gray-600 mb-3">Predicted Outcome</p>
                <span className={`inline-flex rounded-2xl px-6 py-3 text-3xl font-medium ${
                  row.prediction === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {row.prediction === 'PASSED' ? 'Pass' : 'Fail'}
                </span>
              </div>

              <div>
                <p className="text-3xl text-gray-600 mb-3">Prediction Confidence</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-5 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-5 rounded-full" style={{ width: `${confidencePct}%`, backgroundColor: '#0B2C5D' }} />
                  </div>
                  <span className="text-4xl font-medium text-[#0B2C5D]">{confidencePct}%</span>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-7">
            <h3 className="text-4xl font-medium text-[#0B2C5D] mb-3 inline-flex items-center gap-3">
              <TrendingUp className="h-7 w-7" />
              Contributing Predictors
            </h3>
            <p className="text-3xl text-gray-600 mb-6">
              The following factors contributed to this student's prediction classification, ranked by importance:
            </p>

            <div className="space-y-6">
              {predictors.map((predictor) => {
                const badgeClass = predictor.impact === 'positive'
                  ? 'bg-green-100 text-green-700'
                  : predictor.impact === 'neutral'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'

                const barColor = predictor.impact === 'positive'
                  ? '#16a34a'
                  : predictor.impact === 'neutral'
                    ? '#eab308'
                    : '#ef4444'

                return (
                  <div key={predictor.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="inline-flex items-center gap-3">
                        <span className="text-4xl font-medium text-[#0B2C5D]">{predictor.label}</span>
                        <span className={`rounded-lg px-3 py-1 text-2xl ${badgeClass}`}>
                          {predictor.impact === 'positive' ? 'Positive' : predictor.impact === 'neutral' ? 'Neutral' : 'Negative'}
                        </span>
                      </div>
                      <span className="text-3xl text-[#0B2C5D]">{predictor.valueLabel}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-4 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-4 rounded-full" style={{ width: `${Math.round(predictor.score * 100)}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="text-2xl text-gray-500 w-14 text-right">{Math.round(predictor.score * 100)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-[#0B2C5D] text-3xl leading-relaxed">
            <span className="font-semibold">Interpretation:</span> This prediction is based on machine learning analysis of multiple academic performance indicators. The model evaluates key factors including GPA, subject-specific grades, and preparation signals to generate the prediction.
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-8 py-3 text-2xl font-medium text-white"
            style={{ backgroundColor: '#0B2C5D' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
