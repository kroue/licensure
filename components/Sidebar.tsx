'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Brain, LogOut, LayoutDashboard, Users, BarChart3, FileText, ClipboardList, Upload, UserCog, TrendingUp, Database, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import clsx from 'clsx'

interface NavItem { href: string; label: string; icon: React.FC<{ className?: string }> }

const chairmanNav: NavItem[] = [
  { href: '/chairman', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chairman/predictions', label: 'Student Predictions', icon: TrendingUp },
  { href: '/chairman/reports', label: 'Predictive Reports', icon: FileText },
  { href: '/chairman/audit', label: 'Audit Logs', icon: ClipboardList },
  { href: '/chairman/users', label: 'User Management', icon: UserCog },
]

const staffNav: NavItem[] = [
  { href: '/staff', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/staff/upload', label: 'Import CSV Files', icon: Upload },
  { href: '/staff/validate', label: 'Validate Data', icon: CheckCircle2 },
  { href: '/staff/processing', label: 'Clean & Encode Data', icon: BarChart3 },
  { href: '/staff/predict', label: 'Run Prediction', icon: Brain },
  { href: '/staff/summary', label: 'Upload Summary', icon: FileText },
  { href: '/staff/students', label: 'Manage Records', icon: Database },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, user, sessionStartedAt, logout } = useAuth()
  const nav = role === 'chairman' ? chairmanNav : staffNav
  const roleLabel = role === 'chairman' ? 'Chairman / Dean' : 'Staff'
  const startedLabel = sessionStartedAt
    ? new Date(sessionStartedAt).toLocaleString('en-PH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: '#0B2C5D' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="LiCEnSURE logo"
            width={36}
            height={36}
            className="rounded-lg flex-shrink-0"
            priority
          />
          <div>
            <div className="text-white font-bold text-base leading-none">LiCEnSURE System</div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-6 py-3 border-b border-white/10">
        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Logged in as</div>
        <div className="text-white text-sm font-semibold leading-tight">{user?.name || roleLabel}</div>
        <div className="text-white/60 text-xs mt-1 break-all">{user?.email || '-'}</div>
        <div className="text-white/40 text-xs mt-1">Role: {roleLabel}</div>
        {startedLabel && <div className="text-white/40 text-xs mt-1">Session: {startedLabel}</div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'text-navy shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
              style={active ? { backgroundColor: '#F2B705', color: '#0B2C5D' } : {}}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all w-full">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
