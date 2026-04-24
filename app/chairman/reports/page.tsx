'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Filter, Printer } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  createAuditLog,
  getLatestPredictionRunAnalytics,
  getPredictionRowsAnalyticsByRunId,
  type PredictionRowAnalytics,
} from '@/lib/firebase'
import { getRiskLevel, normalizeProbability } from '@/lib/risk'

type RiskCategory = 'All Risk Levels' | 'High Risk' | 'Medium Risk' | 'Low Risk'

type ReportRow = {
  studentCode: string
  studentName: string
  cohortYear: string
  yearLevel: string
  prediction: 'PASSED' | 'FAILED'
  probability: number
  riskLevel: 'High Risk' | 'Medium Risk' | 'Low Risk' | 'N/A'
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function toReportRow(source: PredictionRowAnalytics): ReportRow {
  const student = source.student as Record<string, unknown>
  const predictionRaw = toText(student['prediction'], 'PASSED').toUpperCase()
  const prediction: 'PASSED' | 'FAILED' = predictionRaw === 'FAILED' ? 'FAILED' : 'PASSED'
  const probability = normalizeProbability(toNumber(student['probability']) ?? 0)
  const riskLevel = getRiskLevel(prediction, probability)

  return {
    studentCode: toText(student['Student_Code'] ?? student['studentId'], 'N/A'),
    studentName: toText(student['Student_Name'] ?? student['name'], 'Unknown Student'),
    cohortYear: toText(student['Exam_year'] ?? student['Cohort_Year'] ?? student['cohortYear'], 'Unknown'),
    yearLevel: toText(student['Year_Level'] ?? student['YearLevel'] ?? student['yearLevel'], 'All Year Levels'),
    prediction,
    probability,
    riskLevel,
  }
}

function confidencePct(probability: number): string {
  return `${Math.round(probability * 100)}%`
}

function drawSimpleTable(
  pdf: any,
  startY: number,
  columns: string[],
  rows: string[][],
): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const left = 40
  const right = pageWidth - 40
  const width = right - left
  const rowHeight = 18
  const colWidth = width / columns.length
  let y = startY

  const ensurePage = () => {
    if (y + rowHeight > pageHeight - 40) {
      pdf.addPage()
      y = 40
    }
  }

  ensurePage()
  pdf.setFont('helvetica', 'bold')
  columns.forEach((header, idx) => {
    pdf.text(header, left + idx * colWidth + 4, y + 12)
  })
  y += rowHeight

  pdf.setFont('helvetica', 'normal')
  rows.forEach((row) => {
    ensurePage()
    row.forEach((value, idx) => {
      const clipped = value.length > 36 ? `${value.slice(0, 33)}...` : value
      pdf.text(clipped, left + idx * colWidth + 4, y + 12)
    })
    y += rowHeight
  })

  return y + 6
}

function formatDate(dateText: string): string {
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ReportsPage() {
  const { user } = useAuth()
  const reportRef = useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [generatedOn, setGeneratedOn] = useState(new Date().toISOString())
  const [rows, setRows] = useState<ReportRow[]>([])
  const [cohortYear, setCohortYear] = useState('All Cohorts')
  const [yearLevel, setYearLevel] = useState('All Year Levels')
  const [riskCategory, setRiskCategory] = useState<RiskCategory>('All Risk Levels')
  const hasLoggedReportView = useRef(false)

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

        setGeneratedOn(latest.predictionGeneratedAt)

        const analyticsRows = await getPredictionRowsAnalyticsByRunId(latest.id, {
          uid: user.uid,
          role: user.role,
        })

        const mappedRows = analyticsRows.map((item) => toReportRow(item))
        setRows(mappedRows)

        if (!hasLoggedReportView.current) {
          hasLoggedReportView.current = true
          void createAuditLog({
            action: 'View Report',
            details: `Opened predictive report view (${mappedRows.length} rows)` ,
            status: 'Success',
            actor: {
              uid: user.uid,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          })
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load report data from Firestore.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [user?.role, user?.uid])

  const cohortOptions = useMemo(() => {
    const years = Array.from(new Set(rows.map((row) => row.cohortYear))).filter((value) => value && value !== 'Unknown')
    years.sort((a, b) => Number(b) - Number(a))
    return ['All Cohorts', ...years]
  }, [rows])

  const yearLevelOptions = useMemo(() => {
    const sourceRows = cohortYear === 'All Cohorts' ? rows : rows.filter((row) => row.cohortYear === cohortYear)
    const levels = Array.from(new Set(sourceRows.map((row) => row.yearLevel))).filter(Boolean)
    return ['All Year Levels', ...levels]
  }, [cohortYear, rows])

  useEffect(() => {
    if (!yearLevelOptions.includes(yearLevel)) {
      setYearLevel('All Year Levels')
    }
  }, [yearLevelOptions, yearLevel])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCohort = cohortYear === 'All Cohorts' || row.cohortYear === cohortYear
      const matchesYearLevel = yearLevel === 'All Year Levels' || row.yearLevel === yearLevel
      const matchesRisk = riskCategory === 'All Risk Levels' || row.riskLevel === riskCategory
      return matchesCohort && matchesYearLevel && matchesRisk
    })
  }, [cohortYear, riskCategory, rows, yearLevel])

  const totalStudents = filteredRows.length
  const predictedPass = filteredRows.filter((row) => row.prediction === 'PASSED').length
  const predictedFail = totalStudents - predictedPass
  const passRate = totalStudents > 0 ? (predictedPass / totalStudents) * 100 : 0
  const failedRows = filteredRows.filter((row) => row.prediction === 'FAILED')
  const passedRows = filteredRows.filter((row) => row.prediction === 'PASSED')
  const highRiskCount = failedRows.filter((row) => row.riskLevel === 'High Risk').length
  const mediumRiskCount = failedRows.filter((row) => row.riskLevel === 'Medium Risk').length
  const lowRiskCount = failedRows.filter((row) => row.riskLevel === 'Low Risk').length

  const handlePrint = () => {
    if (user?.uid) {
      void createAuditLog({
        action: 'Generate Report',
        details: `Printed predictive report for ${cohortYear}`,
        status: 'Success',
        actor: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    }

    window.print()
  }

  const handleDownloadPdf = async () => {
    if (totalStudents === 0) return

    try {
      setDownloading(true)
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'pt', 'a4')

      let y = 42
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('LiCEnSURE Predictive Report', 40, y)
      y += 20
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.text(`Cohort: ${cohortYear} | Year Level: ${yearLevel} | Risk Filter: ${riskCategory}`, 40, y)
      y += 16
      pdf.text(`Generated on: ${formatDate(generatedOn)}`, 40, y)
      y += 20
      pdf.text(`Total Students: ${totalStudents} | Predicted Pass: ${predictedPass} | Predicted Fail: ${predictedFail}`, 40, y)
      y += 24

      const failedByRisk: Array<{ title: 'High Risk' | 'Medium Risk' | 'Low Risk'; rows: ReportRow[] }> = [
        { title: 'High Risk', rows: failedRows.filter((row) => row.riskLevel === 'High Risk') },
        { title: 'Medium Risk', rows: failedRows.filter((row) => row.riskLevel === 'Medium Risk') },
        { title: 'Low Risk', rows: failedRows.filter((row) => row.riskLevel === 'Low Risk') },
      ]

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.text('FAILED Students Grouped by Risk Level', 40, y)
      y += 14
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)

      failedByRisk.forEach((group) => {
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${group.title} (${group.rows.length})`, 40, y)
        y += 10
        pdf.setFont('helvetica', 'normal')

        if (group.rows.length === 0) {
          pdf.text('No students in this risk group.', 44, y)
          y += 16
          return
        }

        y = drawSimpleTable(
          pdf,
          y,
          ['Student Code', 'Student Name', 'Year Level', 'Failure Confidence'],
          group.rows.map((row) => [row.studentCode, row.studentName, row.yearLevel, confidencePct(row.probability)]),
        )
      })

      if (y > pdf.internal.pageSize.getHeight() - 80) {
        pdf.addPage()
        y = 40
      }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.text(`PASSED Students (${passedRows.length})`, 40, y)
      y += 14
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)

      if (passedRows.length === 0) {
        pdf.text('No students predicted as PASSED.', 44, y)
        y += 16
      } else {
        y = drawSimpleTable(
          pdf,
          y,
          ['Student Code', 'Student Name', 'Year Level', 'Pass Confidence'],
          passedRows.map((row) => [row.studentCode, row.studentName, row.yearLevel, confidencePct(row.probability)]),
        )
      }

      const safeCohort = cohortYear.replace(/[^a-zA-Z0-9_-]/g, '-')
      pdf.save(`licensure-predictive-report-${safeCohort}.pdf`)

      if (user?.uid) {
        await createAuditLog({
          action: 'Generate Report',
          details: `Created predictive report PDF for ${cohortYear}`,
          status: 'Success',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        })
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to generate PDF report.')

      if (user?.uid) {
        void createAuditLog({
          action: 'Generate Report',
          details: `Failed to generate predictive report PDF - ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`,
          status: 'Failed',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        })
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Predictive Reports</h1>
        <p className="text-sm text-gray-600 mt-2">Generate comprehensive reports with filters and download options</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
        <div className="inline-flex items-center gap-2 text-[#0B2C5D] text-xl font-semibold">
          <Filter className="h-5 w-5" />
          Report Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Cohort Year</p>
            <select
              value={cohortYear}
              onChange={(event) => setCohortYear(event.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-800 bg-white focus:outline-none"
            >
              {cohortOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Year Level</p>
            <select
              value={yearLevel}
              onChange={(event) => setYearLevel(event.target.value)}
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-800 bg-white focus:outline-none"
            >
              {yearLevelOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Risk Category</p>
            <select
              value={riskCategory}
              onChange={(event) => setRiskCategory(event.target.value as RiskCategory)}
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-800 bg-white focus:outline-none"
            >
              {['All Risk Levels', 'High Risk', 'Medium Risk', 'Low Risk'].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <header className="px-8 py-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#0B2C5D]">Report Preview</h2>
            <p className="text-sm text-gray-600 mt-2">Licensure Exam Predictive Report - Cohort {cohortYear}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || totalStudents === 0 || loading}
              className="h-11 rounded-2xl px-5 inline-flex items-center gap-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#0B2C5D' }}
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Preparing PDF...' : 'Download PDF'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={totalStudents === 0 || loading}
              className="h-11 rounded-2xl px-5 inline-flex items-center gap-2 text-sm border border-[#0B2C5D] text-[#0B2C5D] disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </header>

        <div className="px-8 py-10" ref={reportRef}>
          <div className="text-center">
            <h3 className="text-3xl font-semibold text-[#0B2C5D]">LiCEnSURE Predictive Report</h3>
            <p className="text-base text-gray-600 mt-3">Civil Engineering Licensure Exam Success Prediction</p>
            <p className="text-sm text-gray-500 mt-2">Generated on: {formatDate(generatedOn)}</p>
          </div>

          <hr className="my-8 border-gray-200" />

          {loading && <p className="text-lg text-gray-500 text-center py-8">Loading report data from Firestore...</p>}

          {!loading && totalStudents === 0 && (
            <p className="text-lg text-gray-500 text-center py-8">No prediction data available for the selected filters.</p>
          )}

          {!loading && totalStudents > 0 && (
            <>
              <section>
                <h4 className="text-xl font-semibold text-[#0B2C5D] mb-4">Executive Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="rounded-2xl px-6 py-5" style={{ backgroundColor: '#f3f4f6' }}>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-3xl font-semibold text-[#0B2C5D] mt-2">{totalStudents}</p>
                  </div>
                  <div className="rounded-2xl px-6 py-5" style={{ backgroundColor: '#ecfdf3' }}>
                    <p className="text-sm text-gray-600">Predicted Pass</p>
                    <p className="text-3xl font-semibold text-green-700 mt-2">{predictedPass}</p>
                  </div>
                  <div className="rounded-2xl px-6 py-5" style={{ backgroundColor: '#fef2f2' }}>
                    <p className="text-sm text-gray-600">Predicted Fail</p>
                    <p className="text-3xl font-semibold text-red-700 mt-2">{predictedFail}</p>
                  </div>
                  <div className="rounded-2xl px-6 py-5" style={{ backgroundColor: '#eef2ff' }}>
                    <p className="text-sm text-gray-600">Pass Rate</p>
                    <p className="text-3xl font-semibold text-blue-700 mt-2">{passRate.toFixed(1)}%</p>
                  </div>
                </div>
              </section>

              <section className="mt-8">
                <h4 className="text-xl font-semibold text-[#0B2C5D] mb-4">Risk Distribution Analysis</h4>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['Risk Level', 'Count', 'Percentage', 'Recommendation'].map((header) => (
                          <th key={header} className="text-left px-6 py-4 text-sm text-gray-700 font-semibold">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: 'High Risk',
                          count: highRiskCount,
                          badgeClass: 'bg-red-100 text-red-600',
                          recommendation: 'Immediate intervention required',
                        },
                        {
                          label: 'Medium Risk',
                          count: mediumRiskCount,
                          badgeClass: 'bg-amber-100 text-amber-700',
                          recommendation: 'Monitor and provide support',
                        },
                        {
                          label: 'Low Risk',
                          count: lowRiskCount,
                          badgeClass: 'bg-green-100 text-green-700',
                          recommendation: 'Continue regular program',
                        },
                      ].map((row) => (
                        <tr key={row.label} className="border-b border-gray-200 last:border-b-0">
                          <td className="px-6 py-5">
                            <span className={`inline-flex rounded-full px-4 py-1 text-sm font-medium ${row.badgeClass}`}>{row.label}</span>
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-700">{row.count}</td>
                          <td className="px-6 py-5 text-sm text-gray-700">
                            {predictedFail > 0 ? `${((row.count / predictedFail) * 100).toFixed(1)}%` : '0.0%'}
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-600">{row.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-8">
                <h4 className="text-xl font-semibold text-[#0B2C5D] mb-4">Strategic Recommendations</h4>
                <div className="space-y-5">
                  {[
                    {
                      title: 'Targeted Intervention Programs',
                      body: `Implement specialized review sessions for the ${highRiskCount} high-risk students to improve their preparedness and exam readiness.`,
                    },
                    {
                      title: 'Enhanced Monitoring',
                      body: `Establish regular progress tracking for ${mediumRiskCount} medium-risk students with bi-weekly assessments and personalized guidance.`,
                    },
                    {
                      title: 'Resource Allocation',
                      body: 'Allocate additional faculty support and study materials to at-risk groups to maximize overall pass rates.',
                    },
                  ].map((item, index) => (
                    <div key={item.title} className="flex items-start gap-4">
                      <span className="h-8 w-8 rounded-full bg-amber-400 text-white text-sm font-semibold flex items-center justify-center">{index + 1}</span>
                      <div>
                        <p className="text-base font-semibold text-[#0B2C5D]">{item.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="my-8 border-gray-200" />

              <footer className="text-center text-gray-500 space-y-2">
                <p className="text-sm">University of Science and Technology of Southern Philippines (USTP)</p>
                <p className="text-sm">LiCEnSURE - Licensure Exam Predictive System</p>
                <p className="text-sm">This report is confidential and intended for authorized personnel only.</p>
              </footer>
            </>
          )}
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 text-sm">
          {error}
        </section>
      )}
    </div>
  )
}
