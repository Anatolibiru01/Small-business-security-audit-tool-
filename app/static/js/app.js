/**
 * Lynislens Enterprise Suite — Desktop Controller & Orchestration Hub
 * Version 2.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  let currentScorecard = null;
  let activeSeverityFilter = 'ALL';
  let activeCategoryFilter = 'ALL';
  let activeSearchQuery = '';
  let eventSource = null;

  let serversList = [];
  let currentServerId = null; // null = Local Machine, number = server_id
  let activeEnrollmentToken = null;
  let activeComplianceFramework = 'CIS';

  let pieChart = null;
  let barChart = null;

  // =========================================================================
  // 1. AUTHENTICATION & ENTERPRISE REGISTRATION
  // =========================================================================
  const authOverlay = document.getElementById('authOverlay');
  const authTabBtnLogin = document.getElementById('authTabBtnLogin');
  const authTabBtnRegister = document.getElementById('authTabBtnRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const ownerPasswordInput = document.getElementById('ownerPassword');
  const loginAuditorName = document.getElementById('loginAuditorName');
  const userProfileName = document.getElementById('userProfileName');
  const userProfileRole = document.getElementById('userProfileRole');
  const btnLogout = document.getElementById('btnLogout');
  const btnMenuLogout = document.getElementById('btnMenuLogout');

  function checkAuth() {
    const isAuth = localStorage.getItem('lynislens_owner_auth');
    const profileJson = localStorage.getItem('lynislens_profile');
    
    if (profileJson) {
      try {
        const profile = JSON.parse(profileJson);
        if (userProfileName) userProfileName.textContent = profile.auditorName || 'SecOps Auditor';
        if (userProfileRole) userProfileRole.textContent = profile.role || 'Enterprise Security Lead';
      } catch (e) {}
    }

    if (!isAuth) {
      if (authOverlay) authOverlay.classList.remove('hidden');
    } else {
      if (authOverlay) authOverlay.classList.add('hidden');
      initialize();
    }
  }

  // Auth Tab Toggle (Sign In vs Register)
  if (authTabBtnLogin && authTabBtnRegister) {
    authTabBtnLogin.addEventListener('click', () => {
      authTabBtnLogin.classList.add('active');
      authTabBtnRegister.classList.remove('active');
      if (loginForm) loginForm.classList.add('active');
      if (registerForm) registerForm.classList.remove('active');
    });

    authTabBtnRegister.addEventListener('click', () => {
      authTabBtnRegister.classList.add('active');
      authTabBtnLogin.classList.remove('active');
      if (registerForm) registerForm.classList.add('active');
      if (loginForm) loginForm.classList.remove('active');
    });
  }

  // Sign In Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = ownerPasswordInput ? ownerPasswordInput.value.trim() : '';
      const auditor = loginAuditorName ? loginAuditorName.value.trim() : 'SecOps Auditor';
      
      if (pwd.length > 0) {
        localStorage.setItem('lynislens_owner_auth', 'true');
        const existingProfile = localStorage.getItem('lynislens_profile');
        if (!existingProfile) {
          localStorage.setItem('lynislens_profile', JSON.stringify({
            auditorName: auditor,
            role: 'Enterprise Security Lead',
            company: 'Acme Enterprise Security',
            benchmark: 'CIS Linux Benchmark (Level 2 Server)'
          }));
        }
        if (authOverlay) authOverlay.classList.add('hidden');
        checkAuth();
      } else {
        showToast("Please enter master access password.", "error");
      }
    });
  }

  // Enterprise Registration Form Submit
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const company = document.getElementById('regCompanyName').value.trim();
      const auditor = document.getElementById('regAuditorName').value.trim();
      const role = document.getElementById('regRole').value;
      const benchmark = document.getElementById('regBenchmark').value;
      const pwd = document.getElementById('regPassword').value;

      if (!company || !auditor || !pwd) {
        showToast("Please fill all required registration fields.", "error");
        return;
      }

      localStorage.setItem('lynislens_owner_auth', 'true');
      localStorage.setItem('lynislens_profile', JSON.stringify({
        company, auditorName: auditor, role, benchmark
      }));

      if (authOverlay) authOverlay.classList.add('hidden');
      showToast(`Welcome ${auditor}! Enterprise workspace initialized.`, "success");
      checkAuth();
    });
  }

  function handleLogout() {
    localStorage.removeItem('lynislens_owner_auth');
    if (authOverlay) authOverlay.classList.remove('hidden');
    showToast("Signed out of Lynislens Enterprise.", "info");
  }

  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
  if (btnMenuLogout) btnMenuLogout.addEventListener('click', handleLogout);

  // =========================================================================
  // 2. DESKTOP NAVIGATION & MENUS (Left Hover Drawer, Tab & Arrow Keys)
  // =========================================================================
  const leftHoverTriggerZone = document.getElementById('leftHoverTriggerZone');
  const menuHamburger = document.getElementById('menuHamburger');
  const leftSidebarDrawer = document.getElementById('leftSidebarDrawer');
  const leftDrawerBackdrop = document.getElementById('leftDrawerBackdrop');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const drawerBtnLogout = document.getElementById('drawerBtnLogout');

  const menuView = document.getElementById('menuView');
  const viewDropdown = document.getElementById('viewDropdown');
  const btnTopExportRaw = document.getElementById('btnTopExportRaw');
  const docModal = document.getElementById('docModal');
  const aboutModal = document.getElementById('aboutModal');

  let drawerHoverTimeout = null;

  function openLeftDrawer() {
    clearTimeout(drawerHoverTimeout);
    if (leftSidebarDrawer) leftSidebarDrawer.classList.add('active');
    if (leftDrawerBackdrop) leftDrawerBackdrop.classList.add('active');
  }

  function closeLeftDrawer() {
    clearTimeout(drawerHoverTimeout);
    if (leftSidebarDrawer) leftSidebarDrawer.classList.remove('active');
    if (leftDrawerBackdrop) leftDrawerBackdrop.classList.remove('active');
  }

  function scheduleOpenDrawer() {
    clearTimeout(drawerHoverTimeout);
    openLeftDrawer();
  }

  function scheduleCloseDrawer() {
    clearTimeout(drawerHoverTimeout);
    drawerHoverTimeout = setTimeout(() => {
      closeLeftDrawer();
    }, 280);
  }

  function toggleLeftDrawer() {
    if (!leftSidebarDrawer) return;
    const isOpen = leftSidebarDrawer.classList.contains('active');
    if (isOpen) {
      closeLeftDrawer();
    } else {
      openLeftDrawer();
      focusActiveDrawerItem();
    }
  }

  function focusActiveDrawerItem() {
    if (!leftSidebarDrawer) return;
    const activeItem = leftSidebarDrawer.querySelector('.drawer-item.active') || leftSidebarDrawer.querySelector('.drawer-item');
    if (activeItem) {
      setTimeout(() => activeItem.focus(), 50);
    }
  }

  // Hover Interactions for opening the menu on left side hover
  if (leftHoverTriggerZone) {
    leftHoverTriggerZone.addEventListener('mouseenter', scheduleOpenDrawer);
    leftHoverTriggerZone.addEventListener('mouseleave', scheduleCloseDrawer);
  }

  if (menuHamburger) {
    menuHamburger.addEventListener('mouseenter', scheduleOpenDrawer);
    menuHamburger.addEventListener('mouseleave', scheduleCloseDrawer);
    menuHamburger.addEventListener('click', (e) => {
      toggleLeftDrawer();
      e.stopPropagation();
    });
    // Keyboard navigation on Hamburger Menu button
    menuHamburger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        openLeftDrawer();
        focusActiveDrawerItem();
      }
    });
  }

  if (leftSidebarDrawer) {
    leftSidebarDrawer.addEventListener('mouseenter', () => {
      clearTimeout(drawerHoverTimeout);
    });
    leftSidebarDrawer.addEventListener('mouseleave', scheduleCloseDrawer);
  }

  if (leftDrawerBackdrop) {
    leftDrawerBackdrop.addEventListener('click', closeLeftDrawer);
  }

  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => {
      closeLeftDrawer();
      if (menuHamburger) menuHamburger.focus();
    });
  }

  // Helper to get all focusable items inside the drawer in order
  function getDrawerNavItems() {
    if (!leftSidebarDrawer) return [];
    return Array.from(leftSidebarDrawer.querySelectorAll('.drawer-btn-close, .drawer-item, .btn-drawer-logout'));
  }

  // Arrow Key & Keyboard Navigation inside the Drawer
  if (leftSidebarDrawer) {
    leftSidebarDrawer.addEventListener('keydown', (e) => {
      const items = getDrawerNavItems();
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeLeftDrawer();
        if (menuHamburger) menuHamburger.focus();
      }
    });
  }

  // Drawer Navigation Items with Mouse Click & Keyboard Enter/Space
  const drawerItems = document.querySelectorAll('.drawer-item[data-target-tab]');
  drawerItems.forEach(item => {
    const handleActivate = () => {
      const tabId = item.getAttribute('data-target-tab');
      const subview = item.getAttribute('data-subview');
      drawerItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      switchMainTab(tabId);
      if (subview) {
        switchDashboardSubView(subview);
      }
      closeLeftDrawer();
    };

    item.addEventListener('click', handleActivate);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivate();
      }
    });
  });

  // Drawer Quick Action Buttons
  const drawerBtnNewAudit = document.getElementById('drawerBtnNewAudit');
  const drawerBtnConnectServer = document.getElementById('drawerBtnConnectServer');
  const drawerBtnExportRaw = document.getElementById('drawerBtnExportRaw');
  const drawerBtnExportJson = document.getElementById('drawerBtnExportJson');
  const drawerBtnExportHtml = document.getElementById('drawerBtnExportHtml');
  const drawerBtnDoc = document.getElementById('drawerBtnDoc');
  const drawerBtnAbout = document.getElementById('drawerBtnAbout');

  const actionKeys = [
    { el: drawerBtnNewAudit, fn: () => { openScanModal(); closeLeftDrawer(); } },
    { el: drawerBtnConnectServer, fn: () => { openServerModal(); closeLeftDrawer(); } },
    { el: drawerBtnExportRaw, fn: () => { triggerExport('raw'); closeLeftDrawer(); } },
    { el: drawerBtnExportJson, fn: () => { triggerExport('json'); closeLeftDrawer(); } },
    { el: drawerBtnExportHtml, fn: () => { triggerExport('html'); closeLeftDrawer(); } },
    { el: drawerBtnDoc, fn: () => { if (docModal) docModal.classList.add('active'); closeLeftDrawer(); } },
    { el: drawerBtnAbout, fn: () => { if (aboutModal) aboutModal.classList.add('active'); closeLeftDrawer(); } },
    { el: drawerBtnLogout, fn: () => { handleLogout(); closeLeftDrawer(); } }
  ];

  actionKeys.forEach(action => {
    if (action.el) {
      action.el.addEventListener('click', action.fn);
      action.el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action.fn();
        }
      });
    }
  });

  // View Dropdown & Menu Actions Keyboard Navigation
  function getViewDropdownItems() {
    if (!viewDropdown) return [];
    return Array.from(viewDropdown.querySelectorAll('.dropdown-item'));
  }

  if (menuView && viewDropdown) {
    menuView.addEventListener('click', (e) => {
      viewDropdown.classList.toggle('hidden');
      e.stopPropagation();
    });

    menuView.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        viewDropdown.classList.remove('hidden');
        const items = getViewDropdownItems();
        if (items.length) items[0].focus();
      } else if (e.key === 'Escape') {
        viewDropdown.classList.add('hidden');
      }
    });

    viewDropdown.addEventListener('keydown', (e) => {
      const items = getViewDropdownItems();
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex <= 0) {
          menuView.focus();
        } else {
          items[currentIndex - 1].focus();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        viewDropdown.classList.add('hidden');
        menuView.focus();
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (viewDropdown && !viewDropdown.contains(e.target) && !menuView.contains(e.target)) {
      viewDropdown.classList.add('hidden');
    }
  });

  // Suite Tab Navigation Controller (Driven by Left Sidebar Drawer & Keyboard)
  const tabPanes = document.querySelectorAll('.tab-pane');

  const MODULE_METADATA = {
    'tabDashboard': {
      name: 'Dashboard & Executive Summary',
      desc: 'Real-Time Linux Hardening Intelligence & Security Posture'
    },
    'tabSystems': {
      name: 'Agent Overview & Fleet Assets',
      desc: 'Connected Linux Infrastructure, Outbound Push Nodes & Setup Guide'
    },
    'tabCompliance': {
      name: 'Compliance Framework Matrix',
      desc: 'CIS Linux Benchmarks, NIST CSF v2.0, ISO 27001, PCI-DSS & HIPAA'
    },
    'tabImprovement': {
      name: 'Automated Improvement Plan',
      desc: 'Risk-Ranked Remediation Strategies & Priority 1-Click Fixes'
    },
    'tabReporting': {
      name: 'Reporting Hub & Audit Archives',
      desc: 'Executive Security Posture Exports & Historical Audit Trends'
    },
    'tabSettings': {
      name: 'Suite Settings & Servers',
      desc: 'Agent Enrollment Tokens, Audit Policies & Host Decommissioning'
    }
  };

  function updateActiveModuleStrip(tabId) {
    const meta = MODULE_METADATA[tabId] || MODULE_METADATA['tabDashboard'];
    const nameEl = document.getElementById('currentModuleName');
    const descEl = document.getElementById('currentModuleDesc');

    if (nameEl) nameEl.textContent = meta.name;
    if (descEl) descEl.textContent = meta.desc;
  }

  function switchMainTab(targetTabId) {
    // Sync drawer active indicator
    const allDrawerItems = document.querySelectorAll('.drawer-item[data-target-tab]');
    allDrawerItems.forEach(item => {
      if (item.getAttribute('data-target-tab') === targetTabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === targetTabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    updateActiveModuleStrip(targetTabId);

    if (targetTabId === 'tabSystems') {
      renderSystemsInventoryTable();
    } else if (targetTabId === 'tabSettings') {
      renderSystemsInventoryTable();
    } else if (targetTabId === 'tabCompliance') {
      renderComplianceMatrix();
    } else if (targetTabId === 'tabImprovement') {
      renderImprovementPlan();
    } else if (targetTabId === 'tabReporting') {
      loadHistoryList();
    }
  }

  // View Dropdown Links
  const navMap = {
    'btnNavDashboard': { tab: 'tabDashboard', subview: 'executive' },
    'btnNavFindings': { tab: 'tabDashboard', subview: 'findings' },
    'btnNavSystems': { tab: 'tabSystems' },
    'btnNavCompliance': { tab: 'tabCompliance' },
    'btnNavImprovement': { tab: 'tabImprovement' },
    'btnNavReporting': { tab: 'tabReporting' },
    'btnNavSettings': { tab: 'tabSettings' }
  };

  Object.keys(navMap).forEach(btnId => {
    const el = document.getElementById(btnId);
    if (el) {
      const cfg = navMap[btnId];
      const handler = () => {
        switchMainTab(cfg.tab);
        if (cfg.subview) {
          switchDashboardSubView(cfg.subview);
        }
        if (viewDropdown) viewDropdown.classList.add('hidden');
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    }
  });

  const btnOpenDoc = document.getElementById('btnOpenDoc');
  const btnOpenAbout = document.getElementById('btnOpenAbout');
  const btnCloseDocModal = document.getElementById('btnCloseDocModal');
  const btnCloseAboutModal = document.getElementById('btnCloseAboutModal');

  if (btnOpenDoc && docModal) {
    btnOpenDoc.addEventListener('click', () => { docModal.classList.add('active'); if (viewDropdown) viewDropdown.classList.add('hidden'); });
    btnOpenDoc.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); docModal.classList.add('active'); if (viewDropdown) viewDropdown.classList.add('hidden'); } });
  }
  if (btnOpenAbout && aboutModal) {
    btnOpenAbout.addEventListener('click', () => { aboutModal.classList.add('active'); if (viewDropdown) viewDropdown.classList.add('hidden'); });
    btnOpenAbout.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aboutModal.classList.add('active'); if (viewDropdown) viewDropdown.classList.add('hidden'); } });
  }
  if (btnCloseDocModal && docModal) btnCloseDocModal.addEventListener('click', () => docModal.classList.remove('active'));
  if (btnCloseAboutModal && aboutModal) btnCloseAboutModal.addEventListener('click', () => aboutModal.classList.remove('active'));

  // Dashboard Sub-Views: Executive vs Findings with Arrow Key navigation
  const btnDashSubExecutive = document.getElementById('btnDashSubExecutive');
  const btnDashSubFindings = document.getElementById('btnDashSubFindings');
  const dashExecutiveView = document.getElementById('dashExecutiveView');
  const dashFindingsView = document.getElementById('dashFindingsView');

  function switchDashboardSubView(view) {
    if (view === 'executive') {
      if (btnDashSubExecutive) btnDashSubExecutive.classList.add('active');
      if (btnDashSubFindings) btnDashSubFindings.classList.remove('active');
      if (dashExecutiveView) dashExecutiveView.style.display = 'block';
      if (dashFindingsView) dashFindingsView.style.display = 'none';
    } else if (view === 'findings') {
      if (btnDashSubFindings) btnDashSubFindings.classList.add('active');
      if (btnDashSubExecutive) btnDashSubExecutive.classList.remove('active');
      if (dashExecutiveView) dashExecutiveView.style.display = 'none';
      if (dashFindingsView) dashFindingsView.style.display = 'block';
      renderRemediationFeed();
    }
  }

  if (btnDashSubExecutive && btnDashSubFindings) {
    btnDashSubExecutive.addEventListener('click', () => switchDashboardSubView('executive'));
    btnDashSubFindings.addEventListener('click', () => switchDashboardSubView('findings'));

    btnDashSubExecutive.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        switchDashboardSubView('findings');
        btnDashSubFindings.focus();
      }
    });

    btnDashSubFindings.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        switchDashboardSubView('executive');
        btnDashSubExecutive.focus();
      }
    });
  }

  // Agent Overview Sub-Views: Inventory vs Setup Guide with Arrow Key navigation
  const btnSysSubInventory = document.getElementById('btnSysSubInventory');
  const btnSysSubSetup = document.getElementById('btnSysSubSetup');
  const sysInventoryPane = document.getElementById('sysInventoryPane');
  const sysSetupPane = document.getElementById('sysSetupPane');

  function switchSysSubView(view) {
    if (view === 'inventory') {
      if (btnSysSubInventory) btnSysSubInventory.classList.add('active');
      if (btnSysSubSetup) btnSysSubSetup.classList.remove('active');
      if (sysInventoryPane) sysInventoryPane.style.display = 'block';
      if (sysSetupPane) sysSetupPane.style.display = 'none';
    } else if (view === 'setup') {
      if (btnSysSubSetup) btnSysSubSetup.classList.add('active');
      if (btnSysSubInventory) btnSysSubInventory.classList.remove('active');
      if (sysInventoryPane) sysInventoryPane.style.display = 'none';
      if (sysSetupPane) sysSetupPane.style.display = 'block';
    }
  }

  if (btnSysSubInventory && btnSysSubSetup) {
    btnSysSubInventory.addEventListener('click', () => switchSysSubView('inventory'));
    btnSysSubSetup.addEventListener('click', () => switchSysSubView('setup'));

    btnSysSubInventory.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        switchSysSubView('setup');
        btnSysSubSetup.focus();
      }
    });

    btnSysSubSetup.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        switchSysSubView('inventory');
        btnSysSubInventory.focus();
      }
    });
  }

  // Global Escape Key to close any active overlay / modal / dropdown
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLeftDrawer();
      if (viewDropdown) viewDropdown.classList.add('hidden');
      if (docModal) docModal.classList.remove('active');
      if (aboutModal) aboutModal.classList.remove('active');
      const serverModal = document.getElementById('serverModal');
      const scanModal = document.getElementById('scanModal');
      if (serverModal) serverModal.classList.remove('active');
      if (scanModal) scanModal.classList.remove('active');
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        e.target.blur();
      }
    }
  });

  // =========================================================================
  // 3. TARGET SERVER MANAGEMENT & CONNECTION CONTROLLER
  // =========================================================================
  const targetServerSelect = document.getElementById('targetServerSelect');
  const serverConnectionBadge = document.getElementById('serverConnectionBadge');
  const btnOpenServerModal = document.getElementById('btnOpenServerModal');
  const btnOpenServerModalFromSys = document.getElementById('btnOpenServerModalFromSys');
  const btnMenuConnectServer = document.getElementById('btnMenuConnectServer');
  const btnStartFirstRemote = document.getElementById('btnStartFirstRemote');

  const serverModal = document.getElementById('serverModal');
  const btnCloseServerModal = document.getElementById('btnCloseServerModal');
  const btnCancelServer = document.getElementById('btnCancelServer');
  const tabBtnPush = document.getElementById('tabBtnPush');
  const tabBtnSSH = document.getElementById('tabBtnSSH');
  const modalTabPush = document.getElementById('modalTabPush');
  const modalTabSSH = document.getElementById('modalTabSSH');
  const agentCommandText = document.getElementById('agentCommandText');
  const btnCopyAgentCmd = document.getElementById('btnCopyAgentCmd');
  const btnCopySysCmd = document.getElementById('btnCopySysCmd');
  const sysSetupCommandText = document.getElementById('sysSetupCommandText');
  const btnRefreshTokens = document.getElementById('btnRefreshTokens');
  const btnDoneAgent = document.getElementById('btnDoneAgent');
  const agentListenBox = document.getElementById('agentListenBox');
  const agentListenText = document.getElementById('agentListenText');

  async function loadServers() {
    try {
      const res = await fetch('/api/servers');
      if (!res.ok) return;
      serversList = await res.json();
      populateServerDropdown();
      renderSystemsInventoryTable();
    } catch (err) {
      console.error("Failed to load servers:", err);
    }
  }

  function renderSystemsInventoryTable() {
    const tbody = document.getElementById('systemsInventoryTableBody');
    const badge = document.getElementById('systemsCountBadge');
    if (!tbody) return;

    if (!serversList || serversList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 24px; color:#64748b;">No remote servers enrolled. Click "+ Connect Remote Server" or run installer on your Linux host.</td></tr>';
      if (badge) badge.textContent = '0 Enrolled Servers';
      return;
    }

    if (badge) {
      badge.textContent = `${serversList.length} Enrolled Asset${serversList.length > 1 ? 's' : ''}`;
    }

    tbody.innerHTML = serversList.map(srv => {
      const modeBadge = srv.agent_mode === 'push'
        ? '<span class="badge-status status-connected">Outbound Push (Cron)</span>'
        : '<span class="badge-status" style="background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.3);">SSH Ingress</span>';

      const statusBadge = srv.status === 'online' || srv.status === 'audited'
        ? '<span class="badge-status status-connected">Online</span>'
        : '<span class="badge-status status-failed">Offline / Standby</span>';

      const hardeningDisplay = srv.last_score !== null && srv.last_score !== undefined
        ? `<strong>${srv.last_score}/100</strong> <span class="grade-badge">${srv.last_grade || 'B'}</span>`
        : '<span style="color:#64748b;">Pending First Audit</span>';

      const heartbeat = srv.last_heartbeat || srv.updated_at || 'Enrolled';

      return `
        <tr>
          <td>
            <strong>${srv.name}</strong>
            ${srv.enrollment_token ? `<div style="font-size:10px; font-family:var(--font-mono); color:#ea580c;">Token: ${srv.enrollment_token.substring(0, 15)}...</div>` : ''}
          </td>
          <td><code class="mono-stat">${srv.host}:${srv.port || 22}</code></td>
          <td>${modeBadge}</td>
          <td>${srv.os_name || 'Linux'}</td>
          <td>${statusBadge}</td>
          <td>${hardeningDisplay}</td>
          <td>${srv.last_score !== null ? (100 - srv.last_score > 0 ? (100 - srv.last_score) : 0) + ' items' : '—'}</td>
          <td><span class="mono-stat" style="font-size:11px;">${heartbeat}</span></td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-secondary" style="margin-right: 6px;" onclick="selectAndAuditServer(${srv.id})">Audit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteServerById(${srv.id}, '${srv.name}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    const settingsTbody = document.getElementById('settingsServersTableBody');
    if (settingsTbody) {
      if (!serversList || serversList.length === 0) {
        settingsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 18px; color:#64748b;">No remote servers registered.</td></tr>';
      } else {
        settingsTbody.innerHTML = serversList.map(srv => {
          const modeBadge = srv.agent_mode === 'push'
            ? '<span class="badge-status status-connected">Push Agent (Cron)</span>'
            : '<span class="badge-status">SSH Ingress</span>';
          const statusBadge = srv.status === 'online' || srv.status === 'audited'
            ? '<span class="badge-status status-connected">Online</span>'
            : '<span class="badge-status status-failed">Offline</span>';
          const heartbeat = srv.last_heartbeat || srv.updated_at || 'Enrolled';

          return `
            <tr>
              <td><strong>${srv.name}</strong></td>
              <td><code>${srv.host}</code></td>
              <td>${modeBadge}</td>
              <td>${statusBadge}</td>
              <td><span class="mono-stat" style="font-size:11px;">${heartbeat}</span></td>
              <td style="text-align: right;">
                <button class="btn btn-sm btn-danger" onclick="deleteServerById(${srv.id}, '${srv.name}')">Delete Server</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  window.selectAndAuditServer = function(serverId) {
    if (targetServerSelect) {
      targetServerSelect.value = String(serverId);
      currentServerId = serverId;
      updateCurrentServerBadge();
    }
    switchMainTab('tabDashboard');
    openScanModal();
  };

  window.deleteServerById = async function(serverId, serverName) {
    if (!confirm(`Are you sure you want to remove server "${serverName}" (ID: ${serverId}) from Lynislens Enterprise?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/servers/${serverId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete server');
      }

      showToast(`Server "${serverName}" deleted successfully.`, 'info');
      if (currentServerId === serverId) {
        currentServerId = null;
        if (targetServerSelect) targetServerSelect.value = 'local';
        updateCurrentServerBadge();
      }
      await loadServers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  function populateServerDropdown() {
    if (!targetServerSelect) return;
    targetServerSelect.innerHTML = '';

    const localOpt = document.createElement('option');
    localOpt.value = 'local';
    localOpt.textContent = 'Localhost (Local Machine)';
    targetServerSelect.appendChild(localOpt);

    serversList.forEach(srv => {
      const opt = document.createElement('option');
      opt.value = String(srv.id);
      opt.textContent = `${srv.name} (${srv.host})`;
      targetServerSelect.appendChild(opt);
    });

    if (currentServerId !== null) {
      targetServerSelect.value = String(currentServerId);
    } else {
      targetServerSelect.value = 'local';
    }

    updateCurrentServerBadge();
  }

  const btnDeleteTargetServer = document.getElementById('btnDeleteTargetServer');
  let activeCronInterval = 'daily';

  const agentCronSelect = document.getElementById('agentCronIntervalSelect');
  const sysCronSelect = document.getElementById('sysCronIntervalSelect');
  const settingsCronSelect = document.getElementById('settingsCronIntervalSelect');

  function updateInstallCommand() {
    if (!activeEnrollmentToken) return;
    const origin = window.location.origin;
    const cmd = `curl -sSL ${origin}/install.sh | sudo bash -s -- --token ${activeEnrollmentToken} --server ${origin} --cron ${activeCronInterval}`;
    if (agentCommandText) agentCommandText.textContent = cmd;
    if (sysSetupCommandText) sysSetupCommandText.textContent = cmd;
    const settingsToken = document.getElementById('settingsActiveToken');
    if (settingsToken) settingsToken.value = activeEnrollmentToken;
  }

  function syncCronSelects(val) {
    activeCronInterval = val;
    if (agentCronSelect) agentCronSelect.value = val;
    if (sysCronSelect) sysCronSelect.value = val;
    if (settingsCronSelect) settingsCronSelect.value = val;
    updateInstallCommand();
  }

  if (agentCronSelect) agentCronSelect.addEventListener('change', (e) => syncCronSelects(e.target.value));
  if (sysCronSelect) sysCronSelect.addEventListener('change', (e) => syncCronSelects(e.target.value));
  if (settingsCronSelect) settingsCronSelect.addEventListener('change', (e) => syncCronSelects(e.target.value));

  async function updateCurrentServerBadge() {
    if (!targetServerSelect) return;
    const selectedVal = targetServerSelect.value;
    currentServerId = (selectedVal === 'local' || !selectedVal) ? null : parseInt(selectedVal);

    if (btnDeleteTargetServer) {
      btnDeleteTargetServer.style.display = currentServerId ? 'inline-flex' : 'none';
    }

    if (currentServerId === null) {
      try {
        const res = await fetch('/api/system/status');
        const data = await res.json();
        if (data.is_linux && data.lynis_installed) {
          setConnectionBadge('connected', 'Local Host (Online)');
        } else {
          setConnectionBadge('checking', 'Local Host (Simulation Ready)');
        }
      } catch (err) {
        setConnectionBadge('offline', 'Local Host (Offline)');
      }
      return;
    }

    const srv = serversList.find(s => s.id === currentServerId);
    if (!srv) return;

    if (srv.agent_mode === 'push') {
      setConnectionBadge('connected', `Push Agent (Online)`);
      return;
    }

    setConnectionBadge('checking', 'Connecting...');
    try {
      const res = await fetch(`/api/servers/${srv.id}/test`, { method: 'POST' });
      const testData = await res.json();
      if (testData.connected) {
        setConnectionBadge('connected', `Connected (${testData.latency_ms}ms)`);
      } else {
        setConnectionBadge('failed', 'Offline');
      }
    } catch (err) {
      setConnectionBadge('failed', 'Error Connecting');
    }
  }

  if (btnDeleteTargetServer) {
    btnDeleteTargetServer.addEventListener('click', () => {
      if (!currentServerId) return;
      const srv = serversList.find(s => s.id === currentServerId);
      const name = srv ? srv.name : `Server ID ${currentServerId}`;
      deleteServerById(currentServerId, name);
    });
  }

  function setConnectionBadge(status, text) {
    if (!serverConnectionBadge) return;
    serverConnectionBadge.className = 'badge-status';
    if (status === 'connected') {
      serverConnectionBadge.classList.add('status-connected');
      serverConnectionBadge.textContent = text;
    } else if (status === 'failed' || status === 'offline') {
      serverConnectionBadge.classList.add('status-failed');
      serverConnectionBadge.textContent = text;
    } else {
      serverConnectionBadge.classList.add('status-checking');
      serverConnectionBadge.textContent = text;
    }
  }

  if (targetServerSelect) {
    targetServerSelect.addEventListener('change', () => {
      updateCurrentServerBadge();
      loadLatestScorecardForTarget();
    });
  }

  // Modal Sub-tabs (Push vs SSH)
  function switchServerModalTab(targetTab) {
    if (targetTab === 'push') {
      if (tabBtnPush) tabBtnPush.classList.add('active');
      if (tabBtnSSH) tabBtnSSH.classList.remove('active');
      if (modalTabPush) modalTabPush.classList.add('active');
      if (modalTabSSH) modalTabSSH.classList.remove('active');
    } else {
      if (tabBtnSSH) tabBtnSSH.classList.add('active');
      if (tabBtnPush) tabBtnPush.classList.remove('active');
      if (modalTabSSH) modalTabSSH.classList.add('active');
      if (modalTabPush) modalTabPush.classList.remove('active');
    }
  }

  if (tabBtnPush) tabBtnPush.addEventListener('click', () => switchServerModalTab('push'));
  if (tabBtnSSH) tabBtnSSH.addEventListener('click', () => switchServerModalTab('ssh'));

  async function generateAndDisplayAgentToken() {
    try {
      if (agentListenBox) agentListenBox.classList.remove('connected');
      if (agentListenText) agentListenText.textContent = 'Generating secure enrollment token...';
      if (agentCommandText) agentCommandText.textContent = 'Loading installer command...';

      const res = await fetch('/api/servers/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Remote Linux Server' })
      });

      if (!res.ok) throw new Error('Failed to generate token');
      const data = await res.json();
      activeEnrollmentToken = data.token;

      updateInstallCommand();

      if (agentListenText) agentListenText.textContent = 'Waiting for first audit report from remote host...';
      ensureGlobalEventListener();
    } catch (err) {
      if (agentCommandText) agentCommandText.textContent = `Error: ${err.message}`;
    }
  }

  function openServerModal() {
    switchServerModalTab('push');
    generateAndDisplayAgentToken();
    if (serverModal) serverModal.classList.add('active');
  }

  if (btnOpenServerModal) btnOpenServerModal.addEventListener('click', openServerModal);
  if (btnOpenServerModalFromSys) btnOpenServerModalFromSys.addEventListener('click', openServerModal);
  if (btnMenuConnectServer) btnMenuConnectServer.addEventListener('click', openServerModal);
  if (btnStartFirstRemote) btnStartFirstRemote.addEventListener('click', openServerModal);

  if (btnCloseServerModal && serverModal) btnCloseServerModal.addEventListener('click', () => serverModal.classList.remove('active'));
  if (btnCancelServer && serverModal) btnCancelServer.addEventListener('click', () => serverModal.classList.remove('active'));

  function copyTextToClipboard(text, btnElement, successMsg = 'Command copied to clipboard!') {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (btnElement) {
      const origText = btnElement.textContent;
      btnElement.textContent = '✓ Copied!';
      setTimeout(() => { btnElement.textContent = origText; }, 2000);
    }
    showToast(successMsg, "info");
  }

  if (btnCopyAgentCmd && agentCommandText) {
    btnCopyAgentCmd.addEventListener('click', () => copyTextToClipboard(agentCommandText.textContent, btnCopyAgentCmd));
  }
  if (btnCopySysCmd && sysSetupCommandText) {
    btnCopySysCmd.addEventListener('click', () => copyTextToClipboard(sysSetupCommandText.textContent, btnCopySysCmd));
  }

  if (btnRefreshTokens) {
    btnRefreshTokens.addEventListener('click', () => {
      generateAndDisplayAgentToken();
      showToast('Generated fresh enrollment token.', 'info');
    });
  }

  if (btnDoneAgent && serverModal) {
    btnDoneAgent.addEventListener('click', async () => {
      serverModal.classList.remove('active');
      await loadServers();
    });
  }

  // =========================================================================
  // 4. SCAN EXECUTION & AUDITING ENGINE
  // =========================================================================
  const btnTriggerScan = document.getElementById('btnTriggerScan');
  const btnStartFirstScan = document.getElementById('btnStartFirstScan');
  const btnMenuNewAudit = document.getElementById('btnMenuNewAudit');
  const scanModal = document.getElementById('scanModal');
  const btnCloseScanModal = document.getElementById('btnCloseScanModal');
  const btnCancelScan = document.getElementById('btnCancelScan');
  const scanForm = document.getElementById('scanForm');
  const sudoUsernameInput = document.getElementById('sudoUsername');
  const sudoPasswordInput = document.getElementById('sudoPassword');

  function openScanModal() {
    if (!scanModal) return;
    scanModal.classList.add('active');
  }

  if (btnTriggerScan) btnTriggerScan.addEventListener('click', openScanModal);
  if (btnStartFirstScan) btnStartFirstScan.addEventListener('click', openScanModal);
  if (btnMenuNewAudit) btnMenuNewAudit.addEventListener('click', openScanModal);
  if (btnCloseScanModal) btnCloseScanModal.addEventListener('click', () => scanModal.classList.remove('active'));
  if (btnCancelScan) btnCancelScan.addEventListener('click', () => scanModal.classList.remove('active'));

  if (scanForm) {
    scanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (scanModal) scanModal.classList.remove('active');

      switchMainTab('tabDashboard');
      switchDashboardSubView('executive');
      showViewState('scanning');

      const username = sudoUsernameInput ? sudoUsernameInput.value.trim() : 'root';
      const password = sudoPasswordInput ? sudoPasswordInput.value : '';

      try {
        let res;
        if (currentServerId) {
          res = await fetch(`/api/servers/${currentServerId}/scan`, { method: 'POST' });
        } else {
          res = await fetch('/api/scan/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, simulate: false })
          });
        }

        if (res.status === 409) {
          showToast('An audit scan is already in progress.', 'error');
        } else if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to start scan.');
        } else {
          showToast('Security audit initiated!', 'info');
          connectEventSource();
        }
      } catch (err) {
        showToast(err.message, 'error');
        if (currentScorecard) showViewState('results');
        else showViewState('empty');
      }
    });
  }

  function showViewState(state) {
    const emptyState = document.getElementById('emptyState');
    const scanningState = document.getElementById('scanningState');
    const resultsState = document.getElementById('resultsState');

    if (emptyState) emptyState.className = state === 'empty' ? 'state-container active' : 'state-container';
    if (scanningState) scanningState.className = state === 'scanning' ? 'state-container active' : 'state-container';
    if (resultsState) resultsState.className = state === 'results' ? 'state-container active' : 'state-container';
  }

  // =========================================================================
  // 5. SSE LIVE EVENT SOURCE
  // =========================================================================
  function ensureGlobalEventListener() {
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;
    connectEventSource();
  }

  let lastToastedScanKey = null;

  function connectEventSource() {
    if (eventSource) {
      try { eventSource.close(); } catch (e) {}
    }

    let streamUrl = '/api/scan/stream';
    if (currentServerId) streamUrl += `?server_id=${currentServerId}`;

    eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const radarStageTitle = document.getElementById('radarStageTitle');
        const radarProgressBar = document.getElementById('radarProgressBar');
        const radarTickerMessage = document.getElementById('radarTickerMessage');

        if (radarStageTitle && data.stage) radarStageTitle.textContent = data.stage;
        if (radarProgressBar && data.progress_percent !== undefined) radarProgressBar.style.width = `${data.progress_percent}%`;
        if (radarTickerMessage && data.message) radarTickerMessage.textContent = data.message;

        if (data.scorecard) {
          if (data.is_complete) {
            if (agentListenBox) {
              agentListenBox.classList.add('connected');
              if (agentListenText) {
                agentListenText.innerHTML = `<strong>Agent Connected & Scanned!</strong> Received report from <em>${data.scorecard.hostname}</em> (Score: ${data.scorecard.overall_score}/100)`;
              }
            }

            renderScorecard(data.scorecard);
            showViewState('results');

            const scanKey = `${data.scorecard.hostname}-${data.scorecard.overall_score}-${data.scorecard.scanned_at || data.scorecard.timestamp || ''}`;
            if (lastToastedScanKey !== scanKey) {
              lastToastedScanKey = scanKey;
              showToast(`Audit Complete! Score: ${data.scorecard.overall_score}/100 (${data.scorecard.letter_grade})`, 'success');
            }
            loadServers();
          } else if (!currentScorecard) {
            renderScorecard(data.scorecard);
            showViewState('results');
          }
        } else if (data.error) {
          showToast(`Scan issue: ${data.error}`, 'error');
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };
  }

  // =========================================================================
  // 6. SCORECARD, DOUGHNUT CHART & CATEGORY BREAKDOWN
  // =========================================================================
  function renderScorecard(scorecard) {
    if (!scorecard) return;
    currentScorecard = scorecard;

    // Executive Metrics
    const scoreNum = document.getElementById('scoreNumber');
    if (scoreNum) scoreNum.textContent = scorecard.overall_score;

    const gradeBadge = document.getElementById('gradeBadge');
    if (gradeBadge) {
      gradeBadge.textContent = `Grade ${scorecard.letter_grade}`;
      gradeBadge.style.color = scorecard.overall_score >= 80 ? 'var(--ok-color)' : (scorecard.overall_score >= 60 ? 'var(--med-color)' : 'var(--crit-color)');
    }

    const hostVal = document.getElementById('hostNameVal');
    if (hostVal) hostVal.textContent = scorecard.hostname;

    const hardeningVal = document.getElementById('hardeningIndexVal');
    if (hardeningVal) hardeningVal.textContent = `${scorecard.hardening_index} / 100`;

    const osVal = document.getElementById('osNameVal');
    if (osVal) osVal.textContent = scorecard.os_name;

    const kernelVal = document.getElementById('kernelVal');
    if (kernelVal) kernelVal.textContent = scorecard.kernel;

    const riskPill = document.getElementById('riskLevelPill');
    if (riskPill) {
      riskPill.textContent = scorecard.risk_level;
      riskPill.className = `badge-status ${scorecard.risk_level === 'Low' ? 'status-connected' : 'status-failed'}`;
    }

    const fwVal = document.getElementById('metricFirewall');
    if (fwVal) {
      fwVal.textContent = scorecard.firewall_active ? 'Active (Protected)' : 'Inactive / Disabled';
      fwVal.style.color = scorecard.firewall_active ? 'var(--ok-color)' : 'var(--crit-color)';
    }

    // Counts
    const warnings = scorecard.remediation_feed.filter(f => f.severity === 'Critical' || f.severity === 'High');
    const suggestions = scorecard.remediation_feed.filter(f => f.severity === 'Medium' || f.severity === 'Low');
    
    const warnEl = document.getElementById('metricWarnings');
    if (warnEl) warnEl.textContent = warnings.length;
    const suggEl = document.getElementById('metricSuggestions');
    if (suggEl) suggEl.textContent = suggestions.length;
    const countBadge = document.getElementById('findingsCountBadge');
    if (countBadge) countBadge.textContent = scorecard.remediation_feed.length;

    renderDoughnutChart(scorecard);
    renderCategoryBarChart(scorecard);
    renderRemediationFeed();
    renderComplianceMatrix();
    renderImprovementPlan();
  }

  // Open-Middle Doughnut Chart for Findings Distribution with Standard Color Codes:
  // Red (Critical / High Risk)
  // Yellow / Amber (Medium Risk)
  // Green (Low Risk / Healthy)
  // Blue / Grey (Informational / Not Applicable)
  function renderDoughnutChart(scorecard) {
    const canvas = document.getElementById('severityPieChart');
    if (!canvas) return;

    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
    const feed = scorecard.remediation_feed || scorecard.findings || [];
    feed.forEach(f => {
      const sev = f.severity || 'Low';
      if (counts[sev] !== undefined) counts[sev]++;
      else if (sev === 'Informational' || sev === 'Info') counts.Info++;
      else counts.Low++;
    });

    if (pieChart) {
      try { pieChart.destroy(); } catch (e) {}
    }

    const highAndCrit = counts.Critical + counts.High;
    const med = counts.Medium;
    const low = counts.Low;
    const info = counts.Info;

    // If no findings at all, show 100% healthy green
    const hasData = (highAndCrit + med + low + info) > 0;
    const chartData = hasData ? [highAndCrit, med, low, info] : [0, 0, 1, 0];
    const chartLabels = ['Critical / High Risk', 'Medium Risk', 'Low Risk / Healthy', 'Informational / N/A'];

    pieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { family: 'Inter', size: 11, weight: '600' } }
          }
        }
      }
    });
  }

  // Category Breakdown Bar Chart
  function renderCategoryBarChart(scorecard) {
    const canvas = document.getElementById('categoryBarChart');
    if (!canvas) return;

    const categories = Object.keys(scorecard.categories || {});
    const scores = categories.map(c => scorecard.categories[c].score);

    if (barChart) barChart.destroy();

    barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: categories.map(c => c.length > 18 ? c.substring(0, 16) + '...' : c),
        datasets: [{
          label: 'Hardening Score (%)',
          data: scores,
          backgroundColor: '#ea580c',
          borderRadius: 4,
          barThickness: 16
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // Findings & Remediation Checklist
  const severityFilterSelect = document.getElementById('severityFilterSelect');
  const categoryFilterSelect = document.getElementById('categoryFilterSelect');
  const searchInput = document.getElementById('searchInput');
  const btnResetFindingsFilter = document.getElementById('btnResetFindingsFilter');
  const remediationActiveFilterBadge = document.getElementById('remediationActiveFilterBadge');

  if (severityFilterSelect) {
    severityFilterSelect.addEventListener('change', (e) => {
      activeSeverityFilter = e.target.value;
      renderRemediationFeed();
    });
  }

  if (categoryFilterSelect) {
    categoryFilterSelect.addEventListener('change', (e) => {
      activeCategoryFilter = e.target.value;
      renderRemediationFeed();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeSearchQuery = e.target.value.trim();
      renderRemediationFeed();
    });
  }

  if (btnResetFindingsFilter) {
    btnResetFindingsFilter.addEventListener('click', () => {
      activeSeverityFilter = 'ALL';
      activeCategoryFilter = 'ALL';
      activeSearchQuery = '';
      if (severityFilterSelect) severityFilterSelect.value = 'ALL';
      if (categoryFilterSelect) categoryFilterSelect.value = 'ALL';
      if (searchInput) searchInput.value = '';
      renderRemediationFeed();
      showToast('Findings filter reset.', 'info');
    });
  }

  function renderRemediationFeed() {
    const container = document.getElementById('remediationFeed');
    const countText = document.getElementById('remediationCountText');
    if (!container) return;

    if (!currentScorecard || !currentScorecard.remediation_feed || currentScorecard.remediation_feed.length === 0) {
      container.innerHTML = '<div class="empty-message">No findings loaded. Run an audit or connect an agent first.</div>';
      if (countText) countText.textContent = 'Showing 0 items';
      return;
    }

    const allFeed = currentScorecard.remediation_feed;

    // Update Right Sidebar Quick Breakdown Counts
    const critEl = document.getElementById('filterCritCount');
    const highEl = document.getElementById('filterHighCount');
    const medEl = document.getElementById('filterMedCount');
    const lowEl = document.getElementById('filterLowCount');

    if (critEl) critEl.textContent = allFeed.filter(f => f.severity === 'Critical').length;
    if (highEl) highEl.textContent = allFeed.filter(f => f.severity === 'High').length;
    if (medEl) medEl.textContent = allFeed.filter(f => f.severity === 'Medium').length;
    if (lowEl) lowEl.textContent = allFeed.filter(f => f.severity === 'Low').length;

    let items = [...allFeed];

    const isFiltered = activeSeverityFilter !== 'ALL' || activeCategoryFilter !== 'ALL' || activeSearchQuery.length > 0;
    if (remediationActiveFilterBadge) {
      remediationActiveFilterBadge.style.display = isFiltered ? 'inline-block' : 'none';
    }

    if (activeSeverityFilter !== 'ALL') {
      items = items.filter(i => i.severity.toUpperCase() === activeSeverityFilter.toUpperCase());
    }
    if (activeCategoryFilter !== 'ALL') {
      items = items.filter(i => i.category === activeCategoryFilter);
    }
    if (activeSearchQuery) {
      const q = activeSearchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.test_id.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
    }

    if (countText) countText.textContent = `Showing ${items.length} of ${allFeed.length} tasks`;

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-message">No matching findings for selected filters. Click "Reset" in the filter sidebar to view all.</div>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="roadmap-card">
        <div class="roadmap-card-header">
          <div>
            <span class="mono-stat" style="color:var(--brand-orange); font-size:11px;">[${item.test_id}]</span>
            <strong class="roadmap-title">${item.title}</strong>
          </div>
          <div class="roadmap-badges">
            <span class="badge-priority priority-${item.severity === 'Critical' ? 'p1' : (item.severity === 'High' ? 'p2' : 'p3')}">${item.severity}</span>
          </div>
        </div>
        <div class="roadmap-body">
          <p>${item.description}</p>
          <div class="code-action-box">
            <code>${item.remediation_command || 'sudo lynis audit system'}</code>
            <button type="button" class="btn btn-sm btn-primary" onclick="navigator.clipboard.writeText('${item.remediation_command || ''}'); showToast('Remediation command copied!','info');">Copy Fix</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 7. AGENT OVERVIEW ASSET INVENTORY RENDERER
  // =========================================================================
  function renderSystemsInventoryTable() {
    const tbody = document.getElementById('systemsInventoryTableBody');
    const badge = document.getElementById('systemsCountBadge');
    if (!tbody) return;

    if (badge) badge.textContent = `${serversList.length + 1} Managed Assets`;

    let html = `
      <tr>
        <td><strong>Local Machine</strong></td>
        <td><code>127.0.0.1</code></td>
        <td><span class="badge-status status-connected">Local Engine</span></td>
        <td>Linux / System Native</td>
        <td><span class="badge-status status-connected">● Active</span></td>
        <td><span class="mono-stat font-weight-bold">${currentScorecard ? currentScorecard.hardening_index : '--'}/100</span></td>
        <td>${currentScorecard ? currentScorecard.total_findings : 0} open</td>
        <td>Live</td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-secondary" onclick="document.querySelector('.tab-btn[data-target=tabDashboard]').click();">Inspect</button>
        </td>
      </tr>
    `;

    serversList.forEach(srv => {
      const modeLabel = srv.agent_mode === 'push' ? '🚀 Enterprise Push' : '🔌 Direct SSH';
      const score = srv.last_score ? `${srv.last_score}/100` : 'Pending';
      const time = srv.last_heartbeat || srv.last_scan_at || 'Awaiting Sync';

      html += `
        <tr>
          <td><strong>${srv.name}</strong></td>
          <td><code>${srv.host}</code></td>
          <td>${modeLabel}</td>
          <td>Enterprise Linux</td>
          <td><span class="badge-status status-connected">● Online</span></td>
          <td><span class="mono-stat">${score}</span></td>
          <td>--</td>
          <td>${time}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-primary" onclick="triggerServerInspect(${srv.id})">Inspect</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  window.triggerServerInspect = function(serverId) {
    if (targetServerSelect) {
      targetServerSelect.value = String(serverId);
      targetServerSelect.dispatchEvent(new Event('change'));
    }
    switchMainTab('tabDashboard');
  };

  // =========================================================================
  // 8. COMPLIANCE MATRIX EVALUATION & MULTI-FRAMEWORK PIE CHARTS
  // =========================================================================
  let complianceMiniCharts = {};
  let compDetailChart = null;

  const COMPLIANCE_FRAMEWORKS = {
    CIS: {
      title: "CIS Linux Benchmark (Level 1 & 2 Server)",
      description: "Center for Internet Security (CIS) consensus security guidelines mapping OS configurations, authentication, and logging parameters.",
      references: [
        "SSH Daemon Hardening & Root Login Restrictions (CIS 5.2)",
        "Firewall & Ingress Packet Filtering (CIS 3.5)",
        "Password Complexity & PAM Authentication Rules (CIS 5.4)",
        "System Logging & Syslog Daemon Forensics (CIS 4.2)",
        "Filesystem Mount Options & Integrity (CIS 1.1 / 6.1)"
      ],
      controls: [
        { id: "CIS-3.5", name: "Packet Filtering Firewall Enforcement", check: "FIRE-4512", cat: "Network & Perimeter" },
        { id: "CIS-5.2", name: "SSH Daemon Root Login Disabled", check: "SSH-001", cat: "Access Control" },
        { id: "CIS-5.4", name: "Password Quality & PAM Complexity Rules", check: "AUTH-002", cat: "Authentication" },
        { id: "CIS-4.2", name: "Syslog & Audit Daemon Active", check: "LOGG-2190", cat: "Logging & Forensics" },
        { id: "CIS-1.7", name: "Legal Login Banner Configured", check: "BANN-7126", cat: "Warning Banners" },
        { id: "CIS-1.1", name: "Secure Mount Options for Temporary Storage", check: "FILE-7524", cat: "System Hardening" },
        { id: "CIS-6.1", name: "System File Permissions & Integrity Validation", check: "FILE-7502", cat: "Integrity" }
      ]
    },
    NIST: {
      title: "NIST Cybersecurity Framework (CSF v2.0)",
      description: "National Institute of Standards and Technology Framework for Improving Critical Infrastructure Cybersecurity across Protect, Detect, and Respond functions.",
      references: [
        "PR.AC-1: Identity Management, Authentication and Access Control",
        "PR.PT-4: Network Protection & Ingress / Egress Filtering",
        "DE.AE-3: Event & Audit Log Analysis and Anomaly Detection",
        "PR.IP-1: Baseline Configuration & System Hardening Safeguards"
      ],
      controls: [
        { id: "PR.AC-1", name: "Identity & Credential Management", check: "AUTH-002", cat: "Protect (Identity)" },
        { id: "PR.AC-3", name: "Remote Access Management & Authentication", check: "SSH-001", cat: "Protect (Access)" },
        { id: "PR.PT-4", name: "Network Protection & Ingress Filtering", check: "FIRE-4512", cat: "Protect (Network)" },
        { id: "PR.IP-1", name: "Baseline Configuration & Hardening", check: "FILE-7524", cat: "Protect (Config)" },
        { id: "DE.AE-3", name: "Event & Audit Log Analysis", check: "LOGG-2190", cat: "Detect (Logging)" },
        { id: "PR.DS-1", name: "Data-at-Rest & Integrity Protection", check: "FILE-7502", cat: "Protect (Data)" }
      ]
    },
    ISO27001: {
      title: "ISO/IEC 27001:2022 ISMS Controls (Annex A)",
      description: "International standard for Information Security Management Systems specifying technological and operational security safeguards.",
      references: [
        "A.8.20: Network Security Controls & Perimeter Filtering",
        "A.8.5: Secure Authentication Management & Credential Policies",
        "A.8.24: Use of Cryptography & Remote Access Protocols",
        "A.8.15: Logging & Monitoring Activities"
      ],
      controls: [
        { id: "A.8.20", name: "Network Security & Perimeter Control", check: "FIRE-4512", cat: "Technological" },
        { id: "A.8.5", name: "Secure Authentication Management", check: "AUTH-002", cat: "Access Control" },
        { id: "A.8.24", name: "Use of Cryptography & Key Management", check: "SSH-001", cat: "Cryptography" },
        { id: "A.8.15", name: "Logging & Monitoring Activities", check: "LOGG-2190", cat: "Operations" },
        { id: "A.8.9", name: "Configuration Management Baseline", check: "FILE-7524", cat: "Hardening" },
        { id: "A.8.19", name: "Installation of Software on Operational Systems", check: "FILE-7502", cat: "Integrity" }
      ]
    },
    PCIDSS: {
      title: "PCI-DSS v4.0 Payment Card Security Standard",
      description: "Payment Card Industry Data Security Standard protecting cardholder data environments and supporting infrastructure.",
      references: [
        "Req 1.2: Network Security Controls & Firewall Rules",
        "Req 2.2: System Components Hardening Standard",
        "Req 8.3: Strong Authentication & Password Rules",
        "Req 10.2: Audit Logs & System Monitoring Integrity"
      ],
      controls: [
        { id: "Req 1.2", name: "Network Security Controls & Firewalls", check: "FIRE-4512", cat: "Perimeter Security" },
        { id: "Req 2.2", name: "System Components Hardening Standard", check: "FILE-7524", cat: "Hardening" },
        { id: "Req 8.3", name: "Strong Authentication & Password Rules", check: "AUTH-002", cat: "Identity" },
        { id: "Req 8.4", name: "Multi-Factor & Remote Administrative Access", check: "SSH-001", cat: "Access Control" },
        { id: "Req 10.2", name: "Audit Logs & System Monitoring Integrity", check: "LOGG-2190", cat: "Logging" },
        { id: "Req 11.5", name: "Change-Detection Mechanism & File Integrity", check: "FILE-7502", cat: "Integrity" }
      ]
    },
    HIPAA: {
      title: "HIPAA Security Rule Standards (§ 164.312)",
      description: "Health Insurance Portability and Accountability Act Technical Safeguards for protecting electronic protected health information (ePHI).",
      references: [
        "164.312(a): Access Control & Unique User IDs",
        "164.312(b): Audit Controls & Mechanism Verification",
        "164.312(c): Data Integrity & Protection Controls",
        "164.312(e): Transmission Security & Network Filtering"
      ],
      controls: [
        { id: "164.312(a)", name: "Access Control & Unique User Identifiers", check: "SSH-001", cat: "Technical Access" },
        { id: "164.312(b)", name: "Audit Controls & Forensic Logging", check: "LOGG-2190", cat: "Audit & Logs" },
        { id: "164.312(c)", name: "Data Integrity & File System Protection", check: "FILE-7502", cat: "Integrity" },
        { id: "164.312(d)", name: "Person or Entity Authentication Verification", check: "AUTH-002", cat: "Authentication" },
        { id: "164.312(e)", name: "Transmission Security & Network Filtering", check: "FIRE-4512", cat: "Transmission" }
      ]
    },
    SOC2: {
      title: "SOC 2 Type II Security Baseline (Trust Services)",
      description: "AICPA Trust Services Criteria evaluating operational security, access controls, network segregation, and system integrity.",
      references: [
        "CC6.1: Logical Access & Security Perimeter Filtering",
        "CC6.2: User Registration & Access Authentication",
        "CC6.3: Revocation & Privileged Access Control",
        "CC7.2: System Monitoring & Anomaly Detection"
      ],
      controls: [
        { id: "CC6.1", name: "Logical Access & Perimeter Firewall Filtering", check: "FIRE-4512", cat: "Security Perimeter" },
        { id: "CC6.2", name: "User Registration & Authentication Policies", check: "AUTH-002", cat: "Identity" },
        { id: "CC6.3", name: "Privileged Access Management & Root Control", check: "SSH-001", cat: "Access Control" },
        { id: "CC7.2", name: "System Monitoring & Security Event Detection", check: "LOGG-2190", cat: "Monitoring" },
        { id: "CC7.3", name: "Baseline Configuration & Patch Integrity", check: "FILE-7524", cat: "Hardening" },
        { id: "CC8.1", name: "Change Management & File Integrity Verification", check: "FILE-7502", cat: "Change Control" }
      ]
    }
  };

  function selectComplianceFramework(fwKey) {
    if (!COMPLIANCE_FRAMEWORKS[fwKey]) return;
    activeComplianceFramework = fwKey;

    // Update Subnav buttons
    document.querySelectorAll('#tabCompliance .subnav-btn[data-framework]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-framework') === fwKey);
    });

    // Update Framework Cards
    document.querySelectorAll('.compliance-card[data-framework]').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-framework') === fwKey);
    });

    renderComplianceMatrix();
  }

  // Setup click & keyboard triggers on framework buttons & cards
  function initComplianceNavigation() {
    document.querySelectorAll('[data-framework]').forEach(elem => {
      elem.addEventListener('click', () => {
        const fw = elem.getAttribute('data-framework');
        selectComplianceFramework(fw);
      });
      elem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const fw = elem.getAttribute('data-framework');
          selectComplianceFramework(fw);
        }
      });
    });
  }
  initComplianceNavigation();

  function evaluateFrameworkControls(framework) {
    const findings = (currentScorecard && currentScorecard.remediation_feed) ? currentScorecard.remediation_feed : [];
    
    let redCount = 0;    // Critical / High Risk
    let yellowCount = 0; // Medium Risk / Review
    let greenCount = 0;  // Low Risk / Healthy / Compliant
    let blueCount = 0;   // Informational / N/A

    const evaluatedControls = framework.controls.map(ctrl => {
      // Find matching findings
      const matched = findings.filter(f => {
        if (!f.test_id) return false;
        return ctrl.check.includes(f.test_id) || f.test_id.includes(ctrl.check);
      });

      let status = 'passed'; // default green
      let badgeHtml = '<span class="badge-status status-connected">Compliant</span>';

      if (matched.length > 0) {
        const hasCritHigh = matched.some(m => m.severity === 'Critical' || m.severity === 'High');
        const hasMedium = matched.some(m => m.severity === 'Medium');
        const hasLowInfo = matched.some(m => m.severity === 'Low' || m.severity === 'Informational' || m.severity === 'Info');

        if (hasCritHigh) {
          status = 'failed';
          redCount++;
          badgeHtml = '<span class="badge-status status-failed">Non-Compliant</span>';
        } else if (hasMedium) {
          status = 'warning';
          yellowCount++;
          badgeHtml = '<span class="badge-status status-warning">Review Needed</span>';
        } else if (hasLowInfo) {
          status = 'info';
          blueCount++;
          badgeHtml = '<span class="badge-status status-info">Informational</span>';
        } else {
          greenCount++;
        }
      } else {
        greenCount++;
      }

      return {
        ...ctrl,
        status,
        badgeHtml,
        matchedCount: matched.length
      };
    });

    const total = framework.controls.length;
    const scorePct = total > 0 ? Math.round((greenCount / total) * 100) : 100;

    return {
      evaluatedControls,
      redCount,
      yellowCount,
      greenCount,
      blueCount,
      total,
      scorePct
    };
  }

  function renderComplianceMatrix() {
    // 1. Render all 6 Mini Framework Cards & their respective Pie Charts
    Object.keys(COMPLIANCE_FRAMEWORKS).forEach(fwKey => {
      const fw = COMPLIANCE_FRAMEWORKS[fwKey];
      const res = evaluateFrameworkControls(fw);

      // Update Card Header & Percentage
      const pctEl = document.getElementById(`compCardScore_${fwKey}`);
      if (pctEl) pctEl.textContent = `${res.scorePct}%`;

      const passedEl = document.getElementById(`compPassed_${fwKey}`);
      if (passedEl) passedEl.textContent = `${res.greenCount} Pass`;

      const failedEl = document.getElementById(`compFailed_${fwKey}`);
      if (failedEl) failedEl.textContent = `${res.redCount} Fail`;

      // Render Mini Doughnut Pie Chart
      const miniCanvas = document.getElementById(`chartComp_${fwKey}`);
      if (miniCanvas) {
        if (complianceMiniCharts[fwKey]) {
          try { complianceMiniCharts[fwKey].destroy(); } catch (e) {}
        }

        const chartData = [res.redCount, res.yellowCount, res.greenCount, res.blueCount];
        // If all 0, default to 100% green
        const hasData = (res.redCount + res.yellowCount + res.greenCount + res.blueCount) > 0;
        const finalData = hasData ? chartData : [0, 0, 1, 0];

        complianceMiniCharts[fwKey] = new Chart(miniCanvas, {
          type: 'doughnut',
          data: {
            labels: ['Critical / High Risk', 'Medium Risk', 'Low / Compliant', 'Informational / NA'],
            datasets: [{
              data: finalData,
              backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
              borderWidth: 1.5,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: false,
            cutout: '65%',
            animation: { duration: 300 },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: true,
                callbacks: {
                  label: function(ctx) {
                    const labels = ['Critical / High Risk', 'Medium Risk', 'Low Risk / Healthy', 'Informational / N/A'];
                    return ` ${labels[ctx.dataIndex]}: ${ctx.raw}`;
                  }
                }
              }
            }
          }
        });
      }
    });

    // 2. Render Deep-Dive Details for the Active Selected Framework
    const activeFw = COMPLIANCE_FRAMEWORKS[activeComplianceFramework] || COMPLIANCE_FRAMEWORKS.CIS;
    const activeRes = evaluateFrameworkControls(activeFw);

    const titleEl = document.getElementById('complianceFrameworkTitle');
    const descEl = document.getElementById('compFrameworkDesc');
    const refList = document.getElementById('compReferenceList');
    const tbody = document.getElementById('complianceTableBody');
    const scoreEl = document.getElementById('complianceScoreNum');
    const passedControlsEl = document.getElementById('compPassedControls');
    const partialControlsEl = document.getElementById('compPartialControls');
    const failedControlsEl = document.getElementById('compFailedControls');
    const infoControlsEl = document.getElementById('compInfoControls');

    if (titleEl) titleEl.textContent = activeFw.title;
    if (descEl) descEl.innerHTML = activeFw.description;
    
    if (refList && activeFw.references) {
      refList.innerHTML = activeFw.references.map(ref => `<li>${ref}</li>`).join('');
    }

    if (scoreEl) scoreEl.textContent = `${activeRes.scorePct}%`;
    if (passedControlsEl) passedControlsEl.textContent = `${activeRes.greenCount} passed`;
    if (partialControlsEl) partialControlsEl.textContent = `${activeRes.yellowCount} review`;
    if (failedControlsEl) failedControlsEl.textContent = `${activeRes.redCount} failed`;
    if (infoControlsEl) infoControlsEl.textContent = `${activeRes.blueCount} info`;

    // 3. Render Large Interactive Detail Doughnut / Pie Chart
    const detailCanvas = document.getElementById('compDetailPieChart');
    if (detailCanvas) {
      if (compDetailChart) {
        try { compDetailChart.destroy(); } catch (e) {}
      }

      const detailData = [activeRes.redCount, activeRes.yellowCount, activeRes.greenCount, activeRes.blueCount];
      const hasDetailData = (activeRes.redCount + activeRes.yellowCount + activeRes.greenCount + activeRes.blueCount) > 0;
      const finalDetailData = hasDetailData ? detailData : [0, 0, 1, 0];

      compDetailChart = new Chart(detailCanvas, {
        type: 'doughnut',
        data: {
          labels: [
            'Red: Critical / High Risk (Failed)',
            'Yellow: Medium Risk (Review Needed)',
            'Green: Low Risk / Healthy (Compliant)',
            'Blue: Informational / Not Applicable'
          ],
          datasets: [{
            data: finalDetailData,
            backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return ` ${ctx.label}: ${ctx.raw} controls`;
                }
              }
            }
          }
        }
      });
    }

    // 4. Render Table Rows with Standard Color Badges
    if (tbody) {
      tbody.innerHTML = activeRes.evaluatedControls.map(ctrl => `
        <tr>
          <td><strong class="mono-stat" style="color:var(--brand-orange);">${ctrl.id}</strong></td>
          <td><strong>${ctrl.name}</strong></td>
          <td><code>${ctrl.check}</code></td>
          <td>${ctrl.cat}</td>
          <td>${ctrl.badgeHtml}</td>
        </tr>
      `).join('');
    }
  }

  // =========================================================================
  // 9. AUTOMATED IMPROVEMENT PLAN STRATEGY GENERATOR
  // =========================================================================
  function renderImprovementPlan() {
    const container = document.getElementById('improvementPlanContainer');
    if (!container) return;

    if (!currentScorecard || !currentScorecard.remediation_feed || currentScorecard.remediation_feed.length === 0) {
      container.innerHTML = '<div class="empty-message">No findings loaded. Execute an audit to generate a prioritized strategic roadmap.</div>';
      return;
    }

    const feed = [...currentScorecard.remediation_feed];
    // Sort critical first
    const sevOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    feed.sort((a, b) => (sevOrder[a.severity] || 4) - (sevOrder[b.severity] || 4));

    container.innerHTML = feed.slice(0, 10).map((item, idx) => {
      const pLevel = item.severity === 'Critical' ? 'P1 — Immediate' : (item.severity === 'High' ? 'P2 — High ROI' : 'P3 — Routine Hardening');
      const pClass = item.severity === 'Critical' ? 'p1' : (item.severity === 'High' ? 'p2' : 'p3');

      return `
        <div class="roadmap-card">
          <div class="roadmap-card-header">
            <div>
              <span class="mono-stat" style="color:var(--brand-orange); font-size:11px;">#${idx + 1} Strategy Target [${item.test_id}]</span>
              <div class="roadmap-title" style="margin-top:2px;">${item.title}</div>
            </div>
            <div class="roadmap-badges">
              <span class="badge-priority priority-${pClass}">${pLevel}</span>
            </div>
          </div>
          <div class="roadmap-body">
            <div class="roadmap-strategic-reason">
              <strong>Strategic Value:</strong> ${item.description}
            </div>
            <div class="code-action-box">
              <code>${item.remediation_command || 'sudo lynis audit system'}</code>
              <button type="button" class="btn btn-sm btn-primary" onclick="navigator.clipboard.writeText('${item.remediation_command || ''}'); showToast('Command copied!','info');">Copy Fix</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 10. REPORTING & EXPORT CENTER
  // =========================================================================
  const btnOpenExport = document.getElementById('btnOpenExport');
  const btnReportExportHtml = document.getElementById('btnReportExportHtml');
  const btnReportExportRaw = document.getElementById('btnReportExportRaw');
  const btnReportExportJson = document.getElementById('btnReportExportJson');
  const btnMenuExportRaw = document.getElementById('btnMenuExportRaw');
  const btnMenuExportJson = document.getElementById('btnMenuExportJson');
  const btnMenuExportHtml = document.getElementById('btnMenuExportHtml');

  function triggerExport(type) {
    let url = `/api/export/${type}`;
    if (currentServerId) url += `?server_id=${currentServerId}`;
    window.open(url, '_blank');
  }

  if (btnOpenExport) btnOpenExport.addEventListener('click', () => triggerExport('html'));
  if (btnReportExportHtml) btnReportExportHtml.addEventListener('click', () => triggerExport('html'));
  if (btnMenuExportHtml) btnMenuExportHtml.addEventListener('click', () => triggerExport('html'));

  if (btnTopExportRaw) btnTopExportRaw.addEventListener('click', () => triggerExport('raw'));
  if (btnReportExportRaw) btnReportExportRaw.addEventListener('click', () => triggerExport('raw'));
  if (btnMenuExportRaw) btnMenuExportRaw.addEventListener('click', () => triggerExport('raw'));

  if (btnReportExportJson) btnReportExportJson.addEventListener('click', () => triggerExport('json'));
  if (btnMenuExportJson) btnMenuExportJson.addEventListener('click', () => triggerExport('json'));

  async function loadHistoryList() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    try {
      let url = '/api/history';
      if (currentServerId) url += `?server_id=${currentServerId}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No historical audits recorded.</td></tr>';
        return;
      }

      tbody.innerHTML = data.map(rec => `
        <tr>
          <td><span class="mono-stat">${rec.scan_timestamp}</span></td>
          <td><strong>${rec.hostname}</strong></td>
          <td>${rec.server_name || 'Local Machine'}</td>
          <td>${rec.total_findings} findings</td>
          <td><strong>${rec.overall_score}/100</strong></td>
          <td><span class="grade-badge">${rec.letter_grade}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-secondary" onclick="window.open('/api/export/html?scan_id=${rec.id}', '_blank')">Report</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // =========================================================================
  // 11. SETTINGS CONTROLLER
  // =========================================================================
  const btnSettingsRefreshToken = document.getElementById('btnSettingsRefreshToken');
  const btnSettingsCopyCmd = document.getElementById('btnSettingsCopyCmd');
  const btnSettingsSaveProfile = document.getElementById('btnSettingsSaveProfile');

  if (btnSettingsRefreshToken) {
    btnSettingsRefreshToken.addEventListener('click', () => {
      generateAndDisplayAgentToken();
      showToast("Generated new enrollment token.", "info");
    });
  }

  if (btnSettingsCopyCmd) {
    btnSettingsCopyCmd.addEventListener('click', () => {
      const origin = window.location.origin;
      const cmd = `curl -sSL ${origin}/install.sh | sudo bash -s -- --token ${activeEnrollmentToken || 'LL-TOKEN'} --server ${origin}`;
      copyTextToClipboard(cmd, btnSettingsCopyCmd);
    });
  }

  if (btnSettingsSaveProfile) {
    btnSettingsSaveProfile.addEventListener('click', () => {
      const org = document.getElementById('settingsOrgName').value;
      const auditor = document.getElementById('settingsAuditorName').value;
      localStorage.setItem('lynislens_profile', JSON.stringify({
        company: org, auditorName: auditor, role: 'Enterprise Security Lead'
      }));
      checkAuth();
      showToast("Auditor profile updated successfully.", "success");
    });
  }

  // =========================================================================
  // 12. INITIALIZATION
  // =========================================================================
  async function loadLatestScorecardForTarget() {
    try {
      let url = '/api/scan/latest';
      if (currentServerId) url = `/api/servers/${currentServerId}/latest`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.overall_score !== undefined) {
          renderScorecard(data);
          showViewState('results');
          return;
        }
      }
    } catch (err) {}

    showViewState('empty');
  }

  async function initialize() {
    await loadServers();
    await updateCurrentServerBadge();
    await generateAndDisplayAgentToken();
    loadLatestScorecardForTarget();
    loadHistoryList();
    ensureGlobalEventListener();
  }

  // Toast Notification Helper
  window.showToast = function(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') toast.style.borderLeftColor = '#e11d48';
    else if (type === 'info') toast.style.borderLeftColor = '#0284c7';
    
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  checkAuth();
});
