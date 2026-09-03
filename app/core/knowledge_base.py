"""
Plain-English Remediation Knowledge Base for Lynis Security Findings.
Translates technical Lynis test IDs and raw audit logs into clear, actionable
business explanations with step-by-step copy-paste terminal fix commands.
"""

from typing import Dict, Any, Optional

# Master remediation database for common Lynis test IDs
REMEDIATION_KB: Dict[str, Dict[str, Any]] = {
    "AUTH-9288": {
        "title": "Direct Root Login Enabled via SSH",
        "category": "Identity & Access Control",
        "default_severity": "Critical",
        "plain_english": "The master administrator account ('root') is permitted to log in directly over the internet via SSH. Automated brute-force botnets constantly target root accounts.",
        "business_impact": "Severe risk of full server takeover and ransomware deployment. Violates PCI-DSS, SOC 2, and ISO 27001 compliance standards.",
        "remediation_cmd": "sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl restart sshd",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "To revert: set 'PermitRootLogin yes' in /etc/ssh/sshd_config and restart sshd.",
    },
    "FIRE-4512": {
        "title": "No Active Firewall Detected",
        "category": "Network & Perimeter",
        "default_severity": "Critical",
        "plain_english": "Your server does not have a firewall running. All network ports and internal services are directly exposed to the open internet.",
        "business_impact": "High vulnerability to network port scanning, unauthorized remote access, and service exploitation.",
        "remediation_cmd": "sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw allow ssh && sudo ufw --force enable",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "To disable: run 'sudo ufw disable'.",
    },
    "KRNL-5830": {
        "title": "Unrestricted Core Memory Dumps Enabled",
        "category": "System & Kernel",
        "default_severity": "High",
        "plain_english": "When software crashes, the system writes a complete copy of its computer memory to disk. This dump can contain unencrypted user passwords, session tokens, and credit card data.",
        "business_impact": "Sensitive data leaks if an attacker gains access to crash dump files or uses memory dump exploits.",
        "remediation_cmd": "echo '* hard core 0' | sudo tee -a /etc/security/limits.conf && sudo sysctl -w fs.suid_dumpable=0",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Remove the '* hard core 0' entry from /etc/security/limits.conf.",
    },
    "PKGS-7394": {
        "title": "Outdated Software Packages with Known Security Vulnerabilities",
        "category": "Patch & Package Management",
        "default_severity": "Critical",
        "plain_english": "Your system has installed applications and libraries with known public security vulnerabilities (CVEs) that have official security patches available.",
        "business_impact": "Unpatched vulnerabilities are the #1 entry vector for ransomware, botnets, and remote code execution exploits.",
        "remediation_cmd": "sudo apt update && sudo apt upgrade -y",
        "estimated_time": "5-10 mins",
        "difficulty": "Easy",
        "rollback_note": "Individual packages can be pinned with 'apt-mark hold <pkg>'.",
    },
    "SSH-7408": {
        "title": "SSH Server Hardening Recommendations",
        "category": "Identity & Access Control",
        "default_severity": "Medium",
        "plain_english": "The SSH remote administration service has permissive settings (e.g. high login attempt limits or non-verbose logging) that can be tightened against automated attacks.",
        "business_impact": "Increased attack surface for password brute-forcing and insufficient audit trails during security incident forensics.",
        "remediation_cmd": "sudo sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config && sudo sed -i 's/^#*LogLevel.*/LogLevel VERBOSE/' /etc/ssh/sshd_config && sudo systemctl restart sshd",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Adjust MaxAuthTries or LogLevel in /etc/ssh/sshd_config and restart sshd.",
    },
    "AUTH-9230": {
        "title": "Password Expiration and Aging Policy Missing",
        "category": "Identity & Access Control",
        "default_severity": "High",
        "plain_english": "Local user passwords never expire. Stale or forgotten user accounts may retain valid credentials indefinitely.",
        "business_impact": "Dormant account compromise; failure to meet cybersecurity insurance and data protection audit requirements.",
        "remediation_cmd": "sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/' /etc/login.defs && sudo sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   1/' /etc/login.defs",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Set PASS_MAX_DAYS back to 99999 in /etc/login.defs.",
    },
    "LOGG-2190": {
        "title": "Linux Audit Framework (auditd) Not Running",
        "category": "Logging & Forensics",
        "default_severity": "High",
        "plain_english": "The Linux security audit subsystem is not active. System file changes, privilege escalation events, and unauthorized access attempts are not being recorded.",
        "business_impact": "Inability to investigate security breaches, identify compromised files, or provide evidence for compliance audits.",
        "remediation_cmd": "sudo apt install -y auditd && sudo systemctl enable --now auditd",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "To disable: 'sudo systemctl disable --now auditd'.",
    },
    "BANN-7126": {
        "title": "Missing Legal Warning Login Banner",
        "category": "Identity & Access Control",
        "default_severity": "Low",
        "plain_english": "The server does not display a legal warning notice before SSH login. In many jurisdictions, a warning banner is legally required to prosecute unauthorized intruders.",
        "business_impact": "Weakens legal standing when prosecuting unauthorized intrusions or data theft.",
        "remediation_cmd": "echo 'Authorized personnel only. All activities are monitored and recorded.' | sudo tee /etc/issue.net && sudo sed -i 's|^#*Banner.*|Banner /etc/issue.net|' /etc/ssh/sshd_config && sudo systemctl restart sshd",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Remove /etc/issue.net and comment out 'Banner' in /etc/ssh/sshd_config.",
    },
    "KRNL-5788": {
        "title": "Network Kernel Security Settings Not Hardened",
        "category": "System & Kernel",
        "default_severity": "Medium",
        "plain_english": "The Linux network stack is using default settings that are susceptible to TCP SYN denial-of-service floods, IP packet spoofing, and rogue redirection.",
        "business_impact": "Vulnerability to Denial of Service (DoS) attacks and malicious traffic redirection on your local network.",
        "remediation_cmd": "echo -e 'net.ipv4.tcp_syncookies = 1\\nnet.ipv4.conf.all.rp_filter = 1\\nnet.ipv4.conf.all.accept_redirects = 0' | sudo tee /etc/sysctl.d/99-security.conf && sudo sysctl --system",
        "estimated_time": "2 mins",
        "difficulty": "Moderate",
        "rollback_note": "Remove /etc/sysctl.d/99-security.conf and run 'sudo sysctl --system'.",
    },
    "FILE-7524": {
        "title": "Insecure Cron Job File Permissions",
        "category": "Identity & Access Control",
        "default_severity": "High",
        "plain_english": "Automated system task schedules (/etc/crontab or /etc/cron.*) have overly permissive read or write access.",
        "business_impact": "Low-privilege users or malware can modify scheduled tasks to gain unauthorized root administrator control.",
        "remediation_cmd": "sudo chmod 600 /etc/crontab && sudo chmod 700 /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.monthly /etc/cron.weekly 2>/dev/null || true",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Re-apply default permissions if specific applications require custom cron permissions.",
    },
    "NAME-4404": {
        "title": "No Secondary DNS Server Configured",
        "category": "Network & Perimeter",
        "default_severity": "Low",
        "plain_english": "Your system relies on a single DNS name server. If that server goes down, your server will lose internet connectivity and domain resolution.",
        "business_impact": "Risk of server downtime and service unavailability during DNS outages.",
        "remediation_cmd": "echo -e 'nameserver 1.1.1.1\\nnameserver 8.8.8.8' | sudo tee -a /etc/resolv.conf",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Edit /etc/resolv.conf or Netplan config to restore previous DNS settings.",
    },
    "TIME-3104": {
        "title": "NTP Network Time Synchronization Not Active",
        "category": "System & Kernel",
        "default_severity": "Low",
        "plain_english": "The server clock is not synchronized via Network Time Protocol (NTP). Inaccurate system clocks break SSL/TLS security certificates and corrupt log timestamps.",
        "business_impact": "Security certificate validation errors, broken authentication tokens, and unaligned security log forensic timelines.",
        "remediation_cmd": "sudo timedatectl set-ntp on",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Run 'sudo timedatectl set-ntp off'.",
    },
    "ACNT-6401": {
        "title": "Dormant or Inactive User Accounts Present",
        "category": "Identity & Access Control",
        "default_severity": "Medium",
        "plain_english": "There are user accounts on the server that have not been logged into for over 90 days or represent former employees/services.",
        "business_impact": "Orphaned accounts are easy targets for credential reuse and unauthorized lateral movement.",
        "remediation_cmd": "sudo useradd -D -f 30 && echo 'Lock unused user: sudo passwd -l <username>'",
        "estimated_time": "3 mins",
        "difficulty": "Moderate",
        "rollback_note": "To unlock a locked account: 'sudo passwd -u <username>'.",
    },
    "HRDN-7222": {
        "title": "Compiler Available to Non-Privileged Users",
        "category": "System & Kernel",
        "default_severity": "Low",
        "plain_english": "Software compilers (e.g. gcc, clang) are accessible to regular users. Attackers often use compilers on compromised servers to build local privilege escalation exploits.",
        "business_impact": "Enables attackers to compile and run zero-day exploits directly on your server.",
        "remediation_cmd": "sudo chmod 700 /usr/bin/gcc /usr/bin/as /usr/bin/g++ 2>/dev/null || true",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Run 'sudo chmod 755 /usr/bin/gcc'.",
    },
    "MALW-3280": {
        "title": "No Malware / Rootkit Scanner Installed",
        "category": "Patch & Package Management",
        "default_severity": "Medium",
        "plain_english": "The system does not have an active malware, anti-virus, or rootkit detector (such as ClamAV or rkhunter).",
        "business_impact": "Hidden backdoors, cryptominers, and rootkits can operate undetected.",
        "remediation_cmd": "sudo apt install -y rkhunter clamav && sudo freshclam",
        "estimated_time": "3 mins",
        "difficulty": "Easy",
        "rollback_note": "Run 'sudo apt remove -y rkhunter clamav'.",
    },
    "USB-1000": {
        "title": "USB Storage Devices Not Restricted",
        "category": "System & Kernel",
        "default_severity": "Low",
        "plain_english": "USB flash drives and external storage devices can be mounted without restrictions by any physical user.",
        "business_impact": "Risk of data exfiltration or malware introduction via rogue physical USB devices.",
        "remediation_cmd": "echo 'blacklist usb-storage' | sudo tee /etc/modprobe.d/usb-storage.conf",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Remove /etc/modprobe.d/usb-storage.conf.",
    }
}


def get_remediation_details(
    test_id: str,
    raw_text: str = "",
    is_warning: bool = False
) -> Dict[str, Any]:
    """
    Retrieve plain-English remediation metadata for a given Lynis test ID.
    If the test ID is not in the knowledge base, generate an intelligent fallback.
    """
    cleaned_id = test_id.strip()
    
    if cleaned_id in REMEDIATION_KB:
        info = REMEDIATION_KB[cleaned_id].copy()
        info["test_id"] = cleaned_id
        if is_warning:
            # Warnings are at least High severity
            if info["default_severity"] in ["Low", "Medium"]:
                info["severity"] = "High"
            else:
                info["severity"] = info["default_severity"]
        else:
            info["severity"] = info["default_severity"]
        info["raw_text"] = raw_text
        return info

    # Intelligent Fallback Categorizer for unknown/extended Lynis test IDs
    category = "System & Kernel"
    severity = "High" if is_warning else "Medium"
    
    if cleaned_id.startswith(("AUTH-", "ACNT-", "SSH-", "SUDO-", "PAM-")):
        category = "Identity & Access Control"
    elif cleaned_id.startswith(("FIRE-", "NETW-", "NAME-", "PORT-", "HTTP-")):
        category = "Network & Perimeter"
    elif cleaned_id.startswith(("PKGS-", "MALW-", "CONT-", "DOCK-")):
        category = "Patch & Package Management"
    elif cleaned_id.startswith(("LOGG-", "SYSL-", "AUDT-")):
        category = "Logging & Forensics"
    elif cleaned_id.startswith(("FILE-", "STRG-", "BOOT-", "KRNL-", "TIME-", "BANN-")):
        category = "System & Kernel"

    # Default fallback title & description
    title = f"Security Finding: {cleaned_id}"
    plain_desc = raw_text if raw_text else "A security configuration recommendation was flagged during the audit."
    
    # Generic safe remediation command guidance
    rem_cmd = f"# Review Lynis documentation for test {cleaned_id}\n# Lynis details: lynis show details {cleaned_id}"

    return {
        "test_id": cleaned_id,
        "title": title,
        "category": category,
        "severity": severity,
        "plain_english": plain_desc,
        "business_impact": "Potential security exposure or non-compliance with system hardening best practices.",
        "remediation_cmd": rem_cmd,
        "estimated_time": "5 mins",
        "difficulty": "Moderate",
        "rollback_note": "Back up configuration files before making system edits.",
        "raw_text": raw_text,
    }
