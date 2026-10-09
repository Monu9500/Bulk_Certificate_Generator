from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Certificate

router = APIRouter(prefix="/api/certificates", tags=["certificates"])

@router.get("/{certificate_id}/download")
def download_certificate(certificate_id: str, db: Session = Depends(get_db)):
    certificate = db.get(Certificate, certificate_id)
    if not certificate:
        raise HTTPException(404, "Certificate not found")
    path = Path(certificate.file_path).resolve()
    allowed_dir = (Path(__file__).resolve().parents[2] / "generated_certificates").resolve()
    if allowed_dir not in path.parents or not path.is_file():
        raise HTTPException(404, "Certificate file is unavailable")
    return FileResponse(path, media_type="application/pdf", filename=f"certificate-{certificate.id}.pdf")
