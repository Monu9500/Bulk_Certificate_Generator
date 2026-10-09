from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from sqlalchemy.orm import Session
from ..models import Certificate, Job, JobStatus, Recipient, RecipientStatus
from .certificate_service import generate_certificate


def process_job(job_id: str, session_factory, output_dir: Path | None = None):
    db: Session = session_factory()
    try:
        job = db.get(Job, job_id)
        if not job:
            return
        job.status = JobStatus.PROCESSING
        db.commit()
        for recipient in job.recipients:
            recipient.status = RecipientStatus.PROCESSING
            db.commit()
            try:
                certificate_id = str(uuid4())
                path = generate_certificate(certificate_id=certificate_id, recipient_name=recipient.name, event_name=job.event_name, issue_date=job.issue_date, output_dir=output_dir) if output_dir else generate_certificate(certificate_id=certificate_id, recipient_name=recipient.name, event_name=job.event_name, issue_date=job.issue_date)
                db.add(Certificate(id=certificate_id, recipient_id=recipient.id, file_path=str(path)))
                recipient.status = RecipientStatus.SUCCESS
                job.success_count += 1
            except Exception as exc:
                recipient.status = RecipientStatus.FAILED
                recipient.error_message = "Certificate generation failed."
                job.failure_count += 1
            recipient.processed_at = datetime.now(timezone.utc)
            job.processed_count += 1
            db.commit()
        job.status = JobStatus.COMPLETED if job.failure_count == 0 else JobStatus.FAILED
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()
