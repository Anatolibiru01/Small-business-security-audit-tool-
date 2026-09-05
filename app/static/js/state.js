/**
 * Lynislens Enterprise Suite — Global State & Shared Utility Core
 * Version 2.0.0
 */

// Global Suite State
window.LynislensState = {
  currentScorecard: null,
  activeSeverityFilter: 'ALL',
  activeCategoryFilter: 'ALL',
  activeSearchQuery: '',
  eventSource: null,

  serversList: [],
  currentServerId: null, // null = Localhost Machine, number = remote server_id
  activeEnrollmentToken: null,
  activeComplianceFramework: 'CIS',

  pieChart: null,
  barChart: null,
  trendChart: null,
  radarChart: null,
  complianceCharts: {},
  complianceDetailChart: null
};

// Global Toast Notification Dispatcher
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    : type === 'error'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 3800);
};

// Global Helper: Safe HTML Escaping
window.escapeHtml = function(unsafe) {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
