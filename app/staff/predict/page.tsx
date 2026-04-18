'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, Loader2, Play, TrendingUp } from 'lucide-react'
import {
  getPredictedRows,
  getProcessingSummary,
  getUploadSummary,
  getUploadedCsvPayload,
  savePredictedRows,
  type PredictedStudentRow,
  type ProcessingSummary,
  type UploadSummary,
} from '@/lib/upload-session'

type Stage = 'ready' | 'confirm' | 'running' | 'done'

export default function PredictPage() {
  const [stage, setStage] = useState<Stage>('ready')
  const [progress, setProgress] = useState(0)
  const [processedRowsLive, setProcessedRowsLive] = useState(0)
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null)
  const [predictionCount, setPredictionCount] = useState(0)
  const [passed, setPassed] = useState(0)
  const [failed, setFailed] = useState(0)
  const [highRisk, setHighRisk] = useState(0)
  const [mediumRisk, setMediumRisk] = useState(0)
  const [lowRisk, setLowRisk] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    setUploadSummary(getUploadSummary())
    setProcessingSummary(getProcessingSummary())

    const predicted = getPredictedRows()
    if (predicted.length > 0) {
      setPredictionCount(predicted.length)
      setPassed(predicted.filter((row) => row.prediction === 'PASSED').length)
      setFailed(predicted.filter((row) => row.prediction === 'FAILED').length)
      setRiskDistribution(predicted)
      setStage('done')
      setProgress(100)
      setProcessedRowsLive(predicted.length)
    }
  }, [])

  const setRiskDistribution = (rows: PredictedStudentRow[]) => {
    const riskScores = rows.map((row) => (row.prediction === 'FAILED' ? row.probability : 1 - row.probability))
    const high = riskScores.filter((score) => score >= 0.7).length
    const medium = riskScores.filter((score) => score >= 0.4 && score < 0.7).length
    const low = riskScores.length - high - medium
    setHighRisk(high)
    setMediumRisk(medium)
    setLowRisk(low)
  }

  const importedCount = uploadSummary?.validRows ?? predictionCount
  const uploadedFileName = uploadSummary?.fileName ?? 'student_data_2024.csv'
  const currentUploadId = getUploadedCsvPayload()?.uploadId
  const isCleanedAndEncoded = Boolean(
    processingSummary?.cleanedAndEncoded &&
      currentUploadId &&
      processingSummary.uploadId === currentUploadId,
  )

  const openConfirm = () => {
    if (!isCleanedAndEncoded) {
      setError('Data is not yet cleaned and encoded. Complete Data Processing first.')
      return
    }

    setError('')
    setStage('confirm')
  }

  const runPrediction = async () => {
    const uploadPayload = getUploadedCsvPayload()
    if (!uploadPayload?.uploadId) {
      setError('No backend upload session found. Please upload and validate CSV first.')
      setStage('ready')
      return
    }

    if (!isCleanedAndEncoded) {
      setError('Data is not yet cleaned and encoded. Complete Data Processing first.')
      setStage('ready')
      return
    }

    setError('')
    try {
      setStage('running')
      setProgress(12)
      setProcessedRowsLive(Math.floor(importedCount * 0.2))
      await new Promise((resolve) => setTimeout(resolve, 320))

      setProgress(35)
      setProcessedRowsLive(Math.floor(importedCount * 0.35))

      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: uploadPayload.uploadId }),
      })

      setProgress(72)
      setProcessedRowsLive(Math.floor(importedCount * 0.7))

      const payload = (await response.json()) as { predictions?: PredictedStudentRow[]; error?: string }
      if (!response.ok || !Array.isArray(payload.predictions)) {
        throw new Error(payload.error || 'Prediction API failed.')
      }

      savePredictedRows(payload.predictions)

      const predictedRows = payload.predictions
      const passedCount = predictedRows.filter((row) => row.prediction === 'PASSED').length
      const failedCount = predictedRows.length - passedCount
      setPredictionCount(predictedRows.length)
      setPassed(passedCount)
      setFailed(failedCount)
      setRiskDistribution(predictedRows)

      setProgress(100)
      setProcessedRowsLive(predictedRows.length)
      await new Promise((resolve) => setTimeout(resolve, 180))
      setStage('done')
    } catch (predictionError) {
      setError(predictionError instanceof Error ? predictionError.message : 'Prediction failed.')
      setStage('ready')
      setProgress(0)
      setProcessedRowsLive(0)
    }
  }

  const reset = () => {
    setStage('ready')
    setProgress(0)
    setProcessedRowsLive(0)
    setError('')
  }

  return (
    <>
      <div className="p-8 max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Run Prediction</h1>
          <p className="text-sm text-gray-600 mt-2">Execute machine learning model on prepared data</p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Dataset Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">File Name</p>
              <p className="text-2xl font-medium mt-2" style={{ color: '#0B2C5D' }}>{uploadedFileName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-2xl font-medium mt-2" style={{ color: '#0B2C5D' }}>{importedCount} students</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data Status</p>
              <p className="text-2xl font-medium mt-2 inline-flex items-center gap-2" style={{ color: isCleanedAndEncoded ? '#059669' : '#b45309' }}>
                <CheckCircle className="h-5 w-5" />
                {isCleanedAndEncoded ? 'Cleaned & Encoded' : 'Not Ready'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Model Version</p>
              <p className="text-2xl font-medium mt-2" style={{ color: '#0B2C5D' }}>v2.1.3</p>
            </div>
          </div>
        </section>

        {stage === 'ready' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-5">
              <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Ready to Run Prediction</h3>
                <p className="text-sm text-gray-600 mt-2">
                  The prediction model will analyze all {importedCount} student records and generate risk classifications and pass/fail predictions. This process may take a few minutes.
                </p>
                {!isCleanedAndEncoded && (
                  <p className="text-sm text-red-600 mt-3">Cannot proceed until data is cleaned and encoded.</p>
                )}
              </div>
            </div>

            {error && <p className="text-red-600 text-lg mb-4">{error}</p>}

            <button
              onClick={openConfirm}
              disabled={!isCleanedAndEncoded}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#0B2C5D' }}
            >
              <Play className="h-4 w-4" />
              Start Prediction
            </button>
          </section>
        )}

        {stage === 'running' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mt-0.5" />
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Processing Predictions</h3>
                <p className="text-sm text-gray-600 mt-2">Please wait while the model analyzes the data...</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-5 transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: '#0B2C5D' }} />
              </div>
              <p className="mt-3 text-sm text-gray-500">Processing {processedRowsLive} of {importedCount} records...</p>
            </div>
          </section>
        )}

        {stage === 'done' && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex items-start gap-3 mb-5">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xl font-semibold text-gray-800">Prediction Complete</p>
                  <p className="text-sm text-gray-600 mt-1">All predictions have been successfully generated and saved to the system.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Total Analyzed', value: predictionCount, color: '#0B2C5D', bg: '#eff6ff' },
                  { label: 'Predicted Pass', value: passed, color: '#059669', bg: '#ecfdf5' },
                  { label: 'Predicted Fail', value: failed, color: '#b91c1c', bg: '#fef2f2' },
                  { label: 'Pass Rate', value: `${predictionCount > 0 ? ((passed / predictionCount) * 100).toFixed(1) : '0.0'}%`, color: '#0B2C5D', bg: '#fffbeb' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-200 p-5" style={{ backgroundColor: item.bg }}>
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="text-2xl font-semibold mt-2" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/staff/summary"
                  className="flex-1 rounded-xl px-5 py-2.5 text-center text-sm font-medium"
                  style={{ backgroundColor: '#F2B705', color: '#111827' }}
                >
                  View Processing Summary
                </Link>
                <Link
                  href="/staff"
                  className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Back to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Run Again
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-5 inline-flex items-center gap-3">
                <TrendingUp className="h-5 w-5" style={{ color: '#0B2C5D' }} />
                Risk Distribution
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border p-5" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
                  <p className="text-base text-gray-700">High Risk</p>
                  <p className="text-2xl font-semibold mt-2" style={{ color: '#b91c1c' }}>{highRisk}</p>
                  <p className="text-sm mt-2" style={{ color: '#dc2626' }}>{predictionCount > 0 ? ((highRisk / predictionCount) * 100).toFixed(1) : '0.0'}% of total</p>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
                  <p className="text-base text-gray-700">Medium Risk</p>
                  <p className="text-2xl font-semibold mt-2" style={{ color: '#a16207' }}>{mediumRisk}</p>
                  <p className="text-sm mt-2" style={{ color: '#d97706' }}>{predictionCount > 0 ? ((mediumRisk / predictionCount) * 100).toFixed(1) : '0.0'}% of total</p>
                </div>
                <div className="rounded-xl border p-5" style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
                  <p className="text-base text-gray-700">Low Risk</p>
                  <p className="text-2xl font-semibold mt-2" style={{ color: '#059669' }}>{lowRisk}</p>
                  <p className="text-sm mt-2" style={{ color: '#059669' }}>{predictionCount > 0 ? ((lowRisk / predictionCount) * 100).toFixed(1) : '0.0'}% of total</p>
                </div>
              </div>
            </section>
          </>
        )}

        {error && stage !== 'ready' && <p className="text-red-600 text-lg">{error}</p>}
      </div>

      {stage === 'confirm' && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-5">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Confirm Prediction Run</h2>
            </div>
            <div className="px-8 py-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                You are about to run the prediction model on {importedCount} student records. This action will generate new predictions and may take several minutes to complete.
              </p>
              <p className="text-sm text-gray-500 mt-5">Please ensure that the data has been properly validated and cleaned before proceeding.</p>
            </div>
            <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStage('ready')}
                className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runPrediction}
                className="rounded-xl px-6 py-2.5 text-sm font-medium text-white"
                style={{ backgroundColor: '#0B2C5D' }}
              >
                Confirm and Run
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
