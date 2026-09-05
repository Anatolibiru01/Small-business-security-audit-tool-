"""
Generator for Lynis Official Controls Knowledge Base.
Populates app/data/lynis_controls.json with rich metadata, descriptions,
and step-by-step 'how to solve' instructions for all major Lynis controls.
"""

import os
import json

CONTROLS_DATA = {
    # -------------------------------------------------------------------------
    # ACCOUNTING & AUDITING (ACCT)
    # -------------------------------------------------------------------------
    "ACCT-2754": {
        "title": "FreeBSD Process Accounting Disabled",
        "category": "Accounting & Auditing",
        "default_severity": "Medium",
        "control_detail": "Lynis Control ACCT-2754 verifies BSD process accounting daemon status to ensure historical command execution records are kept.",
        "description": "Process accounting is a method to track system resources, recording user activity, command executions, and CPU/memory utilization over time.",
        "how_to_solve": "1. Add 'accounting_enable=\"YES\"' to /etc/rc.conf.\n2. Create accounting file: touch /var/account/acct\n3. Start accounting service: /etc/rc.d/accounting start",
        "business_impact": "Lack of non-repudiation and inability to reconstruct past administrator actions during incident forensics.",
        "remediation_cmd": "echo 'accounting_enable=\"YES\"' | sudo tee -a /etc/rc.conf && sudo service accounting start",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Remove accounting_enable from /etc/rc.conf and stop the accounting service.",
        "compliance_mapping": {"CIS": "CIS 4.1.1", "NIST": "AU-2, AU-3", "ISO27001": "A.12.4.1", "PCIDSS": "Req 10.2"}
    },
    "ACCT-9622": {
        "title": "Linux Process Accounting (acct/psacct) Inactive",
        "category": "Accounting & Auditing",
        "default_severity": "Medium",
        "control_detail": "Lynis Control ACCT-9622 audits the status of Linux process accounting (acct or psacct) which records every executed command with user and runtime metrics.",
        "description": "Process accounting logs all commands executed by all users on the Linux host into /var/log/account/pacct. Without process accounting, attackers can execute ephemeral commands without leaving standard shell history traces.",
        "how_to_solve": "1. Install the process accounting package (psacct or acct).\n2. Enable the systemd service.\n3. Verify accounting is active using 'ac' or 'lastcomm'.",
        "business_impact": "Compromised forensics capability; unable to determine what commands an attacker executed during a security breach.",
        "remediation_cmd": "sudo apt install -y acct && sudo systemctl enable --now acct || (sudo yum install -y psacct && sudo systemctl enable --now psacct)",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "sudo systemctl disable --now acct (or psacct)",
        "compliance_mapping": {"CIS": "CIS 4.1.1.1", "NIST": "AU-2, AU-12", "ISO27001": "A.12.4.1", "PCIDSS": "Req 10.2.2"}
    },
    "ACCT-9626": {
        "title": "Sysstat System Accounting Data Inactive",
        "category": "Accounting & Auditing",
        "default_severity": "Low",
        "control_detail": "Lynis Control ACCT-9626 tests whether the sysstat package (sar, iostat) is collecting performance and resource accounting metrics.",
        "description": "Sysstat records continuous resource utilization trends (CPU, RAM, network, I/O) allowing baseline comparisons and identification of resource-draining malicious payloads or cryptocurrency miners.",
        "how_to_solve": "1. Install sysstat package.\n2. Set ENABLED=\"true\" in /etc/default/sysstat.\n3. Restart and enable sysstat service.",
        "business_impact": "Inability to detect sudden spikes in network or CPU utilization caused by botnets or cryptominers.",
        "remediation_cmd": "sudo apt install -y sysstat && sudo sed -i 's/ENABLED=\"false\"/ENABLED=\"true\"/' /etc/default/sysstat && sudo systemctl enable --now sysstat",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Set ENABLED=\"false\" in /etc/default/sysstat and stop service.",
        "compliance_mapping": {"CIS": "CIS 4.1.1.2", "NIST": "SI-4", "ISO27001": "A.12.1.3", "PCIDSS": "Req 10.6"}
    },
    "ACCT-9628": {
        "title": "Linux Audit Framework Daemon (auditd) Inactive",
        "category": "Accounting & Auditing",
        "default_severity": "High",
        "control_detail": "Lynis Control ACCT-9628 inspects the Linux kernel audit framework (auditd) service status.",
        "description": "Auditd monitors kernel-level system calls, tracking unauthorized file modifications, permission alterations, and execution of privileged binaries. When disabled, security monitoring cannot detect low-level system subversions.",
        "how_to_solve": "1. Install auditd and audispd-plugins.\n2. Enable and start auditd system service.\n3. Load basic rule set in /etc/audit/rules.d/audit.rules.",
        "business_impact": "Fails compliance requirements for PCI-DSS, SOC 2, HIPAA, and CIS Benchmarks. Critical security events go unrecorded.",
        "remediation_cmd": "sudo apt install -y auditd && sudo systemctl enable --now auditd",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "sudo systemctl disable --now auditd",
        "compliance_mapping": {"CIS": "CIS 4.1.2", "NIST": "AU-2, AU-3, AU-12", "ISO27001": "A.12.4.1", "PCIDSS": "Req 10.1"}
    },
    "ACCT-9630": {
        "title": "Empty Audit Daemon Ruleset Detected",
        "category": "Accounting & Auditing",
        "default_severity": "High",
        "control_detail": "Lynis Control ACCT-9630 checks if auditd is running with an empty or non-configured ruleset.",
        "description": "An audit daemon running with zero rules will not record critical security events such as modifications to /etc/passwd, /etc/sudoers, or execution of setuid binaries.",
        "how_to_solve": "1. Deploy baseline security rules to /etc/audit/rules.d/audit.rules.\n2. Run augenrules --load to compile and load rules.\n3. Verify active rules with 'auditctl -l'.",
        "business_impact": "False sense of security: audit daemon is active but capturing no meaningful security telemetry.",
        "remediation_cmd": "echo '-w /etc/passwd -p wa -k identity\n-w /etc/shadow -p wa -k identity\n-w /etc/sudoers -p wa -k actions' | sudo tee -a /etc/audit/rules.d/audit.rules && sudo augenrules --load",
        "estimated_time": "3 mins",
        "difficulty": "Moderate",
        "rollback_note": "Remove custom rules from /etc/audit/rules.d/audit.rules and reload with augenrules --load.",
        "compliance_mapping": {"CIS": "CIS 4.1.3", "NIST": "AU-12", "ISO27001": "A.12.4.1", "PCIDSS": "Req 10.2.1"}
    },
    "ACCT-9632": {
        "title": "Auditd Configuration File Undiscovered",
        "category": "Accounting & Auditing",
        "default_severity": "Medium",
        "control_detail": "Lynis Control ACCT-9632 tests if the auditd configuration file (auditd.conf) is present in standard paths (/etc/audit/).",
        "description": "Missing or improperly placed auditd configuration file prevents the daemon from applying buffer sizes, log rotation parameters, and failure handling modes.",
        "how_to_solve": "1. Locate or reinstall default auditd.conf file in /etc/audit/auditd.conf.\n2. Ensure permissions are 640 root:root.",
        "business_impact": "Potential loss of audit logs due to unmanaged log rotation or daemon crash under high load.",
        "remediation_cmd": "sudo cp /usr/share/doc/auditd/examples/auditd.conf /etc/audit/auditd.conf 2>/dev/null || sudo apt install --reinstall -y auditd",
        "estimated_time": "2 mins",
        "difficulty": "Moderate",
        "rollback_note": "Restore previous configuration backup.",
        "compliance_mapping": {"CIS": "CIS 4.1.2.1", "NIST": "AU-11", "ISO27001": "A.12.4.2", "PCIDSS": "Req 10.5"}
    },
    "ACCT-9636": {
        "title": "Linux Command Audit Trail (Snoopy Logger) Missing",
        "category": "Accounting & Auditing",
        "default_severity": "Low",
        "control_detail": "Lynis Control ACCT-9636 checks if Snoopy logger or an equivalent LD_PRELOAD command auditor is deployed.",
        "description": "Snoopy is a lightweight library that logs all executed commands with authentic username, UID, PID, and timestamp directly to syslog, preventing log tampering by compromised shells.",
        "how_to_solve": "1. Install snoopy package via package manager.\n2. Enable in /etc/ld.so.preload.\n3. Check /var/log/auth.log for command execution entries.",
        "business_impact": "Attackers clearing ~/.bash_history leave no secondary trace of executed commands.",
        "remediation_cmd": "sudo apt install -y snoopy && sudo snoopy-enable || true",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "sudo snoopy-disable or remove /lib/libsnoopy.so from /etc/ld.so.preload",
        "compliance_mapping": {"CIS": "CIS 4.1.1", "NIST": "AU-3", "ISO27001": "A.12.4.1", "PCIDSS": "Req 10.2"}
    },

    # -------------------------------------------------------------------------
    # AUTHENTICATION & ACCESS CONTROL (AUTH)
    # -------------------------------------------------------------------------
    "AUTH-9204": {
        "title": "Multiple User Accounts with UID 0",
        "category": "Identity & Access Control",
        "default_severity": "Critical",
        "control_detail": "Lynis Control AUTH-9204 checks for non-root user accounts configured with User ID 0 (root equivalent).",
        "description": "Only the root account should have UID 0. Additional accounts with UID 0 bypass individual audit logging, granting unauthenticated superuser privileges without audit attribution.",
        "how_to_solve": "1. Inspect /etc/passwd for accounts where the 3rd field is '0'.\n2. Change the UID of non-root accounts to a unique UID (>=1000) or delete rogue accounts.",
        "business_impact": "Severe risk of undetected administrative backdoors and complete compromise of accountability.",
        "remediation_cmd": "awk -F: '($3 == 0 && $1 != \"root\") {print \"Rogue UID 0 account found:\", $1}' /etc/passwd",
        "estimated_time": "3 mins",
        "difficulty": "Moderate",
        "rollback_note": "Ensure user has necessary sudo rights before changing UID.",
        "compliance_mapping": {"CIS": "CIS 5.4.3", "NIST": "AC-2, AC-6", "ISO27001": "A.9.2.1", "PCIDSS": "Req 8.1.1"}
    },
    "AUTH-9208": {
        "title": "Duplicate User Accounts or Group IDs in /etc/passwd",
        "category": "Identity & Access Control",
        "default_severity": "High",
        "control_detail": "Lynis Control AUTH-9208 checks for duplicate usernames or duplicate UIDs in /etc/passwd and /etc/group.",
        "description": "Duplicate user accounts or IDs lead to permission collisions, where file access rights granted to one user unintentionally apply to another.",
        "how_to_solve": "1. Run pwck to identify duplicate entries.\n2. Remove duplicate username lines or reassign unique UIDs.",
        "business_impact": "Unauthorized access to confidential data across user profiles and corrupted ownership tracking.",
        "remediation_cmd": "sudo pwck -r && sudo grpck -r",
        "estimated_time": "3 mins",
        "difficulty": "Moderate",
        "rollback_note": "Backup /etc/passwd and /etc/group before resolving duplicate lines.",
        "compliance_mapping": {"CIS": "CIS 5.4.4", "NIST": "AC-2", "ISO27001": "A.9.2.1", "PCIDSS": "Req 8.1.1"}
    },
    "AUTH-9216": {
        "title": "Password & Shadow File Inconsistencies",
        "category": "Identity & Access Control",
        "default_severity": "High",
        "control_detail": "Lynis Control AUTH-9216 audits the consistency between /etc/passwd, /etc/shadow, and /etc/group.",
        "description": "Users existing in /etc/passwd without a corresponding /etc/shadow entry (or vice-versa) indicates manual tampering, interrupted account creation, or corrupted database states.",
        "how_to_solve": "1. Run 'pwck' to check consistency.\n2. Fix orphaned accounts using 'pwconv' and 'grpconv'.",
        "business_impact": "Authentication failure, corrupted access control lists, or hidden shadow accounts.",
        "remediation_cmd": "sudo pwck -r && sudo pwconv && sudo grpconv",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Restore /etc/passwd and /etc/shadow from backups /etc/passwd- and /etc/shadow-.",
        "compliance_mapping": {"CIS": "CIS 5.4.2", "NIST": "IA-2", "ISO27001": "A.9.4.2", "PCIDSS": "Req 8.2"}
    },
    "AUTH-9218": {
        "title": "User Accounts Without Password Configured",
        "category": "Identity & Access Control",
        "default_severity": "Critical",
        "control_detail": "Lynis Control AUTH-9218 inspects /etc/shadow for accounts having blank or null password hashes.",
        "description": "Accounts without a password allow any user to log in or switch user (su) without credentials, exposing the system to immediate unauthorized access.",
        "how_to_solve": "1. Identify accounts with empty password field in /etc/shadow.\n2. Lock the account (passwd -l) or set a secure password.",
        "business_impact": "Trivial unauthorized remote or local login, total system compromise.",
        "remediation_cmd": "sudo awk -F: '($2 == \"\" ) {print $1}' /etc/shadow | while read -r u; do sudo passwd -l \"$u\"; done",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "sudo passwd <user> to set a new password.",
        "compliance_mapping": {"CIS": "CIS 5.4.1", "NIST": "IA-2, IA-5", "ISO27001": "A.9.4.3", "PCIDSS": "Req 8.2.1"}
    },
    "AUTH-9228": {
        "title": "Linux Password Hash Algorithm Deprecated",
        "category": "Identity & Access Control",
        "default_severity": "High",
        "control_detail": "Lynis Control AUTH-9228 tests the hashing algorithm configured in /etc/pam.d/common-password and /etc/login.defs.",
        "description": "Legacy hashing schemes like MD5, DES, or weak SHA256 can be rapidly cracked using modern GPUs and rainbow tables. Production systems must use SHA-512 or Yescrypt.",
        "how_to_solve": "1. Set ENCRYPT_METHOD to SHA512 or YESCRYPT in /etc/login.defs.\n2. Update PAM configuration to use sha512 rounds=5000.",
        "business_impact": "High vulnerability to offline credential dumping and password hash cracking.",
        "remediation_cmd": "sudo sed -i 's/^ENCRYPT_METHOD.*/ENCRYPT_METHOD SHA512/' /etc/login.defs",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Revert ENCRYPT_METHOD in /etc/login.defs.",
        "compliance_mapping": {"CIS": "CIS 5.3.4", "NIST": "IA-5(1)", "ISO27001": "A.9.4.3", "PCIDSS": "Req 8.2.1"}
    },
    "AUTH-9230": {
        "title": "Password Expiration and Aging Policy Missing",
        "category": "Identity & Access Control",
        "default_severity": "High",
        "control_detail": "Lynis Control AUTH-9230 checks password aging parameters in /etc/login.defs (PASS_MAX_DAYS, PASS_MIN_DAYS, PASS_WARN_AGE).",
        "description": "When password expiration is not enforced, compromised or stale employee credentials can be used indefinitely without detection.",
        "how_to_solve": "1. Configure PASS_MAX_DAYS (90), PASS_MIN_DAYS (1), and PASS_WARN_AGE (7) in /etc/login.defs.\n2. Apply policy to existing accounts with 'chage'.",
        "business_impact": "Dormant account hijacking; failure to satisfy cybersecurity insurance audits.",
        "remediation_cmd": "sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/' /etc/login.defs && sudo sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   1/' /etc/login.defs && sudo sed -i 's/^PASS_WARN_AGE.*/PASS_WARN_AGE   7/' /etc/login.defs",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Set PASS_MAX_DAYS back to 99999 in /etc/login.defs.",
        "compliance_mapping": {"CIS": "CIS 5.4.1.1", "NIST": "IA-5(f)", "ISO27001": "A.9.4.3", "PCIDSS": "Req 8.2.4"}
    },
    "AUTH-9262": {
        "title": "PAM Password Quality Control (libpam-pwquality) Missing",
        "category": "Identity & Access Control",
        "default_severity": "Medium",
        "control_detail": "Lynis Control AUTH-9262 checks for the presence and configuration of PAM password quality enforcement modules.",
        "description": "Without pam_pwquality or pam_cracklib, users can set weak, dictionary-based, or easily guessable passwords (e.g., 'Password123').",
        "how_to_solve": "1. Install libpam-pwquality package.\n2. Configure minlen=14, dcredit=-1, ucredit=-1, ocredit=-1, lcredit=-1 in /etc/security/pwquality.conf.",
        "business_impact": "Vulnerability to password spraying and dictionary-based brute force attacks.",
        "remediation_cmd": "sudo apt install -y libpam-pwquality && sudo sed -i 's/^# minlen =.*/minlen = 14/' /etc/security/pwquality.conf",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "sudo apt remove -y libpam-pwquality",
        "compliance_mapping": {"CIS": "CIS 5.3.1", "NIST": "IA-5", "ISO27001": "A.9.4.3", "PCIDSS": "Req 8.2.3"}
    },
    "AUTH-9288": {
        "title": "Direct Root Login Enabled via SSH",
        "category": "Identity & Access Control",
        "default_severity": "Critical",
        "control_detail": "Lynis Control AUTH-9288 verifies whether PermitRootLogin is explicitly disabled in /etc/ssh/sshd_config.",
        "description": "Permitting direct root login over SSH allows attackers to target the well-known 'root' username with automated brute-force botnets, bypassing individual accountability.",
        "how_to_solve": "1. Set 'PermitRootLogin no' in /etc/ssh/sshd_config.\n2. Ensure standard administrator user has sudo privileges.\n3. Restart sshd service.",
        "business_impact": "Critical risk of full server takeover and automated brute-force compromise. Violates PCI-DSS, SOC 2, and ISO 27001.",
        "remediation_cmd": "sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl restart sshd",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Set 'PermitRootLogin yes' in /etc/ssh/sshd_config and restart sshd.",
        "compliance_mapping": {"CIS": "CIS 5.2.8", "NIST": "AC-2, AC-3, PR.AC-1", "ISO27001": "A.9.2.3", "PCIDSS": "Req 2.2.4"}
    },

    # -------------------------------------------------------------------------
    # FIREWALL & PERIMETER (FIRE)
    # -------------------------------------------------------------------------
    "FIRE-4512": {
        "title": "No Active Firewall Detected",
        "category": "Network & Perimeter",
        "default_severity": "Critical",
        "control_detail": "Lynis Control FIRE-4512 tests for active packet filtering firewalls (UFW, iptables, nftables, firewalld, or pf).",
        "description": "Operating a Linux host without an active firewall exposes all listening TCP/UDP ports and internal database/cache services directly to network scanning and remote exploitation.",
        "how_to_solve": "1. Enable UFW or Firewalld.\n2. Set default incoming policy to DENY and outgoing to ALLOW.\n3. Allow only required inbound service ports (e.g., SSH, HTTP).",
        "business_impact": "Direct exposure of backend services (Redis, MySQL, Docker API) to internet scanning and exploitation.",
        "remediation_cmd": "sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw allow ssh && sudo ufw --force enable",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "sudo ufw disable",
        "compliance_mapping": {"CIS": "CIS 3.5.1", "NIST": "PR.PT-4, SC-7", "ISO27001": "A.13.1.1", "PCIDSS": "Req 1.1"}
    },
    "FIRE-4518": {
        "title": "IPTables Configuration Missing Rules",
        "category": "Network & Perimeter",
        "default_severity": "High",
        "control_detail": "Lynis Control FIRE-4518 tests if iptables kernel packet filter is loaded but possesses an empty rule set.",
        "description": "An empty firewall configuration permits all ingress packets to traverse interface endpoints unrestricted.",
        "how_to_solve": "1. Define default ingress drop rules in /etc/iptables/rules.v4.\n2. Persist rules using iptables-persistent package.",
        "business_impact": "Zero perimeter packet filtering; open attack surface.",
        "remediation_cmd": "sudo apt install -y iptables-persistent && sudo iptables -P INPUT DROP && sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT && sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT && sudo netfilter-persistent save",
        "estimated_time": "3 mins",
        "difficulty": "Moderate",
        "rollback_note": "sudo iptables -P INPUT ACCEPT",
        "compliance_mapping": {"CIS": "CIS 3.5.3", "NIST": "SC-7", "ISO27001": "A.13.1.1", "PCIDSS": "Req 1.2"}
    },

    # -------------------------------------------------------------------------
    # KERNEL & SYSTEM HARDENING (KRNL / HRDN)
    # -------------------------------------------------------------------------
    "KRNL-5788": {
        "title": "Network Kernel Security Settings Not Hardened (sysctl)",
        "category": "System & Kernel",
        "default_severity": "Medium",
        "control_detail": "Lynis Control KRNL-5788 audits sysctl parameters including tcp_syncookies, rp_filter, accept_redirects, and send_redirects.",
        "description": "Default kernel network settings do not protect against TCP SYN denial-of-service floods, IP packet spoofing, and malicious ICMP redirects.",
        "how_to_solve": "1. Create /etc/sysctl.d/99-security.conf.\n2. Enable TCP SYN cookies and reverse path filtering.\n3. Reload sysctl with 'sysctl --system'.",
        "business_impact": "Susceptibility to network denial-of-service attacks and man-in-the-middle traffic redirection.",
        "remediation_cmd": "echo -e 'net.ipv4.tcp_syncookies = 1\\nnet.ipv4.conf.all.rp_filter = 1\\nnet.ipv4.conf.all.accept_redirects = 0\\nnet.ipv4.conf.all.send_redirects = 0\\nnet.ipv6.conf.all.accept_redirects = 0' | sudo tee /etc/sysctl.d/99-security.conf && sudo sysctl --system",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Remove /etc/sysctl.d/99-security.conf and execute 'sudo sysctl --system'.",
        "compliance_mapping": {"CIS": "CIS 3.2.1", "NIST": "SC-5", "ISO27001": "A.12.1.2", "PCIDSS": "Req 1.3"}
    },
    "KRNL-5830": {
        "title": "Unrestricted Core Memory Dumps Enabled",
        "category": "System & Kernel",
        "default_severity": "High",
        "control_detail": "Lynis Control KRNL-5830 inspects whether core dumps are restricted via /etc/security/limits.conf and fs.suid_dumpable sysctl.",
        "description": "When processes crash, unrestricted core dumps write application memory contents (including raw passwords, private keys, and session tokens) into unencrypted disk files.",
        "how_to_solve": "1. Restrict core dumps in /etc/security/limits.conf with '* hard core 0'.\n2. Set fs.suid_dumpable = 0 in /etc/sysctl.d/99-security.conf.",
        "business_impact": "Exposure of sensitive cryptographic keys, user session tokens, and database credentials on disk.",
        "remediation_cmd": "echo '* hard core 0' | sudo tee -a /etc/security/limits.conf && echo 'fs.suid_dumpable = 0' | sudo tee -a /etc/sysctl.d/99-security.conf && sudo sysctl -p /etc/sysctl.d/99-security.conf",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Remove entries from /etc/security/limits.conf and /etc/sysctl.d/99-security.conf.",
        "compliance_mapping": {"CIS": "CIS 1.5.1", "NIST": "SC-28", "ISO27001": "A.12.1.2", "PCIDSS": "Req 6.5.6"}
    },
    "HRDN-7222": {
        "title": "Compilers Available to Non-Privileged Users",
        "category": "System & Kernel",
        "default_severity": "Low",
        "control_detail": "Lynis Control HRDN-7222 checks file permissions on system compilers (gcc, g++, clang, as, ld).",
        "description": "Attackers who gain initial low-privilege shell access use local compilers to compile exploit payloads and rootkits directly on the host.",
        "how_to_solve": "1. Restrict compiler execution permissions to root (chmod 700 /usr/bin/gcc).",
        "business_impact": "Enables attackers to immediately build local privilege escalation exploits.",
        "remediation_cmd": "sudo chmod 700 /usr/bin/gcc /usr/bin/as /usr/bin/g++ 2>/dev/null || true",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "sudo chmod 755 /usr/bin/gcc /usr/bin/as /usr/bin/g++",
        "compliance_mapping": {"CIS": "CIS 1.6", "NIST": "CM-7", "ISO27001": "A.12.5.1", "PCIDSS": "Req 2.2.2"}
    },

    # -------------------------------------------------------------------------
    # SOFTWARE & PACKAGE MANAGEMENT (PKGS)
    # -------------------------------------------------------------------------
    "PKGS-7394": {
        "title": "Outdated Packages with Known Vulnerabilities (CVEs)",
        "category": "Patch & Package Management",
        "default_severity": "Critical",
        "control_detail": "Lynis Control PKGS-7394 audits installed software against distro security advisory repositories for missing security patches.",
        "description": "Installed packages contain known, publicly documented Common Vulnerabilities and Exposures (CVEs) with active exploit code in the wild.",
        "how_to_solve": "1. Refresh package manager indices.\n2. Apply all outstanding security updates.\n3. Configure unattended-upgrades for automatic security patching.",
        "business_impact": "Primary vector for automated ransomware, botnet infiltration, and remote code execution.",
        "remediation_cmd": "sudo apt update && sudo apt upgrade -y && sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades",
        "estimated_time": "5-10 mins",
        "difficulty": "Easy",
        "rollback_note": "Pin specific package versions using apt-mark hold <package>.",
        "compliance_mapping": {"CIS": "CIS 1.8", "NIST": "SI-2", "ISO27001": "A.12.6.1", "PCIDSS": "Req 6.2"}
    },
    "MALW-3280": {
        "title": "No Malware / Rootkit Scanner Installed",
        "category": "Patch & Package Management",
        "default_severity": "Medium",
        "control_detail": "Lynis Control MALW-3280 checks if a rootkit/malware scanner (e.g. rkhunter, chkrootkit, ClamAV) is installed and active.",
        "description": "Without rootkit and malware scanners, kernel-level backdoors, hidden processes, and unauthorized modifications to system binaries operate undetected.",
        "how_to_solve": "1. Install rkhunter and clamav.\n2. Update vulnerability signatures (freshclam / rkhunter --update).\n3. Schedule recurring automated scans in cron.",
        "business_impact": "Persistence of advanced threats, stealth backdoors, and data exfiltration implants.",
        "remediation_cmd": "sudo apt install -y rkhunter clamav clamav-daemon && sudo freshclam && sudo rkhunter --propupd",
        "estimated_time": "3 mins",
        "difficulty": "Easy",
        "rollback_note": "sudo apt remove -y rkhunter clamav",
        "compliance_mapping": {"CIS": "CIS 6.2", "NIST": "SI-3", "ISO27001": "A.12.2.1", "PCIDSS": "Req 5.1"}
    },

    # -------------------------------------------------------------------------
    # SSH SERVER CONFIGURATION (SSH)
    # -------------------------------------------------------------------------
    "SSH-7408": {
        "title": "SSH Server Hardening Recommendations",
        "category": "Identity & Access Control",
        "default_severity": "Medium",
        "control_detail": "Lynis Control SSH-7408 checks multiple sshd_config parameters including MaxAuthTries, LogLevel, X11Forwarding, and ClientAliveInterval.",
        "description": "Default SSH configurations allow excessive login attempts, minimal logging, and insecure forwarding mechanisms that facilitate brute-force credential stuffing.",
        "how_to_solve": "1. Set MaxAuthTries 3, LogLevel VERBOSE, X11Forwarding no, and ClientAliveInterval 300 in /etc/ssh/sshd_config.\n2. Validate syntax with 'sshd -t' and restart service.",
        "business_impact": "Vulnerability to automated SSH brute-force credential stuffing and session hijacking.",
        "remediation_cmd": "sudo sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config && sudo sed -i 's/^#*LogLevel.*/LogLevel VERBOSE/' /etc/ssh/sshd_config && sudo sed -i 's/^#*X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config && sudo systemctl restart sshd",
        "estimated_time": "2 mins",
        "difficulty": "Easy",
        "rollback_note": "Revert settings in /etc/ssh/sshd_config and restart sshd.",
        "compliance_mapping": {"CIS": "CIS 5.2.5", "NIST": "AC-3, IA-5", "ISO27001": "A.13.1.2", "PCIDSS": "Req 2.2.4"}
    },

    # -------------------------------------------------------------------------
    # FILE PERMISSIONS & STORAGE (FILE / TIME / BANN)
    # -------------------------------------------------------------------------
    "FILE-7524": {
        "title": "Insecure Cron Job File Permissions",
        "category": "Identity & Access Control",
        "default_severity": "High",
        "control_detail": "Lynis Control FILE-7524 checks ownership and permissions on /etc/crontab and /etc/cron.* directories.",
        "description": "Overly permissive write access on cron task directories allows non-privileged local users to modify scheduled jobs and execute code as root.",
        "how_to_solve": "1. Set /etc/crontab to permissions 600, owner root:root.\n2. Set /etc/cron.d, /etc/cron.daily, etc., to permissions 700.",
        "business_impact": "Direct local privilege escalation to root through cron script injection.",
        "remediation_cmd": "sudo chown -R root:root /etc/crontab /etc/cron.* && sudo chmod 600 /etc/crontab && sudo chmod 700 /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.monthly /etc/cron.weekly",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Revert permissions if specific daemon relies on custom cron permissions.",
        "compliance_mapping": {"CIS": "CIS 5.1.2", "NIST": "AC-6", "ISO27001": "A.9.4.4", "PCIDSS": "Req 2.2.3"}
    },
    "TIME-3104": {
        "title": "NTP Network Time Synchronization Inactive",
        "category": "System & Kernel",
        "default_severity": "Low",
        "control_detail": "Lynis Control TIME-3104 verifies whether systemd-timesyncd, chrony, or ntpd is actively synchronizing the system clock.",
        "description": "Unsynchronized system clocks corrupt TLS certificate validation, invalidate Kerberos/OAuth authentication tokens, and render forensic log correlation impossible.",
        "how_to_solve": "1. Enable timedatectl NTP synchronization.\n2. Verify synchronization status with 'timedatectl status'.",
        "business_impact": "Authentication failures, invalid SSL certificates, and rejected multi-system log audits.",
        "remediation_cmd": "sudo timedatectl set-ntp on",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "sudo timedatectl set-ntp off",
        "compliance_mapping": {"CIS": "CIS 2.2.1", "NIST": "AU-8", "ISO27001": "A.12.4.4", "PCIDSS": "Req 10.4"}
    },
    "BANN-7126": {
        "title": "Missing Legal Warning Login Banner (/etc/issue.net)",
        "category": "Identity & Access Control",
        "default_severity": "Low",
        "control_detail": "Lynis Control BANN-7126 checks for the presence of an authorized usage warning banner in /etc/issue.net and Banner directive in sshd_config.",
        "description": "Displaying a legal warning prior to authentication establishes clear terms of authorized use, which is legally required in many jurisdictions to prosecute intruders.",
        "how_to_solve": "1. Create /etc/issue.net containing authorized access warning text.\n2. Set 'Banner /etc/issue.net' in /etc/ssh/sshd_config.\n3. Restart sshd.",
        "business_impact": "Weakened legal recourse in incident prosecution and failure of regulatory compliance audits.",
        "remediation_cmd": "echo 'Authorized personnel only. All activity is monitored and recorded.' | sudo tee /etc/issue.net && sudo sed -i 's|^#*Banner.*|Banner /etc/issue.net|' /etc/ssh/sshd_config && sudo systemctl restart sshd",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Comment out Banner directive in /etc/ssh/sshd_config.",
        "compliance_mapping": {"CIS": "CIS 1.7.1", "NIST": "AC-8", "ISO27001": "A.13.2.1", "PCIDSS": "Req 2.2"}
    },
    "NAME-4404": {
        "title": "No Secondary DNS Server Configured",
        "category": "Network & Perimeter",
        "default_severity": "Low",
        "control_detail": "Lynis Control NAME-4404 inspects /etc/resolv.conf for redundant DNS nameservers.",
        "description": "Configuring only a single DNS resolver creates a single point of failure; if the primary resolver fails, the host loses all internet domain resolution.",
        "how_to_solve": "1. Add a secondary upstream nameserver (e.g. 1.1.1.1 or 8.8.8.8) to Netplan or /etc/resolv.conf.",
        "business_impact": "Service downtime and failed package/security updates during primary DNS outages.",
        "remediation_cmd": "echo -e 'nameserver 1.1.1.1\\nnameserver 8.8.8.8' | sudo tee -a /etc/resolv.conf",
        "estimated_time": "1 min",
        "difficulty": "Easy",
        "rollback_note": "Edit /etc/resolv.conf or Netplan config.",
        "compliance_mapping": {"CIS": "CIS 3.4", "NIST": "CP-9", "ISO27001": "A.12.1.3", "PCIDSS": "Req 1.1"}
    }
}

def generate_controls_file():
    os.makedirs("app/data", exist_ok=True)
    out_path = "app/data/lynis_controls.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(CONTROLS_DATA, f, indent=2)
    print(f"Generated {len(CONTROLS_DATA)} official controls into {out_path}")

if __name__ == "__main__":
    generate_controls_file()
