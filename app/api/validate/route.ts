import { NextResponse } from 'next/server'
import { getBackendEndpointCandidates } from '@/lib/backend-url'

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
    const backendUrlCandidates = getBackendEndpointCandidates('/validate')
    if (backendUrlCandidates.length === 0) {
      return NextResponse.json(
        { error: 'Backend URL is not configured. Set PYTHON_BACKEND_URL or VERCEL_URL.' },
        { status: 500 },
      )
    }

    const body = await request.json() as { uploadId?: string }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required for validation.' }, { status: 400 })
    }

    let backendResponse: Response | null = null
    let rawPayload = ''
    let parsedPayload: Record<string, unknown> | null = null
    for (const endpointUrl of backendUrlCandidates) {
      const controller = new AbortController()
      const timeoutHandle = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS)
      try {
        backendResponse = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutHandle)
      }

      rawPayload = await backendResponse.text()
      parsedPayload = parseJsonObject(rawPayload)

      if (
        backendResponse.status === 404
        && (rawPayload.trim().startsWith('<') || rawPayload.includes('NOT_FOUND'))
      ) {
        continue
      }

      break
    }

    if (!backendResponse) {
      return NextResponse.json(
        { error: 'Python backend is unreachable.' },
        { status: 502 },
      )
    }
    const detail = typeof parsedPayload?.detail === 'string' ? parsedPayload.detail : ''
    const errorText = typeof parsedPayload?.error === 'string' ? parsedPayload.error : ''

    if (!backendResponse.ok) {
      const fallbackError = rawPayload.trim().startsWith('<')
        ? 'Python backend returned HTML instead of JSON. Check PYTHON_BACKEND_URL and backend deployment.'
        : rawPayload.slice(0, 180)

      return NextResponse.json(
        { error: detail || errorText || fallbackError || 'Python backend validation failed.' },
        { status: backendResponse.status },
      )
    }

    if (!parsedPayload) {
      return NextResponse.json(
        { error: 'Python backend validation response was not valid JSON.' },
        { status: 502 },
      )
    }

    return NextResponse.json(parsedPayload)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Validation timed out while waiting for Python backend. Ensure backend is running and stable.' },
        { status: 504 },
      )
    }

    const message = error instanceof Error ? error.message : 'Validation failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
