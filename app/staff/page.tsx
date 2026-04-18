'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Database, FileText, Upload, Play, Users } from 'lucide-react'
import { getCleanedRows, getPredictedRows, getUploadSummary, getUploadedCsvPayload, type UploadSummary } from '@/lib/upload-session'

type PipelineStep = {
  title: string
  subtitle: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  isDone: boolean
}

export default function StaffDashboard() {
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)
  const [hasUploadedFile, setHasUploadedFile] = useState(false)
  const [cleanedCount, setCleanedCount] = useState(0)
  const [predictedCount, setPredictedCount] = useState(0)
  const [passedCount, setPassedCount] = useState(0)

  useEffect(() => {
    const summary = getUploadSummary()
    const uploadedPayload = getUploadedCsvPayload()
    const cleanedRows = getCleanedRows()
    const predictedRows = getPredictedRows()

    setUploadSummary(summary)
    setHasUploadedFile(Boolean(uploadedPayload))
    setCleanedCount(cleanedRows.length)
    setPredictedCount(predictedRows.length)
    setPassedCount(predictedRows.filter((row) => row.prediction === 'PASSED').length)
  }, [])

  const totalRecords = uploadSummary?.validRows ?? cleanedCount

  const steps: PipelineStep[] = useMemo(() => {
    return [
      {
        title: 'Step 1',
        subtitle: 'Import CSV Files',
        href: '/staff/upload',
        icon: Upload,
        isDone: hasUploadedFile,
      },
      {
        title: 'Step 2',
        subtitle: 'Validate Data',
        href: '/staff/validate',
        icon: CheckCircle2,
        isDone: (uploadSummary?.validRows ?? 0) > 0,
      },
      {
        title: 'Step 3',
        subtitle: 'Clean & Encode',
        href: '/staff/processing',
        icon: Database,
        isDone: cleanedCount > 0,
      },
      {
        title: 'Step 4',
        subtitle: 'Run Prediction',
        href: '/staff/predict',
        icon: Play,
        isDone: predictedCount > 0,
      },
    ]
  }, [cleanedCount, hasUploadedFile, predictedCount, uploadSummary?.validRows])

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Staff Dashboard</h1>
        <p className="text-gray-500 text-sm mt-2">Data processing and prediction workflow management</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6" style={{ color: '#0B2C5D' }}>Data Processing Pipeline</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-4 items-center">
          {steps.map((step, index) => {
            const Icon = step.icon
            const iconBg = index === 0 ? '#e8edf5' : index === 1 ? '#ecfdf3' : index === 2 ? '#f5ebff' : '#fef8e8'
            const iconColor = index === 0 ? '#2563eb' : index === 1 ? '#16a34a' : index === 2 ? '#9333ea' : '#d4a106'

            return (
              <>
                <Link
                  key={step.title}
                  href={step.href}
                  className="rounded-xl border bg-white px-5 py-6 text-center hover:shadow-md transition-all"
                  style={{ borderColor: step.isDone ? '#F2B705' : '#d1d5db' }}
                >
                  <div className="mx-auto mb-3 h-14 w-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: iconBg }}>
                    <Icon className="h-7 w-7" style={{ color: iconColor }} />
                  </div>
                  <div className="text-xl font-semibold text-gray-800">{step.title}</div>
                  <div className="text-base text-gray-600 mt-1.5">{step.subtitle}</div>
                </Link>

                {index < steps.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center text-gray-400" key={`${step.title}-arrow`}>
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: FileText,
            value: uploadSummary ? 1 : 0,
            label: 'Total Uploads',
            iconBg: '#e8edf5',
            iconColor: '#2563eb',
          },
          {
            icon: CheckCircle2,
            value: passedCount,
            label: 'Successful Predictions',
            iconBg: '#ecfdf3',
            iconColor: '#16a34a',
          },
          {
            icon: Users,
            value: totalRecords.toLocaleString(),
            label: 'Total Records',
            iconBg: '#f5ebff',
            iconColor: '#9333ea',
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 h-14 w-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                <Icon className="h-7 w-7" style={{ color: card.iconColor }} />
              </div>
              <div className="text-4xl font-semibold" style={{ color: '#0B2C5D' }}>{card.value}</div>
              <div className="text-base text-gray-500 mt-2">{card.label}</div>
            </div>
          )
        })}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-5" style={{ color: '#0B2C5D' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              href: '/staff/upload',
              title: 'Upload New Data',
              desc: 'Import CSV file with student records',
            },
            {
              href: '/staff/validate',
              title: 'Validate Uploaded Data',
              desc: 'Run notebook-style checks and rules',
            },
            {
              href: '/staff/students',
              title: 'Manage Records',
              desc: 'Edit and update student records',
            },
          ].map((action) => (
            <Link key={action.title} href={action.href} className="rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm transition-all">
              <p className="text-xl font-semibold text-gray-800">{action.title}</p>
              <p className="text-sm text-gray-500 mt-1.5">{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
