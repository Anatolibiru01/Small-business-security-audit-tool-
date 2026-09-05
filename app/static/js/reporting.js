/**
 * Lynislens Enterprise Suite — Reporting Center & Historical Archives
 * Version 2.0.0
 */

(function() {
  function triggerExport(format) {
    let url = `/api/export/${format}`;
    if (window.LynislensState.currentServerId) {
      url += `?server_id=${window.LynislensState.currentServerId}`;
    }

    if (format === 'html' || format === 'pdf') {
      window.open('/report', '_blank');
    } else {
      window.location.href = url;
    }
    window.showToast(`Exporting ${format.toUpperCase()} report...`, 'info');
  }

  async function fetchHistoryArchives() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const historyList = await res.json();
        if (!historyList.length) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No historical audits recorded yet.</td></tr>`;
          return;
        }

        tbody.innerHTML = historyList.map(item => `
          <tr>
            <td><strong>${window.escapeHtml(item.timestamp || 'Recent')}</strong></td>
            <td><code>${window.escapeHtml(item.hostname || 'Local Machine')}</code></td>
            <td><span class="badge badge-info" style="font-size:10px;">${window.escapeHtml(item.server_name || 'Host')}</span></td>
            <td>${item.total_findings || 0} Findings</td>
            <td><strong style="color:${item.overall_score >= 80 ? '#10b981' : item.overall_score >= 70 ? '#f59e0b' : '#ef4444'}">${item.overall_score || '--'} / 100</strong></td>
            <td><span class="badge-priority priority-${(item.letter_grade || 'C').toLowerCase() === 'a' ? 'p4' : (item.letter_grade || 'C').toLowerCase() === 'b' ? 'p3' : 'p2'}">Grade ${window.escapeHtml(item.letter_grade || 'C')}</span></td>
            <td style="text-align: right;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.open('/report', '_blank')">View Report</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Error fetching audit history:', err);
    }
  }

  function renderReportingTab() {
    fetchHistoryArchives();
  }

  window.triggerExport = triggerExport;
  window.fetchHistoryArchives = fetchHistoryArchives;
  window.renderReportingTab = renderReportingTab;

  document.addEventListener('DOMContentLoaded', () => {
    const btnReportExportHtml = document.getElementById('btnReportExportHtml');
    const btnReportExportRaw = document.getElementById('btnReportExportRaw');
    const btnReportExportJson = document.getElementById('btnReportExportJson');
    const btnTopExportRaw = document.getElementById('btnTopExportRaw');

    if (btnReportExportHtml) btnReportExportHtml.addEventListener('click', () => triggerExport('html'));
    if (btnReportExportRaw) btnReportExportRaw.addEventListener('click', () => triggerExport('raw'));
    if (btnReportExportJson) btnReportExportJson.addEventListener('click', () => triggerExport('json'));
    if (btnTopExportRaw) btnTopExportRaw.addEventListener('click', () => triggerExport('raw'));
  });
})();
