/**
 * Lynislens Enterprise Suite — Global Spotlight Command Palette (Ctrl+K)
 * Version 2.0.0
 */

(function() {
  let activeFilter = 'ALL';
  let selectedIndex = 0;

  function openCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    const input = document.getElementById('cmdPaletteInput');
    if (!modal) return;

    modal.classList.add('active');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 80);
    }
    renderPaletteResults('');
  }

  function closeCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (modal) modal.classList.remove('active');
  }

  function getPaletteItems(query) {
    const items = [];
    const q = query.trim().toLowerCase();

    // 1. Actions & Modules
    const actions = [
      { id: 'act-audit', title: 'Execute Privileged Security Audit', category: 'ACTIONS', icon: '⚡', action: () => { closeCommandPalette(); window.openScanModal(); } },
      { id: 'act-connect', title: 'Connect & Enroll Remote Linux Node', category: 'ACTIONS', icon: '🔌', action: () => { closeCommandPalette(); window.openServerModal(); } },
      { id: 'act-pdf', title: 'Export Executive Audit Report (PDF)', category: 'ACTIONS', icon: '📄', action: () => { closeCommandPalette(); window.triggerExport('html'); } },
      { id: 'act-dat', title: 'Download Raw Lynis Report File (.dat)', category: 'ACTIONS', icon: '💾', action: () => { closeCommandPalette(); window.triggerExport('raw'); } },
      { id: 'act-doc', title: 'Open Lynis Architecture Documentation', category: 'ACTIONS', icon: '📖', action: () => { closeCommandPalette(); window.openDocModal(); } },
      { id: 'act-pass', title: 'Change Master Access Password', category: 'ACTIONS', icon: '🔒', action: () => { closeCommandPalette(); window.openChangePasswordModal(); } },
      { id: 'nav-dash', title: 'Navigate to Dashboard Overview', category: 'ACTIONS', icon: '📊', action: () => { closeCommandPalette(); window.switchMainTab('tabDashboard'); } },
      { id: 'nav-sys', title: 'Navigate to Agent Inventory', category: 'ACTIONS', icon: '🖥️', action: () => { closeCommandPalette(); window.switchMainTab('tabSystems'); } },
      { id: 'nav-comp', title: 'Navigate to Compliance Matrix', category: 'ACTIONS', icon: '🛡️', action: () => { closeCommandPalette(); window.switchMainTab('tabCompliance'); } },
      { id: 'nav-plan', title: 'Navigate to Improvement Plan', category: 'ACTIONS', icon: '🚀', action: () => { closeCommandPalette(); window.switchMainTab('tabImprovement'); } },
      { id: 'nav-rep', title: 'Navigate to Reporting Hub', category: 'ACTIONS', icon: '📁', action: () => { closeCommandPalette(); window.switchMainTab('tabReporting'); } },
      { id: 'nav-set', title: 'Navigate to Suite Settings', category: 'ACTIONS', icon: '⚙️', action: () => { closeCommandPalette(); window.switchMainTab('tabSettings'); } }
    ];

    actions.forEach(a => {
      if (activeFilter === 'ALL' || activeFilter === 'ACTIONS') {
        if (!q || a.title.toLowerCase().includes(q)) items.push(a);
      }
    });

    // 2. Compliance Frameworks
    const compFws = ['CIS', 'NIST', 'ISO27001', 'PCIDSS', 'HIPAA', 'SOC2'];
    compFws.forEach(fw => {
      if (activeFilter === 'ALL' || activeFilter === 'COMPLIANCE') {
        if (!q || fw.toLowerCase().includes(q) || `compliance ${fw}`.toLowerCase().includes(q)) {
          items.push({
            id: `comp-${fw}`,
            title: `Compliance Framework: ${fw}`,
            category: 'COMPLIANCE',
            icon: '🛡️',
            action: () => {
              closeCommandPalette();
              window.switchMainTab('tabCompliance');
              if (typeof window.renderComplianceDetailView === 'function') {
                window.renderComplianceDetailView(fw);
              }
            }
          });
        }
      }
    });

    // 3. Servers
    (window.LynislensState.serversList || []).forEach(srv => {
      if (activeFilter === 'ALL' || activeFilter === 'SERVERS') {
        const sName = srv.name || srv.host;
        if (!q || sName.toLowerCase().includes(q) || srv.host.toLowerCase().includes(q)) {
          items.push({
            id: `srv-${srv.id}`,
            title: `Server: ${sName} (${srv.host})`,
            category: 'SERVERS',
            icon: '🖥️',
            action: () => {
              closeCommandPalette();
              window.selectTargetServer(srv.id);
            }
          });
        }
      }
    });

    // 4. Findings
    const findings = (window.LynislensState.currentScorecard && window.LynislensState.currentScorecard.remediation_feed) || [];
    findings.forEach(f => {
      if (activeFilter === 'ALL' || activeFilter === 'FINDINGS') {
        const tId = f.test_id || '';
        const tTitle = f.title || '';
        if (!q || tId.toLowerCase().includes(q) || tTitle.toLowerCase().includes(q)) {
          items.push({
            id: `find-${tId}`,
            title: `[${tId}] ${tTitle}`,
            category: 'FINDINGS',
            icon: '⚠️',
            action: () => {
              closeCommandPalette();
              window.switchMainTab('tabDashboard');
              window.switchDashboardSubView('findings');
              const searchInput = document.getElementById('searchInput');
              if (searchInput) {
                searchInput.value = tId;
                searchInput.dispatchEvent(new Event('input'));
              }
            }
          });
        }
      }
    });

    return items;
  }

  function renderPaletteResults(query) {
    const resultsContainer = document.getElementById('cmdPaletteResults');
    if (!resultsContainer) return;

    const items = getPaletteItems(query);
    if (!items.length) {
      resultsContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px;">No matching results for "${window.escapeHtml(query)}"</div>`;
      return;
    }

    selectedIndex = Math.min(Math.max(selectedIndex, 0), items.length - 1);

    resultsContainer.innerHTML = items.map((item, idx) => `
      <div class="cmd-palette-item ${idx === selectedIndex ? 'selected' : ''}" data-item-idx="${idx}">
        <span class="cmd-item-icon">${item.icon}</span>
        <span class="cmd-item-title">${window.escapeHtml(item.title)}</span>
        <span class="cmd-item-badge">${window.escapeHtml(item.category)}</span>
      </div>
    `).join('');

    resultsContainer.querySelectorAll('.cmd-palette-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-item-idx'));
        if (items[idx] && items[idx].action) {
          items[idx].action();
        }
      });
    });
  }

  window.openCommandPalette = openCommandPalette;
  window.closeCommandPalette = closeCommandPalette;

  document.addEventListener('DOMContentLoaded', () => {
    const btnOpenCmdPalette = document.getElementById('btnOpenCmdPalette');
    const btnCloseCmdPalette = document.getElementById('btnCloseCmdPalette');
    const cmdPaletteInput = document.getElementById('cmdPaletteInput');
    const modal = document.getElementById('commandPaletteModal');

    if (btnOpenCmdPalette) btnOpenCmdPalette.addEventListener('click', openCommandPalette);
    if (btnCloseCmdPalette) btnCloseCmdPalette.addEventListener('click', closeCommandPalette);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCommandPalette();
      });
    }

    if (cmdPaletteInput) {
      cmdPaletteInput.addEventListener('input', () => {
        selectedIndex = 0;
        renderPaletteResults(cmdPaletteInput.value);
      });

      cmdPaletteInput.addEventListener('keydown', (e) => {
        const items = getPaletteItems(cmdPaletteInput.value);
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % items.length;
          renderPaletteResults(cmdPaletteInput.value);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          renderPaletteResults(cmdPaletteInput.value);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (items[selectedIndex] && items[selectedIndex].action) {
            items[selectedIndex].action();
          }
        }
      });
    }

    // Category Filter Pills
    const filterPills = document.querySelectorAll('.cmd-filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        activeFilter = pill.getAttribute('data-filter') || 'ALL';
        filterPills.forEach(p => p.classList.toggle('active', p === pill));
        selectedIndex = 0;
        renderPaletteResults(cmdPaletteInput ? cmdPaletteInput.value : '');
      });
    });
  });
})();
