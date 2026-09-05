# Lynislens Enterprise — Multi-File Component Architecture Walkthrough

## Overview of Accomplishments
The monolithic single-file architecture has been decomposed into a clean, modular, and secure **multi-file component architecture** across both backend templates and client-side scripts.

### 1. Template Component Modularization (`app/templates/components/`)
The monolithic `index.html` was split into 16 focused Jinja2 sub-templates:
- `app/templates/components/auth_overlay.html`: Master access authentication modal and credential validation.
- `app/templates/components/drawer.html`: Multi-module sidebar navigation drawer with keyboard and hover interactions.
- `app/templates/components/header.html`: Desktop software top bar, profile pill, and dark/light theme toggle.
- `app/templates/components/tab_dashboard.html`: Executive summary, Threat Posture Score, donut charts, radar, and category breakdown.
- `app/templates/components/tab_systems.html`: Connected agent inventory table and 1-line curl setup instructions.
- `app/templates/components/tab_compliance.html`: Regulatory framework switcher (CIS, NIST, ISO 27001, PCI-DSS, HIPAA, SOC 2).
- `app/templates/components/tab_improvement.html`: Prioritized 3-phase remediation roadmap container.
- `app/templates/components/tab_reporting.html`: Report exports (PDF, .dat, JSON) and audit history archive table.
- `app/templates/components/tab_settings.html`: Enrollment tokens, auditor profile, webhooks, and password management.
- `app/templates/components/modal_server.html`: Add/Connect remote server modal (1-line push agent & direct SSH).
- `app/templates/components/modal_scan.html`: Privileged audit execution confirmation modal.
- `app/templates/components/modal_doc.html`: Interactive Lynis & Architecture Documentation explorer.
- `app/templates/components/modal_about.html`: Application version and Lynis attribution modal.
- `app/templates/components/modal_playbook.html`: Batch remediation playbook modal (.sh & .yml).
- `app/templates/components/modal_password.html`: Dedicated change master password modal.
- `app/templates/components/modal_palette.html`: Global Spotlight Command Palette (`Ctrl+K`).

### 2. JavaScript Modularization Layer (`app/static/js/`)
The monolithic `app.js` was separated into 15 focused single-responsibility ES modules:
- `state.js`: Global state management and toast dispatchers.
- `theme.js`: Cyber Dark / Executive Light theme toggling and preference persistence.
- `auth.js`: Master access authentication, profile displays, and modal password change handler.
- `router.js`: Multi-route client navigation, breadcrumbs, and HTML5 browser history (`pushState` / `popstate`).
- `sse.js`: Server-Sent Events live scan progress stream consumer.
- `dashboard.js`: Executive scorecards, Chart.js visualizations, and attack surface port exposure.
- `findings.js`: Findings search, filtering, card expansion, and batch playbook generator.
- `systems.js`: Fleet inventory, target server select synchronizer, and decommissioning.
- `compliance.js`: Compliance framework scoring, adherence gauges, and control checklists.
- `improvement.js`: Strategic 3-phase security roadmap and effort-vs-ROI rankings.
- `reporting.js`: Report exports trigger and audit archives log table.
- `settings.js`: Token rotation, auditor profile saving, and test webhook alerts.
- `documentation.js`: Interactive architecture documentation modal controller.
- `palette.js`: Global Command Palette spotlight search and keyboard navigation.
- `app.js`: Main bootstrap script coordinating initialization.

### 3. Backend Multi-Route Handlers (`app/main.py`)
Direct HTTP route handlers render specific tabs with full deep-linking support:
- `/` & `/dashboard`
- `/findings`
- `/systems`
- `/compliance`
- `/improvement`
- `/reporting`
- `/settings`
- `/documentation`

### 4. Zero Visual or UX Regression
- All element IDs, CSS classes, animations, themes, and responsiveness remain 100% identical and pixel-perfect.
