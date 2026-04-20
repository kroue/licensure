'use client'
import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { clearUploadedCsvPayload, clearValidationArtifacts, saveUploadedCsvPayload } from '@/lib/upload-session'
import { useAuth } from '@/lib/auth'
import { createAuditLog, upsertUploadHistoryAnalytics } from '@/lib/firebase'

type Step = 'upload' | 'uploaded' | 'error'

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsText(file)
  })
}

export default function UploadPage() {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [fileSizeKB, setFileSizeKB] = useState('0.00')
  const [errorMessage, setErrorMessage] = useState('')
  const [dragging, setDragging] = useState(false)

  const estimateCsvRows = (csvText: string): number => {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0)
    return Math.max(0, lines.length - 1)
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file.')
      return
    }

    setErrorMessage('')
    setFileName(file.name)
    setFileSizeKB((file.size / 1024).toFixed(2))

    try {
      const csvText = await readFileAsText(file)
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, csvText }),
      })

      const payload = await response.json() as { uploadId?: string; error?: string }
      if (!response.ok || !payload.uploadId) {
        throw new Error(payload.error || 'Backend upload failed.')
      }

      saveUploadedCsvPayload({
        uploadId: payload.uploadId,
        fileName: file.name,
        fileSize: file.size,
        csvText,
        uploadedAt: new Date().toISOString(),
      })

      if (user?.uid) {
        try {
          const estimatedRows = estimateCsvRows(csvText)

          await upsertUploadHistoryAnalytics({
            uploadId: payload.uploadId,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            records: estimatedRows,
            status: 'Uploaded',
            runBy: {
              uid: user.uid,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          })

          await createAuditLog({
            action: 'Import CSV',
            details: `Uploaded ${file.name} (${estimatedRows} records)`,
            status: 'Success',
            actor: {
              uid: user.uid,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            metadata: {
              uploadId: payload.uploadId,
            },
          })
        } catch {
          setErrorMessage('File uploaded, but upload analytics logging failed.')
        }
      }

      // New upload invalidates prior validation/prediction outputs.
      clearValidationArtifacts()
      setStep('uploaded')
    } catch (error) {
      if (user?.uid) {
        void createAuditLog({
          action: 'Import CSV',
          details: `Failed to upload ${file.name} - ${error instanceof Error ? error.message : 'Unknown upload error'}`,
          status: 'Failed',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        })
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload CSV file.')
      setStep('error')
    }
  }, [user])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    clearUploadedCsvPayload()
    clearValidationArtifacts()
    setStep('upload')
    setFileName('')
    setFileSizeKB('0.00')
    setErrorMessage('')
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Import CSV Files</h1>
        <p className="text-sm text-gray-600 mt-2">Upload student data files for prediction processing</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-300 p-6">
          {step === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragging ? 'bg-blue-50' : 'bg-white'}`}
          style={dragging ? { borderColor: '#0B2C5D' } : { borderColor: '#d1d5db' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#e8edf5' }}>
            <Upload className="w-7 h-7" style={{ color: '#0B2C5D' }} />
          </div>
          <h3 className="text-lg text-gray-700 font-semibold mb-2">Drop your CSV file here</h3>
          <p className="text-sm text-gray-500 mb-5">or click to browse from your computer</p>
          <label className="cursor-pointer inline-flex px-5 py-2.5 rounded-xl text-sm text-white font-medium"
            style={{ backgroundColor: '#0B2C5D' }}>
            Choose File
            <input type="file" accept=".csv" className="hidden" onChange={handleInput} />
          </label>
        </div>
          )}

          {step === 'uploaded' && (
            <div>
              <div className="flex items-center gap-5 mb-6">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#e8edf5' }}>
                  <FileText className="h-7 w-7" style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <p className="text-lg font-medium" style={{ color: '#0B2C5D' }}>{fileName}</p>
                  <p className="text-sm text-gray-500 mt-1">{fileSizeKB} KB</p>
                </div>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-5 mb-6 flex items-start gap-3">
                <CheckCircle className="h-7 w-7 text-green-600 mt-0.5" />
                <div>
                  <p className="text-lg font-medium text-green-800">Upload Successful</p>
                  <p className="text-sm text-green-700 mt-1">File has been uploaded successfully. You can now proceed to validate the data.</p>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  disabled
                  className="flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#7d90ad' }}
                >
                  Uploaded
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>

              <Link
                href="/staff/validate"
                className="block w-full rounded-xl px-5 py-2.5 text-center text-sm font-medium"
                style={{ backgroundColor: '#F2B705', color: '#111827' }}
              >
                Proceed to Validation
              </Link>
            </div>
          )}

          {step === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="text-lg font-semibold text-red-700 mb-2">Upload Failed</p>
              <p className="text-sm text-red-600">{errorMessage || 'Please try uploading a valid CSV file.'}</p>
              <button onClick={reset} className="mt-4 px-5 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">
                Try Another File
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-semibold mb-5" style={{ color: '#0B2C5D' }}>CSV File Requirements</h3>
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-7 w-7 text-green-600 mt-1" />
            <div>
              <p className="text-base font-medium text-gray-800">Required Columns</p>
              <p className="text-sm text-gray-600 mt-1">Student ID, Name, GPA, Year Level, and all relevant academic performance metrics</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="h-7 w-7 text-green-600 mt-1" />
            <div>
              <p className="text-base font-medium text-gray-800">Format Standards</p>
              <p className="text-sm text-gray-600 mt-1">Use comma-separated values with header row. Ensure proper data types for each field.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <AlertCircle className="h-7 w-7 text-amber-500 mt-1" />
            <div>
              <p className="text-base font-medium text-gray-800">Data Quality</p>
              <p className="text-sm text-gray-600 mt-1">Minimize missing values and ensure data consistency for accurate predictions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
