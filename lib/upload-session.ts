export interface UploadSummary {
  fileName: string
  totalRows: number
  validRows: number
  issueRows: number
  missingColumns: string[]
  missingThreshold: number
  importedAt: string
}

export interface UploadedCsvPayload {
  uploadId?: string
  fileName: string
  fileSize: number
  csvText?: string
  uploadedAt: string
}

export type CleanedRowValue = string | number | null
export type CleanedRow = Record<string, CleanedRowValue>

export interface PredictedStudentRow {
  Student_Code: string
  Student_Name: string
  Email: string
  GWA: number
  MSTE_AVE: number
  HPGE_AVE: number
  PSAD_AVE: number
  prediction: 'PASSED' | 'FAILED'
  probability: number
  Age: number | null
  Gender: string
  Year_Level: string
  Exam_year: number | null
  Months_prep: number | null
  Father_Monthly_Income: string
  Mother_Monthly_Income: string
  Father_Educational_Attainment: string
  Mother_Educational_Attainment: string
}

export interface ProcessingSummary {
  uploadId: string
  cleanedAndEncoded: boolean
  processedRows: number
  missingRows: number
  duplicatesRemoved: number
  encodedFeatureCount: number
  completedAt: string
}

const STORAGE_KEY = 'licensure_upload_summary'
const CLEANED_ROWS_KEY = 'licensure_cleaned_rows'
const PREDICTIONS_KEY = 'licensure_prediction_rows'
const UPLOADED_CSV_KEY = 'licensure_uploaded_csv_payload'
const PROCESSING_SUMMARY_KEY = 'licensure_processing_summary'

export function saveUploadSummary(summary: UploadSummary): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(summary))
  } catch {
    // Best-effort persistence only.
  }
}

export function getUploadSummary(): UploadSummary | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UploadSummary
  } catch {
    return null
  }
}

export function saveCleanedRows(rows: CleanedRow[]): void {
  try {
    sessionStorage.setItem(CLEANED_ROWS_KEY, JSON.stringify(rows))
  } catch {
    // Best-effort persistence only.
  }
}

export function getCleanedRows(): CleanedRow[] {
  try {
    const raw = sessionStorage.getItem(CLEANED_ROWS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CleanedRow[]) : []
  } catch {
    return []
  }
}

export function savePredictedRows(rows: PredictedStudentRow[]): void {
  try {
    sessionStorage.setItem(PREDICTIONS_KEY, JSON.stringify(rows))
  } catch {
    // Best-effort persistence only.
  }
}

export function saveProcessingSummary(summary: ProcessingSummary): void {
  try {
    sessionStorage.setItem(PROCESSING_SUMMARY_KEY, JSON.stringify(summary))
  } catch {
    // Best-effort persistence only.
  }
}

export function getProcessingSummary(): ProcessingSummary | null {
  try {
    const raw = sessionStorage.getItem(PROCESSING_SUMMARY_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ProcessingSummary
  } catch {
    return null
  }
}

export function getPredictedRows(): PredictedStudentRow[] {
  try {
    const raw = sessionStorage.getItem(PREDICTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PredictedStudentRow[]) : []
  } catch {
    return []
  }
}

export function saveUploadedCsvPayload(payload: UploadedCsvPayload): void {
  try {
    sessionStorage.setItem(UPLOADED_CSV_KEY, JSON.stringify(payload))
  } catch {
    // Best-effort persistence only.
  }
}

export function getUploadedCsvPayload(): UploadedCsvPayload | null {
  try {
    const raw = sessionStorage.getItem(UPLOADED_CSV_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UploadedCsvPayload
  } catch {
    return null
  }
}

export function clearUploadedCsvPayload(): void {
  try {
    sessionStorage.removeItem(UPLOADED_CSV_KEY)
  } catch {
    // Best-effort persistence only.
  }
}

export function clearValidationArtifacts(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(CLEANED_ROWS_KEY)
    sessionStorage.removeItem(PREDICTIONS_KEY)
    sessionStorage.removeItem(PROCESSING_SUMMARY_KEY)
  } catch {
    // Best-effort persistence only.
  }
}
