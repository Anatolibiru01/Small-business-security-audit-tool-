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
> **Changing Master Password**: Once authenticated, you can change your master password at any time via the **Auditor Profile Dropdown** (`Change Master Password`) in the top-right corner, or under **Suite Settings & Policies** -> **Master Access Credentials & Security**. Updated passwords are automatically saved and enforced for all subsequent sessions.

---

## 🎖️ Acknowledgment: The Role of Lynis

Lynislens is built with deep appreciation for **[Lynis](https://cisofy.com/lynis/)**, the industry-standard battle-tested open-source security auditing tool originally created by **Michael Boelen** and maintained by **CISOfy**.

### What Lynis Does:
- Lynis performs in-depth non-destructive security scanning directly on UNIX/Linux kernels, packages, authentication subsystems, network daemon configurations, file permissions, and logging daemons.
- It produces rich machine-readable key-value diagnostic reports (`/var/log/lynis-report.dat`) and detailed execution logs (`/var/log/lynis.log`).

### How Lynislens Enhances Lynis:
- **Enterprise Visual Orchestration**: Converts terminal-based text output into an interactive, real-time visual dashboard with historical trends, radar maturity charts, and exposure matrices.
- **Intelligent Knowledge Base & Governance**: Expands cryptic test IDs (e.g., `PKGS-7392`, `SSH-7408`, `KRNL-5820`) into plain-English risk rationales, precise CLI fix commands, configuration diff previews, and rollback procedures.
- **5-Tier Regulatory Compliance Mapping**: Automatically cross-references Lynis findings against **CIS Benchmarks**, **NIST CSF v2.0**, **ISO 27001**, **PCI-DSS 4.0**, **SOC 2**, and **HIPAA**.
- **Fleet Push & Pull Management**: Supports direct SSH remote execution as well as zero-inbound-port **Enterprise Push Agents** deployed via a 1-line cron script.
- **1-Click Remediation Playbooks**: Compiles selected findings into executable Shell scripts (`.sh`) or Ansible playbooks (`.yml`).
- **Executive PDF Reporting & Webhooks**: Generates C-level and auditor-ready PDF reports and broadcasts instant SecOps alerts to Slack, Discord, MS Teams, or SIEM endpoints.

---

## 🚀 Key Features & Capabilities

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                           LYNISLENS ENTERPRISE                          │
  ├───────────────────┬───────────────────────────────┬─────────────────────┤
  │ 🛡️ Local Auditing │ 🔌 Remote SSH Direct Auditing │ 🚀 Fleet Push Agent │
  └─────────┬─────────┴───────────────┬───────────────┴──────────┬──────────┘
            │                         │                          │
            └─────────────────────────┼──────────────────────────┘
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       Enterprise Orchestration Core (FastAPI)   │
             ├─────────────────────────────────────────────────┤
             │ • SSE Live Streaming Engine                     │
             │ • Knowledge Base (700+ Lynis Control Mappings)  │
             │ • 5-Tier Compliance Matrix Engine               │
             │ • Scoring, Hardening Index & Grade Calculator   │
             │ • Automated Playbook & Diff Generator           │
             │ • SQLite History & Time-Series DB               │
             └────────────────────────┬────────────────────────┘
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │      Desktop & Cloud Control Dashboard (SPA)    │
             ├─────────────────────────────────────────────────┤
             │ • Executive Summary & Hardening Index Scorecard │
             │ • Findings & Remediation Checklist with Diffs   │
             │ • Regulatory Compliance Matrix (CIS, NIST, etc.)│
             │ • Automated Prioritized Improvement Roadmap     │
             │ • Agent & Fleet Asset Management                │
             │ • Audit Run Archive & Time-Series Trend Line    │
             │ • Cyber Dark & Executive Light Themes           │
             └─────────────────────────────────────────────────┘
```

### 1. Multi-Target Auditing Pipeline
- **Local Native Engine**: Executes privileged Lynis scans locally with real-time SSE progress streaming.
- **Direct SSH Remote Audits**: Connects securely to remote Linux servers using SSH key or password authentication.
- **Outbound Push Agents**: For firewalled or NAT-isolated instances, lightweight push agents execute automated cron audits and post JSON reports back to the Lynislens endpoint.

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
- **Lynis**: Installed on the audit host (`sudo apt install lynis` or `sudo yum install lynis`)
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
   python -m app.main
   ```
   *The server will start at `http://localhost:8000`.*

5. **Access the Dashboard**:
   Open your browser to `http://localhost:8000` and sign in with `admin` / `lynislens`.

---

## 🤖 Remote Push Agent Deployment (Zero Inbound Ports)

For air-gapped, NATed, or cloud-hosted instances (AWS EC2, GCP, DigitalOcean, Hetzner, on-prem), deploy the lightweight push agent:

1. Navigate to **Suite Settings** in the dashboard to view your active enrollment token.
2. Run the single-line deployment command on your remote Linux server:
   ```bash
   curl -sSL "http://<YOUR_LYNISLENS_IP>:8000/api/agent/install.sh?token=<ENROLLMENT_TOKEN>&interval=daily" | sudo bash
   ```
3. The agent installs a secure cron daemon, performs scheduled Lynis audits, and transmits cryptographic reports back to your Lynislens hub.

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
| `POST` | `/api/scan/start` | Initiates a local or remote Lynis audit execution |
| `GET` | `/api/scan/stream` | Real-time Server-Sent Events (SSE) audit progress ticker |
| `GET` | `/api/scan/latest` | Retrieves the latest scorecard data |
| `GET` | `/api/history` | Returns historical audit run records |
| `GET` | `/api/history/{id}` | Retrieves a specific historical scorecard by ID |
| `GET` | `/api/history/{id}/export/dat` | Downloads raw `/var/log/lynis-report.dat` archive |
| `GET` | `/api/servers` | Lists all registered infrastructure assets |
| `POST` | `/api/servers` | Registers a new remote SSH target server |
| `DELETE` | `/api/servers/{id}` | Decommissions and deletes a registered server |
| `POST` | `/api/servers/{id}/test` | Tests SSH credentials, latency, and Lynis presence |
| `GET` | `/api/agent/token` | Fetches active enrollment token for remote push agents |
| `POST` | `/api/agent/token/refresh`| Rotates and generates a new agent enrollment token |
| `POST` | `/api/agent/push` | Ingestion endpoint for remote push agent report payloads |
| `POST` | `/api/notifications/test` | Dispatches test alert payload to configured webhook |
| `POST` | `/api/notifications/config`| Saves webhook provider URL and alert threshold policies |
| `GET` | `/export/pdf` | Renders and downloads formal Executive PDF report |
| `GET` | `/export/html` | Renders stand-alone executive HTML security report |

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
