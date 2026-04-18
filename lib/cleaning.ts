import Papa from 'papaparse'

export type UploadStep = 'upload' | 'validating' | 'validated' | 'error'

export const REQUIRED_COLUMNS = [
  'Student_Code',
  'Student_Name',
  'GWA',
  'MSTE_AVE',
  'HPGE_AVE',
  'PSAD_AVE',
  'COMPREHENSION_INDEX',
  'Graduated_with_Latin',
  'Age',
  'Gender',
  'Father_Monthly_Income',
  'Father_Educational_Attainment',
  'Mother_Monthly_Income',
  'Mother_Educational_Attainment',
  'Exam_year',
  'Months_prep',
] as const

type RequiredColumn = (typeof REQUIRED_COLUMNS)[number]

const COLUMN_ALIASES: Record<RequiredColumn, string[]> = {
  Student_Code: ['STUDENT_CODE', 'STUDENTID', 'STUDENT_ID', 'STUDENTNO'],
  Student_Name: ['STUDENT_NAME', 'NAME', 'FULL_NAME', 'STUDENT'],
  GWA: ['GWA', 'GENERAL_WEIGHTED_AVERAGE'],
  MSTE_AVE: ['MSTE_AVE', 'MSTE_AVE', 'MSTE'],
  HPGE_AVE: ['HPGE_AVE', 'HPGE_AVE', 'HPGE'],
  PSAD_AVE: ['PSAD_AVE', 'PSAD_AVG', 'PSAD'],
  COMPREHENSION_INDEX: ['COMPREHENSION_INDEX', 'COMPREHENSION', 'ENGLISH_SUBJECTS'],
  Graduated_with_Latin: ['GRADUATED_WITH_LATIN', 'LATIN_HONORS', 'WITH_LATIN_HONORS'],
  Age: ['AGE'],
  Gender: ['GENDER', 'SEX'],
  Father_Monthly_Income: ['FATHER_MONTHLY_INCOME', 'FATHER_INCOME'],
  Father_Educational_Attainment: ['FATHER_EDUCATIONAL_ATTAINMENT', 'FATHER_EDUCATION'],
  Mother_Monthly_Income: ['MOTHER_MONTHLY_INCOME', 'MOTHER_INCOME'],
  Mother_Educational_Attainment: ['MOTHER_EDUCATIONAL_ATTAINMENT', 'MOTHER_EDUCATION'],
  Exam_year: ['EXAM_YEAR', 'EXAMYEAR'],
  Months_prep: ['MONTHS_PREP', 'MONTHS_PREPARATION', 'MONTHS_OF_PREP'],
}

const NUMERIC_COLUMNS = new Set<RequiredColumn>([
  'GWA',
  'MSTE_AVE',
  'HPGE_AVE',
  'PSAD_AVE',
  'COMPREHENSION_INDEX',
  'Age',
  'Exam_year',
  'Months_prep',
])

export interface RowIssue {
  rowNumber: number
  messages: string[]
}

export interface UploadCleaningResult {
  ok: boolean
  totalRows: number
  validRows: number
  issueRows: number
  missingColumns: string[]
  issues: RowIssue[]
  cleanedRows: Array<Record<string, string | number | null>>
  missingThreshold: number
}

// Keep Student_Code and Student_Name for UI display while dropping true non-features.
const NON_PREDICTOR_COLUMNS = new Set(['Student_ID', 'Result', 'Unnamed: 15'])

function normalizeHeader(value: string): string {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

function canonicalizeColumn(header: string): string {
  const normalized = normalizeHeader(header)
  for (const column of REQUIRED_COLUMNS) {
    if (normalizeHeader(column) === normalized) return column
    if (COLUMN_ALIASES[column].includes(normalized)) return column
  }
  return header.trim()
}

function parseCsv(csvText: string): { rows: Array<Record<string, string>>; headers: string[] } {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => canonicalizeColumn(header),
  })

  if (parsed.errors.length > 0) {
    const [firstError] = parsed.errors
    throw new Error(firstError.message || 'Unable to parse CSV file.')
  }

  return {
    rows: parsed.data,
    headers: parsed.meta.fields ?? [],
  }
}

function normalizeValue(column: RequiredColumn, value: unknown): string | number | null {
  if (value == null) return null
  const cleaned = String(value).trim()
  if (!cleaned || cleaned.toUpperCase() === 'N/A' || cleaned.toUpperCase() === 'NA') return null

  if (column === 'Gender') {
    const lower = cleaned.toLowerCase()
    if (lower === 'male' || lower === 'm') return 'Male'
    if (lower === 'female' || lower === 'f') return 'Female'
    return cleaned
  }

  if (column === 'Graduated_with_Latin') {
    const lower = cleaned.toLowerCase()
    if (['yes', 'y', 'true', '1', 'with latin', 'with latin honors'].includes(lower)) return 1
    if (['no', 'n', 'false', '0', 'none', 'without latin'].includes(lower)) return 0
    return cleaned
  }

  if (NUMERIC_COLUMNS.has(column)) {
    const numeric = Number(cleaned.replace(/,/g, ''))
    if (Number.isFinite(numeric)) {
      if (column === 'Age' && (numeric < 10 || numeric > 100)) return null
      return numeric
    }
    return null
  }

  return cleaned
}

export function cleanAndValidateCsv(csvText: string): UploadCleaningResult {
  const { rows, headers } = parseCsv(csvText)
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))

  if (missingColumns.length > 0) {
    return {
      ok: false,
      totalRows: rows.length,
      validRows: 0,
      issueRows: rows.length,
      missingColumns,
      issues: [],
      cleanedRows: [],
      missingThreshold: 0.3,
    }
  }

  const issues: RowIssue[] = []
  const cleanedRows: Array<Record<string, string | number | null>> = []
  let validRows = 0

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const messages: string[] = []
    let missingCount = 0
    const normalizedRow: Record<string, string | number | null> = {}

    for (const column of REQUIRED_COLUMNS) {
      const normalized = normalizeValue(column, row[column])
      normalizedRow[column] = normalized

      if (normalized == null || normalized === '') {
        missingCount += 1
      }

      if (column === 'Gender' && normalized != null && normalized !== 'Male' && normalized !== 'Female') {
        messages.push('Gender should be Male/Female.')
      }
    }

    const missingRate = missingCount / REQUIRED_COLUMNS.length
    if (missingRate > 0.3) {
      messages.push('Row exceeds 30% missing values threshold.')
    }

    if (messages.length > 0) {
      issues.push({ rowNumber, messages })
    } else {
      validRows += 1

      const modelReady = Object.fromEntries(
        Object.entries(normalizedRow).filter(([key]) => !NON_PREDICTOR_COLUMNS.has(key)),
      )

      if ('Result' in row) {
        const fail = String(row.Result ?? '').trim().toUpperCase() === 'FAILED' ? 1 : 0
        modelReady.Fail = fail
      }

      cleanedRows.push(modelReady)
    }
  })

  return {
    ok: issues.length === 0,
    totalRows: rows.length,
    validRows,
    issueRows: issues.length,
    missingColumns: [],
    issues,
    cleanedRows,
    missingThreshold: 0.3,
  }
}
