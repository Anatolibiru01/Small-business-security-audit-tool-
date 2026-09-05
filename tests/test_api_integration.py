"""
API & Integration tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_index_page():
    res = client.get("/")
    assert res.status_code == 200
    assert "Lynislens" in res.text or "Security" in res.text


def test_system_status_api():
    res = client.get("/api/system/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_linux" in data
    assert "lynis_installed" in data
    assert "install_help" in data


def test_servers_api_flow():
    # 1. Create Server
    create_res = client.post("/api/servers", json={
        "name": "Integration Test Host",
        "host": "192.168.1.99",
        "port": 22,
        "username": "kali"
    })
    assert create_res.status_code == 201
    srv = create_res.json()
    srv_id = srv["id"]

    # 2. List servers
    list_res = client.get("/api/servers")
    assert list_res.status_code == 200
    assert any(s["id"] == srv_id for s in list_res.json())

    # 3. Delete server
    del_res = client.delete(f"/api/servers/{srv_id}")
    assert del_res.status_code == 200


def test_export_endpoints_response():
    # Test json export
    res_json = client.get("/api/export/json")
    assert res_json.status_code in [200, 404]

    # Test html export
    res_html = client.get("/api/export/html")
    assert res_html.status_code in [200, 404]

    # Test raw export
    res_raw = client.get("/api/export/raw")
    assert res_raw.status_code in [200, 404]



