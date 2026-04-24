'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/auth'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { role, loading } = useAuth()
  const isFacultyBlockedRoute = role === 'faculty' && pathname !== '/staff/predict'

  useEffect(() => {
    if (loading) return
    if (role !== 'staff' && role !== 'faculty') {
      router.replace('/login')
      return
    }

    if (role === 'faculty' && pathname !== '/staff/predict') {
      router.replace('/staff/predict')
    }
  }, [loading, pathname, role, router])

  if (loading || (role !== 'staff' && role !== 'faculty') || isFacultyBlockedRoute) {
    return <div className="min-h-screen bg-gray-50" />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
