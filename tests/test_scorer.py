"""
Unit tests for Risk Scoring and Category Engine.
"""

import os
import pytest
from app.core.parser import parse_lynis_report
from app.core.scorer import calculate_scorecard, AuditScorecard

SAMPLE_REPORT_PATH = os.path.join(os.path.dirname(__file__), "sample_lynis_report.dat")


def test_calculate_scorecard_from_sample():
    report = parse_lynis_report(SAMPLE_REPORT_PATH)
    scorecard = calculate_scorecard(report)
    
    assert isinstance(scorecard, AuditScorecard)
    # With 4 critical/high warnings and several suggestions, score should reflect risk
    assert 0 <= scorecard.overall_score <= 100
    assert scorecard.letter_grade in ["A+", "A", "B", "C", "F"]
    assert scorecard.risk_level in ["Low Risk", "Moderate Risk", "High Risk", "Critical Risk"]
    
    # Check category breakdowns
    assert "Network & Perimeter" in scorecard.categories
    assert "Identity & Access Control" in scorecard.categories
    assert "Patch & Package Management" in scorecard.categories
    assert "Logging & Forensics" in scorecard.categories
    assert "System & Kernel" in scorecard.categories
    
    # Remediation feed checks
    assert len(scorecard.remediation_feed) > 0
    # First item should be Critical
    assert scorecard.remediation_feed[0].severity == "Critical"
    
    # Check copy-paste remediation command exists
    for item in scorecard.remediation_feed:
        assert item.remediation_cmd != ""
        assert item.plain_english != ""
        assert item.business_impact != ""


def test_scorecard_perfect_system():
    raw = "hostname=perfect-node\nhardening_index=98\nfirewall_active=1\n"
    report = parse_lynis_report(raw)
    scorecard = calculate_scorecard(report)
    
    assert scorecard.overall_score == 100
    assert scorecard.letter_grade == "A+"
    assert scorecard.risk_level == "Low Risk"
    assert scorecard.total_findings == 0
    assert len(scorecard.remediation_feed) == 0


def test_scorecard_score_clamping():
    # Construct a report with dozens of critical issues to test lower bound clamping
    lines = ["hostname=vulnerable-node\nhardening_index=10\n"]
    for i in range(20):
        lines.append(f"warning[]=AUTH-9288|Root login issue {i}|||")
    
    report = parse_lynis_report("\n".join(lines))
    scorecard = calculate_scorecard(report)
    
    # Overall score should not drop below 0
    assert scorecard.overall_score == 0
    assert scorecard.letter_grade == "F"
    assert scorecard.risk_level == "Critical Risk"
