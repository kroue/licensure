'use client'
import Link from 'next/link'
import Image from 'next/image'
import { BarChart3, ShieldCheck, TrendingUp, GraduationCap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col" style={{ backgroundColor: '#0B2C5D' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="LiCEnSURE logo"
            width={40}
            height={40}
            className="rounded-lg"
            priority
          />
          <div>
            <div className="text-white font-bold text-sm">LiCEnSURE | USTP</div>
            <div className="text-white/60 text-xs">Predicting Success. Protecting the future.</div>
          </div>
        </div>
        <Link href="/login"
          className="px-5 py-2 rounded-lg text-navy font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#F2B705', color: '#0B2C5D' }}>
          Login
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
        {/* Logo */}
        <div className="mb-8 relative">
          <Image
            src="/logo.png"
            alt="LiCEnSURE logo"
            width={128}
            height={128}
            className="rounded-3xl mx-auto shadow-2xl"
            priority
          />
        </div>

        <p className="text-white/70 text-sm uppercase tracking-widest mb-2">LiCEnSURE</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#F2B705' }}>
          Licensure Exam Predictive System
        </h1>
        <h2 className="text-white text-xl md:text-2xl font-semibold mb-6">
          Data-Driven Prediction for Licensure Exam Success
        </h2>
        <p className="text-white/70 text-base max-w-2xl leading-relaxed mb-10">
          A machine learning-powered decision support system for predicting Civil Engineering licensure
          exam success, enabling early identification of at-risk students and providing institutional
          insights for academic leaders.
        </p>

        <Link href="/login"
          className="px-8 py-3 rounded-lg text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95 shadow-lg"
          style={{ backgroundColor: '#1a3f6f', border: '2px solid rgba(255,255,255,0.2)' }}>
          Access System
        </Link>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-16 max-w-6xl w-full">
          {[
            {
              icon: BarChart3,
              title: 'Predictive Analytics',
              desc: 'Machine learning models analyze student data to predict exam outcomes',
            },
            {
              icon: ShieldCheck,
              title: 'Risk Identification',
              desc: 'Early detection of at-risk students for targeted intervention',
            },
            {
              icon: TrendingUp,
              title: 'Institutional Insights',
              desc: 'Strategic dashboards for academic leaders and decision-makers',
            },
            {
              icon: GraduationCap,
              title: 'Academic Excellence',
              desc: 'Data-driven approach to improve licensure exam pass rates',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl px-6 py-6 text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ backgroundColor: '#F2B705' }}>
                <Icon className="w-5 h-5" style={{ color: '#0B2C5D' }} />
              </div>
              <h3 className="text-white font-semibold text-xl mb-2">{title}</h3>
              <p className="text-white/80 text-base leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-white/40 text-xs border-t border-white/10">
        © 2024 University of Science and Technology of Southern Philippines · LiCEnSURE v9
      </footer>
    </div>
  )
}
