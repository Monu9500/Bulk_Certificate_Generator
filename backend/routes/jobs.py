from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from ..database import SessionLocal, get_db
from ..models import Job, JobStatus, Recipient
from ..schemas import BulkJobCreate, CreateJobResponse, JobResponse, ResultsResponse, RecipientResult
from ..services.job_service import process_job

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.post("", response_model=CreateJobResponse, status_code=202)
def create_job(payload: BulkJobCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = Job(id=str(uuid4()), event_name=payload.event_name.strip(), issue_date=payload.issue_date, status=JobStatus.PENDING, total_recipients=len(payload.recipients))
    job.recipients = [Recipient(id=str(uuid4()), name=item.name.strip(), email=str(item.email)) for item in payload.recipients]
    db.add(job)
    db.commit()
    background_tasks.add_task(process_job, job.id, SessionLocal)
    return CreateJobResponse(job_id=job.id, status=job.status, total_recipients=job.total_recipients)

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return JobResponse(job_id=job.id, status=job.status, total_recipients=job.total_recipients, processed_count=job.processed_count, success_count=job.success_count, failure_count=job.failure_count, created_at=job.created_at, completed_at=job.completed_at)

@router.get("/{job_id}/results", response_model=ResultsResponse)
def get_results(job_id: str, request: Request, db: Session = Depends(get_db)):
    job = db.query(Job).options(joinedload(Job.recipients).joinedload(Recipient.certificate)).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    base = str(request.base_url).rstrip("/")
    results = [RecipientResult(recipient_id=r.id, name=r.name, email=r.email, status=r.status, certificate_id=r.certificate.id if r.certificate else None, download_url=f"{base}/api/certificates/{r.certificate.id}/download" if r.certificate else None, error_message=r.error_message) for r in job.recipients]
    return ResultsResponse(job_id=job.id, results=results)
