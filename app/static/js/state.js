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

// Global Toast Notification Dispatcher (Disabled)
window.showToast = function() {};

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
