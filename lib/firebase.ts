'use client'

import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut, updateProfile } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore'
import type { Role } from './data'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDT6jO9jRQLaosgk7ARAvg7T1AwHds1yms',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'licensure-39cb5.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'licensure-39cb5',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'licensure-39cb5.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '206525711250',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:206525711250:web:688beef38efd14a9c2b74b',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-4QG3J76KGY',
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export type ManagedUserRole = 'Chairman' | 'Dean' | 'Staff' | 'Faculty'
export type ManagedUserStatus = 'Active' | 'Inactive'

export interface ManagedUserRecord {
  id: string
  name: string
  email: string
  role: ManagedUserRole
  status: ManagedUserStatus
  lastLogin: string
}

export interface PredictionRunAnalytics {
  uploadId: string
  fileName: string
  totalAnalyzed: number
  passedCount: number
  failedCount: number
  passRate: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  modelVersion: string
  modelAccuracy?: number
  processedRows: number
  encodedFeatureCount: number
  predictionGeneratedAt: string
  sessionStartedAt: string | null
  runBy: {
    uid: string
    email: string
    name: string
    role: 'chairman' | 'staff' | 'faculty'
  }
}

export interface UploadHistoryAnalytics {
  uploadId: string
  fileName: string
  uploadedAt: string
  records: number | null
  status: 'Uploaded' | 'Success' | 'Failed'
  runBy: {
    uid: string
    email: string
    name: string
    role: 'chairman' | 'staff' | 'faculty'
  }
}

export interface PredictionRowAnalytics {
  runId: string
  uploadId: string
  fileName: string
  predictionGeneratedAt: string
  runBy: {
    uid: string
    email: string
    name: string
    role: 'chairman' | 'staff' | 'faculty'
  }
  student: Record<string, unknown>
  contributingPredictors?: Array<{
    key: string
    label: string
    valueLabel: string
    score: number
    impact: 'positive' | 'neutral' | 'negative'
  }>
}

export interface PredictionRunAnalyticsRecord extends PredictionRunAnalytics {
  id: string
}

export type AuditLogStatus = 'Success' | 'Failed' | 'Info'

export interface AuditLogRecord {
  id: string
  occurredAt: string
  action: string
  details: string
  status: AuditLogStatus
  actor: {
    uid: string
    email: string
    name: string
    role: 'Chairman' | 'Dean' | 'Staff' | 'Faculty'
  }
  metadata?: Record<string, unknown>
}

export interface AuditLogWrite {
  action: string
  details: string
  status: AuditLogStatus
  actor: {
    uid: string
    email: string
    name: string
    role: 'chairman' | 'staff' | 'faculty'
  }
  occurredAt?: string
  metadata?: Record<string, unknown>
}

type ManagedUserWrite = {
  name: string
  email: string
  role: ManagedUserRole
  status: ManagedUserStatus
  lastLogin?: string
}

const CHAIRMAN_DEAN_EMAILS = new Set(['chairman@ustp.edu.ph', 'dean@ustp.edu.ph'])

export function inferRoleFromEmail(email: string): Role {
  return CHAIRMAN_DEAN_EMAILS.has(email.trim().toLowerCase()) ? 'chairman' : 'staff'
}

export function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'User'
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function roleLabelFromEmail(email: string): ManagedUserRole {
  const normalized = email.trim().toLowerCase()
  if (normalized === 'dean@ustp.edu.ph') return 'Dean'
  if (normalized === 'chairman@ustp.edu.ph') return 'Chairman'
  if (normalized.includes('faculty')) return 'Faculty'
  return 'Staff'
}

function toManagedUserRecord(
  id: string,
  data: Partial<ManagedUserWrite> & { lastLogin?: unknown },
): ManagedUserRecord {
  return {
    id,
    name: data.name || 'Unknown User',
    email: data.email || '-',
    role: data.role || roleLabelFromEmail(data.email || ''),
    status: data.status || 'Active',
    lastLogin: toDateLabel(data.lastLogin),
  }
}

function toDateLabel(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString('en-PH', { hour12: false })
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('en-PH', { hour12: false })
    }
    return value
  }

  return 'Never'
}

function sanitizeForFirestore(value: unknown): unknown {
  if (value === undefined) return null
  if (value === null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (Array.isArray(value)) return value.map((entry) => sanitizeForFirestore(entry))
  if (value instanceof Date || value instanceof Timestamp) return value

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, sanitizeForFirestore(entry)]),
    )
  }

  return value
}

function normalizeAuditRole(role: 'chairman' | 'staff' | 'faculty', email: string): 'Chairman' | 'Dean' | 'Staff' | 'Faculty' {
  if (role === 'faculty') return 'Faculty'
  if (role === 'staff') return 'Staff'
  if (email.trim().toLowerCase() === 'dean@ustp.edu.ph') return 'Dean'
  return 'Chairman'
}

export function subscribeManagedUsers(
  onData: (users: ManagedUserRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const ref = query(collection(db, 'system_users'), orderBy('name'))

  return onSnapshot(
    ref,
    (snapshot) => {
      const users = snapshot.docs.map((snapshotDoc) => {
        const data = snapshotDoc.data() as Partial<ManagedUserWrite> & { lastLogin?: unknown }
        return toManagedUserRecord(snapshotDoc.id, data)
      })

      onData(users)
    },
    (error) => {
      if (onError) onError(error)
    },
  )
}

export async function getManagedUserRecordByUid(uid: string): Promise<ManagedUserRecord | null> {
  const uidQuery = query(collection(db, 'system_users'), where('uid', '==', uid), limit(1))
  const snapshot = await getDocs(uidQuery)
  if (snapshot.empty) return null

  const userDoc = snapshot.docs[0]
  const data = userDoc.data() as Partial<ManagedUserWrite> & { lastLogin?: unknown }
  return toManagedUserRecord(userDoc.id, data)
}

export async function getManagedUserRecordByEmail(email: string): Promise<ManagedUserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const emailQuery = query(collection(db, 'system_users'), where('email', '==', normalizedEmail), limit(1))
  const snapshot = await getDocs(emailQuery)
  if (snapshot.empty) return null

  const userDoc = snapshot.docs[0]
  const data = userDoc.data() as Partial<ManagedUserWrite> & { lastLogin?: unknown }
  return toManagedUserRecord(userDoc.id, data)
}

export async function upsertManagedUserRecordByUid(
  uid: string,
  payload: ManagedUserWrite,
): Promise<void> {
  const normalizedEmail = payload.email.trim().toLowerCase()
  const normalizedName = payload.name.trim()
  const role = payload.role
  const status = payload.status

  const existing = await getManagedUserRecordByUid(uid)
  const existingDocId = existing?.id

  if (existingDocId) {
    await setDoc(
      doc(db, 'system_users', existingDocId),
      {
        uid,
        name: normalizedName,
        email: normalizedEmail,
        role,
        status,
        ...(payload.lastLogin ? { lastLogin: payload.lastLogin } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    return
  }

  const existingByEmail = await getManagedUserRecordByEmail(normalizedEmail)
  if (existingByEmail?.id) {
    await setDoc(
      doc(db, 'system_users', existingByEmail.id),
      {
        uid,
        name: normalizedName,
        email: normalizedEmail,
        role,
        status,
        ...(payload.lastLogin ? { lastLogin: payload.lastLogin } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    return
  }

  await addDoc(collection(db, 'system_users'), {
    uid,
    name: normalizedName,
    email: normalizedEmail,
    role,
    status,
    lastLogin: payload.lastLogin || 'Never',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function ensureCoreAdminRecords(): Promise<void> {
  const coreUsers: Array<ManagedUserWrite & { id: string }> = [
    {
      id: 'chairman_core',
      name: 'Dr. Juan Santos',
      email: 'chairman@ustp.edu.ph',
      role: 'Chairman',
      status: 'Active',
      lastLogin: new Date().toISOString(),
    },
    {
      id: 'dean_core',
      name: 'Dr. Maria Garcia',
      email: 'dean@ustp.edu.ph',
      role: 'Dean',
      status: 'Active',
      lastLogin: new Date().toISOString(),
    },
  ]

  await Promise.all(
    coreUsers.map(async (entry) => {
      await setDoc(
        doc(db, 'system_users', entry.id),
        {
          ...entry,
          updatedAt: serverTimestamp(),
          seededAt: serverTimestamp(),
        },
        { merge: true },
      )
    }),
  )
}

export async function createManagedUserRecord(
  user: ManagedUserWrite,
  options?: { id?: string; uid?: string },
): Promise<string> {
  const payload = {
    ...(options?.uid ? { uid: options.uid } : {}),
    name: user.name.trim(),
    email: user.email.trim().toLowerCase(),
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin || 'Never',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (options?.id) {
    await setDoc(doc(db, 'system_users', options.id), payload, { merge: true })
    return options.id
  }

  const created = await addDoc(collection(db, 'system_users'), payload)
  return created.id
}

export async function updateManagedUserRecord(
  id: string,
  updates: Partial<ManagedUserWrite>,
): Promise<void> {
  await updateDoc(doc(db, 'system_users', id), {
    ...updates,
    ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteManagedUserRecord(id: string): Promise<void> {
  await deleteDoc(doc(db, 'system_users', id))
}

export async function createAuditLog(payload: AuditLogWrite): Promise<string> {
  const occurredAt = payload.occurredAt || new Date().toISOString()
  const normalized: Omit<AuditLogRecord, 'id'> = {
    occurredAt,
    action: payload.action,
    details: payload.details,
    status: payload.status,
    actor: {
      uid: payload.actor.uid,
      email: payload.actor.email.trim().toLowerCase(),
      name: payload.actor.name,
      role: normalizeAuditRole(payload.actor.role, payload.actor.email),
    },
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  }

  const created = await addDoc(collection(db, 'audit_logs'), {
    ...(sanitizeForFirestore(normalized) as Record<string, unknown>),
    createdAt: serverTimestamp(),
  })

  return created.id
}

export function subscribeAuditLogs(
  requester: { uid: string; role: 'chairman' | 'staff' | 'faculty' },
  onData: (rows: AuditLogRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  let isActive = true

  const loadRows = async () => {
    try {
      const ref = requester.role === 'chairman'
        ? query(collection(db, 'audit_logs'), orderBy('occurredAt', 'desc'), limit(400))
        : query(collection(db, 'audit_logs'), where('actor.uid', '==', requester.uid))

      const snapshot = await getDocs(ref)
      if (!isActive) return

      const rows = snapshot.docs
        .map((snapshotDoc) => {
          const row = snapshotDoc.data() as Omit<AuditLogRecord, 'id'>
          return {
            id: snapshotDoc.id,
            ...row,
          }
        })
        .sort((a, b) => {
          const aTime = new Date(a.occurredAt || '').getTime()
          const bTime = new Date(b.occurredAt || '').getTime()
          return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
        })

      onData(rows)
    } catch (error) {
      if (!isActive) return
      if (onError) onError(error as Error)
    }
  }

  void loadRows()

  const pollId = window.setInterval(() => {
    void loadRows()
  }, 15000)

  return () => {
    isActive = false
    window.clearInterval(pollId)
  }
}

export async function touchManagedUserLastLogin(
  uid: string,
  payload: { name: string; email: string; role: ManagedUserRole; status: ManagedUserStatus },
): Promise<void> {
  await upsertManagedUserRecordByUid(uid, {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    status: payload.status,
    lastLogin: new Date().toISOString(),
  })
}

export async function createStaffUserWithSecondaryAuth(
  fullName: string,
  email: string,
  password: string,
): Promise<{ uid: string; email: string }> {
  const secondaryApp = initializeApp(firebaseConfig, `staff-creator-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)

    if (fullName.trim()) {
      await updateProfile(credential.user, { displayName: fullName.trim() })
    }

    await signOut(secondaryAuth)

    return {
      uid: credential.user.uid,
      email: credential.user.email ?? email,
    }
  } finally {
    await deleteApp(secondaryApp)
  }
}

export async function savePredictionRunAnalytics(payload: PredictionRunAnalytics): Promise<string> {
  const created = await addDoc(collection(db, 'prediction_runs'), {
    ...(sanitizeForFirestore(payload) as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return created.id
}

export async function upsertUploadHistoryAnalytics(payload: UploadHistoryAnalytics): Promise<void> {
  await setDoc(
    doc(db, 'upload_history', payload.uploadId),
    {
      ...(sanitizeForFirestore(payload) as Record<string, unknown>),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function subscribeUploadHistoryAnalytics(
  requester: { uid: string; role: 'chairman' | 'staff' | 'faculty' },
  onData: (rows: UploadHistoryAnalytics[]) => void,
  onError?: (error: Error) => void,
): () => void {
  let isActive = true

  const loadRows = async () => {
    try {
      const ref = requester.role === 'chairman'
        ? query(collection(db, 'upload_history'), orderBy('uploadedAt', 'desc'))
        : query(
            collection(db, 'upload_history'),
            where('runBy.uid', '==', requester.uid),
          )
      const snapshot = await getDocs(ref)

      if (!isActive) return

      const rows = snapshot.docs
        .map((snapshotDoc) => snapshotDoc.data() as UploadHistoryAnalytics)
        .sort((a, b) => {
          const aTime = new Date(a.uploadedAt || '').getTime()
          const bTime = new Date(b.uploadedAt || '').getTime()
          return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
        })
      onData(rows)
    } catch (error) {
      if (!isActive) return
      if (onError) onError(error as Error)
    }
  }

  void loadRows()

  const pollId = window.setInterval(() => {
    void loadRows()
  }, 15000)

  return () => {
    isActive = false
    window.clearInterval(pollId)
  }
}

export async function savePredictionRowsAnalytics(
  rows: PredictionRowAnalytics[],
): Promise<void> {
  if (rows.length === 0) return

  const chunkSize = 350
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const batch = writeBatch(db)

    chunk.forEach((row, idx) => {
      const rowRef = doc(collection(db, 'prediction_rows'))
      batch.set(rowRef, {
        ...(sanitizeForFirestore(row) as Record<string, unknown>),
        rowIndex: start + idx,
        createdAt: serverTimestamp(),
      })
    })

    await batch.commit()
  }
}

export async function getPredictionRowsAnalyticsByUpload(
  uploadId: string,
  requester: { uid: string; role: 'chairman' | 'staff' | 'faculty' },
): Promise<PredictionRowAnalytics[]> {
  if (!uploadId.trim()) return []

  const rowsQuery = requester.role === 'chairman'
    ? query(collection(db, 'prediction_rows'), where('uploadId', '==', uploadId.trim()))
    : query(
        collection(db, 'prediction_rows'),
        where('uploadId', '==', uploadId.trim()),
        where('runBy.uid', '==', requester.uid),
      )

  const snapshot = await getDocs(rowsQuery)
  return snapshot.docs
    .map((snapshotDoc) => snapshotDoc.data() as PredictionRowAnalytics & { rowIndex?: number })
    .sort((a, b) => {
      const aIndex = typeof a.rowIndex === 'number' ? a.rowIndex : 0
      const bIndex = typeof b.rowIndex === 'number' ? b.rowIndex : 0
      return aIndex - bIndex
    })
}

export async function getLatestPredictionRunAnalytics(
  requester: { uid: string; role: 'chairman' | 'staff' | 'faculty' },
): Promise<PredictionRunAnalyticsRecord | null> {
  const baseQuery = requester.role === 'chairman'
    ? query(collection(db, 'prediction_runs'), orderBy('predictionGeneratedAt', 'desc'), limit(1))
    : query(
        collection(db, 'prediction_runs'),
        where('runBy.uid', '==', requester.uid),
        orderBy('predictionGeneratedAt', 'desc'),
        limit(1),
      )

  const snapshot = await getDocs(baseQuery)
  if (snapshot.empty) return null

  const runDoc = snapshot.docs[0]
  const run = runDoc.data() as PredictionRunAnalytics
  return { id: runDoc.id, ...run }
}

export async function getPredictionRowsAnalyticsByRunId(
  runId: string,
  requester: { uid: string; role: 'chairman' | 'staff' | 'faculty' },
): Promise<PredictionRowAnalytics[]> {
  if (!runId.trim()) return []

  const rowsQuery = requester.role === 'chairman'
    ? query(collection(db, 'prediction_rows'), where('runId', '==', runId.trim()))
    : query(
        collection(db, 'prediction_rows'),
        where('runId', '==', runId.trim()),
        where('runBy.uid', '==', requester.uid),
      )

  const snapshot = await getDocs(rowsQuery)
  return snapshot.docs
    .map((snapshotDoc) => snapshotDoc.data() as PredictionRowAnalytics & { rowIndex?: number })
    .sort((a, b) => {
      const aIndex = typeof a.rowIndex === 'number' ? a.rowIndex : 0
      const bIndex = typeof b.rowIndex === 'number' ? b.rowIndex : 0
      return aIndex - bIndex
    })
}
