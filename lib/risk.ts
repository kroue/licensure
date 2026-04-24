export type PredictionLabel = 'PASSED' | 'FAILED'

export type FailedRiskLevel = 'High Risk' | 'Medium Risk' | 'Low Risk'

export type RiskLevel = FailedRiskLevel | 'N/A'

export function normalizeProbability(probability: unknown): number {
  if (typeof probability === 'number' && Number.isFinite(probability)) {
    return Math.max(0, Math.min(1, probability))
  }

  if (typeof probability === 'string') {
    const parsed = Number(probability)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, parsed))
    }
  }

  return 0
}

export function getFailedRiskLevelFromProbability(probability: unknown): FailedRiskLevel {
  const normalized = normalizeProbability(probability)
  const percentage = normalized * 100

  if (percentage >= 80) return 'High Risk'
  if (percentage >= 50) return 'Medium Risk'
  return 'Low Risk'
}

export function getRiskLevel(prediction: PredictionLabel, probability: unknown): RiskLevel {
  if (prediction !== 'FAILED') return 'N/A'
  return getFailedRiskLevelFromProbability(probability)
}
