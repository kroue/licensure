import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL ?? 'http://127.0.0.1:8000'
const BACKEND_TIMEOUT_MS = 20000

export async function POST(request: Request) {
  try {
    const body = await request.json() as { uploadId?: string; rows?: unknown[] }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''
    const rows = Array.isArray(body.rows) ? body.rows : undefined
    if (!uploadId && (!rows || rows.length === 0)) {
      return NextResponse.json({ error: 'Either uploadId or rows is required.' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS)

    let backendResponse: Response
    try {
      backendResponse = await fetch(`${PYTHON_BACKEND_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: uploadId || undefined, rows }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutHandle)
    }

    const payload = await backendResponse.json() as { predictions?: unknown[]; detail?: string; error?: string }

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: payload.detail || payload.error || 'Python backend prediction failed.' },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload)
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
