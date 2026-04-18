# LiCEnSURE – Licensure Exam Predictive System

A machine learning-powered decision support system for predicting Civil Engineering licensure exam success at the University of Science and Technology of Southern Philippines (USTP).

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **ML Model (backend):** Random Forest · SMOTE · 10-Fold CV (see notebooks)

## Branding
- Primary: Navy Blue `#0B2C5D`
- Accent: Gold `#F2B705`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Python Backend (Notebook Logic in Production)

The system now uses a Python backend for validation and prediction based on your notebook pipeline.

1. Create and activate a Python environment.
2. Install backend dependencies.
3. Start the FastAPI server.
4. Start Next.js.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal:

```bash
npm run dev
```

Optional environment variable:

```bash
PYTHON_BACKEND_URL=http://127.0.0.1:8000
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Chairman / Dean | `chairman@ustp.edu.ph` | `chairman123` |
| Staff | `staff@ustp.edu.ph` | `staff123` |

## Pages

### Public
- `/` — Landing page
- `/login` — Login with role selection

### Chairman / Dean Portal (`/chairman`)
- `/chairman` — Prediction dashboard with charts
- `/chairman/predictions` — Student predictions table + detail modal (SHAP feature contributions)
- `/chairman/model` — Model performance (confusion matrix, radar, CV fold results, model comparison)
- `/chairman/reports` — Generate and download reports
- `/chairman/audit` — System audit logs
- `/chairman/users` — Manage user accounts

### Staff Portal (`/staff`)
- `/staff` — Staff dashboard
- `/staff/upload` — CSV upload (upload-only step)
- `/staff/validate` — Notebook-style validation via Python backend
- `/staff/processing` — Data processing status page
- `/staff/predict` — Run prediction pipeline (preprocessing → SMOTE → RF inference → SHAP summary)
- `/staff/students` — Student records table + detail modal

## ML Model Summary (v17)

- **Algorithm:** Random Forest Classifier
- **Imbalance handling:** SMOTE (Synthetic Minority Oversampling)
- **Tuning:** RandomizedSearchCV (30 iterations, scoring = Recall for FAILED class)
- **Evaluation:** 10-Fold Stratified Cross-Validation
- **Key metrics:** Accuracy 86.12% · Recall 88.91% · ROC AUC 0.9213
- **Features:** GWA, MSTE/HPGE/PSAD aligned subjects, English subjects (Comprehension Index), Graduated with Latin, Age, Gender, Father/Mother Income & Education, Exam Year, Months of Prep
- **Explainability:** SHAP TreeExplainer (per-student feature contributions)

## Project Structure

```
licensure/
├── app/
│   ├── page.tsx              # Landing
│   ├── login/page.tsx        # Login
│   ├── chairman/
│   │   ├── page.tsx          # Dashboard
│   │   ├── predictions/      # Student predictions + modal
│   │   ├── model/            # Model performance
│   │   ├── reports/          # Reports
│   │   ├── audit/            # Audit logs
│   │   └── users/            # User management
│   └── staff/
│       ├── page.tsx          # Staff dashboard
│       ├── upload/           # CSV upload
│       ├── predict/          # Run prediction
│       └── students/         # Student records
├── components/
│   └── Sidebar.tsx
├── lib/
│   ├── data.ts               # Mock data + feature importance
│   └── auth.tsx              # Auth context
└── ...config files
```
