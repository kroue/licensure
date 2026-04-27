import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL
  ?? 'http://127.0.0.1:8000'
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
    if (process.env.VERCEL && !process.env.PYTHON_BACKEND_URL) {
      return NextResponse.json(
        { error: 'PYTHON_BACKEND_URL is not configured in Vercel environment variables.' },
        { status: 500 },
      )
    }

    const body = await request.json() as { uploadId?: string }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required for validation.' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS)

    let backendResponse: Response
    try {
      backendResponse = await fetch(`${PYTHON_BACKEND_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutHandle)
    }

    const rawPayload = await backendResponse.text()
    const parsedPayload = parseJsonObject(rawPayload)
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
