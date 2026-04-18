import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL ?? 'http://127.0.0.1:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { fileName?: string; csvText?: string }
    const fileName = typeof body.fileName === 'string' ? body.fileName : ''
    const csvText = typeof body.csvText === 'string' ? body.csvText : ''

    if (!fileName || !csvText.trim()) {
      return NextResponse.json({ error: 'fileName and csvText are required.' }, { status: 400 })
    }

    const backendResponse = await fetch(`${PYTHON_BACKEND_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, csvText }),
    })

    const payload = await backendResponse.json() as { detail?: string; error?: string }
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: payload.detail || payload.error || 'Python backend upload failed.' },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
