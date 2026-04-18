'use client'
import { useState } from 'react'
import { users } from '@/lib/data'
import { UserPlus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Manage system access and roles</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#0B2C5D' }}>
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Active', value: users.filter(u => u.status === 'Active').length },
          { label: 'Inactive', value: users.filter(u => u.status === 'Inactive').length },
          { label: 'Staff', value: users.filter(u => u.role === 'Staff').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold" style={{ color: '#0B2C5D' }}>{value}</div>
            <div className="text-gray-500 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#0B2C5D' }}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'Chairman/Dean' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                      style={u.role === 'Chairman/Dean' ? { backgroundColor: '#0B2C5D' } : {}}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.status === 'Active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">{u.lastLogin}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-5">Add New User</h2>
            <div className="space-y-4">
              {[['Full Name', 'text', 'e.g. Engr. Juan dela Cruz'], ['Email Address', 'email', 'user@ustp.edu.ph'], ['Password', 'password', '••••••••']].map(([label, type, placeholder]) => (
                <div key={String(label)}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input type={String(type)} placeholder={String(placeholder)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option>Staff</option>
                  <option>Chairman/Dean</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm text-white font-semibold"
                style={{ backgroundColor: '#0B2C5D' }}>
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
