# Lynislens Enterprise — Automated Linux Security Audit & Hardening Suite

[![Version](https://img.shields.io/badge/version-2.0.0--enterprise-orange.svg)](https://github.com/Anatolibiru01/Small-business-security-audit-tool-)
[![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-GPLv3%20%2F%20Commercial-green.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/FastAPI-Production%20Ready-009688.svg)](https://fastapi.tiangolo.com/)

> **Lynislens Enterprise** is a commercial-grade, multi-node Linux security posture management and automated compliance platform. It transforms raw system auditing diagnostics into actionable executive intelligence, risk-prioritized remediation playbooks, and continuous regulatory compliance verification.

---

## 🔐 Initial Master Access Credentials

When launching Lynislens for the first time, authenticate using the default master administrator credentials:

| Credential | Value |
| :--- | :--- |
| **Default Username** | `admin` |
| **Default Master Password** | `lynislens` |

> [!IMPORTANT]
> **Changing Master Password**: Once authenticated, you can change your master password at any time via the **Auditor Profile Dropdown** (`Change Master Password`) in the top-right corner, or under **Suite Settings & Policies** -> **Master Access Credentials & Security**. Updated passwords are automatically encrypted, saved, and enforced for all subsequent sessions.

---

## 🎖️ Acknowledgment: The Role of Lynis

Lynislens is built with deep appreciation for **[Lynis](https://cisofy.com/lynis/)**, the industry-standard battle-tested open-source security auditing tool originally created by **Michael Boelen** and maintained by **CISOfy**.

### What Lynis Does:
- **Core Capabilities**: Performs essential tasks including **Security auditing**, **Compliance testing**, **Penetration testing**, **Vulnerability detection**, and **System hardening**.
- Lynis performs in-depth non-destructive security scanning directly on UNIX/Linux kernels, packages, authentication subsystems, network daemon configurations, file permissions, and logging daemons.
- It produces rich machine-readable key-value diagnostic reports (`/var/log/lynis-report.dat`) and detailed execution logs (`/var/log/lynis.log`).

### How Lynislens Enhances Lynis:
- **Enterprise Visual Orchestration**: Converts terminal-based text output into an interactive, real-time visual dashboard with historical trends, radar maturity charts, and exposure matrices.
- **Intelligent Knowledge Base & Governance**: Expands cryptic test IDs (e.g., `PKGS-7392`, `SSH-7408`, `KRNL-5820`) into plain-English risk rationales, precise CLI fix commands, configuration diff previews, and rollback procedures.
- **5-Tier Regulatory Compliance Mapping**: Automatically cross-references Lynis findings against **CIS Benchmarks**, **NIST CSF v2.0**, **ISO 27001**, **PCI-DSS 4.0**, **SOC 2**, and **HIPAA**.
- **Fleet Push & Pull Management**: Supports direct SSH remote execution as well as zero-inbound-port **Enterprise Push Agents** deployed via a 1-line curl onboarding script.
- **1-Click Remediation Playbooks**: Compiles selected findings into executable Shell scripts (`.sh`) or Ansible playbooks (`.yml`).
- **Executive PDF Reporting & Webhooks**: Generates C-level and auditor-ready PDF reports and broadcasts instant SecOps alerts to Slack, Discord, MS Teams, or SIEM endpoints.

---

## 🏗️ Multi-File Component Architecture

Lynislens is engineered with a modular, security-focused multi-file component design decoupling presentation, state, and business logic:

```
app/
├── core/
│   ├── agent_installer.py    # Generates 1-line curl setup bash script
│   ├── executor.py           # Local audit runner & preflight checks
│   ├── history.py            # SQLite audit history & time-series storage
│   ├── knowledge_base.py     # 700+ Lynis controls & compliance crosswalk
│   ├── parser.py             # Raw /var/log/lynis-report.dat parser
│   ├── scorer.py             # Hardening Index & multi-vector risk engine
│   ├── servers.py            # Fleet asset registry & cryptographic tokens
│   └── ssh_client.py         # Paramiko direct SSH execution engine
├── static/
│   ├── css/
│   │   └── dashboard.css     # Complete design system & dual-theme tokens
│   └── js/
│       ├── app.js            # Main bootstrap entrypoint
│       ├── auth.js           # Authentication & password management
│       ├── compliance.js     # Multi-framework compliance matrix
│       ├── dashboard.js      # Executive charts & metrics
│       ├── documentation.js  # In-app architecture documentation modal
│       ├── findings.js       # Findings checklist & batch playbooks
│       ├── improvement.js    # 3-Phase prioritized remediation roadmap
│       ├── palette.js        # Global Command Palette (Ctrl+K)
│       ├── reporting.js      # PDF/dat/JSON report export triggers
│       ├── router.js         # HTML5 history & tab routing
│       ├── settings.js       # Tokens, webhooks & auditor profile
│       ├── sse.js            # Server-Sent Events live scan streaming
│       ├── state.js          # Shared state & toast notifications
│       ├── systems.js        # Fleet server inventory & setup guides
│       └── theme.js          # Cyber Dark & Executive Light theme toggle
└── templates/
    ├── components/
    │   ├── auth_overlay.html    # Master login window
    │   ├── drawer.html          # Left navigation drawer
    │   ├── header.html          # Software menu bar & profile pill
    │   ├── modal_about.html     # About & version modal
    │   ├── modal_doc.html       # Architecture & Lynis doc modal
    │   ├── modal_palette.html   # Command Palette modal (Ctrl+K)
    │   ├── modal_password.html  # Change password modal
    │   ├── modal_playbook.html  # Batch playbook modal
    │   ├── modal_scan.html      # Privileged scan confirmation modal
    │   ├── modal_server.html    # Connect remote server modal
    │   ├── tab_compliance.html  # Compliance matrix tab
    │   ├── tab_dashboard.html   # Executive summary & charts tab
    │   ├── tab_improvement.html # Improvement plan tab
    │   ├── tab_reporting.html   # Reporting hub tab
    │   ├── tab_settings.html    # Suite settings tab
    │   └── tab_systems.html     # Agent inventory & setup tab
    ├── index.html               # Main modular parent template
    └── report_export.html       # Printable executive PDF report template
```

---

## 🚀 Key Features & Capabilities

### 1. Multi-Target Auditing Pipeline
- **Local Native Engine**: Executes privileged Lynis scans locally with real-time SSE progress streaming.
- **Direct SSH Remote Audits**: Connects securely to remote Linux servers using SSH key or password authentication.
- **Outbound Push Agents**: For firewalled or NAT-isolated instances, lightweight push agents execute automated cron audits and post JSON reports back to the central dashboard.

### 2. Deep Remediation Intelligence
- Every finding includes:
  - **Control Detail & Governance**: Benchmark rule mapping and governance requirements.
  - **Description & Threat Impact**: Explains business and technical risk in plain English.
  - **Interactive Config Diffs**: Highlights lines to delete (`-`) and add (`+`) in system configs (e.g. `/etc/ssh/sshd_config`, `/etc/login.defs`, `/etc/sysctl.d/`).
  - **Direct Remediation Commands**: Ready-to-execute CLI commands with 1-click clipboard copying.
  - **Structured Remediation Steps**: Numbered guides for permanent hardening.

### 3. Automated Batch Remediation Playbooks
- Select multiple security findings and compile them into a unified executable script:
  - **Shell Script (`.sh`)**: Direct Bash script with sanity checks and service reloads.
  - **Ansible Playbook (`.yml`)**: Infrastructure-as-code automation tasks.

### 4. Interactive Data Visualization & Dual Theme
- **Open-Middle Doughnut Chart**: 4-color findings distribution (Critical/High, Medium, Low/Compliant, Informational).
- **Category Breakdown with Domain Insights**: Interactive bar chart that automatically calculates domain averages, highlights your **Strongest Domain**, and features a clickable **Priority Focus** tile.
- **Historical Trend Line Chart**: Visualizes hardening index progression over audit cycles.
- **6-Domain Defense Radar**: Evaluates multi-vector security maturity across Identity, Kernel, Network, Crypto, Logging, and Packages.
- **Attack Surface Table**: Highlights active listening ports, bound daemons, and firewall status.
- **Theme Switcher**: Instant toggle between **Cyber Dark** and **Executive Light** modes.

---

## 📦 Installation & Setup Guide

### Prerequisites
- **Python 3.8+**
- **Lynis**: Installed on the audit host (`sudo apt install lynis` or `sudo dnf install lynis`)
- Linux / WSL / macOS environment for direct scanning (Windows supported via WSL or Remote SSH targets).

### Quickstart Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Anatolibiru01/Small-business-security-audit-tool-.git
   cd Small-business-security-audit-tool-
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Lynislens Enterprise Server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The server will start at `http://localhost:8000`.*

5. **Access the Dashboard**:
   Open your browser to `http://localhost:8000` and sign in with `admin` / `lynislens`.

---

## 🤖 Remote Node Connections & Fleet Ingestion

Lynislens supports 3 flexible connection architectures to fit any network or cloud environment:

### Method 1: Native Lynis Client Upload (Zero Agents)
For any Linux server with Lynis already installed (`apt install lynis` / `dnf install lynis`):

1. Configure your target machine's `/etc/lynis/custom.prf`:
   ```bash
   echo -e "\nupload=yes\nupload_server=http://<YOUR_LYNISLENS_IP>:8000/api/lynis/upload/\nlicense_key=<ENROLLMENT_TOKEN>" | sudo tee -a /etc/lynis/custom.prf
   ```
2. Run the audit and upload directly to your central dashboard:
   ```bash
   sudo lynis audit system --upload
   ```
3. Schedule automated daily uploads (cron):
   ```bash
   echo "0 3 * * * root /usr/sbin/lynis audit system --cronjob --upload" | sudo tee /etc/cron.d/lynis-upload-audit
   ```

---

### Method 2: 1-Line Standalone Push Agent Installer
For fresh Linux nodes without Lynis installed (AWS EC2, GCP, DigitalOcean, Hetzner, on-prem):
```bash
curl -sSL http://<YOUR_LYNISLENS_IP>:8000/install.sh | sudo bash -s -- --token <ENROLLMENT_TOKEN> --server http://<YOUR_LYNISLENS_IP>:8000 --cron daily
```
*Deploys standalone Lynis into `/opt/lynis`, sets up scheduled cron audits, and uploads reports automatically.*

---

### Method 3: Direct Agentless Remote SSH Audit
Audit remote servers directly from the dashboard without modifying the target system:
1. Open **Fleet / Systems** -> **+ Connect Remote Agent** -> **Direct SSH**.
2. Enter the target server IP, SSH port, and credentials.
3. Select the server from the top dropdown and click **"Run Audit"** to stream live progress via SSE.

---

## 🔌 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` or `/dashboard` | Executive Summary & Security Posture Dashboard |
| `GET` | `/findings` | Findings, Configuration Diffs & Remediation Checklist |
| `GET` | `/systems` | Agent Overview, Fleet Assets & 1-Line Installer Setup |
| `GET` | `/compliance` | Compliance Matrix (CIS, NIST, ISO 27001, PCI-DSS, SOC 2, HIPAA) |
| `GET` | `/improvement` | Automated Prioritized Improvement Plan Roadmap |
| `GET` | `/reporting` | Reporting Hub, Audit Archives & PDF/HTML Exports |
| `GET` | `/settings` | Suite Settings, Tokens, Servers & Webhook Notifications |
| `GET` | `/documentation` | In-App Architectural Specification & Lynis Documentation Explorer |
| `GET` | `/install.sh` | Dynamic 1-line curl agent installation bash script |
| `POST` | `/api/scan/trigger` | Initiates a local or remote Lynis audit execution |
| `GET` | `/api/scan/stream` | Real-time Server-Sent Events (SSE) audit progress ticker |
| `GET` | `/api/scan/latest` | Retrieves the latest scorecard payload |
| `GET` | `/api/history` | Returns historical audit run records |
| `GET` | `/api/servers` | Lists all registered infrastructure assets |
| `POST` | `/api/servers` | Registers a new remote SSH target server |
| `DELETE` | `/api/servers/{id}` | Decommissions and deletes a registered server |
| `GET` | `/api/token` | Fetches active enrollment token for remote push agents |
| `POST` | `/api/token/rotate` | Rotates and generates a new cryptographic enrollment token |
| `POST` | `/api/agent/push` | Ingestion endpoint for remote push agent report payloads |
| `POST` | `/api/webhook/test` | Dispatches test alert payload to configured webhook endpoint |
| `GET` | `/report` | Renders stand-alone executive printable report |
| `GET` | `/api/export/{format}` | Exports report in `pdf`, `raw` (.dat), or `json` format |

---

## 🧪 Testing & Quality Assurance

Run the comprehensive pytest test suite to verify scoring, parsing, SSH orchestration, and API endpoints:

```bash
pytest tests/ -v
```

---

## 📄 License & Commercial Distribution

Lynislens Enterprise is distributed under the GNU General Public License v3.0 (GPLv3) with commercial enterprise licensing options available for SaaS, managed service providers (MSPs), and commercial security auditors.

---

*Engineered with precision for SecOps Teams, System Administrators, and Security Auditors.*
