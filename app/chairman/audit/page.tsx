'use client'
import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { subscribeAuditLogs, type AuditLogRecord } from '@/lib/firebase'

type RoleFilter = 'All Roles' | 'Staff' | 'Dean' | 'Chairman'

function toDateLabel(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function AuditPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All Roles')
  const [rows, setRows] = useState<AuditLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    const unsubscribe = subscribeAuditLogs(
      { uid: user.uid, role: user.role },
      (data) => {
        setRows(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message || 'Unable to load audit logs.')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user?.role, user?.uid])

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesRole = roleFilter === 'All Roles' || row.actor.role === roleFilter
      if (!matchesRole) return false

      if (!normalized) return true

      return (
        row.actor.email.toLowerCase().includes(normalized) ||
        row.actor.role.toLowerCase().includes(normalized) ||
        row.action.toLowerCase().includes(normalized) ||
        row.details.toLowerCase().includes(normalized) ||
        row.status.toLowerCase().includes(normalized)
      )
    })
  }, [roleFilter, rows, search])

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">System activity trail — all user actions are logged</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, action, or details..."
              className="w-full pl-12 pr-4 h-12 border border-gray-300 rounded-xl text-sm focus:outline-none" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-12 w-12 rounded-xl border border-gray-300 flex items-center justify-center text-gray-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              className="h-12 min-w-[160px] rounded-xl border border-gray-300 px-4 text-base text-gray-800 bg-white focus:outline-none"
            >
              {['All Roles', 'Staff', 'Dean', 'Chairman'].map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['TIMESTAMP', 'USER', 'ROLE', 'ACTION', 'DETAILS', 'STATUS'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{toDateLabel(log.occurredAt)}</td>
                  <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{log.actor.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {log.actor.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-800 whitespace-nowrap">{log.action}</td>
                  <td className="px-5 py-4 text-gray-600 max-w-[360px]">{log.details}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        log.status === 'Success'
                          ? 'bg-green-100 text-green-700'
                          : log.status === 'Failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">Loading audit logs from Firestore...</td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">No audit entries found for current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="px-5 py-3 border-t border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-800 text-sm">
        <span className="font-semibold">Note:</span> This audit log is read-only and shows all system activities performed by authorized users. Records are retained for compliance and security purposes.
      </section>

      <div className="text-xs text-gray-400">
        {filtered.length} entries · Real-time audit visibility via Firestore polling
        </div>
    </div>
  )
}
