import { NextResponse } from 'next/server'
import { getBackendBaseCandidates } from '@/lib/backend-url'

export const runtime = 'nodejs'

const BACKEND_TIMEOUT_MS = 20000

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { uploadId?: string; rows?: unknown[] }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''
    const rows = Array.isArray(body.rows) ? body.rows : undefined
    if (!uploadId && (!rows || rows.length === 0)) {
      return NextResponse.json({ error: 'Either uploadId or rows is required.' }, { status: 400 })
    }

    const backendCandidates = getBackendBaseCandidates()
    let backendResponse: Response | null = null
    let payload: Record<string, unknown> | null = null
    let rawPayload = ''

    for (const baseUrl of backendCandidates) {
      const controller = new AbortController()
      const timeoutHandle = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS)
      try {
        backendResponse = await fetch(`${baseUrl}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: uploadId || undefined, rows }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutHandle)
      }

      rawPayload = await backendResponse.text()
      payload = parseJsonObject(rawPayload)

      if (
        backendResponse.status === 404
        && (rawPayload.trim().startsWith('<') || rawPayload.includes('NOT_FOUND'))
      ) {
        continue
      }

      break
    }

    if (!backendResponse) {
      return NextResponse.json({ error: 'Python backend is unreachable.' }, { status: 502 })
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error:
            (typeof payload?.detail === 'string' ? payload.detail : '')
            || (typeof payload?.error === 'string' ? payload.error : '')
            || 'Python backend prediction failed.',
        },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload ?? {})
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Prediction timed out while waiting for Python backend. Ensure backend is running and stable.' },
        { status: 504 },
      )
    }

    const message = error instanceof Error ? error.message : 'Prediction failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
