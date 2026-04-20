'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Save, Search, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { createAuditLog, getPredictionRowsAnalyticsByUpload, type PredictionRowAnalytics } from '@/lib/firebase'
import { getUploadedCsvPayload } from '@/lib/upload-session'

interface StudentRecord {
  studentId: string
  name: string
  yearLevel: string
  gpa: string
  email: string
}

const YEAR_LEVEL_OPTIONS = ['4th Year', '5th Year'] as const

const normalizeYearLevel = (value: string): (typeof YEAR_LEVEL_OPTIONS)[number] => {
  if (YEAR_LEVEL_OPTIONS.includes(value as (typeof YEAR_LEVEL_OPTIONS)[number])) {
    return value as (typeof YEAR_LEVEL_OPTIONS)[number]
  }

  return '4th Year'
}

export default function StudentsPage() {
  const { user } = useAuth()
  const PAGE_SIZE = 25
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<StudentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<StudentRecord | null>(null)

  const handleEditRecord = (record: StudentRecord) => {
    setEditingStudentId(record.studentId)
    setEditDraft({
      ...record,
      yearLevel: normalizeYearLevel(record.yearLevel),
    })

    if (user?.uid) {
      void createAuditLog({
        action: 'Update Record',
        details: `Opened record editor for ${record.studentId}`,
        status: 'Info',
        actor: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        metadata: {
          studentId: record.studentId,
        },
      })
    }
  }

  const handleDraftChange = (field: keyof StudentRecord, value: string) => {
    setEditDraft((current) => {
      if (!current) return current
      return { ...current, [field]: value }
    })
  }

  const handleCancelEdit = () => {
    if (editingStudentId && user?.uid) {
      void createAuditLog({
        action: 'Update Record',
        details: `Cancelled record editor for ${editingStudentId}`,
        status: 'Info',
        actor: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        metadata: {
          studentId: editingStudentId,
        },
      })
    }

    setEditingStudentId(null)
    setEditDraft(null)
  }

  const handleSaveEdit = () => {
    if (!editingStudentId || !editDraft) return

    const sanitizedDraft: StudentRecord = {
      ...editDraft,
      studentId: editDraft.studentId.trim(),
      name: editDraft.name.trim(),
      gpa: editDraft.gpa.trim(),
      email: editDraft.email.trim(),
      yearLevel: normalizeYearLevel(editDraft.yearLevel),
    }

    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.studentId === editingStudentId ? sanitizedDraft : record,
      ),
    )

    if (user?.uid) {
      void createAuditLog({
        action: 'Update Record',
        details: `Saved updates for ${editingStudentId}`,
        status: 'Success',
        actor: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        metadata: {
          studentId: editingStudentId,
          updatedStudentId: sanitizedDraft.studentId,
          yearLevel: sanitizedDraft.yearLevel,
        },
      })
    }

    setEditingStudentId(null)
    setEditDraft(null)
  }

  useEffect(() => {
    const uploadPayload = getUploadedCsvPayload()
    if (!uploadPayload?.uploadId) {
      setError('No uploaded backend data found. Upload and validate a CSV file first.')
      setLoading(false)
      return
    }
    const uploadId = uploadPayload.uploadId

    if (!user?.uid) {
      setError('No active logged-in user found.')
      setLoading(false)
      return
    }

    const toStudentRecord = (row: PredictionRowAnalytics): StudentRecord => {
      const student = row.student as Record<string, unknown>
      const studentId = String(student['Student_Code'] ?? student['studentId'] ?? '-')
      const name = String(student['Student_Name'] ?? student['name'] ?? '-')
      const gpaValue = student['GWA'] ?? student['gpa']
      const gpa = typeof gpaValue === 'number' ? gpaValue.toFixed(2) : String(gpaValue ?? '-')
      const yearLevelRaw = student['Year_Level'] ?? student['YearLevel'] ?? student['yearLevel']
      const examYear = student['Exam_year']
      const yearLevel = yearLevelRaw ? String(yearLevelRaw) : examYear ? `Exam ${String(examYear)}` : 'N/A'
      const email = String(student['Email'] ?? student['email'] ?? `${String(name).toLowerCase().replace(/\s+/g, '.')}@ustp.edu.ph`)

      return { studentId, name, yearLevel, gpa, email }
    }

    const loadRecords = async () => {
      try {
        const analyticsRows = await getPredictionRowsAnalyticsByUpload(uploadId, {
          uid: user.uid,
          role: user.role,
        })

        setRecords(analyticsRows.map(toStudentRecord))
      } catch (recordsError) {
        setError(recordsError instanceof Error ? recordsError.message : 'Unable to load records from Firestore analytics.')
        setRecords([])
      } finally {
        setLoading(false)
      }
    }

    void loadRecords()
  }, [user?.role, user?.uid])

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
        {loading && <p className="text-sm text-gray-500 mt-3">Loading records from Firestore analytics...</p>}
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
              {paginatedRows.map((record, index) => {
                const isEditing = editingStudentId === record.studentId

                return (
                  <tr key={`${record.studentId}-${startIndex + index}`} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-8 py-5 text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          value={editDraft?.studentId ?? ''}
                          onChange={(event) => handleDraftChange('studentId', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none"
                        />
                      ) : (
                        record.studentId
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          value={editDraft?.name ?? ''}
                          onChange={(event) => handleDraftChange('name', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none"
                        />
                      ) : (
                        record.name
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500">
                      {isEditing ? (
                        <select
                          value={normalizeYearLevel(editDraft?.yearLevel ?? '4th Year')}
                          onChange={(event) => handleDraftChange('yearLevel', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none"
                        >
                          {YEAR_LEVEL_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        record.yearLevel
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-700">
                      {isEditing ? (
                        <input
                          value={editDraft?.gpa ?? ''}
                          onChange={(event) => handleDraftChange('gpa', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none"
                        />
                      ) : (
                        record.gpa
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500">
                      {isEditing ? (
                        <input
                          value={editDraft?.email ?? ''}
                          onChange={(event) => handleDraftChange('email', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none"
                        />
                      ) : (
                        record.email
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-700">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-green-600 hover:bg-green-50"
                            aria-label="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                            aria-label="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEditRecord(record)}
                          className="inline-flex items-center gap-2 text-sm text-gray-700"
                          disabled={Boolean(editingStudentId)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-8 text-sm text-gray-500 text-center">
                    No student records found from Firestore prediction analytics.
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
