/**
 * Lynislens - Desktop Software Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let currentScorecard = null;
  let activeSeverityFilter = 'ALL';
  let activeCategoryFilter = 'ALL';
  let activeSearchQuery = '';
  let eventSource = null;

  // Chart Instances
  let pieChart = null;
  let barChart = null;

  // Initial Auth Check
  const authOverlay = document.getElementById('authOverlay');
  const btnAuthLogin = document.getElementById('btnAuthLogin');
  const ownerPasswordInput = document.getElementById('ownerPassword');

  function checkAuth() {
    const isOwner = localStorage.getItem('lynislens_owner_auth');
    if (!isOwner) {
      authOverlay.classList.remove('hidden');
    } else {
      authOverlay.classList.add('hidden');
      initialize();
    }
  }

  btnAuthLogin.addEventListener('click', () => {
    const pwd = ownerPasswordInput.value.trim();
    if (pwd.length > 0) {
      localStorage.setItem('lynislens_owner_auth', 'true');
      authOverlay.classList.add('hidden');
      initialize();
    } else {
      alert("Please enter a password.");
    }
  });

  // Toast Logic
  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (type === 'error') {
      toast.style.borderLeftColor = '#d32f2f';
    }
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // Start check
  checkAuth();

  // Logout Logic
  const btnLogout = document.getElementById('btnLogout');
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('lynislens_owner_auth');
    location.reload();
  });

  // Help Modal Logic
  const menuHelp = document.getElementById('menuHelp');
  const helpDropdown = document.getElementById('helpDropdown');
  
  menuHelp.addEventListener('click', (e) => {
    helpDropdown.classList.toggle('hidden');
    e.stopPropagation();
  });

  // View Modal Logic
  const menuView = document.getElementById('menuView');
  const viewDropdown = document.getElementById('viewDropdown');
  const btnOpenDoc = document.getElementById('btnOpenDoc');
  const btnOpenAbout = document.getElementById('btnOpenAbout');
  const docModal = document.getElementById('docModal');
  const aboutModal = document.getElementById('aboutModal');
  const btnCloseDocModal = document.getElementById('btnCloseDocModal');
  const btnCloseAboutModal = document.getElementById('btnCloseAboutModal');

  menuView.addEventListener('click', (e) => {
    viewDropdown.classList.toggle('hidden');
    e.stopPropagation();
  });

  btnOpenDoc.addEventListener('click', () => { docModal.classList.add('active'); });
  btnOpenAbout.addEventListener('click', () => { aboutModal.classList.add('active'); });
  btnCloseDocModal.addEventListener('click', () => { docModal.classList.remove('active'); });
  btnCloseAboutModal.addEventListener('click', () => { aboutModal.classList.remove('active'); });
  
  document.addEventListener('click', (e) => {
    if (!menuHelp.contains(e.target)) {
      helpDropdown.classList.add('hidden');
    }
    if (!menuView.contains(e.target)) {
      viewDropdown.classList.add('hidden');
    }
  });

  // Tab Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // DOM Elements
  const systemStatusText = document.getElementById('systemStatusText');
  const btnTriggerScan = document.getElementById('btnTriggerScan');
  const btnStartFirstScan = document.getElementById('btnStartFirstScan');
  const btnOpenExport = document.getElementById('btnOpenExport');

  // View States inside Dashboard Tab
  const emptyState = document.getElementById('emptyState');
  const scanningState = document.getElementById('scanningState');
  const resultsState = document.getElementById('resultsState');

  const radarStageTitle = document.getElementById('radarStageTitle');
  const radarProgressBar = document.getElementById('radarProgressBar');
  const radarTickerMessage = document.getElementById('radarTickerMessage');

  // Modals
  const scanModal = document.getElementById('scanModal');
  const btnCloseScanModal = document.getElementById('btnCloseScanModal');
  const btnCancelScan = document.getElementById('btnCancelScan');
  const scanForm = document.getElementById('scanForm');
  const sudoUsernameInput = document.getElementById('sudoUsername');
  const sudoPasswordInput = document.getElementById('sudoPassword');
  const preflightAlertMsg = document.getElementById('preflightAlertMsg');

  // Filters & Search
  const severityFilterSelect = document.getElementById('severityFilterSelect');
  const categoryFilterSelect = document.getElementById('categoryFilterSelect');
  const searchInput = document.getElementById('searchInput');

  function showViewState(state) {
    emptyState.classList.remove('active');
    scanningState.classList.remove('active');
    resultsState.classList.remove('active');

    if (state === 'empty') emptyState.classList.add('active');
    else if (state === 'scanning') scanningState.classList.add('active');
    else if (state === 'results') resultsState.classList.add('active');
  }

  function openScanModal() { scanModal.classList.add('active'); }
  function closeScanModal() { scanModal.classList.remove('active'); }

  btnTriggerScan.addEventListener('click', openScanModal);
  if (btnStartFirstScan) btnStartFirstScan.addEventListener('click', openScanModal);
  btnCloseScanModal.addEventListener('click', closeScanModal);
  btnCancelScan.addEventListener('click', closeScanModal);

  btnOpenExport.addEventListener('click', () => {
    window.open('/api/export/html', '_blank');
  });

  // Initialize Charts
  function initCharts(scorecard) {
    const pieCtx = document.getElementById('severityPieChart').getContext('2d');
    const barCtx = document.getElementById('categoryBarChart').getContext('2d');

    if (pieChart) pieChart.destroy();
    if (barChart) barChart.destroy();

    // Pie Chart Data
    pieChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [
            scorecard.critical_count,
            scorecard.high_count,
            scorecard.medium_count,
            scorecard.low_count
          ],
          backgroundColor: [
            '#d32f2f', '#f57c00', '#fbc02d', '#1976d2'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#333333',
            bodyColor: '#333333',
            borderColor: '#f57c00',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            boxPadding: 4,
            animation: {
              duration: 300
            }
          }
        }
      }
    });

    // Bar Chart Data (Categories)
    const catLabels = [];
    const catScores = [];
    const catColors = [];
    for (const [name, cat] of Object.entries(scorecard.categories)) {
      catLabels.push(name);
      catScores.push(cat.total_issues);
      if (cat.score < 60) catColors.push('#d32f2f');
      else if (cat.score < 85) catColors.push('#f57c00');
      else catColors.push('#388e3c');
    }

    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [{
          label: 'Number of Findings',
          data: catScores,
          backgroundColor: catColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, suggestedMax: 10 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#333333',
            bodyColor: '#333333',
            borderColor: '#f57c00',
            borderWidth: 1,
            padding: 10,
            animation: {
              duration: 300
            }
          }
        }
      }
    });
  }

  function renderScorecard(scorecard) {
    if (!scorecard) return;
    currentScorecard = scorecard;

    document.getElementById('scoreNumber').textContent = scorecard.overall_score;
    document.getElementById('gradeBadge').textContent = `Grade ${scorecard.letter_grade}`;
    
    document.getElementById('hostNameVal').textContent = scorecard.hostname || 'localhost';
    document.getElementById('osNameVal').textContent = scorecard.os_name || 'Linux';
    document.getElementById('kernelVal').textContent = scorecard.os_kernel_version || 'N/A';
    document.getElementById('riskLevelPill').textContent = scorecard.risk_level;
    document.getElementById('metricFirewall').textContent = scorecard.firewall_active ? 'Active' : 'Disabled';

    initCharts(scorecard);
    renderRemediationFeed();
  }

  function renderRemediationFeed() {
    const feed = document.getElementById('remediationFeed');
    feed.innerHTML = '';

    if (!currentScorecard || !currentScorecard.remediation_feed) return;

    const items = currentScorecard.remediation_feed.filter(item => {
      if (activeSeverityFilter !== 'ALL' && item.severity !== activeSeverityFilter) return false;
      if (activeCategoryFilter !== 'ALL' && item.category !== activeCategoryFilter) return false;
      if (activeSearchQuery) {
        const txt = `${item.test_id} ${item.title} ${item.plain_english}`.toLowerCase();
        if (!txt.includes(activeSearchQuery)) return false;
      }
      return true;
    });

    if (items.length === 0) {
      feed.innerHTML = '<div class="empty-message">No findings match the filters.</div>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = `rem-item-card ${item.severity}`;
      card.innerHTML = `
        <div class="rem-header">
          <span class="sev-pill ${item.severity.toLowerCase()}">${item.severity}</span>
          <span>${item.title}</span>
          <span style="margin-left:auto; font-family:var(--font-mono); color:var(--text-muted);">${item.test_id}</span>
        </div>
        <div class="rem-body">
          <p>${item.plain_english}</p>
          <div class="rem-cmd-box">
            <code>${escapeHtml(item.remediation_cmd)}</code>
            <button class="btn btn-copy" data-cmd="${escapeHtml(item.remediation_cmd)}" title="Copy Command">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
      feed.appendChild(card);
    });

    feed.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const cmd = e.currentTarget.getAttribute('data-cmd');
        if (cmd) {
          await navigator.clipboard.writeText(cmd);
          const originalHTML = e.currentTarget.innerHTML;
          e.currentTarget.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(() => e.currentTarget.innerHTML = originalHTML, 2000);
        }
      });
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  severityFilterSelect.addEventListener('change', (e) => {
    activeSeverityFilter = e.target.value;
    renderRemediationFeed();
  });

  categoryFilterSelect.addEventListener('change', (e) => {
    activeCategoryFilter = e.target.value;
    renderRemediationFeed();
  });

  searchInput.addEventListener('input', (e) => {
    activeSearchQuery = e.target.value.toLowerCase().trim();
    renderRemediationFeed();
  });

  // Scan execution
  scanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    closeScanModal();
    
    // Switch to Dashboard tab
    tabBtns[0].click();
    showViewState('scanning');

    updateStepper(0);
    radarStageTitle.textContent = 'Initializing Audit Scan...';
    radarTickerMessage.innerHTML = 'Connecting to Lynis...<br>';

    const payload = {
      username: sudoUsernameInput.value.trim(),
      password: sudoPasswordInput.value
    };

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to trigger scan');
      startProgressStream();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
      if (currentScorecard) showViewState('results');
      else showViewState('empty');
    }
  });

  function updateStepper(percent) {
    const stepIds = ['step1', 'step2', 'step3', 'step4'];
    const lineIds = ['line1', 'line2', 'line3'];
    let currentStep = 1;
    if (percent > 15) currentStep = 2;
    if (percent > 65) currentStep = 3;
    if (percent > 90) currentStep = 4;
  
    stepIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (idx + 1 < currentStep) el.className = 'step completed';
      else if (idx + 1 === currentStep) el.className = 'step active';
      else el.className = 'step';
    });
    
    lineIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (idx + 1 < currentStep) el.className = 'step-line completed';
      else el.className = 'step-line';
    });
  }

  function startProgressStream() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/api/scan/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.stage) radarStageTitle.textContent = data.stage;
        if (typeof data.progress_percent === 'number') {
          updateStepper(data.progress_percent);
        }
        if (data.message) {
          radarTickerMessage.innerHTML += `${data.message}<br>`;
          radarTickerMessage.scrollTop = radarTickerMessage.scrollHeight;
        }

        if (data.is_complete && data.scorecard) {
          eventSource.close();
          renderScorecard(data.scorecard);
          showToast('Audit completed successfully');
          showViewState('results');
          loadHistoryList();
        } else if (data.error) {
          eventSource.close();
          showToast(`Scan error: ${data.error}`, 'error');
          if (currentScorecard) showViewState('results');
          else showViewState('empty');
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };
  }

  // Preflight Check
  async function checkPreflightStatus() {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.is_linux && data.lynis_installed) {
        systemStatusText.textContent = 'Ready (Lynis Detected)';
        preflightAlertMsg.textContent = 'Host is Linux and Lynis is installed.';
      } else {
        systemStatusText.textContent = 'Lynis Missing or Offline';
        preflightAlertMsg.textContent = 'Cannot run live audit. Install Lynis.';
      }
    } catch (err) {
      systemStatusText.textContent = 'Backend Offline';
    }
  }

  // History loader
  async function loadHistoryList() {
    try {
      const res = await fetch('/api/history');
      const records = await res.json();
      const tbody = document.getElementById('historyTableBody');
      tbody.innerHTML = '';
      
      if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No history loaded.</td></tr>';
        return;
      }

      records.forEach(rec => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${rec.timestamp}</td>
          <td>${rec.hostname}</td>
          <td>${rec.os_name}</td>
          <td>${rec.total_findings}</td>
          <td>${rec.overall_score}/100</td>
          <td class="actions-cell">
            <div class="actions-wrapper">
              <button class="btn btn-sm btn-view-hist" data-id="${rec.id}">View</button>
              <button class="btn btn-sm btn-del-hist" data-id="${rec.id}" title="Delete Record" style="background: none; border: none; color: var(--sev-critical); padding: 2px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-view-hist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          try {
            const detRes = await fetch(`/api/history/${id}`);
            const detData = await detRes.json();
            renderScorecard(detData);
            tabBtns[0].click(); // Switch to dashboard
            showViewState('results');
          } catch(err) {
            showToast("Failed to load past audit.", "error");
          }
        });
      });

      tbody.querySelectorAll('.btn-del-hist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (!confirm('Are you sure you want to delete this scan record?')) return;
          const id = e.currentTarget.getAttribute('data-id');
          try {
            const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
            if (res.ok) {
              showToast("Record deleted successfully.");
              loadHistoryList(); // Refresh list
            } else {
              showToast("Failed to delete record.", "error");
            }
          } catch(err) {
            showToast("Failed to delete record.", "error");
          }
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function initialize() {
    await checkPreflightStatus();
    loadHistoryList();

    try {
      const res = await fetch('/api/scan/latest');
      if (res.ok) {
        const data = await res.json();
        if (data && data.overall_score !== undefined) {
          renderScorecard(data);
          showViewState('results');
          return;
        }
      }
    } catch (err) { }

    showViewState('empty');
  }

});
