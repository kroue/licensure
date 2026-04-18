'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { DEMO_ACCOUNTS, BEST_MODEL } from '@/lib/data'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    const chair = DEMO_ACCOUNTS.chairman
    const staff = DEMO_ACCOUNTS.staff
    if (email === chair.email && password === chair.password) {
      login('chairman'); router.push('/chairman')
    } else if (email === staff.email && password === staff.password) {
      login('staff'); router.push('/staff')
    } else {
      setError('Invalid email or password. Please try again.')
    }
    setLoading(false)
  }

  const fillDemo = (role: 'chairman' | 'staff') => {
    setEmail(DEMO_ACCOUNTS[role].email)
    setPassword(DEMO_ACCOUNTS[role].password)
    setError('')
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0B2C5D' }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #071B37 0%, #0B2C5D 100%)' }}>
        <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div>
          <Image
            src="/logo.png"
            alt="LiCEnSURE logo"
            width={80}
            height={80}
            className="rounded-2xl mb-8"
            priority
          />
          <h1 className="text-white text-4xl font-bold mb-2">LiCEnSURE</h1>
          <p className="font-semibold text-xl mb-6" style={{ color: '#F2B705' }}>Licensure Exam Predictive System</p>
          <p className="text-white/60 leading-relaxed max-w-sm">
            Empowering USTP's Civil Engineering department with machine learning to identify
            at-risk students and drive data-informed decisions.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { label: 'Algorithm', value: 'Random Forest + SMOTE' },
              { label: 'Accuracy', value: `${(BEST_MODEL.accuracy * 100).toFixed(1)}%` },
              { label: 'Recall (FAILED class)', value: `${(BEST_MODEL.recall * 100).toFixed(1)}%` },
              { label: 'ROC AUC', value: BEST_MODEL.rocAuc.toFixed(4) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm border-b border-white/10 pb-3">
                <span className="text-white/50">{label}</span>
                <span className="text-white font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">University of Science and Technology of Southern Philippines</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Image
                src="/logo.png"
                alt="LiCEnSURE logo"
                width={56}
                height={56}
                className="rounded-xl mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to access LiCEnSURE</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => fillDemo('chairman')}
                className="text-xs py-2 px-3 rounded-lg border-2 transition-all hover:shadow-md font-medium"
                style={{ borderColor: '#0B2C5D', color: '#0B2C5D', backgroundColor: 'rgba(11,44,93,0.04)' }}>
                Demo: Chairman
              </button>
              <button onClick={() => fillDemo('staff')}
                className="text-xs py-2 px-3 rounded-lg border-2 transition-all hover:shadow-md font-medium"
                style={{ borderColor: '#F2B705', color: '#92700a', backgroundColor: 'rgba(242,183,5,0.08)' }}>
                Demo: Staff
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@ustp.edu.ph"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-all" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
                style={{ backgroundColor: '#0B2C5D' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
          <p className="text-center text-gray-400 text-xs mt-6">
            USTP – Civil Engineering Department · LiCEnSURE System
          </p>
        </div>
      </div>
    </div>
  )
}
