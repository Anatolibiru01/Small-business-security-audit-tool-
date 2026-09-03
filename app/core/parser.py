"""
Lynis Report Parser Engine.
Parses structured /var/log/lynis-report.dat files into clean, typed Python data structures.
"""

import os
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class FindingItem(BaseModel):
    test_id: str
    text: str
    extra: str = ""
    is_warning: bool = False


class LynisReportData(BaseModel):
    # Metadata
    auditor_version: str = "Unknown"
    os: str = "Linux"
    os_name: str = "Linux"
    os_version: str = ""
    os_kernel_version: str = ""
    hostname: str = "localhost"
    ip_address: str = ""
    report_date: str = ""
    
    # Lynis Hardening Metric
    hardening_index: int = 0
    
    # Subsystem states
    firewall_active: bool = False
    ufw_active: bool = False
    iptables_active: bool = False
    nftables_active: bool = False
    ssh_daemon: bool = False
    ssh_protocol: str = "2"
    openssh_version: str = ""
    installed_packages: int = 0
    vulnerable_packages: int = 0
    
    # Findings
    warnings: List[FindingItem] = Field(default_factory=list)
    suggestions: List[FindingItem] = Field(default_factory=list)
    
    # Raw parsed key-values
    raw_kv: Dict[str, Any] = Field(default_factory=dict)


def parse_lynis_report(report_content_or_path: str) -> LynisReportData:
    """
    Parse a Lynis report from a file path or direct string content.
    """
    lines = []
    if os.path.exists(report_content_or_path) and os.path.isfile(report_content_or_path):
        with open(report_content_or_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    else:
        lines = report_content_or_path.splitlines()

    raw_kv: Dict[str, Any] = {}
    warnings: List[FindingItem] = []
    suggestions: List[FindingItem] = []

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        if "=" not in line:
            continue

        key_part, val_part = line.split("=", 1)
        key_part = key_part.strip()
        val_part = val_part.strip()

        # Handle array items: warning[]=... or suggestion[]=...
        if key_part.endswith("[]"):
            clean_key = key_part[:-2]
            if clean_key not in raw_kv:
                raw_kv[clean_key] = []
            raw_kv[clean_key].append(val_part)

            # Parse warning & suggestion fields
            if clean_key == "warning":
                item = _parse_finding_line(val_part, is_warning=True)
                if item:
                    warnings.append(item)
            elif clean_key == "suggestion":
                item = _parse_finding_line(val_part, is_warning=False)
                if item:
                    suggestions.append(item)
        else:
            raw_kv[key_part] = val_part

    # Construct strongly typed LynisReportData
    hardening_idx = _safe_int(raw_kv.get("hardening_index", "0"))
    installed_pkgs = _safe_int(raw_kv.get("installed_packages", "0"))
    vuln_pkgs = _safe_int(raw_kv.get("vulnerable_packages", "0"))

    # Firewall detection
    fw_active = (
        raw_kv.get("firewall_active") == "1"
        or raw_kv.get("ufw_active") == "1"
        or raw_kv.get("iptables_active") == "1"
        or raw_kv.get("nftables_active") == "1"
    )

    return LynisReportData(
        auditor_version=raw_kv.get("auditor_version", "3.0+"),
        os=raw_kv.get("os", "Linux"),
        os_name=raw_kv.get("os_name", raw_kv.get("os", "Linux")),
        os_version=raw_kv.get("os_version", ""),
        os_kernel_version=raw_kv.get("os_kernel_version", ""),
        hostname=raw_kv.get("hostname", "localhost"),
        ip_address=raw_kv.get("ip_address", ""),
        report_date=raw_kv.get("report_date", ""),
        hardening_index=hardening_idx,
        firewall_active=fw_active,
        ufw_active=raw_kv.get("ufw_active") == "1",
        iptables_active=raw_kv.get("iptables_active") == "1",
        nftables_active=raw_kv.get("nftables_active") == "1",
        ssh_daemon=raw_kv.get("ssh_daemon") == "1",
        ssh_protocol=raw_kv.get("ssh_protocol", "2"),
        openssh_version=raw_kv.get("openssh_version", ""),
        installed_packages=installed_pkgs,
        vulnerable_packages=vuln_pkgs,
        warnings=warnings,
        suggestions=suggestions,
        raw_kv=raw_kv,
    )


def _parse_finding_line(raw_val: str, is_warning: bool) -> Optional[FindingItem]:
    """
    Parse a Lynis finding string: TEST-ID|Description|Extra details|...
    """
    if not raw_val:
        return None
    
    parts = raw_val.split("|")
    test_id = parts[0].strip() if len(parts) > 0 else "UNKNOWN"
    text = parts[1].strip() if len(parts) > 1 else ""
    extra = parts[2].strip() if len(parts) > 2 else ""

    return FindingItem(
        test_id=test_id,
        text=text,
        extra=extra,
        is_warning=is_warning
    )


def _safe_int(val: Any) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0
