import { NextResponse } from 'next/server'
import { getBackendBaseCandidates } from '@/lib/backend-url'

export const runtime = 'nodejs'

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
      backendResponse = await fetch(`${baseUrl}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      })
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
            || 'Python backend records failed.',
        },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload ?? {})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Records request failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
