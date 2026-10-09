from pathlib import Path
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas

BASE_DIR = Path(__file__).resolve().parents[2]
OUTPUT_DIR = BASE_DIR / "generated_certificates"


def generate_certificate(*, certificate_id: str, recipient_name: str, event_name: str, issue_date, output_dir: Path = OUTPUT_DIR) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{certificate_id}.pdf"
    page_width, page_height = landscape(A4)
    pdf = canvas.Canvas(str(path), pagesize=(page_width, page_height))
    pdf.setTitle(f"Certificate - {recipient_name}")
    pdf.setStrokeColor(colors.HexColor("#1f3a5f"))
    pdf.setLineWidth(3)
    pdf.rect(28, 28, page_width - 56, page_height - 56)
    pdf.setStrokeColor(colors.HexColor("#c5963d"))
    pdf.setLineWidth(1)
    pdf.rect(40, 40, page_width - 80, page_height - 80)
    pdf.setFillColor(colors.HexColor("#1f3a5f"))
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawCentredString(page_width / 2, page_height - 115, "CERTIFICATE OF COMPLETION")
    pdf.setFillColor(colors.HexColor("#555555"))
    pdf.setFont("Helvetica", 13)
    pdf.drawCentredString(page_width / 2, page_height - 155, "This certificate is proudly presented to")
    pdf.setFillColor(colors.HexColor("#172b4d"))
    pdf.setFont("Helvetica-Bold", 30)
    pdf.drawCentredString(page_width / 2, page_height - 205, recipient_name)
    pdf.setFillColor(colors.HexColor("#555555"))
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(page_width / 2, page_height - 245, "for successfully completing")
    pdf.setFillColor(colors.HexColor("#1f3a5f"))
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawCentredString(page_width / 2, page_height - 285, event_name)
    pdf.setFillColor(colors.HexColor("#555555"))
    pdf.setFont("Helvetica", 11)
    pdf.drawString(90, 95, f"Issued: {issue_date.isoformat()}")
    pdf.drawRightString(page_width - 90, 95, f"Certificate ID: {certificate_id}")
    pdf.setStrokeColor(colors.HexColor("#1f3a5f"))
    pdf.line(page_width / 2 - 80, 125, page_width / 2 + 80, 125)
    pdf.setFillColor(colors.HexColor("#333333"))
    pdf.setFont("Helvetica", 10)
    pdf.drawCentredString(page_width / 2, 108, "Authorized Signatory")
    pdf.save()
    return path
