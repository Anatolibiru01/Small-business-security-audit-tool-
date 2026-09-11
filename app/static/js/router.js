/**
 * Lynislens Enterprise Suite — Multi-Route Navigation & Drawer Controller
 * Version 2.0.0
 */

(function() {
  const TAB_META = {
    'tabDashboard': {
      title: 'Dashboard & Executive Summary',
      desc: 'Real-Time Linux Hardening Intelligence & Security Posture',
      path: '/dashboard'
    },
    'tabSystems': {
      title: 'Agent Overview & Fleet Assets',
      desc: 'Centralized Host Inventory & 1-Line Curl Outbound Setup',
      path: '/systems'
    },
    'tabCompliance': {
      title: 'Regulatory Compliance Matrix',
      desc: 'Automated CIS Benchmark, NIST CSF, ISO 27001 & PCI-DSS Verification',
      path: '/compliance'
    },
    'tabImprovement': {
      title: 'Automated Improvement Plan',
      desc: 'Prioritized Remediation Roadmap & 1-Click Hardening Playbooks',
      path: '/improvement'
    },
    'tabReporting': {
      title: 'Executive & Technical Report Center',
      desc: 'Comprehensive PDF Export, Raw .dat Archive & Historical Audit Log',
      path: '/reporting'
    },
    'tabSettings': {
      title: 'Enterprise Suite Settings',
      desc: 'Enrollment Tokens, Auditor Profile, SecOps Webhooks & Fleet Access',
      path: '/settings'
    }
  };

  let drawerHoverTimeout = null;

  function openLeftDrawer() {
    clearTimeout(drawerHoverTimeout);
    const leftSidebarDrawer = document.getElementById('leftSidebarDrawer');
    const leftDrawerBackdrop = document.getElementById('leftDrawerBackdrop');
    if (leftSidebarDrawer) leftSidebarDrawer.classList.add('active');
    if (leftDrawerBackdrop) leftDrawerBackdrop.classList.add('active');
  }

  function closeLeftDrawer() {
    clearTimeout(drawerHoverTimeout);
    const leftSidebarDrawer = document.getElementById('leftSidebarDrawer');
    const leftDrawerBackdrop = document.getElementById('leftDrawerBackdrop');
    if (leftSidebarDrawer) leftSidebarDrawer.classList.remove('active');
    if (leftDrawerBackdrop) leftDrawerBackdrop.classList.remove('active');
  }

  function toggleLeftDrawer() {
    const leftSidebarDrawer = document.getElementById('leftSidebarDrawer');
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
    const leftSidebarDrawer = document.getElementById('leftSidebarDrawer');
    if (!leftSidebarDrawer) return;
    const activeItem = leftSidebarDrawer.querySelector('.drawer-item.active') || leftSidebarDrawer.querySelector('.drawer-item');
    if (activeItem) {
      setTimeout(() => activeItem.focus(), 50);
    }
  }

  function updateBreadcrumb(tabId) {
    const meta = TAB_META[tabId] || { title: 'Suite Module', desc: 'Lynislens Enterprise Platform' };
    const currentModuleName = document.getElementById('currentModuleName');
    const currentModuleDesc = document.getElementById('currentModuleDesc');
    if (currentModuleName) currentModuleName.textContent = meta.title;
    if (currentModuleDesc) currentModuleDesc.textContent = meta.desc;
  }

  function switchMainTab(tabId, pushHistory = true) {
    // Hide all tab panes
    const allPanes = document.querySelectorAll('.tab-pane');
    allPanes.forEach(pane => pane.classList.remove('active'));

    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    // Update Drawer Active states
    const allDrawerItems = document.querySelectorAll('.drawer-item[data-target-tab]');
    allDrawerItems.forEach(item => {
      if (item.getAttribute('data-target-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    updateBreadcrumb(tabId);

    // Synchronize HTML5 History
    const meta = TAB_META[tabId];
    if (pushHistory && meta && window.history && window.history.pushState) {
      const url = meta.path;
      if (window.location.pathname !== url) {
        window.history.pushState({ tabId: tabId }, meta.title, url);
      }
    }

    // Tab-specific trigger updates
    if (tabId === 'tabDashboard') {
      if (window.LynislensState && window.LynislensState.currentScorecard) {
        if (typeof window.updateDashboardView === 'function') {
          window.updateDashboardView(window.LynislensState.currentScorecard);
        }
        if (typeof window.renderFindingsFeed === 'function') {
          window.renderFindingsFeed(window.LynislensState.currentScorecard);
        }
      }
    } else if (tabId === 'tabSystems' && typeof window.renderSystemsTab === 'function') {
      window.renderSystemsTab();
    } else if (tabId === 'tabCompliance' && typeof window.renderComplianceTab === 'function') {
      window.renderComplianceTab();
    } else if (tabId === 'tabImprovement' && typeof window.renderImprovementTab === 'function') {
      window.renderImprovementTab();
    } else if (tabId === 'tabReporting' && typeof window.renderReportingTab === 'function') {
      window.renderReportingTab();
    } else if (tabId === 'tabSettings' && typeof window.renderSettingsTab === 'function') {
      window.renderSettingsTab();
    }
  }

  function switchDashboardSubView(subview) {
    const btnExecutive = document.getElementById('btnDashSubExecutive');
    const btnFindings = document.getElementById('btnDashSubFindings');
    const viewExecutive = document.getElementById('dashExecutiveView');
    const viewFindings = document.getElementById('dashFindingsView');

    if (subview === 'findings') {
      if (btnFindings) btnFindings.classList.add('active');
      if (btnExecutive) btnExecutive.classList.remove('active');
      if (viewExecutive) viewExecutive.style.display = 'none';
      if (viewFindings) viewFindings.style.display = 'block';
      if (window.LynislensState && window.LynislensState.currentScorecard && typeof window.renderFindingsFeed === 'function') {
        window.renderFindingsFeed(window.LynislensState.currentScorecard);
      }
    } else {
      if (btnExecutive) btnExecutive.classList.add('active');
      if (btnFindings) btnFindings.classList.remove('active');
      if (viewExecutive) viewExecutive.style.display = 'block';
      if (viewFindings) viewFindings.style.display = 'none';
      if (window.LynislensState && window.LynislensState.currentScorecard && typeof window.updateDashboardView === 'function') {
        window.updateDashboardView(window.LynislensState.currentScorecard);
      }
    }
  }

  window.openLeftDrawer = openLeftDrawer;
  window.closeLeftDrawer = closeLeftDrawer;
  window.toggleLeftDrawer = toggleLeftDrawer;
  window.switchMainTab = switchMainTab;
  window.switchDashboardSubView = switchDashboardSubView;

  // Handle browser popstate (Back / Forward buttons)
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.tabId) {
      switchMainTab(e.state.tabId, false);
    } else {
      const path = window.location.pathname;
      for (const [tabId, meta] of Object.entries(TAB_META)) {
        if (meta.path === path) {
          switchMainTab(tabId, false);
          return;
        }
      }
      switchMainTab('tabDashboard', false);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const leftHoverTriggerZone = document.getElementById('leftHoverTriggerZone');
    const menuHamburger = document.getElementById('menuHamburger');
    const leftSidebarDrawer = document.getElementById('leftSidebarDrawer');
    const leftDrawerBackdrop = document.getElementById('leftDrawerBackdrop');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');

    if (leftHoverTriggerZone) {
      leftHoverTriggerZone.addEventListener('mouseenter', () => {
        clearTimeout(drawerHoverTimeout);
        openLeftDrawer();
      });
      leftHoverTriggerZone.addEventListener('mouseleave', () => {
        clearTimeout(drawerHoverTimeout);
        drawerHoverTimeout = setTimeout(closeLeftDrawer, 280);
      });
    }

    if (menuHamburger) {
      menuHamburger.addEventListener('mouseenter', () => {
        clearTimeout(drawerHoverTimeout);
        openLeftDrawer();
      });
      menuHamburger.addEventListener('mouseleave', () => {
        clearTimeout(drawerHoverTimeout);
        drawerHoverTimeout = setTimeout(closeLeftDrawer, 280);
      });
      menuHamburger.addEventListener('click', (e) => {
        toggleLeftDrawer();
        e.stopPropagation();
      });
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
        leftSidebarDrawer.classList.add('hover-expanded');
      });
      leftSidebarDrawer.addEventListener('mouseleave', () => {
        clearTimeout(drawerHoverTimeout);
        drawerHoverTimeout = setTimeout(() => {
          leftSidebarDrawer.classList.remove('hover-expanded');
          leftSidebarDrawer.classList.remove('active');
        }, 150);
      });
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

    // Drawer item click / keydown bindings
    const drawerItems = document.querySelectorAll('.drawer-item[data-target-tab]');
    drawerItems.forEach(item => {
      const handleActivate = () => {
        const tabId = item.getAttribute('data-target-tab');
        const subview = item.getAttribute('data-subview');
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

    // Subnav Buttons for Dashboard
    const btnDashSubExecutive = document.getElementById('btnDashSubExecutive');
    const btnDashSubFindings = document.getElementById('btnDashSubFindings');
    if (btnDashSubExecutive) {
      btnDashSubExecutive.addEventListener('click', () => switchDashboardSubView('executive'));
    }
    if (btnDashSubFindings) {
      btnDashSubFindings.addEventListener('click', () => switchDashboardSubView('findings'));
    }

    // Global Keybindings (Ctrl+K, Esc)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (typeof window.openCommandPalette === 'function') {
          window.openCommandPalette();
        }
      } else if (e.key === 'Escape') {
        closeLeftDrawer();
        if (typeof window.closeAllModals === 'function') {
          window.closeAllModals();
        }
      }
    });

    // Check initial tab from body attribute
    const initialTab = document.body.getAttribute('data-initial-tab') || 'tabDashboard';
    const initialSubview = document.body.getAttribute('data-initial-subview') || 'executive';
    const openDoc = document.body.getAttribute('data-open-doc') === 'true';

    switchMainTab(initialTab, false);
    if (initialSubview === 'findings') {
      switchDashboardSubView('findings');
    }
    if (openDoc) {
      const docModal = document.getElementById('docModal');
      if (docModal) docModal.classList.add('active');
    }
  });
})();
