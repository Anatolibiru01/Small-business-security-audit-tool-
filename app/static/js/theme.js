/**
 * Lynislens Enterprise Suite — Theme Management (Dark / Light Mode)
 * Version 2.0.0
 */

(function() {
  function getPreferredTheme() {
    const saved = localStorage.getItem('lynislens_theme');
    if (saved) return saved;
    return 'dark'; // Default to Cyber Dark
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('lynislens_theme', theme);
  }

  window.applyTheme = applyTheme;
  window.getPreferredTheme = getPreferredTheme;

  // Initialize theme immediately on script load
  applyTheme(getPreferredTheme());

  document.addEventListener('DOMContentLoaded', () => {
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = active === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        
        // Re-render charts to adapt to the new theme's grid and text colors
        if (window.LynislensState && window.LynislensState.currentScorecard) {
          if (typeof window.renderDoughnutChart === 'function') window.renderDoughnutChart(window.LynislensState.currentScorecard);
          if (typeof window.renderCategoryBarChart === 'function') window.renderCategoryBarChart(window.LynislensState.currentScorecard);
          if (typeof window.renderHistoryTrendChart === 'function') window.renderHistoryTrendChart(window.LynislensState.currentScorecard);
          if (typeof window.renderDefenseRadarChart === 'function') window.renderDefenseRadarChart(window.LynislensState.currentScorecard);
          if (typeof window.renderAllComplianceFrameworkPies === 'function') window.renderAllComplianceFrameworkPies(window.LynislensState.currentScorecard);
          if (typeof window.renderComplianceDetailView === 'function') window.renderComplianceDetailView(window.LynislensState.activeComplianceFramework);
        }
      });
    }
  });
})();
