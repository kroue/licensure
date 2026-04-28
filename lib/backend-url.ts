function removeTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function getBackendBaseCandidates(): string[] {
  const candidates: string[] = []
  const configured = process.env.PYTHON_BACKEND_URL?.trim()
  const isVercel = Boolean(process.env.VERCEL)

  if (configured) {
    const normalized = removeTrailingSlash(configured)
    candidates.push(normalized)

    if (isVercel && !normalized.includes('/_/backend')) {
      candidates.push(`${normalized}/_/backend`)
    }
  } else if (isVercel) {
    const vercelUrl = process.env.VERCEL_URL?.trim()
    if (vercelUrl) {
      const host = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`
      const normalized = removeTrailingSlash(host)
      candidates.push(`${normalized}/_/backend`)
      candidates.push(normalized)
    }
  }

  if (!isVercel) {
    candidates.push('http://127.0.0.1:8000')
  }

  const unique: string[] = []
  for (const candidate of candidates) {
    if (!unique.includes(candidate)) {
      unique.push(candidate)
    }
  }
  return unique
}
