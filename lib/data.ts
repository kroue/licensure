// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'chairman' | 'staff' | 'faculty'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  department?: string
  createdAt: string
  status: 'active' | 'inactive'
}

export interface Student {
  id: string
  studentCode: string
  name: string
  gwa: number
  msteAligned: number
  psadAligned: number
  hpgeAligned: number
  englishSubjects: number
  comprehensionIndex: number
  age: number
  gender: 'Male' | 'Female'
  fatherMonthlyIncome: number
  fatherEducation: string
  motherMonthlyIncome: number
  motherEducation: string
  examYear: number
  monthsPrep: number
  prediction: 'PASSED' | 'FAILED'
  probability: number
  predictionDate: string
  batchId: string
}

export interface FeatureContribution {
  feature: string
  value: string | number
  shapValue: number
  direction: 'risk' | 'protective'
}

export interface ModelMetrics {
  model: string
  accuracy: number
  precision: number
  recall: number
  specificity: number
  f1Score: number
  rocAuc: number
}

export interface Batch {
  id: string
  fileName: string
  uploadedBy: string
  uploadedAt: string
  totalRecords: number
  processed: number
  passed: number
  failed: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface AuditLog {
  id: string
  action: string
  user: string
  role: Role
  timestamp: string
  details: string
  ipAddress: string
}

// ─── Demo Accounts ────────────────────────────────────────────────────────────

export const DEMO_ACCOUNTS = {
  chairman: { email: 'msantos@ustp.edu.ph', password: 'chairman123', name: 'Dr. Maria Santos', role: 'chairman' as Role },
  staff:    { email: 'jdelacruz@ustp.edu.ph', password: 'staff123',   name: 'Engr. Jose Dela Cruz', role: 'staff' as Role },
  faculty:  { email: 'fgarcia@ustp.edu.ph',   password: 'faculty123', name: 'Engr. Felix Garcia',   role: 'faculty' as Role },
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const USERS: User[] = [
  { id: 'u1', name: 'Dr. Maria Santos',      email: 'msantos@ustp.edu.ph',    role: 'chairman', department: 'Civil Engineering', createdAt: '2024-01-10', status: 'active' },
  { id: 'u2', name: 'Engr. Jose Dela Cruz',  email: 'jdelacruz@ustp.edu.ph',  role: 'staff',    department: 'Civil Engineering', createdAt: '2024-01-12', status: 'active' },
  { id: 'u3', name: 'Engr. Ana Reyes',       email: 'areyes@ustp.edu.ph',     role: 'staff',    department: 'Academic Affairs',  createdAt: '2024-02-01', status: 'active' },
  { id: 'u4', name: 'Prof. Carlos Bautista', email: 'cbautista@ustp.edu.ph',  role: 'chairman', department: "Dean's Office",     createdAt: '2024-02-14', status: 'active' },
  { id: 'u5', name: 'Engr. Liza Mendoza',    email: 'lmendoza@ustp.edu.ph',   role: 'staff',    department: 'Civil Engineering', createdAt: '2024-03-05', status: 'inactive' },
  { id: 'u6', name: 'Engr. Felix Garcia',    email: 'fgarcia@ustp.edu.ph',    role: 'faculty',  department: 'Civil Engineering', createdAt: '2024-03-10', status: 'active' },
]

// ─── Model Performance ────────────────────────────────────────────────────────

export const MODEL_METRICS: ModelMetrics[] = [
  { model: 'Random Forest',       accuracy: 0.8412, precision: 0.7891, recall: 0.8923, specificity: 0.8012, f1Score: 0.8374, rocAuc: 0.9021 },
  { model: 'XGBoost',             accuracy: 0.8234, precision: 0.7743, recall: 0.8654, specificity: 0.7881, f1Score: 0.8174, rocAuc: 0.8876 },
  { model: 'Gradient Boosting',   accuracy: 0.8089, precision: 0.7612, recall: 0.8412, specificity: 0.7801, f1Score: 0.7992, rocAuc: 0.8745 },
  { model: 'Logistic Regression', accuracy: 0.7643, precision: 0.7201, recall: 0.7892, specificity: 0.7432, f1Score: 0.7530, rocAuc: 0.8312 },
  { model: 'Decision Tree',       accuracy: 0.7512, precision: 0.6934, recall: 0.7721, specificity: 0.7341, f1Score: 0.7307, rocAuc: 0.7923 },
]

export const BEST_MODEL = MODEL_METRICS[0]

export const CONFUSION_MATRIX = { tn: 68, fp: 17, fn: 9, tp: 74 }

// ─── Students ─────────────────────────────────────────────────────────────────

export const STUDENTS: Student[] = [
  { id: 's1',  studentCode: 'CE-2019-001', name: 'Aldrin Macaraeg',     gwa: 1.8, msteAligned: 78, psadAligned: 72, hpgeAligned: 80, englishSubjects: 88, comprehensionIndex: 0.76, age: 24, gender: 'Male',   fatherMonthlyIncome: 18000, fatherEducation: 'College Graduate',     motherMonthlyIncome: 15000, motherEducation: 'High School Graduate', examYear: 2024, monthsPrep: 6, prediction: 'PASSED', probability: 0.18, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's2',  studentCode: 'CE-2019-002', name: 'Bernadette Ocampo',   gwa: 2.4, msteAligned: 61, psadAligned: 55, hpgeAligned: 63, englishSubjects: 70, comprehensionIndex: 0.54, age: 23, gender: 'Female', fatherMonthlyIncome: 12000, fatherEducation: 'High School Graduate',  motherMonthlyIncome: 10000, motherEducation: 'Elementary Graduate',  examYear: 2024, monthsPrep: 3, prediction: 'FAILED', probability: 0.82, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's3',  studentCode: 'CE-2019-003', name: 'Carlo Reyes',         gwa: 2.1, msteAligned: 70, psadAligned: 68, hpgeAligned: 74, englishSubjects: 81, comprehensionIndex: 0.65, age: 25, gender: 'Male',   fatherMonthlyIncome: 22000, fatherEducation: 'College Graduate',     motherMonthlyIncome: 18000, motherEducation: 'College Graduate',     examYear: 2024, monthsPrep: 5, prediction: 'PASSED', probability: 0.31, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's4',  studentCode: 'CE-2019-004', name: 'Diana Villanueva',    gwa: 2.7, msteAligned: 53, psadAligned: 48, hpgeAligned: 57, englishSubjects: 62, comprehensionIndex: 0.44, age: 24, gender: 'Female', fatherMonthlyIncome:  9000, fatherEducation: 'Elementary Graduate',  motherMonthlyIncome:  8000, motherEducation: 'Elementary Graduate',  examYear: 2024, monthsPrep: 2, prediction: 'FAILED', probability: 0.91, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's5',  studentCode: 'CE-2019-005', name: 'Eduardo Santos',      gwa: 1.6, msteAligned: 85, psadAligned: 82, hpgeAligned: 88, englishSubjects: 92, comprehensionIndex: 0.84, age: 23, gender: 'Male',   fatherMonthlyIncome: 35000, fatherEducation: 'Post-Graduate',        motherMonthlyIncome: 28000, motherEducation: 'College Graduate',     examYear: 2024, monthsPrep: 8, prediction: 'PASSED', probability: 0.07, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's6',  studentCode: 'CE-2019-006', name: 'Fatima Cruz',         gwa: 2.5, msteAligned: 59, psadAligned: 52, hpgeAligned: 60, englishSubjects: 68, comprehensionIndex: 0.49, age: 26, gender: 'Female', fatherMonthlyIncome: 10000, fatherEducation: 'Vocational/Technical', motherMonthlyIncome: 11000, motherEducation: 'High School Graduate', examYear: 2024, monthsPrep: 3, prediction: 'FAILED', probability: 0.77, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's7',  studentCode: 'CE-2019-007', name: 'Gabriel Lim',         gwa: 2.0, msteAligned: 74, psadAligned: 70, hpgeAligned: 76, englishSubjects: 84, comprehensionIndex: 0.71, age: 24, gender: 'Male',   fatherMonthlyIncome: 20000, fatherEducation: 'College Graduate',     motherMonthlyIncome: 17000, motherEducation: 'College Graduate',     examYear: 2024, monthsPrep: 6, prediction: 'PASSED', probability: 0.25, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's8',  studentCode: 'CE-2019-008', name: 'Hannah Ramos',        gwa: 2.9, msteAligned: 45, psadAligned: 40, hpgeAligned: 48, englishSubjects: 55, comprehensionIndex: 0.38, age: 25, gender: 'Female', fatherMonthlyIncome:  7500, fatherEducation: 'Elementary Graduate',  motherMonthlyIncome:  7000, motherEducation: 'Elementary Graduate',  examYear: 2024, monthsPrep: 1, prediction: 'FAILED', probability: 0.95, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's9',  studentCode: 'CE-2019-009', name: 'Ivan Torres',         gwa: 1.9, msteAligned: 80, psadAligned: 75, hpgeAligned: 83, englishSubjects: 89, comprehensionIndex: 0.78, age: 23, gender: 'Male',   fatherMonthlyIncome: 28000, fatherEducation: 'College Graduate',     motherMonthlyIncome: 22000, motherEducation: 'College Graduate',     examYear: 2024, monthsPrep: 7, prediction: 'PASSED', probability: 0.13, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's10', studentCode: 'CE-2019-010', name: 'Julia Morales',       gwa: 2.3, msteAligned: 66, psadAligned: 60, hpgeAligned: 68, englishSubjects: 75, comprehensionIndex: 0.59, age: 24, gender: 'Female', fatherMonthlyIncome: 14000, fatherEducation: 'High School Graduate',  motherMonthlyIncome: 13000, motherEducation: 'Vocational/Technical', examYear: 2024, monthsPrep: 4, prediction: 'PASSED', probability: 0.43, predictionDate: '2024-11-15', batchId: 'b1' },
  { id: 's11', studentCode: 'CE-2018-022', name: 'Kevin Delos Reyes',   gwa: 2.6, msteAligned: 57, psadAligned: 50, hpgeAligned: 55, englishSubjects: 65, comprehensionIndex: 0.47, age: 27, gender: 'Male',   fatherMonthlyIncome:  9500, fatherEducation: 'High School Graduate',  motherMonthlyIncome:  9000, motherEducation: 'High School Graduate', examYear: 2023, monthsPrep: 2, prediction: 'FAILED', probability: 0.84, predictionDate: '2023-11-10', batchId: 'b2' },
  { id: 's12', studentCode: 'CE-2018-023', name: 'Lara Castillo',       gwa: 1.7, msteAligned: 83, psadAligned: 79, hpgeAligned: 85, englishSubjects: 91, comprehensionIndex: 0.81, age: 23, gender: 'Female', fatherMonthlyIncome: 32000, fatherEducation: 'Post-Graduate',        motherMonthlyIncome: 25000, motherEducation: 'Post-Graduate',        examYear: 2023, monthsPrep: 9, prediction: 'PASSED', probability: 0.09, predictionDate: '2023-11-10', batchId: 'b2' },
]

// ─── SHAP-like feature contributions ─────────────────────────────────────────

export function getFeatureContributions(student: Student): FeatureContribution[] {
  const clamp = (v: number) => Math.max(-0.45, Math.min(0.45, v))
  const raw: Array<[string, string | number, number]> = [
    ['GWA',                    student.gwa.toFixed(2),                         clamp((student.gwa - 2.0) * 0.22)],
    ['MSTE Aligned Subjects',  `${student.msteAligned}%`,                      clamp((75 - student.msteAligned) * 0.006)],
    ['HPGE Aligned Subjects',  `${student.hpgeAligned}%`,                      clamp((75 - student.hpgeAligned) * 0.005)],
    ['PSAD Aligned Subjects',  `${student.psadAligned}%`,                      clamp((70 - student.psadAligned) * 0.005)],
    ['English Subjects',       `${student.englishSubjects}%`,                  clamp((80 - student.englishSubjects) * 0.004)],
    ['Comprehension Index',    student.comprehensionIndex.toFixed(2),          clamp((0.65 - student.comprehensionIndex) * 0.3)],
    ['Months of Preparation',  `${student.monthsPrep} mo`,                     clamp((5 - student.monthsPrep) * 0.045)],
    ['Age',                    `${student.age} yrs`,                           clamp((student.age - 24) * 0.012)],
    ['Family Income',          `₱${Math.round((student.fatherMonthlyIncome + student.motherMonthlyIncome) / 2).toLocaleString()}`, clamp((15000 - (student.fatherMonthlyIncome + student.motherMonthlyIncome) / 2) * 0.000018)],
  ]
  return raw
    .map(([feature, value, shapValue]) => ({ feature, value, shapValue, direction: (shapValue > 0 ? 'risk' : 'protective') as 'risk' | 'protective' }))
    .sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue))
}

// ─── Batches ──────────────────────────────────────────────────────────────────

export const BATCHES: Batch[] = [
  { id: 'b1', fileName: 'CE_Examinees_2024_Batch1.csv', uploadedBy: 'Engr. Jose Dela Cruz', uploadedAt: '2024-11-14 09:23:00', totalRecords: 10, processed: 10, passed: 6, failed: 4, status: 'completed' },
  { id: 'b2', fileName: 'CE_Examinees_2023_Batch1.csv', uploadedBy: 'Engr. Ana Reyes',      uploadedAt: '2023-11-09 14:15:00', totalRecords:  2, processed:  2, passed: 1, failed: 1, status: 'completed' },
]

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const AUDIT_LOGS: AuditLog[] = [
  { id: 'a1',  action: 'Upload CSV',          user: 'Engr. Jose Dela Cruz', role: 'staff',    timestamp: '2024-11-14 09:23:12', details: 'Uploaded CE_Examinees_2024_Batch1.csv (10 records)',        ipAddress: '192.168.1.45' },
  { id: 'a2',  action: 'Run Prediction',      user: 'Engr. Jose Dela Cruz', role: 'staff',    timestamp: '2024-11-14 09:25:44', details: 'Ran prediction on batch b1 — Random Forest model',         ipAddress: '192.168.1.45' },
  { id: 'a3',  action: 'View Student Details',user: 'Dr. Maria Santos',      role: 'chairman', timestamp: '2024-11-14 10:05:20', details: 'Viewed prediction details: CE-2019-002 (B. Ocampo)',       ipAddress: '192.168.1.10' },
  { id: 'a4',  action: 'Generate Report',     user: 'Dr. Maria Santos',      role: 'chairman', timestamp: '2024-11-14 10:30:00', details: 'Generated Predictive Summary Report — 2024 Batch 1',      ipAddress: '192.168.1.10' },
  { id: 'a5',  action: 'Login',               user: 'Engr. Ana Reyes',       role: 'staff',    timestamp: '2024-11-15 08:00:05', details: 'Successful login from CDO campus',                        ipAddress: '192.168.2.33' },
  { id: 'a6',  action: 'View Dashboard',      user: 'Prof. Carlos Bautista', role: 'chairman', timestamp: '2024-11-15 08:45:11', details: 'Accessed Chairman prediction dashboard',                   ipAddress: '192.168.1.12' },
  { id: 'a7',  action: 'Manage Users',        user: 'Dr. Maria Santos',      role: 'chairman', timestamp: '2024-11-15 09:10:55', details: 'Deactivated user: lmendoza@ustp.edu.ph',                  ipAddress: '192.168.1.10' },
  { id: 'a8',  action: 'Upload CSV',          user: 'Engr. Ana Reyes',       role: 'staff',    timestamp: '2024-11-15 09:30:00', details: 'Uploaded CE_Examinees_2024_Batch2.csv (15 records)',       ipAddress: '192.168.2.33' },
  { id: 'a9',  action: 'Run Prediction',      user: 'Engr. Ana Reyes',       role: 'staff',    timestamp: '2024-11-15 09:32:18', details: 'Ran prediction on batch — processing',                    ipAddress: '192.168.2.33' },
  { id: 'a10', action: 'Logout',              user: 'Engr. Jose Dela Cruz',  role: 'staff',    timestamp: '2024-11-15 11:00:00', details: 'User logged out',                                         ipAddress: '192.168.1.45' },
]

// ─── Chart helpers ────────────────────────────────────────────────────────────

export function getDashboardStats() {
  const total  = STUDENTS.length
  const failed = STUDENTS.filter(s => s.prediction === 'FAILED').length
  const passed = STUDENTS.filter(s => s.prediction === 'PASSED').length
  return { total, failed, passed, passRate: passed / total, failRate: failed / total }
}

export function getPredictionTrend() {
  return [
    { year: '2020', passed: 62, failed: 28 },
    { year: '2021', passed: 70, failed: 24 },
    { year: '2022', passed: 65, failed: 30 },
    { year: '2023', passed: 74, failed: 18 },
    { year: '2024', passed: 60, failed: 40 },
  ]
}

export function getFeatureImportance() {
  return [
    { feature: 'GWA',                importance: 0.2341 },
    { feature: 'MSTE Aligned',       importance: 0.1823 },
    { feature: 'Comprehension Idx',  importance: 0.1456 },
    { feature: 'HPGE Aligned',       importance: 0.1289 },
    { feature: 'PSAD Aligned',       importance: 0.1102 },
    { feature: 'English Subjects',   importance: 0.0912 },
    { feature: 'Months Prep',        importance: 0.0641 },
    { feature: 'Father Education',   importance: 0.0312 },
    { feature: 'Mother Education',   importance: 0.0289 },
    { feature: 'Family Income',      importance: 0.0234 },
    { feature: 'Age',                importance: 0.0187 },
    { feature: 'Gender',             importance: 0.0112 },
    { feature: 'Exam Year',          importance: 0.0098 },
  ]
}

// ─── Backward-compat aliases ──────────────────────────────────────────────────
export const mockStudents = STUDENTS
export const modelMetrics = {
  accuracy: BEST_MODEL.accuracy,
  precision: BEST_MODEL.precision,
  recall: BEST_MODEL.recall,
  specificity: BEST_MODEL.specificity,
  f1Score: BEST_MODEL.f1Score,
  rocAuc: BEST_MODEL.rocAuc,
  trueNegative: CONFUSION_MATRIX.tn,
  falsePositive: CONFUSION_MATRIX.fp,
  falseNegative: CONFUSION_MATRIX.fn,
  truePositive: CONFUSION_MATRIX.tp,
}

export const modelComparisonData = MODEL_METRICS.map((model) => ({
  model: model.model,
  accuracy: model.accuracy,
  precision: model.precision,
  recall: model.recall,
  specificity: model.specificity,
  f1: model.f1Score,
  roc: model.rocAuc,
}))

export const cvFoldResults = [
  { fold: 1, accuracy: 0.84, recall: 0.90, f1: 0.84 },
  { fold: 2, accuracy: 0.82, recall: 0.88, f1: 0.82 },
  { fold: 3, accuracy: 0.85, recall: 0.89, f1: 0.84 },
  { fold: 4, accuracy: 0.83, recall: 0.90, f1: 0.83 },
  { fold: 5, accuracy: 0.84, recall: 0.88, f1: 0.83 },
  { fold: 6, accuracy: 0.85, recall: 0.90, f1: 0.84 },
  { fold: 7, accuracy: 0.83, recall: 0.89, f1: 0.83 },
  { fold: 8, accuracy: 0.84, recall: 0.89, f1: 0.84 },
  { fold: 9, accuracy: 0.85, recall: 0.90, f1: 0.85 },
  { fold: 10, accuracy: 0.84, recall: 0.89, f1: 0.84 },
]
