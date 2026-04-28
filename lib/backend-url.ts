function removeTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function normalizeToAbsoluteUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return removeTrailingSlash(trimmed)
  }
  return removeTrailingSlash(`https://${trimmed}`)
}

export function getBackendBaseCandidates(): string[] {
  const candidates: string[] = []
  const configuredRaw = process.env.PYTHON_BACKEND_URL?.trim()
  const isVercel = Boolean(process.env.VERCEL)

  if (configuredRaw) {
    const configuredValues = configuredRaw
      .split(/[\r\n,\s]+/)
      .map((value) => normalizeToAbsoluteUrl(value))
      .filter((value) => value.length > 0)

    for (const normalized of configuredValues) {
      candidates.push(normalized)
      if (isVercel && !normalized.includes('/_/backend')) {
        candidates.push(`${normalized}/_/backend`)
      }
    }
  } else if (isVercel) {
    const vercelUrl = process.env.VERCEL_URL?.trim()
    if (vercelUrl) {
      const normalized = normalizeToAbsoluteUrl(vercelUrl)
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

export function getBackendEndpointCandidates(endpoint: string): string[] {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const baseCandidates = getBackendBaseCandidates()
  const urls: string[] = []

  for (const base of baseCandidates) {
    const normalizedBase = removeTrailingSlash(base)
    const alreadyHasEndpoint = normalizedBase.endsWith(normalizedEndpoint)
    if (alreadyHasEndpoint) {
      urls.push(normalizedBase)
    } else {
      urls.push(`${normalizedBase}${normalizedEndpoint}`)
    }

    if (!normalizedBase.includes('/_/backend')) {
      urls.push(`${normalizedBase}/_/backend${normalizedEndpoint}`)
    }

    if (!normalizedBase.includes('/api')) {
      urls.push(`${normalizedBase}/api${normalizedEndpoint}`)
    }
  }

  const unique: string[] = []
  for (const url of urls) {
    if (!unique.includes(url)) {
      unique.push(url)
    }
  }
  return unique
}
