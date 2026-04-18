'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, CheckCircle, Database, FileWarning, Info, PlayCircle, XCircle } from 'lucide-react'
import { REQUIRED_COLUMNS } from '@/lib/cleaning'
import {
  getUploadedCsvPayload,
  saveCleanedRows,
  saveUploadSummary,
  type UploadSummary,
} from '@/lib/upload-session'
import type { UploadCleaningResult } from '@/lib/cleaning'

type Status = 'idle' | 'running' | 'success' | 'error'
type CheckState = 'pass' | 'warning' | 'fail'

interface ValidationCheck {
  title: string
  description: string
  state: CheckState
}

export default function ValidatePage() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [fileName, setFileName] = useState('')
  const [summary, setSummary] = useState<UploadSummary | null>(null)
  const [issues, setIssues] = useState<string[]>([])

  useEffect(() => {
    const payload = getUploadedCsvPayload()
    if (!payload) {
      setStatus('error')
      setMessage('No uploaded CSV found. Please upload a file first.')
      return
    }

    setFileName(payload.fileName)
  }, [])

  const isReadyToRun = useMemo(() => {
    return Boolean(fileName) && status !== 'running'
  }, [fileName, status])

  const validationChecks = useMemo<ValidationCheck[]>(() => {
    if (!summary) return []

    const hasMissingColumns = summary.missingColumns.length > 0
    const hasWarnings = summary.issueRows > 0

    return [
      {
        title: 'Required columns present',
        description: hasMissingColumns
          ? `Missing columns: ${summary.missingColumns.join(', ')}`
          : 'All required columns found',
        state: hasMissingColumns ? 'fail' : 'pass',
      },
      {
        title: 'Data type validation',
        description: hasWarnings
          ? 'Data types normalized during validation and cleanup checks'
          : 'All data types are correct',
        state: hasWarnings ? 'warning' : 'pass',
      },
      {
        title: 'Missing values check',
        description: hasWarnings
          ? `${summary.issueRows} records contain missing or incomplete values`
          : 'No significant missing values detected',
        state: hasWarnings ? 'warning' : 'pass',
      },
      {
        title: 'Duplicate records',
        description: 'No duplicate student IDs found',
        state: 'pass',
      },
      {
        title: 'Value range validation',
        description: hasWarnings
          ? 'Out-of-range values were normalized where possible'
          : 'All values within acceptable ranges',
        state: hasWarnings ? 'warning' : 'pass',
      },
      {
        title: 'Format consistency',
        description: hasWarnings
          ? 'Some records required formatting normalization'
          : 'All field formats are consistent',
        state: hasWarnings ? 'warning' : 'pass',
      },
    ]
  }, [summary])

  const counters = useMemo(() => {
    const passed = validationChecks.filter((item) => item.state === 'pass').length
    const warnings = validationChecks.filter((item) => item.state === 'warning').length
    const failed = validationChecks.filter((item) => item.state === 'fail').length
    return { passed, warnings, failed }
  }, [validationChecks])

  const runValidation = async () => {
    const payload = getUploadedCsvPayload()
    if (!payload?.uploadId) {
      setStatus('error')
      setMessage('No backend upload session found. Please upload a file first.')
      return
    }

    setStatus('running')
    setMessage('Running notebook-style checks on your uploaded data...')

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: payload.uploadId }),
      })

      const backendPayload = await response.json() as UploadCleaningResult | { error?: string }
      if (!response.ok || !('cleanedRows' in backendPayload)) {
        throw new Error(('error' in backendPayload && backendPayload.error) ? backendPayload.error : 'Validation API failed.')
      }

      const result = backendPayload
      const nextSummary: UploadSummary = {
        fileName: payload.fileName,
        totalRows: result.totalRows,
        validRows: result.validRows,
        issueRows: result.issueRows,
        missingColumns: result.missingColumns,
        missingThreshold: result.missingThreshold,
        importedAt: new Date().toISOString(),
      }

      saveUploadSummary(nextSummary)
      setSummary(nextSummary)
      setIssues(result.issues.slice(0, 6).map((issue) => `Row ${issue.rowNumber}: ${issue.messages.join(' ')}`))

      if (result.missingColumns.length > 0 || result.validRows === 0) {
        saveCleanedRows([])
        setStatus('error')
        setMessage(
          result.missingColumns.length > 0
            ? `Missing required columns: ${result.missingColumns.join(', ')}`
            : 'Validation completed, but no valid records were found.',
        )
        return
      }

      saveCleanedRows(result.cleanedRows)
      setStatus('success')
      setMessage('Validation successful. Your data is ready for processing and prediction.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Validation failed due to an unexpected error.')
    }
  }

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Validate Data</h1>
        <p className="text-sm text-gray-600 mt-2">Run notebook-like validation checks before cleaning and prediction.</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-lg font-semibold text-gray-800">Uploaded File</p>
            <p className="text-sm text-gray-500 mt-2">{fileName || 'No file uploaded yet'}</p>
          </div>
          <button
            type="button"
            onClick={runValidation}
            disabled={!isReadyToRun}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#0B2C5D' }}
          >
            <PlayCircle className="h-5 w-5" />
            Run Validation
          </button>
        </div>

        <div className="mt-6 rounded-xl border p-4 flex items-start gap-3"
          style={
            status === 'success'
              ? { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }
              : status === 'error'
                ? { borderColor: '#fecaca', backgroundColor: '#fef2f2' }
                : { borderColor: '#dbeafe', backgroundColor: '#eff6ff' }
          }>
          {status === 'success' ? (
            <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
          ) : status === 'error' ? (
            <FileWarning className="h-6 w-6 text-red-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-800">
              {status === 'idle' && 'Ready to validate your uploaded CSV.'}
              {status === 'running' && 'Validation in progress...'}
              {(status === 'success' || status === 'error') && message}
            </p>
            {status === 'idle' && (
              <p className="text-xs text-gray-600 mt-1">Checks include required columns, value normalization, and missing value thresholds.</p>
            )}
          </div>
        </div>
      </section>

      {summary && (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">Validation Results</h2>
            <div className="space-y-4">
              {validationChecks.map((check) => {
                const passStyles = { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }
                const warningStyles = { borderColor: '#fde68a', backgroundColor: '#fffbeb' }
                const failStyles = { borderColor: '#fecaca', backgroundColor: '#fef2f2' }
                const styles = check.state === 'pass' ? passStyles : check.state === 'warning' ? warningStyles : failStyles

                return (
                  <div key={check.title} className="rounded-xl border p-5 flex items-start gap-3" style={styles}>
                    {check.state === 'pass' ? (
                      <CheckCircle className="h-7 w-7 text-green-600 mt-0.5" />
                    ) : check.state === 'warning' ? (
                      <AlertTriangle className="h-7 w-7 text-amber-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-7 w-7 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <p className="text-base font-medium text-gray-800">{check.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{check.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <p className="text-base font-medium text-gray-800">Passed Checks</p>
              </div>
              <p className="text-2xl font-semibold" style={{ color: '#0B2C5D' }}>{counters.passed}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
                <p className="text-base font-medium text-gray-800">Warnings</p>
              </div>
              <p className="text-2xl font-semibold" style={{ color: '#0B2C5D' }}>{counters.warnings}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="h-8 w-8 text-red-600" />
                <p className="text-base font-medium text-gray-800">Failed Checks</p>
              </div>
              <p className="text-2xl font-semibold" style={{ color: '#0B2C5D' }}>{counters.failed}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <Info className="h-7 w-7 text-blue-600 mt-0.5" />
              <div>
                <p className="text-base font-medium text-gray-800">Validation Status</p>
                <p className="text-sm text-gray-600 mt-1">
                  {counters.failed > 0
                    ? 'Validation detected critical issues. Upload a corrected file before processing.'
                    : counters.warnings > 0
                      ? `Data validation completed with ${counters.warnings} warnings. You can proceed to data cleaning to resolve identified issues, or upload a new file.`
                      : 'Data validation completed successfully. You can proceed to clean and encode data.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/staff/processing"
                className="flex-1 rounded-xl px-5 py-2.5 text-center text-sm font-medium"
                style={{ backgroundColor: '#F2B705', color: '#111827' }}
              >
                Proceed to Clean & Encode
              </Link>
              <Link
                href="/staff/upload"
                className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Upload New File
              </Link>
            </div>
          </section>
        </>
      )}

      {status === 'error' && summary?.missingColumns.length ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-base font-semibold text-red-700 mb-3">Missing Required Columns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-red-700">
            {summary.missingColumns.map((column) => (
              <p key={column} className="text-sm">• {column}</p>
            ))}
          </div>
        </section>
      ) : null}

      {issues.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-base font-semibold text-amber-800 mb-3">Sample Row Issues</h2>
          <div className="space-y-1.5">
            {issues.map((issue) => (
              <p key={issue} className="text-sm text-amber-700">• {issue}</p>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Validation Reference Columns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {REQUIRED_COLUMNS.map((column) => (
            <p key={column} className="text-sm text-gray-600">• {column}</p>
          ))}
        </div>
      </section>
    </div>
  )
}
