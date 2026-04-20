from __future__ import annotations

from dataclasses import dataclass, field
from io import StringIO
from pathlib import Path
from threading import Lock
from typing import Any
from uuid import uuid4

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline
from pydantic import BaseModel
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder

RANDOM_STATE = 42
MISSING_THRESHOLD = 0.30
MAX_ISSUES_IN_RESPONSE = 200

ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT_DIR / "v7 LiCEnSURE Dataset.csv"

REQUIRED_COLUMNS = [
    "Student_Code",
    "Student_Name",
    "Email",
    "GWA",
    "MSTE_AVE",
    "HPGE_AVE",
    "PSAD_AVE",
    "COMPREHENSION_INDEX",
    "Graduated_with_Latin",
    "Age",
    "Gender",
    "Father_Monthly_Income",
    "Father_Educational_Attainment",
    "Mother_Monthly_Income",
    "Mother_Educational_Attainment",
    "Year_Level",
    "Exam_year",
    "Months_prep",
]

FEATURE_COLUMNS = [
    "GWA",
    "MSTE_AVE",
    "HPGE_AVE",
    "PSAD_AVE",
    "COMPREHENSION_INDEX",
    "Graduated_with_Latin",
    "Age",
    "Gender",
    "Father_Monthly_Income",
    "Father_Educational_Attainment",
    "Mother_Monthly_Income",
    "Mother_Educational_Attainment",
    "Year_Level",
    "Exam_year",
    "Months_prep",
]

NUMERIC_COLUMNS = {
    "GWA",
    "MSTE_AVE",
    "HPGE_AVE",
    "PSAD_AVE",
    "COMPREHENSION_INDEX",
    "Age",
    "Exam_year",
    "Months_prep",
}

OPTIONAL_MISSING_COLUMNS = {"Email", "Year_Level"}

COLUMN_ALIASES: dict[str, list[str]] = {
    "Student_Code": ["STUDENT_CODE", "STUDENTID", "STUDENT_ID", "STUDENTNO"],
    "Student_Name": ["STUDENT_NAME", "NAME", "FULL_NAME", "STUDENT"],
    "Email": ["EMAIL", "E_MAIL", "STUDENT_EMAIL", "EMAIL_ADDRESS"],
    "GWA": ["GWA", "GENERAL_WEIGHTED_AVERAGE"],
    "MSTE_AVE": ["MSTE_AVE", "MSTE"],
    "HPGE_AVE": ["HPGE_AVE", "HPGE"],
    "PSAD_AVE": ["PSAD_AVE", "PSAD_AVG", "PSAD"],
    "COMPREHENSION_INDEX": ["COMPREHENSION_INDEX", "COMPREHENSION", "ENGLISH_SUBJECTS"],
    "Graduated_with_Latin": ["GRADUATED_WITH_LATIN", "LATIN_HONORS", "WITH_LATIN_HONORS"],
    "Age": ["AGE"],
    "Gender": ["GENDER", "SEX"],
    "Father_Monthly_Income": ["FATHER_MONTHLY_INCOME", "FATHER_INCOME"],
    "Father_Educational_Attainment": ["FATHER_EDUCATIONAL_ATTAINMENT", "FATHER_EDUCATION"],
    "Mother_Monthly_Income": ["MOTHER_MONTHLY_INCOME", "MOTHER_INCOME"],
    "Mother_Educational_Attainment": ["MOTHER_EDUCATIONAL_ATTAINMENT", "MOTHER_EDUCATION"],
    "Year_Level": ["YEAR_LEVEL", "YEARLEVEL", "YEAR"],
    "Exam_year": ["EXAM_YEAR", "EXAMYEAR"],
    "Months_prep": ["MONTHS_PREP", "MONTHS_PREPARATION", "MONTHS_OF_PREP"],
}


class UploadRequest(BaseModel):
    fileName: str
    csvText: str


class ValidateRequest(BaseModel):
    uploadId: str


class ProcessingRequest(BaseModel):
    uploadId: str


class RecordsRequest(BaseModel):
    uploadId: str


class PredictRequest(BaseModel):
    uploadId: str | None = None
    rows: list[dict[str, Any]] | None = None


@dataclass
class UploadRecord:
    file_name: str
    csv_text: str
    total_rows: int
    uploaded_at: str
    parsed_rows: list[dict[str, Any]] = field(default_factory=list)
    parsed_columns: list[str] = field(default_factory=list)
    validated: bool = False
    validation_result: dict[str, Any] | None = None
    cleaned_rows: list[dict[str, Any]] = field(default_factory=list)


app = FastAPI(title="LiCEnSURE Python Backend", version="2.0.0")
_model_lock = Lock()
_upload_lock = Lock()
_trained_pipeline: Pipeline | None = None
_upload_store: dict[str, UploadRecord] = {}


def normalize_header(value: str) -> str:
    text = str(value).strip()
    text = "".join(ch if ch.isalnum() else "_" for ch in text)
    text = text.strip("_")
    return text.upper()


def canonicalize_header(header: str) -> str:
    normalized = normalize_header(header)
    for required in REQUIRED_COLUMNS:
        if normalize_header(required) == normalized:
            return required
        if normalized in COLUMN_ALIASES.get(required, []):
            return required
    return header.strip()


def canonicalize_headers(headers: list[str]) -> list[str]:
    seen: set[str] = set()
    canonical_headers: list[str] = []

    for raw_header in headers:
        candidate = canonicalize_header(raw_header)
        if candidate and candidate not in seen:
            canonical_headers.append(candidate)
            seen.add(candidate)
            continue

        fallback_base = str(raw_header).strip() or "Unnamed"
        fallback = fallback_base
        suffix = 2
        while fallback in seen:
            fallback = f"{fallback_base}_{suffix}"
            suffix += 1

        canonical_headers.append(fallback)
        seen.add(fallback)

    return canonical_headers


def normalize_gender(value: Any) -> str | None:
    if pd.isna(value):
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    lower = cleaned.lower()
    if lower in {"m", "male"}:
        return "Male"
    if lower in {"f", "female"}:
        return "Female"
    return cleaned


def normalize_latin(value: Any) -> int | str | None:
    if pd.isna(value):
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    lower = cleaned.lower()
    if lower in {"yes", "y", "true", "1", "with latin", "with latin honors"}:
        return 1
    if lower in {"no", "n", "false", "0", "none", "without latin"}:
        return 0
    return cleaned


def normalize_year_level(value: Any) -> str | None:
    if pd.isna(value):
        return None

    cleaned = str(value).strip()
    if not cleaned:
        return None

    lower = cleaned.lower()
    compact = " ".join(lower.replace("-", " ").replace("_", " ").split())

    if compact in {"fourth year", "4th year", "year 4", "4", "fourth"}:
        return "4th Year"
    if compact in {"fifth year", "5th year", "year 5", "5", "fifth"}:
        return "5th Year"

    if "4" in compact and "year" in compact:
        return "4th Year"
    if "5" in compact and "year" in compact:
        return "5th Year"

    return cleaned


def normalize_value(column: str, value: Any) -> Any:
    if value is None or (isinstance(value, str) and value.strip().upper() in {"", "N/A", "NA"}):
        return None

    if column == "Gender":
        return normalize_gender(value)

    if column == "Graduated_with_Latin":
        return normalize_latin(value)

    if column == "Year_Level":
        return normalize_year_level(value)

    if column in NUMERIC_COLUMNS:
        numeric = pd.to_numeric(str(value).replace(",", ""), errors="coerce")
        if pd.isna(numeric):
            return None
        if column == "Age" and (numeric < 10 or numeric > 100):
            return None
        return float(numeric)

    cleaned = str(value).strip()
    if column == "Email":
        return cleaned.lower() if cleaned else None
    return cleaned if cleaned else None


def clean_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    issues: list[dict[str, Any]] = []
    cleaned_rows: list[dict[str, Any]] = []

    for idx, row in enumerate(rows):
        row_number = idx + 2
        normalized_row: dict[str, Any] = {}
        row_issues: list[str] = []
        missing_count = 0

        for column in REQUIRED_COLUMNS:
            normalized = normalize_value(column, row.get(column))
            normalized_row[column] = normalized
            if normalized in (None, "") and column not in OPTIONAL_MISSING_COLUMNS:
                missing_count += 1
            if column == "Gender" and normalized not in (None, "Male", "Female"):
                row_issues.append("Gender should be Male/Female.")

        missing_rate = missing_count / len(REQUIRED_COLUMNS)
        if missing_rate > MISSING_THRESHOLD:
            row_issues.append("Row exceeds 30% missing values threshold.")

        if row_issues:
            issues.append({"rowNumber": row_number, "messages": row_issues})
            continue

        cleaned_rows.append(normalized_row)

    return cleaned_rows, issues


def ensure_training_model() -> Pipeline:
    global _trained_pipeline
    with _model_lock:
        if _trained_pipeline is not None:
            return _trained_pipeline

        if not DATASET_PATH.exists():
            raise HTTPException(status_code=500, detail=f"Training dataset not found: {DATASET_PATH.name}")

        df = pd.read_csv(DATASET_PATH, encoding="latin-1")
        df.columns = [str(c).strip() for c in df.columns]

        if "Result" not in df.columns:
            raise HTTPException(status_code=500, detail="Training dataset has no Result column.")

        df["Fail"] = df["Result"].astype(str).str.strip().str.upper().eq("FAILED").astype(int)

        for column in FEATURE_COLUMNS:
            if column not in df.columns:
                df[column] = np.nan

        for column in FEATURE_COLUMNS:
            df[column] = df[column].map(lambda v: normalize_value(column, v))

        X = df[FEATURE_COLUMNS].copy()
        y = df["Fail"].astype(int).copy()

        num_cols = [c for c in FEATURE_COLUMNS if c in NUMERIC_COLUMNS]
        cat_cols = [c for c in FEATURE_COLUMNS if c not in NUMERIC_COLUMNS]

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", SimpleImputer(strategy="median"), num_cols),
                (
                    "cat",
                    Pipeline(
                        steps=[
                            ("imputer", SimpleImputer(strategy="most_frequent")),
                            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                        ]
                    ),
                    cat_cols,
                ),
            ]
        )

        classifier = RandomForestClassifier(
            n_estimators=500,
            max_depth=15,
            min_samples_split=2,
            min_samples_leaf=1,
            max_features="sqrt",
            class_weight="balanced_subsample",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )

        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("smote", SMOTE(random_state=RANDOM_STATE)),
                ("model", classifier),
            ]
        )

        pipeline.fit(X, y)
        _trained_pipeline = pipeline
        return _trained_pipeline


def parse_csv(csv_text: str) -> pd.DataFrame:
    df = pd.read_csv(StringIO(csv_text), encoding="latin-1")
    raw_headers = [str(c) for c in df.columns]
    df.columns = canonicalize_headers(raw_headers)
    return df


def get_upload(upload_id: str) -> UploadRecord:
    with _upload_lock:
        record = _upload_store.get(upload_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Upload session not found. Please upload CSV again.")
    return record


def row_lookup(row: dict[str, Any], *candidates: str) -> Any:
    key_map = {normalize_header(str(key)): key for key in row.keys()}
    for candidate in candidates:
        normalized_candidate = normalize_header(candidate)
        if normalized_candidate in key_map:
            return row.get(key_map[normalized_candidate])
    return None


def infer_email(student_name: str, provided_email: Any) -> str:
    if provided_email is not None and str(provided_email).strip():
        return str(provided_email).strip()
    if not student_name.strip():
        return "N/A"
    local = "".join(ch for ch in student_name.lower().replace(" ", ".") if ch.isalnum() or ch == ".")
    return f"{local}@ustp.edu.ph"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/upload")
def upload_csv(request: UploadRequest) -> dict[str, Any]:
    if not request.csvText.strip():
        raise HTTPException(status_code=400, detail="CSV content is empty.")

    try:
        df = parse_csv(request.csvText)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Upload parse failed: {error}") from error

    parsed_rows = df.to_dict(orient="records")
    parsed_columns = [str(column) for column in df.columns]

    upload_id = uuid4().hex
    record = UploadRecord(
        file_name=request.fileName,
        csv_text=request.csvText,
        total_rows=len(df),
        uploaded_at=pd.Timestamp.utcnow().isoformat(),
        parsed_rows=parsed_rows,
        parsed_columns=parsed_columns,
    )

    with _upload_lock:
        _upload_store[upload_id] = record

    return {
        "uploadId": upload_id,
        "fileName": request.fileName,
        "totalRows": len(df),
        "uploadedAt": record.uploaded_at,
    }


@app.post("/validate")
def validate(request: ValidateRequest) -> dict[str, Any]:
    record = get_upload(request.uploadId)

    if record.validated and record.validation_result is not None:
        return record.validation_result

    rows = record.parsed_rows
    headers = record.parsed_columns

    if not headers:
        try:
            df = parse_csv(record.csv_text)
            rows = df.to_dict(orient="records")
            headers = [str(column) for column in df.columns]
            with _upload_lock:
                record.parsed_rows = rows
                record.parsed_columns = headers
        except Exception as error:
            raise HTTPException(status_code=400, detail=f"Validation failed: {error}") from error

    total_rows = len(rows)
    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in headers and column not in OPTIONAL_MISSING_COLUMNS
    ]
    if missing_columns:
        result = {
            "ok": False,
            "totalRows": total_rows,
            "validRows": 0,
            "issueRows": total_rows,
            "missingColumns": missing_columns,
            "issues": [],
            "cleanedRows": [],
            "cleanedRowsCount": 0,
            "issuesTruncated": False,
            "missingThreshold": MISSING_THRESHOLD,
            "uploadId": request.uploadId,
        }
        with _upload_lock:
            record.validation_result = result
            record.cleaned_rows = []
            record.validated = True
        return result

    cleaned_rows, issues = clean_rows(rows)
    issues_for_response = issues[:MAX_ISSUES_IN_RESPONSE]
    result = {
        "ok": len(issues) == 0,
        "totalRows": total_rows,
        "validRows": len(cleaned_rows),
        "issueRows": len(issues),
        "missingColumns": [],
        "issues": issues_for_response,
        "cleanedRows": [],
        "cleanedRowsCount": len(cleaned_rows),
        "issuesTruncated": len(issues) > len(issues_for_response),
        "missingThreshold": MISSING_THRESHOLD,
        "uploadId": request.uploadId,
    }

    with _upload_lock:
        record.validation_result = result
        record.cleaned_rows = cleaned_rows
        record.validated = True

    return result


@app.post("/processing")
def processing(request: ProcessingRequest) -> dict[str, Any]:
    record = get_upload(request.uploadId)
    if not record.validated or record.validation_result is None:
        raise HTTPException(status_code=400, detail="Data must be validated before processing.")

    cleaned = pd.DataFrame(record.cleaned_rows)
    if cleaned.empty:
        return {
            "uploadId": request.uploadId,
            "processedRows": 0,
            "missingRows": record.validation_result["issueRows"],
            "numericFeatures": 0,
            "categoricalFeatures": 0,
            "encodedFeatureCount": 0,
            "steps": [
                {"name": "Handling missing values", "status": "done"},
                {"name": "Removing duplicates", "status": "done"},
                {"name": "Standardizing formats", "status": "done"},
                {"name": "Encoding categorical data", "status": "done"},
            ],
        }

    numeric_cols = [col for col in FEATURE_COLUMNS if col in NUMERIC_COLUMNS]
    categorical_cols = [col for col in FEATURE_COLUMNS if col not in NUMERIC_COLUMNS]

    cat_cardinality = int(sum(cleaned[col].fillna("UNKNOWN").nunique() for col in categorical_cols if col in cleaned.columns))
    encoded_feature_count = len(numeric_cols) + cat_cardinality

    return {
        "uploadId": request.uploadId,
        "processedRows": len(cleaned),
        "missingRows": int(record.validation_result["issueRows"]),
        "numericFeatures": len(numeric_cols),
        "categoricalFeatures": len(categorical_cols),
        "encodedFeatureCount": encoded_feature_count,
        "steps": [
            {"name": "Handling missing values", "status": "done"},
            {"name": "Removing duplicates", "status": "done"},
            {"name": "Standardizing formats", "status": "done"},
            {"name": "Encoding categorical data", "status": "done"},
        ],
    }


@app.post("/records")
def records(request: RecordsRequest) -> dict[str, Any]:
    record = get_upload(request.uploadId)
    try:
        df = parse_csv(record.csv_text)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded CSV: {error}") from error

    rows = df.to_dict(orient="records")
    output: list[dict[str, Any]] = []

    for idx, row in enumerate(rows):
        student_id = str(row_lookup(row, "Student_Code", "Student_ID", "StudentID") or f"ROW-{idx + 1}").strip()
        student_name = str(row_lookup(row, "Student_Name", "Name", "Full_Name") or f"Student {idx + 1}").strip()
        year_level = str(row_lookup(row, "Year_Level", "Year Level", "Year") or "4th Year").strip()

        gwa_raw = row_lookup(row, "GWA", "GPA")
        gwa_num = pd.to_numeric(gwa_raw, errors="coerce")
        gpa = f"{float(gwa_num):.1f}" if not pd.isna(gwa_num) else "N/A"

        email_raw = row_lookup(row, "Email", "E-mail", "Student_Email")
        email = infer_email(student_name, email_raw)

        output.append(
            {
                "studentId": student_id,
                "name": student_name,
                "yearLevel": year_level,
                "gpa": gpa,
                "email": email,
            }
        )

    return {"records": output}


@app.post("/predict")
def predict(request: PredictRequest) -> dict[str, Any]:
    if request.uploadId:
        record = get_upload(request.uploadId)
        if not record.validated:
            raise HTTPException(status_code=400, detail="Please validate data before prediction.")
        rows = record.cleaned_rows
    else:
        rows = request.rows or []

    if not rows:
        raise HTTPException(status_code=400, detail="No rows provided for prediction.")

    pipeline = ensure_training_model()
    input_df = pd.DataFrame(rows)

    for column in REQUIRED_COLUMNS:
        if column not in input_df.columns:
            input_df[column] = np.nan

    for column in FEATURE_COLUMNS:
        input_df[column] = input_df[column].map(lambda v: normalize_value(column, v))

    X_infer = input_df[FEATURE_COLUMNS].copy()
    y_pred = pipeline.predict(X_infer)
    y_proba = pipeline.predict_proba(X_infer)[:, 1]

    predictions: list[dict[str, Any]] = []
    for idx, row in input_df.iterrows():
        failed_prob = float(max(0.0, min(1.0, y_proba[idx])))
        label = "FAILED" if int(y_pred[idx]) == 1 else "PASSED"
        predictions.append(
            {
                "Student_Code": str(row.get("Student_Code", "") or "").strip(),
                "Student_Name": str(row.get("Student_Name", "") or "").strip(),
                "Email": infer_email(
                    str(row.get("Student_Name", "") or "").strip(),
                    row.get("Email"),
                ),
                "GWA": float(row.get("GWA") or 0),
                "MSTE_AVE": float(row.get("MSTE_AVE") or 0),
                "HPGE_AVE": float(row.get("HPGE_AVE") or 0),
                "PSAD_AVE": float(row.get("PSAD_AVE") or 0),
                "prediction": label,
                "probability": failed_prob if label == "FAILED" else (1.0 - failed_prob),
                "Age": row.get("Age"),
                "Gender": row.get("Gender") or "Unknown",
                "Year_Level": str(row.get("Year_Level") or "4th Year"),
                "Exam_year": row.get("Exam_year"),
                "Months_prep": row.get("Months_prep"),
                "Father_Monthly_Income": str(row.get("Father_Monthly_Income") or "N/A"),
                "Mother_Monthly_Income": str(row.get("Mother_Monthly_Income") or "N/A"),
                "Father_Educational_Attainment": str(row.get("Father_Educational_Attainment") or "N/A"),
                "Mother_Educational_Attainment": str(row.get("Mother_Educational_Attainment") or "N/A"),
            }
        )

    return {"predictions": predictions}
