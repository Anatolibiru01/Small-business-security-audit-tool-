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
    # On Windows / non-Linux dev environments
    assert verify_sudo_credentials("admin", "samplepass") is True
    assert verify_sudo_credentials("admin", "") is False


def test_simulated_scan_lifecycle():
    async def _runner():
        manager = ScanManager()
        events = []
        
        async for event in manager.run_scan(simulate=True, profile="standard"):
            events.append(event)
            assert isinstance(event, ScanProgressEvent)
            assert 0 <= event.progress_percent <= 100

        assert len(events) >= 6
        last_event = events[-1]
        assert last_event.is_complete is True
        assert last_event.scorecard is not None
        assert 0 <= last_event.scorecard.overall_score <= 100
        assert manager.last_scorecard is not None

    asyncio.run(_runner())


def test_simulated_scan_profiles():
    async def _runner():
        manager = ScanManager()
        
        # Test Hardened Profile
        hardened_events = []
        async for event in manager.run_scan(simulate=True, profile="hardened"):
            hardened_events.append(event)
        
        scorecard_hardened = hardened_events[-1].scorecard
        assert scorecard_hardened.overall_score >= 80

        # Test Critical Profile
        critical_events = []
        async for event in manager.run_scan(simulate=True, profile="critical"):
            critical_events.append(event)
        
        scorecard_critical = critical_events[-1].scorecard
        assert scorecard_critical.overall_score <= 60

    asyncio.run(_runner())
