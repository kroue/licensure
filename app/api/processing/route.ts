import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL ?? 'http://127.0.0.1:8000'
const BACKEND_TIMEOUT_MS = 20000

export async function POST(request: Request) {
  try {
    const body = await request.json() as { uploadId?: string }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''
    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required.' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS)

    let backendResponse: Response
    try {
      backendResponse = await fetch(`${PYTHON_BACKEND_URL}/processing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutHandle)
    }

    const payload = await backendResponse.json() as { detail?: string; error?: string }
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: payload.detail || payload.error || 'Python backend processing failed.' },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload)
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
