"""
Plain-English Remediation Knowledge Base and Lynis Security Controls Engine.
Translates technical Lynis test IDs and raw audit logs into clear, actionable
business explanations with structured Control Detail, Description, How to Solve,
and real, copy-paste executable terminal fix commands.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

# Load official Lynis Controls database
CONTROLS_FILE = Path(__file__).resolve().parent.parent / "data" / "lynis_controls.json"
LYNIS_CONTROLS_DB: Dict[str, Dict[str, Any]] = {}

if CONTROLS_FILE.exists():
    try:
        with open(CONTROLS_FILE, "r", encoding="utf-8") as f:
            LYNIS_CONTROLS_DB = json.load(f)
    except Exception as e:
        print(f"[KnowledgeBase] Warning: Failed to load lynis_controls.json: {e}")

# Export for backward compatibility
REMEDIATION_KB = LYNIS_CONTROLS_DB


def get_remediation_details(
    test_id: str,
    raw_text: str = "",
    is_warning: bool = False
) -> Dict[str, Any]:
    """
    Retrieve plain-English remediation metadata and official Lynis control specifications
    for a given Lynis test ID.
    Includes Control Detail, Description, How to Solve, and real copy-paste executable commands.
    """
    cleaned_id = test_id.strip().upper()
    
    # 1. Check official controls database first
    if cleaned_id in LYNIS_CONTROLS_DB:
        info = LYNIS_CONTROLS_DB[cleaned_id].copy()
        info["test_id"] = cleaned_id
        if is_warning:
            info["severity"] = "High" if info.get("default_severity") in ["Low", "Medium"] else info.get("default_severity", "High")
        else:
            info["severity"] = info.get("default_severity", "Medium")
            
        info["plain_english"] = info.get("description", raw_text)
        info["raw_text"] = raw_text
        return info

    # 2. Intelligent Real Action Synthesizer by Domain / Test Prefix
    # Guarantees that users ALWAYS receive real, copy-paste executable commands and never generic placeholders.
    category = "System & Kernel"
    severity = "High" if is_warning else "Medium"
    estimated_time = "2 mins"
    difficulty = "Easy"
    rollback_note = "Revert the configuration file changes or restart service."

    if cleaned_id.startswith("PKGS-"):
        category = "Patch & Package Management"
        title = f"Package Management & Software Vulnerabilities [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} inspects installed packages, repository status, and security updates."
        description = raw_text if raw_text else "Outdated or unpatched software packages with known vulnerabilities were detected."
        how_to_solve = "1. Update package repository metadata: sudo apt update\n2. Upgrade all outdated packages to latest patched versions: sudo apt --with-new-pkgs upgrade -y\n3. Remove obsolete unused packages: sudo apt autoremove -y"
        remediation_cmd = "sudo apt update && sudo apt --with-new-pkgs upgrade -y && sudo apt autoremove -y"
        estimated_time = "5 mins"
        compliance_mapping = {
            "CIS": "CIS 1.8",
            "NIST": "SI-2",
            "ISO27001": "A.12.6.1",
            "PCIDSS": "Req 6.2",
            "HIPAA": "§164.308(a)(1)",
            "SOC2": "CC7.1"
        }

    elif cleaned_id.startswith("SSH-"):
        category = "Identity & Access Control"
        title = f"SSH Server Security Hardening [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} audits SSH daemon configuration and cryptographic access parameters."
        description = raw_text if raw_text else "SSH remote administration configuration has permissive settings that should be hardened."
        how_to_solve = "1. Open /etc/ssh/sshd_config.\n2. Restrict login attempts and disable insecure authentication methods.\n3. Reload the SSH daemon: sudo systemctl reload sshd"
        remediation_cmd = "sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sudo sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config && sudo systemctl reload sshd"
        compliance_mapping = {
            "CIS": "CIS 5.2.7",
            "NIST": "AC-3, AC-7",
            "ISO27001": "A.9.4.2",
            "PCIDSS": "Req 8.1.6",
            "HIPAA": "§164.312(a)",
            "SOC2": "CC6.1"
        }

    elif cleaned_id.startswith("FIRE-"):
        category = "Network & Perimeter"
        title = f"Host Firewall & Network Perimeter [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} audits host-based firewall status and incoming connection filtering."
        description = raw_text if raw_text else "Host-based firewall rules are inactive or permit unrestricted inbound connections."
        how_to_solve = "1. Set default inbound block and outbound allow policies.\n2. Allow required services (e.g. port 22 for SSH).\n3. Enable and start firewall."
        remediation_cmd = "sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw allow ssh && sudo ufw --force enable"
        compliance_mapping = {
            "CIS": "CIS 3.5.1",
            "NIST": "SC-7",
            "ISO27001": "A.13.1.1",
            "PCIDSS": "Req 1.2",
            "HIPAA": "§164.312(e)",
            "SOC2": "CC6.6"
        }

    elif cleaned_id.startswith(("KRNL-", "BOOT-", "STRT-")):
        category = "System & Kernel"
        title = f"Kernel & System Security Parameters [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} checks kernel parameters and memory protection baselines."
        description = raw_text if raw_text else "Kernel or system boot configuration lacks recommended hardening options."
        how_to_solve = "1. Add sysctl hardening directives to /etc/sysctl.d/99-security.conf.\n2. Reload kernel parameters with 'sudo sysctl --system'."
        remediation_cmd = "echo -e 'net.ipv4.conf.all.rp_filter = 1\\nfs.suid_dumpable = 0' | sudo tee -a /etc/sysctl.d/99-security.conf && sudo sysctl --system"
        compliance_mapping = {
            "CIS": "CIS 1.5.1",
            "NIST": "SI-11",
            "ISO27001": "A.12.1.2",
            "PCIDSS": "Req 6.5.1",
            "HIPAA": "§164.312(a)",
            "SOC2": "CC7.1"
        }

    elif cleaned_id.startswith(("LOGG-", "SYSL-", "AUDT-", "ACCT-")):
        category = "Logging & Forensics"
        title = f"Audit Subsystem & Log Management [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} inspects auditd, system logging, and command accounting services."
        description = raw_text if raw_text else "Security event logging or process accounting is inactive or insufficiently configured."
        how_to_solve = "1. Install auditd and logging plugins: sudo apt install -y auditd\n2. Enable daemon at system boot.\n3. Start the auditd service."
        remediation_cmd = "sudo apt install -y auditd audispd-plugins && sudo systemctl enable --now auditd"
        compliance_mapping = {
            "CIS": "CIS 4.1.2",
            "NIST": "AU-2, AU-12",
            "ISO27001": "A.12.4.1",
            "PCIDSS": "Req 10.2",
            "HIPAA": "§164.312(b)",
            "SOC2": "CC7.2"
        }

    elif cleaned_id.startswith(("AUTH-", "ACNT-", "PAM-", "SUDO-")):
        category = "Identity & Access Control"
        title = f"Authentication & Password Governance [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} audits user credentials, password policies, and PAM modules."
        description = raw_text if raw_text else "User authentication or password aging policies do not meet standard security requirements."
        how_to_solve = "1. Configure password expiration and aging in /etc/login.defs.\n2. Verify user database integrity with pwck.\n3. Ensure inactive user accounts are locked."
        remediation_cmd = "sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS 90/' /etc/login.defs && sudo pwck -r"
        compliance_mapping = {
            "CIS": "CIS 5.4.1",
            "NIST": "IA-5(1)",
            "ISO27001": "A.9.4.3",
            "PCIDSS": "Req 8.2.4",
            "HIPAA": "§164.308(a)(5)",
            "SOC2": "CC6.1"
        }

    elif cleaned_id.startswith("FILE-"):
        category = "Identity & Access Control"
        title = f"File Permissions & Access Rights [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} evaluates filesystem permissions and ownership on system configuration files."
        description = raw_text if raw_text else "Important system configuration or schedule files have overly permissive access permissions."
        how_to_solve = "1. Restrict file permissions to root:root only.\n2. Set 600 or 644 permission modes on sensitive files.\n3. Remove world-writable attributes."
        remediation_cmd = "sudo chmod 600 /etc/crontab /etc/shadow 2>/dev/null && sudo chmod 700 /etc/cron.* /root 2>/dev/null"
        compliance_mapping = {
            "CIS": "CIS 5.1.2",
            "NIST": "AC-3",
            "ISO27001": "A.9.2.3",
            "PCIDSS": "Req 2.2.4",
            "HIPAA": "§164.312(a)",
            "SOC2": "CC6.1"
        }

    elif cleaned_id.startswith("BANN-"):
        category = "Identity & Access Control"
        title = f"Legal Warning Login Banner [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} checks for pre-login and post-login warning notices."
        description = raw_text if raw_text else "No legal warning notice is displayed prior to user authentication."
        how_to_solve = "1. Create /etc/issue.net with warning text.\n2. Set Banner directive in /etc/ssh/sshd_config.\n3. Reload SSH daemon."
        remediation_cmd = "echo 'Authorized Access Only. All activities are monitored and recorded.' | sudo tee /etc/issue.net && sudo sed -i 's|^#*Banner.*|Banner /etc/issue.net|' /etc/ssh/sshd_config && sudo systemctl reload sshd"
        compliance_mapping = {
            "CIS": "CIS 1.7.1",
            "NIST": "AC-8",
            "ISO27001": "A.9.4.2",
            "PCIDSS": "Req 2.2.5",
            "HIPAA": "§164.312(a)",
            "SOC2": "CC6.1"
        }

    elif cleaned_id.startswith("TIME-"):
        category = "System & Kernel"
        title = f"System Time Synchronization [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} tests Network Time Protocol (NTP) synchronization."
        description = raw_text if raw_text else "System clock is not synchronized via NTP, causing time drift and broken log correlation."
        how_to_solve = "1. Enable systemd-timesyncd or install chrony.\n2. Enable automatic time synchronization: sudo timedatectl set-ntp on"
        remediation_cmd = "sudo timedatectl set-ntp on && sudo systemctl enable --now systemd-timesyncd"
        compliance_mapping = {
            "CIS": "CIS 2.2.1",
            "NIST": "AU-8",
            "ISO27001": "A.12.4.4",
            "PCIDSS": "Req 10.4",
            "HIPAA": "§164.312(b)",
            "SOC2": "CC7.2"
        }

    elif cleaned_id.startswith("MALW-"):
        category = "Patch & Package Management"
        title = f"Malware & Rootkit Detection [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} checks for anti-malware and rootkit scanners."
        description = raw_text if raw_text else "No active malware or rootkit scanner was detected on the host."
        how_to_solve = "1. Install ClamAV and rkhunter.\n2. Update malware definitions.\n3. Perform a baseline scan."
        remediation_cmd = "sudo apt install -y rkhunter clamav && sudo freshclam"
        compliance_mapping = {
            "CIS": "CIS 1.4",
            "NIST": "SI-3",
            "ISO27001": "A.12.2.1",
            "PCIDSS": "Req 5.1",
            "HIPAA": "§164.308(a)(6)",
            "SOC2": "CC6.8"
        }

    else:
        title = f"Security Hardening Recommendation [{cleaned_id}]"
        control_detail = f"Lynis Control {cleaned_id} audits security baseline parameters in category '{category}'."
        description = raw_text if raw_text else f"A security configuration recommendation was flagged for test {cleaned_id}."
        how_to_solve = "1. Apply the latest package and security updates: sudo apt update && sudo apt upgrade -y\n2. Inspect the associated system configuration.\n3. Restart services to apply changes."
        remediation_cmd = "sudo apt update && sudo apt --with-new-pkgs upgrade -y"
        compliance_mapping = {
            "CIS": "CIS Benchmark Section 1.x",
            "NIST": "NIST SP 800-53",
            "ISO27001": "A.12.1",
            "PCIDSS": "Req 2.2",
            "HIPAA": "§164.312",
            "SOC2": "CC6.1"
        }

    return {
        "test_id": cleaned_id,
        "title": title,
        "category": category,
        "severity": severity,
        "control_detail": control_detail,
        "description": description,
        "how_to_solve": how_to_solve,
        "plain_english": description,
        "business_impact": "Potential security exposure or non-compliance with system hardening best practices.",
        "remediation_cmd": remediation_cmd,
        "estimated_time": estimated_time,
        "difficulty": difficulty,
        "rollback_note": rollback_note,
        "compliance_mapping": compliance_mapping,
        "raw_text": raw_text,
    }
