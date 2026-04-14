from __future__ import annotations


def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is True
    assert body.get("data", {}).get("status") == "ok"
