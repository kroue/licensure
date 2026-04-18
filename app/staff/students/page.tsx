'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Search } from 'lucide-react'
import { getUploadedCsvPayload } from '@/lib/upload-session'

interface StudentRecord {
  studentId: string
  name: string
  yearLevel: string
  gpa: string
  email: string
}

export default function StudentsPage() {
  const PAGE_SIZE = 25
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<StudentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const uploadPayload = getUploadedCsvPayload()
    if (!uploadPayload?.uploadId) {
      setError('No uploaded backend data found. Upload and validate a CSV file first.')
      setLoading(false)
      return
    }

    const loadRecords = async () => {
      try {
        const response = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: uploadPayload.uploadId }),
        })

        const payload = await response.json() as { records?: StudentRecord[]; error?: string }
        if (!response.ok || !Array.isArray(payload.records)) {
          throw new Error(payload.error || 'Unable to load records from Python backend.')
        }

        setRecords(payload.records)
      } catch (recordsError) {
        setError(recordsError instanceof Error ? recordsError.message : 'Unable to load records from Python backend.')
        setRecords([])
      } finally {
        setLoading(false)
      }
    }

    void loadRecords()
  }, [])

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return records

    return records.filter((record) =>
      record.name.toLowerCase().includes(search) || record.studentId.toLowerCase().includes(search),
    )
  }, [query, records])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, records])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedRows = rows.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>Manage Student Records</h1>
        <p className="text-sm text-gray-600 mt-2">Edit and update student information in the system</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or student ID..."
            className="w-full h-12 rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
        {loading && <p className="text-sm text-gray-500 mt-3">Loading records from Python backend...</p>}
        {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-8 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase">Student ID</th>
                <th className="text-left px-8 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase">Name</th>
                <th className="text-left px-8 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase">Year Level</th>
                <th className="text-left px-8 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase">GPA</th>
                <th className="text-left px-8 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase">Email</th>
                <th className="text-left px-8 py-4 text-xs font-semibold tracking-wide text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((record) => (
                <tr key={record.studentId} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-8 py-5 text-sm text-gray-700">{record.studentId}</td>
                  <td className="px-8 py-5 text-sm text-gray-700">{record.name}</td>
                  <td className="px-8 py-5 text-sm text-gray-500">{record.yearLevel}</td>
                  <td className="px-8 py-5 text-sm text-gray-700">{record.gpa}</td>
                  <td className="px-8 py-5 text-sm text-gray-500">{record.email}</td>
                  <td className="px-8 py-5 text-sm text-gray-700">
                    <button type="button" className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-8 text-sm text-gray-500 text-center">
                    No student records found from Python backend upload.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && rows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, rows.length)} of {rows.length} records
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-5">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Note:</span> Changes to student records will be saved immediately. Updated records will be used in future prediction runs. No access to prediction results or strategic dashboards from this view.
        </p>
      </section>
    </div>
  )
}
