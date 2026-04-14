from __future__ import annotations

from app.core.config import get_settings


def test_admin_stats_requires_auth(client):
    r = client.get("/api/v1/admin/stats")
    assert r.status_code == 401


def test_admin_stats_forbidden_when_allowlist_empty(client, auth_headers, monkeypatch):
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    get_settings.cache_clear()
    try:
        r = client.get("/api/v1/admin/stats", headers=auth_headers)
        assert r.status_code == 403
        body = r.json()
        assert body.get("error", {}).get("code") == "admin_disabled"
    finally:
        get_settings.cache_clear()


def test_admin_stats_ok_for_allowlisted_email(client, auth_headers, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "testuser@example.com")
    get_settings.cache_clear()
    try:
        r = client.get("/api/v1/admin/stats", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert "total_users" in data.get("data", {})
    finally:
        get_settings.cache_clear()
