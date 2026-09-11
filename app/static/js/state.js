/**
 * Lynislens Enterprise Suite — Global State & Shared Utility Core
 * Version 2.0.0
 */

// Initial target server restoration from localStorage
let initialServerId = null;
try {
  const savedServer = localStorage.getItem('lynislens_selected_server');
  if (savedServer && savedServer !== 'local') {
    const parsed = Number(savedServer);
    if (!isNaN(parsed)) {
      initialServerId = parsed;
    }
  }
} catch (e) {}

// Global Suite State
window.LynislensState = {
  currentScorecard: null,
  activeSeverityFilter: 'ALL',
  activeCategoryFilter: 'ALL',
  activeSearchQuery: '',
  eventSource: null,

  serversList: [],
  currentServerId: initialServerId, // null = Localhost Machine, number = remote server_id
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

// Global Helper: Professional 1-Click Clipboard Copy with fallback & visual feedback
window.copyToClipboard = async function(text, triggerBtn = null, toastMessage = null) {
  if (!text) return false;
  let success = false;

  // 1. Try modern Clipboard API (Works on HTTPS & localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      success = true;
    } catch (e) {
      success = false;
    }
  }

  // 2. Fallback for HTTP / LAN IP contexts (e.g. http://172.17.x.x)
  if (!success) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0.01';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);
      success = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
      success = false;
    }
  }

  // 3. Visual feedback on button (Icon morphs to Checkmark)
  if (triggerBtn) {
    triggerBtn.classList.add('copied');
    if (!triggerBtn.dataset.origHtml) {
      triggerBtn.dataset.origHtml = triggerBtn.innerHTML;
    }
    triggerBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    setTimeout(() => {
      triggerBtn.classList.remove('copied');
      if (triggerBtn.dataset.origHtml) {
        triggerBtn.innerHTML = triggerBtn.dataset.origHtml;
      }
    }, 1800);
  }

  if (toastMessage && typeof window.showToast === 'function') {
    window.showToast(toastMessage, 'success');
  }

  return success;
};

