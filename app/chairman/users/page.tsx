'use client'

import { useEffect, useMemo, useState } from 'react'
import { Edit2, Search, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  createAuditLog,
  deleteManagedUserRecord,
  subscribeManagedUsers,
  updateManagedUserRecord,
  type ManagedUserRecord,
  type ManagedUserRole,
  type ManagedUserStatus,
} from '@/lib/firebase'

type ModalMode = 'create' | 'edit'

type UserForm = {
  name: string
  email: string
  role: ManagedUserRole
  status: ManagedUserStatus
  password: string
}

const INITIAL_FORM: UserForm = {
  name: '',
  email: '',
  role: 'Staff',
  status: 'Active',
  password: '',
}

function badgeForRole(role: ManagedUserRole): { bg: string; text: string } {
  if (role === 'Chairman') return { bg: '#eadcf9', text: '#7e22ce' }
  if (role === 'Dean') return { bg: '#efe5ff', text: '#9333ea' }
  if (role === 'Faculty') return { bg: '#d1fae5', text: '#047857' }
  return { bg: '#dbeafe', text: '#2563eb' }
}

function badgeForStatus(status: ManagedUserStatus): { bg: string; text: string } {
  if (status === 'Active') return { bg: '#dcfce7', text: '#15803d' }
  return { bg: '#e5e7eb', text: '#4b5563' }
}

export default function UsersPage() {
  const { createManagedAccount, user } = useAuth()

  const [users, setUsers] = useState<ManagedUserRecord[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeManagedUsers(
      (rows) => {
        setUsers(rows)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message || 'Failed to fetch users from Firebase.')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return users

    return users.filter((entry) => {
      return (
        entry.name.toLowerCase().includes(normalized) ||
        entry.email.toLowerCase().includes(normalized) ||
        entry.role.toLowerCase().includes(normalized)
      )
    })
  }, [query, users])

  const openCreate = () => {
    setMode('create')
    setSelectedId(null)
    setForm(INITIAL_FORM)
    setError('')
    setShowModal(true)
  }

  const openEdit = (entry: ManagedUserRecord) => {
    setMode('edit')
    setSelectedId(entry.id)
    setForm({
      name: entry.name,
      email: entry.email,
      role: entry.role,
      status: entry.status,
      password: '',
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSaving(false)
    setSelectedId(null)
    setForm(INITIAL_FORM)
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email, and password are required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const created = await createManagedAccount(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.role)

      if (user?.uid) {
        await createAuditLog({
          action: 'Create User',
          details: `Created user ${created.email} with role ${form.role}`,
          status: 'Success',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          metadata: {
            createdUid: created.uid,
          },
        })
      }

      closeModal()
    } catch (creationError) {
      if (user?.uid) {
        void createAuditLog({
          action: 'Create User',
          details: `Failed to create user ${form.email.trim().toLowerCase()} - ${creationError instanceof Error ? creationError.message : 'Unknown error'}`,
          status: 'Failed',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        })
      }

      setError(creationError instanceof Error ? creationError.message : 'Failed to create user.')
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedId) return
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const original = users.find((entry) => entry.id === selectedId)
      await updateManagedUserRecord(selectedId, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        status: form.status,
      })

      if (user?.uid) {
        await createAuditLog({
          action: 'Update Record',
          details: `Updated account ${original?.email || form.email.trim().toLowerCase()}`,
          status: 'Success',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          metadata: {
            userDocId: selectedId,
          },
        })
      }

      closeModal()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update user.')
      setSaving(false)
    }
  }

  const handleDelete = async (entry: ManagedUserRecord) => {
    if (entry.email === user?.email) {
      setError('You cannot delete the currently signed-in account.')
      return
    }

    const confirmed = window.confirm(`Delete user ${entry.email}?`)
    if (!confirmed) return

    try {
      await deleteManagedUserRecord(entry.id)

      if (user?.uid) {
        await createAuditLog({
          action: 'Delete User',
          details: `Deleted user account ${entry.email}`,
          status: 'Success',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          metadata: {
            deletedDocId: entry.id,
          },
        })
      }
    } catch (deleteError) {
      if (user?.uid) {
        void createAuditLog({
          action: 'Delete User',
          details: `Failed to delete user ${entry.email} - ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`,
          status: 'Failed',
          actor: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        })
      }

      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user.')
    }
  }

  return (
    <div className="p-7 max-w-7xl space-y-7">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0B2C5D' }}>User Management</h1>
        <p className="text-sm text-gray-600 mt-2">Manage system user accounts and role assignments</p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users by name or email..."
              className="h-12 w-full rounded-2xl border border-gray-300 pl-12 pr-5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="h-12 rounded-2xl px-6 text-white text-sm font-semibold inline-flex items-center gap-2"
            style={{ backgroundColor: '#0B2C5D' }}
          >
            <UserPlus className="h-4 w-4" />
            Add New User
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['NAME', 'EMAIL', 'ROLE', 'STATUS', 'LAST LOGIN', 'ACTIONS'].map((header) => (
                  <th key={header} className="text-left px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-700">{header}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loading && filteredUsers.map((entry) => {
                const roleBadge = badgeForRole(entry.role)
                const statusBadge = badgeForStatus(entry.status)

                return (
                  <tr key={entry.id} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-8 py-6 text-sm text-gray-800">{entry.name}</td>
                    <td className="px-8 py-6 text-sm text-gray-700">{entry.email}</td>
                    <td className="px-8 py-6">
                      <span
                        className="inline-flex rounded-full px-4 py-1 text-xs font-medium"
                        style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
                      >
                        {entry.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className="inline-flex rounded-full px-4 py-1 text-xs font-medium"
                        style={{ backgroundColor: statusBadge.bg, color: statusBadge.text }}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-700">{entry.lastLogin}</td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-4">
                        <button type="button" onClick={() => openEdit(entry)} className="text-[#0B2C5D]">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(entry)} className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {loading && (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-sm text-gray-500 text-center">Loading users from Firebase...</td>
                </tr>
              )}

              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-sm text-gray-500 text-center">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5" onClick={closeModal}>
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-8 py-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">{mode === 'create' ? 'Create New User' : 'Edit User'}</h2>
            </div>

            <div className="px-8 py-7 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:outline-none"
                  placeholder="Dr. Juan Santos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:outline-none"
                  placeholder="user@ustp.edu.ph"
                />
              </div>

              {mode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:outline-none"
                    placeholder="Enter temporary password"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as ManagedUserRole }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700"
                  >
                    <option>Chairman</option>
                    <option>Dean</option>
                    <option>Faculty</option>
                    <option>Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ManagedUserStatus }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={mode === 'create' ? handleCreate : handleEdit}
                className="rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-70"
                style={{ backgroundColor: '#0B2C5D' }}
              >
                {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
