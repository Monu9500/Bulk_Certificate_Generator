from fastapi.testclient import TestClient
from backend.main import app
from backend.services import job_service

client = TestClient(app)

def test_one_recipient_failure_continues(monkeypatch, tmp_path):
    original = job_service.generate_certificate
    def controlled_failure(**kwargs):
        if kwargs['recipient_name'] == 'Fails Here':
            raise RuntimeError('controlled test failure')
        return original(**kwargs)
    monkeypatch.setattr(job_service, 'generate_certificate', controlled_failure)
    response = client.post('/api/jobs', json={"event_name":"Testing","issue_date":"2026-10-09","recipients":[{"name":"Fails Here","email":"fail@example.com"},{"name":"Works Here","email":"ok@example.com"}]})
    job_id = response.json()['job_id']
    results = client.get(f'/api/jobs/{job_id}/results').json()['results']
    assert [r['status'] for r in results] == ['FAILED', 'SUCCESS']
    status = client.get(f'/api/jobs/{job_id}').json()
    assert status['processed_count'] == 2 and status['success_count'] == 1 and status['failure_count'] == 1
