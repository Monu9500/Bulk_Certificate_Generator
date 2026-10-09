from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from .models import JobStatus, RecipientStatus

class RecipientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr

class BulkJobCreate(BaseModel):
    event_name: str = Field(min_length=2, max_length=150)
    issue_date: date
    recipients: list[RecipientCreate] = Field(min_length=1, max_length=1000)

class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    job_id: str
    status: JobStatus
    total_recipients: int
    processed_count: int
    success_count: int
    failure_count: int
    created_at: datetime
    completed_at: datetime | None

class CreateJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    total_recipients: int

class RecipientResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    recipient_id: str
    name: str
    email: str
    status: RecipientStatus
    certificate_id: str | None = None
    download_url: str | None = None
    error_message: str | None = None

class ResultsResponse(BaseModel):
    job_id: str
    results: list[RecipientResult]
