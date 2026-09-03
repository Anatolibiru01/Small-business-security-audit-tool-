"""
API & Integration tests for FastAPI endpoints and SSE Streaming.
"""

import pytest
import httpx
import json
import asyncio

BASE_URL = "http://127.0.0.1:8000"


def test_index_page():
    with httpx.Client(base_url=BASE_URL) as client:
        res = client.get("/")
        assert res.status_code == 200
        assert "Small-Business Security Audit Tool" in res.text
        assert "Security Dashboard" in res.text
        assert "radar-screen" in res.text


def test_system_status_api():
    with httpx.Client(base_url=BASE_URL) as client:
        res = client.get("/api/system/status")
        assert res.status_code == 200
        data = res.json()
        assert "is_linux" in data
        assert "lynis_installed" in data
        assert "install_help" in data


def test_full_scan_and_stream_flow():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Trigger simulated scan
        start_res = client.post("/api/scan/start", json={
            "username": "admin",
            "password": "testpassword",
            "simulate": True,
            "profile": "standard"
        })
        assert start_res.status_code == 200
        assert start_res.json()["status"] == "started"

        # 2. Consume SSE stream until complete
        with client.stream("GET", "/api/scan/stream") as stream:
            completed = False
            scorecard = None
            for line in stream.iter_lines():
                if line.startswith("data: "):
                    payload = json.loads(line[6:])
                    if payload.get("is_complete"):
                        completed = True
                        scorecard = payload.get("scorecard")
                        break

            assert completed is True
            assert scorecard is not None
            assert scorecard["overall_score"] > 0
            assert "categories" in scorecard
            assert len(scorecard["remediation_feed"]) > 0

        # 3. Verify /api/scan/latest
        latest_res = client.get("/api/scan/latest")
        assert latest_res.status_code == 200
        latest_data = latest_res.json()
        assert latest_data["overall_score"] == scorecard["overall_score"]

        # 4. Verify /api/history
        history_res = client.get("/api/history")
        assert history_res.status_code == 200
        history_records = history_res.json()
        assert len(history_records) > 0
        latest_history_id = history_records[0]["id"]

        # 5. Verify /api/history/{id}
        hist_detail = client.get(f"/api/history/{latest_history_id}")
        assert hist_detail.status_code == 200
        assert hist_detail.json()["overall_score"] == scorecard["overall_score"]

        # 6. Verify /api/export/html
        export_html = client.get("/api/export/html")
        assert export_html.status_code == 200
        assert "Executive Security Posture Report" in export_html.text
        assert "Prioritized Remediation Checklist" in export_html.text

        # 7. Verify /api/export/json
        export_json = client.get("/api/export/json")
        assert export_json.status_code == 200
        assert "security-audit" in export_json.headers.get("content-disposition", "")
