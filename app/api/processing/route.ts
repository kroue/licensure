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
    const body = await request.json() as { uploadId?: string }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''
    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required.' }, { status: 400 })
    }

    const backendCandidates = getBackendBaseCandidates()
    let backendResponse: Response | null = null
    let payload: Record<string, unknown> | null = null
    let rawPayload = ''

    for (const baseUrl of backendCandidates) {
      const controller = new AbortController()
      const timeoutHandle = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS)
      try {
        backendResponse = await fetch(`${baseUrl}/processing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId }),
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
            || 'Python backend processing failed.',
        },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload ?? {})
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Processing timed out while waiting for Python backend. Ensure backend is running and stable.' },
        { status: 504 },
      )
    }

    const message = error instanceof Error ? error.message : 'Processing failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
