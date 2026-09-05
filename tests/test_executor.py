"""
Unit tests for Execution and Preflight Manager.
"""

import pytest
import asyncio
from app.core.executor import check_system_preflight, verify_sudo_credentials, ScanManager, ScanProgressEvent


def test_preflight_check():
    status = check_system_preflight()
    assert status is not None
    assert isinstance(status.is_linux, bool)
    assert isinstance(status.lynis_installed, bool)
    assert len(status.install_help) > 0


def test_verify_sudo_credentials():
    assert verify_sudo_credentials("admin", "") is False
    res = verify_sudo_credentials("admin", "samplepass")
    assert isinstance(res, bool)


def test_simulated_scan_lifecycle():
    async def _runner():
        manager = ScanManager()
        events = []
        
        async for event in manager.run_scan(simulate=True):
            events.append(event)
            assert isinstance(event, ScanProgressEvent)
            assert 0 <= event.progress_percent <= 100

        assert len(events) >= 5
        last_event = events[-1]
        assert last_event.is_complete is True
        assert last_event.scorecard is not None
        assert 0 <= last_event.scorecard.overall_score <= 100
        assert manager.last_scorecard is not None

    asyncio.run(_runner())

