"""
Risk Scoring & Category Breakdown Engine.
Calculates the 100-point security health score, risk grade, category metrics,
and enriched plain-English remediation list.
"""

from typing import Dict, List, Any
from pydantic import BaseModel, Field
from app.core.parser import LynisReportData
from app.core.knowledge_base import get_remediation_details

# Deduction Weights
DEDUCTION_MATRIX = {
    "Critical": 20,
    "High": 10,
    "Medium": 5,
    "Low": 2
}


class RemediationItem(BaseModel):
    test_id: str
    title: str
    category: str
    severity: str  # Critical, High, Medium, Low
    control_detail: str = ""
    description: str = ""
    how_to_solve: str = ""
    plain_english: str = ""
    business_impact: str = ""
    remediation_cmd: str = ""
    estimated_time: str = "5 mins"
    difficulty: str = "Easy"
    rollback_note: str = ""
    compliance_mapping: Dict[str, str] = Field(default_factory=dict)
    is_warning: bool = False
    deduction_points: int = 0


class CategoryScore(BaseModel):
    category_name: str
    score: int  # 0 to 100
    total_issues: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    status_label: str  # "Good", "Needs Review", "Critical Attention"


class AuditScorecard(BaseModel):
    # Overall Metrics
    overall_score: int  # 0 to 100
    letter_grade: str  # A+, A, B, C, F
    risk_level: str  # Low Risk, Moderate Risk, High Risk, Critical Risk
    executive_summary: str
    
    # Counts
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    
    # System metadata
    os_name: str
    os_kernel_version: str
    hostname: str
    ip_address: str
    hardening_index: int
    firewall_active: bool
    installed_packages: int
    vulnerable_packages: int
    
    # Detailed collections
    categories: Dict[str, CategoryScore] = Field(default_factory=dict)
    remediation_feed: List[RemediationItem] = Field(default_factory=list)


def calculate_scorecard(report: LynisReportData) -> AuditScorecard:
    """
    Process raw LynisReportData into an Executive Security Scorecard with
    100-point risk deduction, category health breakdown, and enriched remediation tasks.
    """
    remediation_items: List[RemediationItem] = []
    seen_test_ids = set()

    # Process all Warnings first (Higher priority)
    for w in report.warnings:
        details = get_remediation_details(w.test_id, raw_text=w.text, is_warning=True)
        severity = details["severity"]
        deduction = DEDUCTION_MATRIX.get(severity, 10)
        
        item = RemediationItem(
            test_id=details["test_id"],
            title=details["title"],
            category=details["category"],
            severity=severity,
            control_detail=details.get("control_detail", ""),
            description=details.get("description", details.get("plain_english", "")),
            how_to_solve=details.get("how_to_solve", ""),
            plain_english=details.get("plain_english", details.get("description", "")),
            business_impact=details.get("business_impact", ""),
            remediation_cmd=details.get("remediation_cmd", ""),
            estimated_time=details.get("estimated_time", "5 mins"),
            difficulty=details.get("difficulty", "Easy"),
            rollback_note=details.get("rollback_note", ""),
            compliance_mapping=details.get("compliance_mapping", {}),
            is_warning=True,
            deduction_points=deduction
        )
        remediation_items.append(item)
        seen_test_ids.add(w.test_id)

    # Process Suggestions
    for s in report.suggestions:
        # Avoid duplicate test ID listings if already captured in warnings
        if s.test_id in seen_test_ids and s.test_id != "UNKNOWN":
            continue

        details = get_remediation_details(s.test_id, raw_text=s.text, is_warning=False)
        severity = details["severity"]
        deduction = DEDUCTION_MATRIX.get(severity, 5)

        item = RemediationItem(
            test_id=details["test_id"],
            title=details["title"],
            category=details["category"],
            severity=severity,
            control_detail=details.get("control_detail", ""),
            description=details.get("description", details.get("plain_english", "")),
            how_to_solve=details.get("how_to_solve", ""),
            plain_english=details.get("plain_english", details.get("description", "")),
            business_impact=details.get("business_impact", ""),
            remediation_cmd=details.get("remediation_cmd", ""),
            estimated_time=details.get("estimated_time", "5 mins"),
            difficulty=details.get("difficulty", "Easy"),
            rollback_note=details.get("rollback_note", ""),
            compliance_mapping=details.get("compliance_mapping", {}),
            is_warning=False,
            deduction_points=deduction
        )
        remediation_items.append(item)
        seen_test_ids.add(s.test_id)

    # Calculate Total Deductions
    total_deductions = sum(item.deduction_points for item in remediation_items)
    overall_score = max(0, min(100, 100 - total_deductions))

    # Calculate Counts by Severity
    critical_count = sum(1 for i in remediation_items if i.severity == "Critical")
    high_count = sum(1 for i in remediation_items if i.severity == "High")
    medium_count = sum(1 for i in remediation_items if i.severity == "Medium")
    low_count = sum(1 for i in remediation_items if i.severity == "Low")

    # Determine Grade and Risk Level
    if overall_score >= 90:
        letter_grade = "A+"
        risk_level = "Low Risk"
        exec_summary = "Your system security posture is excellent. Core protections are active and attack surfaces are well restricted."
    elif overall_score >= 80:
        letter_grade = "A"
        risk_level = "Low Risk"
        exec_summary = "Good security baseline with minor configuration recommendations remaining."
    elif overall_score >= 70:
        letter_grade = "B"
        risk_level = "Moderate Risk"
        exec_summary = "Fair security status, but key areas (such as access control or logging) require attention to prevent intrusion."
    elif overall_score >= 50:
        letter_grade = "C"
        risk_level = "High Risk"
        exec_summary = "Elevated risk detected. High-priority vulnerabilities or unhardened services need immediate remediation."
    else:
        letter_grade = "F"
        risk_level = "Critical Risk"
        exec_summary = "Critical security deficiencies detected! Essential defenses (such as firewall or root access controls) are disabled or compromised."

    # Compute Category Breakdowns
    standard_categories = [
        "Network & Perimeter",
        "Identity & Access Control",
        "Patch & Package Management",
        "Logging & Forensics",
        "System & Kernel"
    ]
    categories: Dict[str, CategoryScore] = {}

    for cat_name in standard_categories:
        cat_items = [i for i in remediation_items if i.category == cat_name]
        c_crit = sum(1 for i in cat_items if i.severity == "Critical")
        c_high = sum(1 for i in cat_items if i.severity == "High")
        c_med = sum(1 for i in cat_items if i.severity == "Medium")
        c_low = sum(1 for i in cat_items if i.severity == "Low")
        
        cat_deduction = sum(i.deduction_points for i in cat_items)
        cat_score = max(0, min(100, 100 - cat_deduction))
        
        if cat_score >= 85:
            cat_status = "Good"
        elif cat_score >= 60:
            cat_status = "Needs Review"
        else:
            cat_status = "Critical Attention"

        categories[cat_name] = CategoryScore(
            category_name=cat_name,
            score=cat_score,
            total_issues=len(cat_items),
            critical_count=c_crit,
            high_count=c_high,
            medium_count=c_med,
            low_count=c_low,
            status_label=cat_status
        )

    # Sort Remediation Items: Critical -> High -> Medium -> Low
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    remediation_items.sort(key=lambda x: severity_order.get(x.severity, 4))

    return AuditScorecard(
        overall_score=overall_score,
        letter_grade=letter_grade,
        risk_level=risk_level,
        executive_summary=exec_summary,
        total_findings=len(remediation_items),
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        os_name=report.os_name,
        os_kernel_version=report.os_kernel_version,
        hostname=report.hostname,
        ip_address=report.ip_address,
        hardening_index=report.hardening_index,
        firewall_active=report.firewall_active,
        installed_packages=report.installed_packages,
        vulnerable_packages=report.vulnerable_packages,
        categories=categories,
        remediation_feed=remediation_items
    )
