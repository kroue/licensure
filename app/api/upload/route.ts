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
    const backendUrlCandidates = getBackendEndpointCandidates('/upload')
    if (backendUrlCandidates.length === 0) {
      return NextResponse.json(
        { error: 'Backend URL is not configured. Set PYTHON_BACKEND_URL or VERCEL_URL.' },
        { status: 500 },
      )
    }

    const body = await request.json() as { fileName?: string; csvText?: string }
    const fileName = typeof body.fileName === 'string' ? body.fileName : ''
    const csvText = typeof body.csvText === 'string' ? body.csvText : ''

    if (!fileName || !csvText.trim()) {
      return NextResponse.json({ error: 'fileName and csvText are required.' }, { status: 400 })
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
          body: JSON.stringify({ fileName, csvText }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutHandle)
      }

      rawPayload = await backendResponse.text()
      parsedPayload = parseJsonObject(rawPayload)

      // Retry another candidate when Vercel responds with HTML NOT_FOUND.
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
        { error: detail || errorText || fallbackError || 'Python backend upload failed.' },
        { status: backendResponse.status },
      )
    }

    if (!parsedPayload) {
      return NextResponse.json(
        { error: 'Python backend upload response was not valid JSON.' },
        { status: 502 },
      )
    }

    return NextResponse.json(parsedPayload)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Upload timed out while waiting for Python backend.' },
        { status: 504 },
      )
    }

    const message = error instanceof Error ? error.message : 'Upload failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
