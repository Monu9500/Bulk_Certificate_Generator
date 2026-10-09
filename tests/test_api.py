from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, engine
from backend.services import job_service

client = TestClient(app)


def payload():
    return {"event_name": "Python Workshop", "issue_date": "2026-10-09", "recipients": [{"name": "Rahul Sharma", "email": "rahul@example.com"}, {"name": "Priya Das", "email": "priya@example.com"}]}


def test_validation():
    response = client.post('/api/jobs', json={"event_name": "", "issue_date": "bad", "recipients": []})
    assert response.status_code == 422


def test_create_and_download(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.services.certificate_service.OUTPUT_DIR", tmp_path)
    response = client.post('/api/jobs', json=payload())
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    status = client.get(f'/api/jobs/{job_id}')
    assert status.status_code == 200
    assert status.json()["processed_count"] == 2
    results = client.get(f'/api/jobs/{job_id}/results').json()["results"]
    assert all(item["status"] == "SUCCESS" for item in results)
    download = client.get(results[0]["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"
    assert download.content.startswith(b"%PDF")


def test_unknown_ids():
    assert client.get('/api/jobs/unknown').status_code == 404
    assert client.get('/api/certificates/unknown/download').status_code == 404
