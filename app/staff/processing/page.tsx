'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Circle, Database, Loader2, Play } from 'lucide-react'
import { getUploadSummary, getUploadedCsvPayload, saveProcessingSummary, type UploadSummary } from '@/lib/upload-session'

const PROCESSING_STEPS = ['Handling missing values', 'Removing duplicates', 'Standardizing formats', 'Encoding categorical data']

const CLEANING_DETAILS = [
  {
    title: 'Missing Value Imputation',
    desc: 'Automatically handles missing data using statistical methods',
  },
  {
    title: 'Data Standardization',
    desc: 'Ensures consistent formatting across all records',
  },
  {
    title: 'Categorical Encoding',
    desc: 'Converts text categories to numerical values for model processing',
  },
]

export default function ProcessingPage() {
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [processingStats, setProcessingStats] = useState<{
    processedRows: number
    missingRows: number
    duplicatesRemoved: number
    typeCoercionIssues: number
    numericFeatures: number
    categoricalFeatures: number
    encodedFeatureCount: number
  } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setUploadSummary(getUploadSummary())
  }, [])

  const uploadedFileName = uploadSummary?.fileName ?? 'student_data_2024.csv'
  const importedCount = uploadSummary?.validRows ?? 0

  const runProcessing = async () => {
    const payload = getUploadedCsvPayload()
    if (!payload?.uploadId) {
      setError('No backend upload session found. Please upload and validate CSV first.')
      return
    }

    setError('')
    setIsDone(false)
    setIsProcessing(true)
    setProcessingStats(null)
    setActiveStep(0)
    setProgress(5)

    try {
      for (let i = 0; i < PROCESSING_STEPS.length; i += 1) {
        setActiveStep(i)
        setProgress(20 + i * 20)
        await new Promise((resolve) => setTimeout(resolve, 450))
      }

      const response = await fetch('/api/processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: payload.uploadId }),
      })

      const backendPayload = await response.json() as {
        processedRows?: number
        missingRows?: number
        imputedValues?: number
        duplicatesRemoved?: number
        typeCoercionIssues?: number
        numericFeatures?: number
        categoricalFeatures?: number
        encodedFeatureCount?: number
        error?: string
      }

      if (!response.ok) {
        throw new Error(backendPayload.error || 'Failed to fetch processing report.')
      }

      setProcessingStats({
        processedRows: backendPayload.processedRows ?? 0,
        missingRows: backendPayload.imputedValues ?? backendPayload.missingRows ?? 0,
        duplicatesRemoved: backendPayload.duplicatesRemoved ?? 0,
        typeCoercionIssues: backendPayload.typeCoercionIssues ?? 0,
        numericFeatures: backendPayload.numericFeatures ?? 0,
        categoricalFeatures: backendPayload.categoricalFeatures ?? 0,
        encodedFeatureCount: backendPayload.encodedFeatureCount ?? 0,
      })

      saveProcessingSummary({
        uploadId: payload.uploadId,
        cleanedAndEncoded: true,
        processedRows: backendPayload.processedRows ?? 0,
        missingRows: backendPayload.imputedValues ?? backendPayload.missingRows ?? 0,
        duplicatesRemoved: backendPayload.duplicatesRemoved ?? 0,
        encodedFeatureCount:
          backendPayload.encodedFeatureCount ??
          ((backendPayload.numericFeatures ?? 0) + (backendPayload.categoricalFeatures ?? 0)),
        completedAt: new Date().toISOString(),
      })

      setActiveStep(PROCESSING_STEPS.length)
      setProgress(100)
      setIsDone(true)
    } catch (processingError) {
      setError(processingError instanceof Error ? processingError.message : 'Failed to fetch processing report.')
      setActiveStep(-1)
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Clean and Encode Data</h1>
        <p className="text-sm text-gray-600 mt-2">Prepare data for prediction by cleaning and encoding</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Data Processing</h2>
            <p className="mt-1 text-sm text-gray-500">File: {uploadedFileName} ({importedCount} records)</p>
          </div>
          <button
            type="button"
            onClick={runProcessing}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#0B2C5D' }}
          >
            <Play className="h-4 w-4" />
            {isProcessing ? 'Processing...' : isDone ? 'Process Again' : 'Start Processing'}
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-lg text-gray-700 mb-2">
            <span>Processing Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-5 transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: '#F2B705' }}
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {PROCESSING_STEPS.map((step, index) => {
            const stepDone = isDone || activeStep > index
            const stepActive = isProcessing && activeStep === index
            return (
            <div key={step} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
              {stepDone ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : stepActive ? (
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              ) : (
                <Circle className="h-6 w-6 text-gray-300" />
              )}
              <span className="text-base font-medium text-gray-700">{step}</span>
            </div>
            )
          })}
        </div>
      </div>

      {processingStats && (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: '#0B2C5D' }}>
          <Database className="h-6 w-6" />
          Processing Summary
        </h3>
          <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Processed Rows', value: processingStats.processedRows },
              { label: 'Values Imputed', value: processingStats.missingRows },
              { label: 'Duplicates Removed', value: processingStats.duplicatesRemoved },
              { label: 'Fields Encoded', value: processingStats.encodedFeatureCount || (processingStats.numericFeatures + processingStats.categoricalFeatures) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-xl font-semibold mt-1" style={{ color: '#0B2C5D' }}>{item.value}</p>
              </div>
            ))}
          </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-5 mb-5 flex items-start gap-3">
          <CheckCircle className="h-7 w-7 text-green-600 mt-0.5" />
          <div>
            <p className="text-base font-semibold text-green-800">Data Cleaning Complete</p>
            <p className="text-sm text-green-700 mt-1">All data has been successfully cleaned and encoded. The dataset is now ready for prediction processing.</p>
            {processingStats.typeCoercionIssues > 0 && (
              <p className="text-sm text-amber-700 mt-2">
                {processingStats.typeCoercionIssues} value(s) had invalid numeric formats and were handled during cleaning.
              </p>
            )}
          </div>
        </div>

        <Link
          href="/staff/predict"
          className="block w-full rounded-xl px-5 py-2.5 text-center text-sm font-medium"
          style={{ backgroundColor: '#F2B705', color: '#111827' }}
        >
          Proceed to Run Prediction
        </Link>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {CLEANING_DETAILS.map((item, idx) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#F2B705' }}>
                {idx + 1}
              </span>
              <div>
                <p className="text-lg font-semibold text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {!processingStats && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm">{error}</div>
      )}
    </div>
  )
}
