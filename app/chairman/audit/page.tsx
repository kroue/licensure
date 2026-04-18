'use client'
import { useState } from 'react'
import { auditLogs } from '@/lib/data'
import { Search, ClipboardList } from 'lucide-react'

const actionColors: Record<string, string> = {
  'Uploaded CSV': 'bg-blue-50 text-blue-700',
  'Ran Prediction': 'bg-green-50 text-green-700',
  'Viewed Dashboard': 'bg-gray-100 text-gray-600',
  'Generated Report': 'bg-purple-50 text-purple-700',
  'Viewed Student Details': 'bg-yellow-50 text-yellow-700',
  'Created User': 'bg-orange-50 text-orange-700',
}

export default function AuditPage() {
  const [search, setSearch] = useState('')

  const filtered = auditLogs.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">System activity trail — all user actions are logged</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-5">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, action, or details..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['#', 'User', 'Action', 'Details', 'Timestamp', 'IP Address'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">{log.id}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-700">{log.user}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">{log.details}</td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-xs whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} entries · Showing all available logs
        </div>
      </div>
    </div>
  )
}
