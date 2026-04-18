'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ClipboardCheck, UploadCloud, XCircle } from 'lucide-react'
import {
  getPredictedRows,
  getProcessingSummary,
  getUploadSummary,
  type ProcessingSummary,
  type UploadSummary,
} from '@/lib/upload-session'

type HistoryRow = {
  fileName: string
  uploadDate: string
  records: number | '-'
  status: 'Success' | 'Failed'
  processedBy: string
}

function formatDateTime(isoOrDate: string): string {
  const date = new Date(isoOrDate)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function ProcessingSummaryPage() {
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null)
  const [predictedCount, setPredictedCount] = useState(0)

  useEffect(() => {
    setUploadSummary(getUploadSummary())
    setProcessingSummary(getProcessingSummary())
    setPredictedCount(getPredictedRows().length)
  }, [])

  const historyRows = useMemo<HistoryRow[]>(() => {
    if (!uploadSummary) return []

    const hasPrediction = predictedCount > 0
    const processingDone = Boolean(processingSummary?.cleanedAndEncoded)
    const isSuccess = hasPrediction && processingDone

    return [
      {
        fileName: uploadSummary.fileName,
        uploadDate: formatDateTime(uploadSummary.importedAt),
        records: uploadSummary.validRows > 0 ? uploadSummary.validRows : '-',
        status: isSuccess ? 'Success' : 'Failed',
        processedBy: 'staff.user@ustp.edu.ph',
      },
    ]
  }, [predictedCount, processingSummary?.cleanedAndEncoded, uploadSummary])

  const totalUploads = uploadSummary ? 1 : 0
  const successfulUploads = historyRows.filter((row) => row.status === 'Success').length
  const totalProcessed = processingSummary?.processedRows ?? uploadSummary?.validRows ?? 0

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Upload & Processing Summary</h1>
        <p className="text-sm text-gray-600 mt-2">History of file uploads and processing status</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e8edf5' }}>
            <UploadCloud className="h-6 w-6" style={{ color: '#2563eb' }} />
          </div>
          <p className="text-base text-gray-600">Total Uploads</p>
          <p className="text-4xl font-semibold mt-2" style={{ color: '#0B2C5D' }}>{totalUploads}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ecfdf3' }}>
            <CheckCircle2 className="h-6 w-6" style={{ color: '#16a34a' }} />
          </div>
          <p className="text-base text-gray-600">Successful</p>
          <p className="text-4xl font-semibold mt-2" style={{ color: '#0B2C5D' }}>{successfulUploads}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f5ebff' }}>
            <ClipboardCheck className="h-6 w-6" style={{ color: '#9333ea' }} />
          </div>
          <p className="text-base text-gray-600">Total Records Processed</p>
          <p className="text-4xl font-semibold mt-2" style={{ color: '#0B2C5D' }}>{totalProcessed}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <header className="px-8 py-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold" style={{ color: '#0B2C5D' }}>Upload History</h2>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['FILE NAME', 'UPLOAD DATE', 'RECORDS', 'STATUS', 'PROCESSED BY'].map((header) => (
                  <th key={header} className="px-8 py-4 text-sm font-semibold text-gray-600 tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.fileName} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-8 py-5 text-lg text-gray-800">{row.fileName}</td>
                  <td className="px-8 py-5 text-lg text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-gray-400" />
                      {row.uploadDate}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-lg text-gray-800">{row.records}</td>
                  <td className="px-8 py-5">
                    {row.status === 'Success' ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-green-700 text-lg">
                        <CheckCircle2 className="h-5 w-5" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-1.5 text-red-700 text-lg">
                        <XCircle className="h-5 w-5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-lg text-gray-700">{row.processedBy}</td>
                </tr>
              ))}

              {historyRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-gray-500">
                    No upload history yet. Upload and process a CSV file first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div>
        <Link
          href="/staff/upload"
          className="inline-flex rounded-xl px-6 py-3 text-sm font-medium text-white"
          style={{ backgroundColor: '#0B2C5D' }}
        >
          Upload New File
        </Link>
      </div>
    </div>
  )
}
