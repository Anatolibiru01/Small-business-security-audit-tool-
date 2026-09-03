"""
Unit tests for Lynis Report Parser Engine.
"""

import os
import pytest
from app.core.parser import parse_lynis_report, LynisReportData

SAMPLE_REPORT_PATH = os.path.join(os.path.dirname(__file__), "sample_lynis_report.dat")


def test_parse_sample_report_file():
    report = parse_lynis_report(SAMPLE_REPORT_PATH)
    assert isinstance(report, LynisReportData)
    assert report.hostname == "web-prod-srv01"
    assert report.os_name == "Ubuntu"
    assert report.os_version == "24.04"
    assert report.hardening_index == 64
    assert report.firewall_active is False
    assert report.installed_packages == 612
    assert report.vulnerable_packages == 3
    
    # Verify Warnings
    assert len(report.warnings) == 4
    warning_ids = [w.test_id for w in report.warnings]
    assert "AUTH-9288" in warning_ids
    assert "FIRE-4512" in warning_ids
    assert "KRNL-5830" in warning_ids
    assert "PKGS-7394" in warning_ids
    
    # Verify Suggestions
    assert len(report.suggestions) == 11
    suggestion_ids = [s.test_id for s in report.suggestions]
    assert "SSH-7408" in suggestion_ids
    assert "LOGG-2190" in suggestion_ids
    assert "BANN-7126" in suggestion_ids


def test_parse_empty_or_minimal_string():
    raw = "hostname=minimal-node\nhardening_index=90\nfirewall_active=1\n"
    report = parse_lynis_report(raw)
    assert report.hostname == "minimal-node"
    assert report.hardening_index == 90
    assert report.firewall_active is True
    assert len(report.warnings) == 0
    assert len(report.suggestions) == 0
