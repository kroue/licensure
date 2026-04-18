'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DEMO_ACCOUNTS, type Role } from './data'

interface AuthUser { name: string; email: string; role: Role }
interface AuthContextType {
  role: Role | null
  user: AuthUser | null
  login: (role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({ role: null, user: null, login: () => {}, logout: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('licensure_user')
      if (saved) setUser(JSON.parse(saved))
    } catch {}
  }, [])

  const login = (role: Role) => {
    const acct = DEMO_ACCOUNTS[role]
    const u: AuthUser = { name: acct.name, email: acct.email, role }
    setUser(u)
    try { sessionStorage.setItem('licensure_user', JSON.stringify(u)) } catch {}
  }

  const logout = () => {
    setUser(null)
    try { sessionStorage.removeItem('licensure_user') } catch {}
  }

  return (
    <AuthContext.Provider value={{ role: user?.role ?? null, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
