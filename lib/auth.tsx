'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  auth,
  createManagedUserRecord,
  createStaffUserWithSecondaryAuth,
  deriveNameFromEmail,
  getManagedUserRecordByEmail,
  getManagedUserRecordByUid,
  touchManagedUserLastLogin,
  upsertManagedUserRecordByUid,
  type ManagedUserRole,
} from './firebase'
import type { Role } from './data'

interface AuthUser { uid: string; name: string; email: string; role: Role }
interface AuthContextType {
  role: Role | null
  user: AuthUser | null
  sessionStartedAt: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<Role>
  logout: () => Promise<void>
  createManagedAccount: (
    fullName: string,
    email: string,
    password: string,
    role: ManagedUserRole,
  ) => Promise<{ uid: string; email: string }>
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  user: null,
  sessionStartedAt: null,
  loading: true,
  login: async () => 'staff',
  logout: async () => {},
  createManagedAccount: async () => ({ uid: '', email: '' }),
})

const SESSION_KEY = 'licensure_active_session'

function resolveSessionStart(uid: string): string {
  const now = new Date().toISOString()
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { uid?: string; startedAt?: string }
      if (parsed.uid === uid && typeof parsed.startedAt === 'string' && parsed.startedAt) {
        return parsed.startedAt
      }
    }
  } catch {
    // Fallback to fresh session timestamp.
  }

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ uid, startedAt: now }))
  } catch {
    // Best-effort persistence only.
  }
  return now
}

function clearSessionStart(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Best-effort persistence only.
  }
}

function toAuthUser(firebaseUser: FirebaseUser): AuthUser {
  const email = firebaseUser.email ?? ''
  return {
    uid: firebaseUser.uid,
    email,
    role: email.trim().toLowerCase() === 'chairman@ustp.edu.ph' || email.trim().toLowerCase() === 'dean@ustp.edu.ph' ? 'chairman' : 'staff',
    name: firebaseUser.displayName || deriveNameFromEmail(email),
  }
}

function mapAuthError(errorMessage: string): string {
  if (errorMessage.includes('auth/invalid-credential')) return 'Invalid email or password. Please try again.'
  if (errorMessage.includes('auth/user-not-found')) return 'Account not found.'
  if (errorMessage.includes('auth/wrong-password')) return 'Invalid email or password. Please try again.'
  if (errorMessage.includes('auth/too-many-requests')) return 'Too many attempts. Please wait and try again.'
  if (errorMessage.includes('auth/email-already-in-use')) return 'This email is already registered.'
  if (errorMessage.includes('auth/weak-password')) return 'Password must be at least 6 characters.'
  return 'Authentication failed. Please try again.'
}

function roleLabelFromRole(role: Role, email: string): 'Chairman' | 'Dean' | 'Staff' | 'Faculty' {
  if (role === 'faculty') return 'Faculty'
  if (role === 'staff') return 'Staff'
  return email.trim().toLowerCase() === 'dean@ustp.edu.ph' ? 'Dean' : 'Chairman'
}

function appRoleFromManagedRole(role: ManagedUserRole): Role {
  if (role === 'Faculty') return 'faculty'
  return role === 'Staff' ? 'staff' : 'chairman'
}

function fallbackManagedRole(email: string): ManagedUserRole {
  const normalized = email.trim().toLowerCase()
  if (normalized === 'dean@ustp.edu.ph') return 'Dean'
  if (normalized === 'chairman@ustp.edu.ph') return 'Chairman'
  if (normalized.includes('faculty')) return 'Faculty'
  return 'Staff'
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs)
    }),
  ])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setSessionStartedAt(null)
        clearSessionStart()
        setLoading(false)
        return
      }

      const baseUser = toAuthUser(firebaseUser)

      void (async () => {
        try {
          const byUid = await withTimeout(getManagedUserRecordByUid(firebaseUser.uid), 3000)
          const byEmail = !byUid && baseUser.email ? await withTimeout(getManagedUserRecordByEmail(baseUser.email), 3000) : null
          const managedRole = byUid?.role || byEmail?.role || fallbackManagedRole(baseUser.email)

          setUser({
            uid: baseUser.uid,
            name: byUid?.name || byEmail?.name || baseUser.name,
            email: baseUser.email,
            role: appRoleFromManagedRole(managedRole),
          })
          setSessionStartedAt(resolveSessionStart(baseUser.uid))
        } catch {
          setUser(baseUser)
          setSessionStartedAt(resolveSessionStart(baseUser.uid))
        } finally {
          setLoading(false)
        }
      })()
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<Role> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const firebaseUser = credential.user
      const baseUser = toAuthUser(firebaseUser)

      const byUid = await withTimeout(getManagedUserRecordByUid(firebaseUser.uid), 3500)
      const byEmail = !byUid && baseUser.email ? await withTimeout(getManagedUserRecordByEmail(baseUser.email), 3500) : null

      const managedRole = byUid?.role || byEmail?.role || fallbackManagedRole(baseUser.email)
      const role = appRoleFromManagedRole(managedRole)

      setUser({
        uid: baseUser.uid,
        name: byUid?.name || byEmail?.name || baseUser.name,
        email: baseUser.email,
        role,
      })
      setSessionStartedAt(resolveSessionStart(baseUser.uid))

      // Best-effort sync for collection role/profile and last login.
      void upsertManagedUserRecordByUid(firebaseUser.uid, {
        name: byUid?.name || byEmail?.name || baseUser.name,
        email: baseUser.email,
        role: managedRole,
        status: byUid?.status || byEmail?.status || 'Active',
      }).catch(() => {
        // Best-effort update only.
      })

      void touchManagedUserLastLogin(firebaseUser.uid, {
        name: byUid?.name || byEmail?.name || baseUser.name,
        email: baseUser.email,
        role: managedRole,
        status: byUid?.status || byEmail?.status || 'Active',
      }).catch(() => {
        // Best-effort update only.
      })

      return role
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.'
      throw new Error(mapAuthError(message))
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setSessionStartedAt(null)
    clearSessionStart()
  }

  const createManagedAccount = async (
    fullName: string,
    email: string,
    password: string,
    role: ManagedUserRole,
  ) => {
    if (user?.role !== 'chairman') {
      throw new Error('Only Chairman / Dean accounts can create user accounts.')
    }

    try {
      const created = await createStaffUserWithSecondaryAuth(fullName, email.trim().toLowerCase(), password)
      await createManagedUserRecord(
        {
          name: fullName.trim(),
          email: created.email,
          role,
          status: 'Active',
          lastLogin: 'Never',
        },
        { uid: created.uid },
      )
      return created
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create staff account.'
      throw new Error(mapAuthError(message))
    }
  }

  return (
    <AuthContext.Provider value={{ role: user?.role ?? null, user, sessionStartedAt, loading, login, logout, createManagedAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
