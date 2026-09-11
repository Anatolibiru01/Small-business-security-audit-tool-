/**
 * Lynislens Enterprise Suite — Regulatory Compliance Frameworks Matrix
 * Version 2.0.0
 */

(function() {
  const FRAMEWORK_METAS = {
    'CIS': {
      title: 'CIS Linux Benchmark (Level 1 & 2)',
      desc: 'The Center for Internet Security (CIS) Benchmarks provide consensus-based best practice guidelines for securing Linux operating systems.',
      guidance: [
        'SSH Daemon Hardening & Root Login Restrictions (CIS 5.2)',
        'Firewall & Ingress Packet Filtering (CIS 3.5)',
        'Password Complexity & PAM Authentication Rules (CIS 5.4)',
        'System Logging & Syslog Daemon Forensics (CIS 4.2)'
      ]
    },
    'NIST': {
      title: 'NIST Cybersecurity Framework (CSF v2.0)',
      desc: 'National Institute of Standards and Technology CSF v2.0 focuses on Identify, Protect, Detect, Respond, and Recover core functions for critical infrastructure.',
      guidance: [
        'Identity Management & Access Control (PR.AC-1 to PR.AC-6)',
        'Data Security & Configuration Baselines (PR.DS-1)',
        'Continuous Security Monitoring & Telemetry (DE.CM-1)',
        'Vulnerability Management & Mitigation (RS.MI-1)'
      ]
    },
    'ISO27001': {
      title: 'ISO/IEC 27001:2022 ISMS Controls',
      desc: 'International Information Security Management Standard covering Annex A controls for technical vulnerability management and operational security.',
      guidance: [
        'Control A.8.8: Management of Technical Vulnerabilities',
        'Control A.8.9: Configuration Management & Hardening',
        'Control A.8.12: Data Leakage Prevention & Firewalls',
        'Control A.8.15: Logging, Log Rotation & Audit Trails'
      ]
    },
    'PCIDSS': {
      title: 'Payment Card Industry Data Security Standard (PCI-DSS v4.0)',
      desc: 'Mandatory technical requirements for organizations storing, processing, or transmitting credit cardholder data (CHD).',
      guidance: [
        'Requirement 1: Install and Maintain Network Security Controls',
        'Requirement 2: Apply Secure Configurations to All System Components',
        'Requirement 8: Identify Users and Authenticate Access to Components',
        'Requirement 10: Log and Monitor All Access to System Components'
      ]
    },
    'HIPAA': {
      title: 'HIPAA Security Rule (45 CFR §164.312)',
      desc: 'US Federal statutory regulations mandating administrative, physical, and technical safeguards for electronic protected health information (ePHI).',
      guidance: [
        'Technical Safeguard §164.312(a)(1): Unique User Access Control',
        'Technical Safeguard §164.312(b): Audit Controls & Logging',
        'Technical Safeguard §164.312(c)(1): Integrity Verification',
        'Technical Safeguard §164.312(e)(1): Transmission Security & Encryption'
      ]
    },
    'SOC2': {
      title: 'SOC 2 Type II Trust Services Criteria',
      desc: 'AICPA Trust Services Criteria evaluating Security, Availability, Processing Integrity, Confidentiality, and Privacy across enterprise cloud environments.',
      guidance: [
        'CC6.1: Logical Access Controls & Privilege Separation',
        'CC6.6: Boundary Protection & External Perimeter Firewalls',
        'CC7.1: Vulnerability Detection & Hardening Benchmarks',
        'CC7.2: Real-Time Security Incident Monitoring'
      ]
    }
  };

  // Per-framework scoring profiles: each framework weighs security categories
  // differently based on what that standard actually prioritises.
  const FRAMEWORK_PROFILES = {
    'CIS': {
      // CIS Benchmarks: broad Linux hardening, all categories weighted equally
      totalControls: 32,
      categoryWeights: {
        'Network & Perimeter': 1.0,
        'Identity & Access Control': 1.0,
        'Patch & Package Management': 1.0,
        'Logging & Forensics': 1.0,
        'System & Kernel': 1.0
      },
      sevMultipliers: { critical: 3.0, high: 2.0, medium: 1.0, low: 0.4 }
    },
    'NIST': {
      // NIST CSF: emphasises access control, system integrity, less about raw network config
      totalControls: 26,
      categoryWeights: {
        'Network & Perimeter': 0.7,
        'Identity & Access Control': 1.5,
        'Patch & Package Management': 1.1,
        'Logging & Forensics': 0.9,
        'System & Kernel': 1.3
      },
      sevMultipliers: { critical: 3.5, high: 2.0, medium: 0.8, low: 0.3 }
    },
    'ISO27001': {
      // ISO 27001 ISMS: heavy on logging, audit trails, access management
      totalControls: 22,
      categoryWeights: {
        'Network & Perimeter': 0.6,
        'Identity & Access Control': 1.3,
        'Patch & Package Management': 0.8,
        'Logging & Forensics': 1.6,
        'System & Kernel': 0.9
      },
      sevMultipliers: { critical: 3.0, high: 2.2, medium: 1.2, low: 0.5 }
    },
    'PCIDSS': {
      // PCI-DSS: firewall, network segmentation, access, patching are king
      totalControls: 30,
      categoryWeights: {
        'Network & Perimeter': 1.6,
        'Identity & Access Control': 1.4,
        'Patch & Package Management': 1.3,
        'Logging & Forensics': 1.0,
        'System & Kernel': 0.5
      },
      sevMultipliers: { critical: 4.0, high: 2.5, medium: 1.0, low: 0.3 }
    },
    'HIPAA': {
      // HIPAA Security Rule: audit logging, access controls, encryption emphasis
      totalControls: 20,
      categoryWeights: {
        'Network & Perimeter': 0.7,
        'Identity & Access Control': 1.4,
        'Patch & Package Management': 0.7,
        'Logging & Forensics': 1.7,
        'System & Kernel': 0.5
      },
      sevMultipliers: { critical: 3.0, high: 2.0, medium: 1.3, low: 0.6 }
    },
    'SOC2': {
      // SOC 2 Trust Services: monitoring, change management, boundary protection
      totalControls: 24,
      categoryWeights: {
        'Network & Perimeter': 1.2,
        'Identity & Access Control': 1.0,
        'Patch & Package Management': 0.8,
        'Logging & Forensics': 1.5,
        'System & Kernel': 0.7
      },
      sevMultipliers: { critical: 3.2, high: 2.0, medium: 1.1, low: 0.4 }
    }
  };

  function computeFrameworkScore(framework, scorecard) {
    const findings = (scorecard && scorecard.remediation_feed) || [];
    const mapped = findings.filter(f => f.compliance_mapping && f.compliance_mapping[framework]);
    const profile = FRAMEWORK_PROFILES[framework] || FRAMEWORK_PROFILES['CIS'];

    if (!mapped.length) {
      // No findings at all — fallback based on overall score with framework-specific offset
      const baseScore = (scorecard && scorecard.overall_score) || 75;
      const offset = { CIS: 0, NIST: 3, ISO27001: -2, PCIDSS: -4, HIPAA: -3, SOC2: 1 }[framework] || 0;
      const score = Math.min(100, Math.max(10, baseScore + offset));
      return {
        score,
        passed: Math.round(profile.totalControls * score / 100),
        failed: Math.max(1, Math.round(profile.totalControls * (100 - score) / 100)),
        partial: 0,
        controls: []
      };
    }

    // Compute weighted deductions per finding based on category relevance to this framework
    let weightedDeductions = 0;
    let effectiveFailed = 0;
    let effectivePartial = 0;

    mapped.forEach(f => {
      const cat = f.category || 'System & Kernel';
      const catWeight = profile.categoryWeights[cat] || 1.0;
      const sev = (f.severity || 'medium').toLowerCase();
      const sevMul = profile.sevMultipliers[sev] || 1.0;

      const deduction = catWeight * sevMul;
      weightedDeductions += deduction;

      if (sev === 'critical' || sev === 'high') {
        effectiveFailed++;
      } else if (sev === 'medium') {
        effectivePartial++;
      }
    });

    // Normalise: max possible deduction is totalControls * highest severity * highest weight
    const maxDeduction = profile.totalControls * 3.0;
    const rawScore = 100 - (weightedDeductions / maxDeduction) * 100;
    const score = Math.min(100, Math.max(10, Math.round(rawScore)));

    const passed = Math.max(1, profile.totalControls - effectiveFailed - effectivePartial);
    const failed = effectiveFailed;
    const partial = effectivePartial;

    return { score, passed, failed, partial, controls: mapped };
  }

  function renderAllComplianceFrameworkPies(scorecard) {
    const frameworks = ['CIS', 'NIST', 'ISO27001', 'PCIDSS', 'HIPAA', 'SOC2'];
    frameworks.forEach(fw => {
      const data = computeFrameworkScore(fw, scorecard);

      const scoreEl = document.getElementById(`compCardScore_${fw}`);
      const passedEl = document.getElementById(`compPassed_${fw}`);
      const failedEl = document.getElementById(`compFailed_${fw}`);

      if (scoreEl) scoreEl.textContent = `${data.score}%`;
      if (passedEl) passedEl.textContent = `${data.passed} Passed`;
      if (failedEl) failedEl.textContent = `${data.failed} Non-Compliant`;

      const canvas = document.getElementById(`chartComp_${fw}`);
      if (canvas) {
        if (window.LynislensState.complianceCharts[fw]) {
          window.LynislensState.complianceCharts[fw].destroy();
        }
        window.LynislensState.complianceCharts[fw] = new Chart(canvas, {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [data.passed, data.failed, data.partial || 0],
              backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: false,
            cutout: '70%',
            plugins: { legend: { display: false } }
          }
        });
      }
    });
  }

  function renderComplianceDetailView(framework) {
    window.LynislensState.activeComplianceFramework = framework;
    const meta = FRAMEWORK_METAS[framework] || FRAMEWORK_METAS['CIS'];

    const frameworkTitle = document.getElementById('complianceFrameworkTitle');
    const compFrameworkDesc = document.getElementById('compFrameworkDesc');
    const compReferenceList = document.getElementById('compReferenceList');

    if (frameworkTitle) frameworkTitle.textContent = meta.title;
    if (compFrameworkDesc) compFrameworkDesc.textContent = meta.desc;
    if (compReferenceList) {
      compReferenceList.innerHTML = meta.guidance.map(g => `<li>${window.escapeHtml(g)}</li>`).join('');
    }

    const data = computeFrameworkScore(framework, window.LynislensState.currentScorecard);

    const scoreNum = document.getElementById('complianceScoreNum');
    const passedControls = document.getElementById('compPassedControls');
    const partialControls = document.getElementById('compPartialControls');
    const failedControls = document.getElementById('compFailedControls');
    const infoControls = document.getElementById('compInfoControls');

    if (scoreNum) scoreNum.textContent = `${data.score}%`;
    if (passedControls) passedControls.textContent = data.passed;
    if (partialControls) partialControls.textContent = data.partial || 0;
    if (failedControls) failedControls.textContent = data.failed;
    if (infoControls) infoControls.textContent = 4;

    const ctx = document.getElementById('compDetailPieChart');
    if (ctx) {
      if (window.LynislensState.complianceDetailChart) {
        window.LynislensState.complianceDetailChart.destroy();
      }
      window.LynislensState.complianceDetailChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Compliant', 'Review', 'Non-Compliant', 'Info'],
          datasets: [{
            data: [data.passed, data.partial || 0, data.failed, 4],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: { legend: { display: false } }
        }
      });
    }

    renderComplianceTable(framework, data.controls);
  }

  function renderComplianceTable(framework, controls) {
    const tbody = document.getElementById('complianceTableBody');
    if (!tbody) return;

    if (!controls || !controls.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No direct non-compliant findings for ${framework}. Baseline requirements are satisfied.</td></tr>`;
      return;
    }

    tbody.innerHTML = controls.map((c, i) => {
      const mapping = (c.compliance_mapping && c.compliance_mapping[framework]) || `${framework}-REQ-${i + 1}`;
      const sev = c.severity || 'Medium';
      const isPass = sev.toLowerCase() === 'low';
      return `
        <tr>
          <td><strong style="font-family:var(--font-mono); color:var(--brand-orange);">${window.escapeHtml(mapping)}</strong></td>
          <td><strong>${window.escapeHtml(c.title || 'Security Requirement')}</strong></td>
          <td><code>${window.escapeHtml(c.test_id || '--')}</code></td>
          <td>${window.escapeHtml(c.category || 'System')}</td>
          <td>
            <span class="badge badge-${isPass ? 'success' : sev.toLowerCase() === 'critical' ? 'danger' : 'warning'}">
              ${isPass ? 'Compliant' : 'Non-Compliant (' + sev + ')'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderComplianceTab() {
    renderAllComplianceFrameworkPies(window.LynislensState.currentScorecard);
    renderComplianceDetailView(window.LynislensState.activeComplianceFramework || 'CIS');
  }

  window.renderComplianceTab = renderComplianceTab;
  window.renderAllComplianceFrameworkPies = renderAllComplianceFrameworkPies;
  window.renderComplianceDetailView = renderComplianceDetailView;
  window.computeFrameworkScore = computeFrameworkScore;

  document.addEventListener('DOMContentLoaded', () => {
    // Framework Buttons in Subnav and Cards
    const frameworkBtns = document.querySelectorAll('.subnav-btn[data-framework], .compliance-card[data-framework]');
    frameworkBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const fw = btn.getAttribute('data-framework');
        document.querySelectorAll('.subnav-btn[data-framework]').forEach(b => b.classList.toggle('active', b.getAttribute('data-framework') === fw));
        document.querySelectorAll('.compliance-card[data-framework]').forEach(c => c.classList.toggle('active', c.getAttribute('data-framework') === fw));
        renderComplianceDetailView(fw);
      });
    });
  });
})();
