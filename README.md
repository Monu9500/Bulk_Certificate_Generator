# Bulk Certificate Generator Backend

A beginner-friendly FastAPI backend that accepts one bulk request, generates one PDF certificate per recipient, tracks progress, records per-recipient failures, and safely serves successful PDFs.

## Features

- Bulk `POST /api/jobs` requests with Pydantic validation.
- SQLite persistence through SQLAlchemy; tables initialize automatically.
- Landscape A4 certificates generated with ReportLab.
- Background processing with FastAPI `BackgroundTasks`.
- Per-recipient status, certificate ID, and error tracking.
- Safe PDF download endpoint that never exposes arbitrary filesystem paths.
- Pytest coverage for validation, job creation, progress, generation, failures, and downloads.

## Technology stack

| Technology | Purpose | Documentation |
|---|---|---|
| Python 3.11+ | Application runtime | [Python](https://www.python.org/downloads/) |
| FastAPI | REST API | [FastAPI](https://fastapi.tiangolo.com/) |
| SQLite | Local relational database | [SQLite](https://www.sqlite.org/) |
| SQLAlchemy | ORM and relationships | [SQLAlchemy](https://www.sqlalchemy.org/) |
| Pydantic | Request validation | [Pydantic](https://docs.pydantic.dev/) |
| ReportLab | PDF generation | [ReportLab](https://www.reportlab.com/) |
| Uvicorn | ASGI server | [Uvicorn](https://www.uvicorn.org/) |
| Pytest | Automated tests | [Pytest](https://docs.pytest.org/) |

## Setup in VS Code (Windows)

1. Install [Python](https://www.python.org/downloads/) and select **Add Python to PATH**.
2. Open this folder in VS Code and open its terminal.
3. Create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

For Command Prompt use `.venv\Scripts\activate.bat`. If PowerShell blocks activation, use `.venv\Scripts\python.exe -m pip ...` directly; do not change system policy unnecessarily.

4. Install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

No environment variables or manual database setup are required. The app creates `certificates.db` and `generated_certificates/` automatically.

## Run the API

From the repository root:

```powershell
.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Open [Swagger UI](http://127.0.0.1:8000/docs), [ReDoc](http://127.0.0.1:8000/redoc), or [OpenAPI JSON](http://127.0.0.1:8000/openapi.json).

## API reference

### Create a job

`POST /api/jobs` returns `202 Accepted` and starts processing in the background.

```json
{
  "event_name": "Python Programming Workshop",
  "issue_date": "2026-10-09",
  "recipients": [
    {"name": "Rahul Sharma", "email": "rahul@example.com"},
    {"name": "Priya Das", "email": "priya@example.com"},
    {"name": "Amit Kumar", "email": "amit@example.com"}
  ]
}
```

Names must be 2–120 characters, emails must be valid, and a batch contains 1–1000 recipients.

### Check progress

`GET /api/jobs/{job_id}` returns `PENDING`, `PROCESSING`, `COMPLETED`, or `FAILED` plus total, processed, successful, and failed counts. `FAILED` means at least one recipient failed; partial success is represented by the counts.

### Get individual results

`GET /api/jobs/{job_id}/results` returns each recipient's status, certificate ID, download URL, and failure message where applicable.

### Download a PDF

`GET /api/certificates/{certificate_id}/download` returns `application/pdf`. Unknown IDs and missing files return `404`.

## Architecture and data flow

The `jobs` table has one-to-many `recipients`; a successful recipient has one related `certificate` row. The database stores metadata and a controlled relative storage location; PDFs remain available after ordinary restarts while both records and files remain present.

1. FastAPI validates the request.
2. A job and recipient rows are committed.
3. Background processing handles each recipient independently.
4. ReportLab writes a unique PDF.
5. Counts and statuses are committed after each recipient.
6. Clients poll status/results and download successful certificates.

`BackgroundTasks` is intentionally simple for this local assignment. Work can be interrupted if the process stops; there are no durable queues, retries, or crash recovery guarantees.

## Tests

```powershell
.venv\Scripts\python.exe -m pytest -v
```

Tests use FastAPI's test client and verify validation, multiple recipients, progress counts, controlled individual failure, unknown IDs, PDF content, and download content type. Runtime data should be deleted before rerunning tests if you want a clean local database.

## Folder structure

```text
backend/
  main.py                 # FastAPI application
  database.py             # SQLite engine and sessions
  models.py               # Jobs, recipients, certificates
  schemas.py              # API validation and responses
  routes/                 # HTTP endpoints
  services/               # Job orchestration and PDF generation
tests/                    # Automated tests
generated_certificates/   # Runtime PDFs (ignored by Git)
requirements.txt
README.md
```

## Security and limitations

Input lengths and email formats are validated. Certificate IDs are UUIDs, filenames are generated by the server, and downloads are restricted to the generated certificate directory. This demo has no authentication or authorization, so it should not be exposed publicly without adding access control, rate limiting, durable processing, migrations, and production storage.

## GitHub submission

Review `.gitignore` and ensure the database, PDFs, virtual environment, secrets, and personal data are excluded. Then replace the placeholder repository URL:

```bash
git init
git add .
git commit -m "Implement bulk certificate generator"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## Interview study guide

Start with `backend/routes/jobs.py`, then `backend/services/job_service.py`, `backend/services/certificate_service.py`, `backend/models.py`, and `tests/`. These files show validation, relationships, background processing, failure isolation, and PDF generation.
