'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BarChart3, Clock3, Users } from 'lucide-react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/lib/auth'
import {
  createAuditLog,
  getLatestPredictionRunAnalytics,
  getPredictionRowsAnalyticsByRunId,
  type PredictionRowAnalytics,
  type PredictionRunAnalyticsRecord,
} from '@/lib/firebase'

type ConfidenceBucket = {
  label: '90-100%' | '80-89%' | '70-79%' | '60-69%'
  count: number
}

function getConfidence(row: PredictionRowAnalytics): number {
  const student = row.student as Record<string, unknown>
  const raw = student['probability']
  if (typeof raw !== 'number' || Number.isNaN(raw)) return 0
  const confidence = Math.max(raw, 1 - raw)
  return Math.max(0, Math.min(1, confidence))
}

export default function ChairmanDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [latestRun, setLatestRun] = useState<PredictionRunAnalyticsRecord | null>(null)
  const [rowAnalytics, setRowAnalytics] = useState<PredictionRowAnalytics[]>([])
  const hasLoggedDashboardView = useRef(false)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    if (!hasLoggedDashboardView.current) {
      hasLoggedDashboardView.current = true
      void createAuditLog({
        action: 'View Dashboard',
        details: 'Accessed chairman dashboard overview',
        status: 'Success',
        actor: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    }

    let isMounted = true

    const loadDashboard = async () => {
      try {
        if (isMounted) setLoading(true)
        const latest = await getLatestPredictionRunAnalytics({ uid: user.uid, role: user.role })
        if (isMounted) setLatestRun(latest)

        if (latest?.id) {
          const rows = await getPredictionRowsAnalyticsByRunId(latest.id, { uid: user.uid, role: user.role })
          if (isMounted) setRowAnalytics(rows)
        } else {
          if (isMounted) setRowAnalytics([])
        }
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard analytics.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadDashboard()

    const pollId = window.setInterval(() => {
      void loadDashboard()
    }, 15000)

    return () => {
      isMounted = false
      window.clearInterval(pollId)
    }
  }, [user?.role, user?.uid])

  const confidenceBuckets = useMemo<ConfidenceBucket[]>(() => {
    const buckets: ConfidenceBucket[] = [
      { label: '90-100%', count: 0 },
      { label: '80-89%', count: 0 },
      { label: '70-79%', count: 0 },
      { label: '60-69%', count: 0 },
    ]

    rowAnalytics.forEach((row) => {
      const confidencePct = getConfidence(row) * 100
      if (confidencePct >= 90) buckets[0].count += 1
      else if (confidencePct >= 80) buckets[1].count += 1
      else if (confidencePct >= 70) buckets[2].count += 1
      else if (confidencePct >= 60) buckets[3].count += 1
    })

    return buckets
  }, [rowAnalytics])

  const overview = useMemo(() => {
    const total = latestRun?.totalAnalyzed ?? 0
    const passRate = latestRun?.passRate ?? 0
    const atRisk = latestRun?.failedCount ?? 0

    return {
      total,
      passRate,
      atRisk,
      highRisk: latestRun?.highRiskCount ?? 0,
      mediumRisk: latestRun?.mediumRiskCount ?? 0,
      lowRisk: latestRun?.lowRiskCount ?? 0,
    }
  }, [latestRun, rowAnalytics])

  const riskTotal = overview.highRisk + overview.mediumRisk + overview.lowRisk
  const riskPieData = [
    { name: 'High Risk', value: overview.highRisk, color: '#ef4444' },
    { name: 'Medium Risk', value: overview.mediumRisk, color: '#f59e0b' },
    { name: 'Low Risk', value: overview.lowRisk, color: '#10b981' },
  ]

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Dashboard Overview</h1>
        <p className="text-sm text-gray-600 mt-2">Strategic insights and prediction summary for Civil Engineering licensure exam</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {[
          {
            icon: Users,
            value: overview.total,
            label: 'Total Students Analyzed',
            iconBg: '#e8edf5',
            iconColor: '#2563eb',
            formatter: (val: number) => val.toLocaleString(),
          },
          {
            icon: BarChart3,
            value: overview.passRate,
            label: 'Predicted Pass Rate',
            iconBg: '#ecfdf3',
            iconColor: '#16a34a',
            formatter: (val: number) => `${val.toFixed(1)}%`,
          },
          {
            icon: AlertTriangle,
            value: overview.atRisk,
            label: 'At-Risk Students',
            iconBg: '#fef2f2',
            iconColor: '#ef4444',
            formatter: (val: number) => val.toLocaleString(),
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <article key={card.label} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                <Icon className="h-6 w-6" style={{ color: card.iconColor }} />
              </div>
              <div className="text-3xl font-semibold" style={{ color: '#0B2C5D' }}>{card.formatter(card.value)}</div>
              <p className="text-sm text-gray-600 mt-2">{card.label}</p>
            </article>
          )
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0B2C5D] mb-4 inline-flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Risk Distribution
          </h2>

          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="45%"
                  outerRadius={120}
                  innerRadius={0}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {riskPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm mt-2">
            <p style={{ color: '#ef4444' }}>High Risk: {riskTotal > 0 ? ((overview.highRisk / riskTotal) * 100).toFixed(0) : '0'}%</p>
            <p style={{ color: '#f59e0b' }}>Medium Risk: {riskTotal > 0 ? ((overview.mediumRisk / riskTotal) * 100).toFixed(0) : '0'}%</p>
            <p style={{ color: '#10b981' }}>Low Risk: {riskTotal > 0 ? ((overview.lowRisk / riskTotal) * 100).toFixed(0) : '0'}%</p>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0B2C5D] mb-4 inline-flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Prediction Confidence Overview
          </h2>

          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceBuckets} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#4b5563' }} />
                <YAxis tick={{ fontSize: 12, fill: '#4b5563' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0B2C5D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-sm text-gray-600">Distribution of prediction confidence levels across all analyzed students</p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#0B2C5D] mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              href: '/chairman/predictions',
              title: 'View Student Predictions',
              desc: 'Detailed prediction results for each student',
            },
            {
              href: '/chairman/reports',
              title: 'Generate Reports',
              desc: 'Create comprehensive predictive reports',
            },
            {
              href: '/chairman/users',
              title: 'User Management',
              desc: 'Manage user accounts and role assignments',
            },
          ].map((action) => (
            <Link key={action.title} href={action.href} className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-all">
              <p className="text-lg font-semibold text-[#0B2C5D]">{action.title}</p>
              <p className="text-sm text-gray-600 mt-2">{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {loading && (
        <section className="rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm text-gray-600">
          Loading dashboard analytics from Firestore...
        </section>
      )}

      {!loading && !latestRun && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          No prediction analytics found yet. Have staff run a prediction first.
        </section>
      )}

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </section>
      )}
    </div>
  )
}
