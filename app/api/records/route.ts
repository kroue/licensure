import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL
  ?? (process.env.VERCEL ? 'https://licensure-pi.vercel.app' : 'http://127.0.0.1:8000')

export async function POST(request: Request) {
  try {
    const body = await request.json() as { uploadId?: string }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''
    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required.' }, { status: 400 })
    }

    const backendResponse = await fetch(`${PYTHON_BACKEND_URL}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId }),
    })

    const payload = await backendResponse.json() as { detail?: string; error?: string }
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: payload.detail || payload.error || 'Python backend records failed.' },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Records request failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
