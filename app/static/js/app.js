/**
 * Lynislens Enterprise Suite — Main Application Bootstrap
 * Version 2.0.0
 * 
 * Coordinates modular scripts:
 * state.js -> theme.js -> auth.js -> router.js -> sse.js -> dashboard.js 
 * -> findings.js -> systems.js -> compliance.js -> improvement.js -> reporting.js
 * -> settings.js -> documentation.js -> palette.js
 */

(function() {
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  window.closeAllModals = closeAllModals;

  async function bootstrapApp() {
    console.log('Bootstrapping Lynislens Enterprise Suite v2.0...');
    if (typeof window.fetchServersList === 'function') {
      await window.fetchServersList();
    }
    if (typeof window.fetchLatestScan === 'function') {
      window.fetchLatestScan();
    }
    if (typeof window.fetchEnrollmentToken === 'function') {
      window.fetchEnrollmentToken();
    }
    if (typeof window.initAmbientSSEStream === 'function') {
      window.initAmbientSSEStream();
    }
  }

  window.bootstrapApp = bootstrapApp;

  document.addEventListener('DOMContentLoaded', () => {
    // Backdrop click-to-close on all modals
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Check authentication and bootstrap
    if (typeof window.checkAuth === 'function') {
      window.checkAuth();
    } else {
      bootstrapApp();
    }
  });
})();
