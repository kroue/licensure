'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/auth'

export default function ChairmanLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (role !== 'chairman') {
      router.replace('/login')
    }
  }, [loading, role, router])

  if (loading || role !== 'chairman') {
    return <div className="min-h-screen bg-gray-50" />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
