/**
 * Lynislens Enterprise Suite — Reporting Center & Historical Archives
 * Version 2.0.0
 */

(function() {
  function triggerExport(format) {
    if (!window.LynislensState.currentScorecard || window.LynislensState.currentScorecard.overall_score === undefined || window.LynislensState.currentScorecard.overall_score === null) {
      window.showToast('No active agent or audit results available. Please run an audit or select a connected agent first.', 'error');
      return;
    }

    let url = `/api/export/${format}`;
    if (window.LynislensState.currentServerId) {
      url += `?server_id=${window.LynislensState.currentServerId}`;
    }

    if (format === 'html' || format === 'pdf') {
      const exportUrl = window.LynislensState.currentServerId ? `/report?server_id=${window.LynislensState.currentServerId}` : '/report';
      window.open(exportUrl, '_blank');
    } else {
      window.location.href = url;
    }
    window.showToast(`Exporting ${format.toUpperCase()} report...`, 'info');
  }

  function updateHistoryFilterDropdown() {
    const filterSelect = document.getElementById('historyTargetFilter');
    if (!filterSelect) return;

    const currentVal = filterSelect.value || 'all';
    let html = `<option value="all">All Systems & Nodes</option><option value="local">Localhost (Local Machine)</option>`;
    
    (window.LynislensState.serversList || []).forEach(srv => {
      html += `<option value="${srv.id}">${window.escapeHtml(srv.name || srv.host)} (${window.escapeHtml(srv.host)})</option>`;
    });

    filterSelect.innerHTML = html;
    filterSelect.value = currentVal;
  }

  async function fetchHistoryArchives() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    updateHistoryFilterDropdown();

    const filterSelect = document.getElementById('historyTargetFilter');
    const filterVal = filterSelect ? filterSelect.value : 'all';

    let url = '/api/history';
    if (filterVal && filterVal !== 'all') {
      url += `?server_id=${filterVal}`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const historyList = await res.json();
        if (!historyList.length) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:25px; color:var(--text-muted);">No historical audit records found for this asset.</td></tr>`;
          return;
        }

        tbody.innerHTML = historyList.map(item => `
          <tr>
            <td><strong>${window.escapeHtml(item.timestamp || 'Recent')}</strong></td>
            <td><code>${window.escapeHtml(item.hostname || 'Local Machine')}</code></td>
            <td><span class="badge badge-info" style="font-size:10px;">${window.escapeHtml(item.server_name || (item.server_id ? `Node #${item.server_id}` : 'Localhost'))}</span></td>
            <td>${item.total_findings || 0} Findings</td>
            <td><strong style="color:${item.overall_score >= 90 ? '#10b981' : item.overall_score >= 80 ? '#0d9488' : item.overall_score >= 70 ? '#d97706' : item.overall_score >= 60 ? '#ea580c' : '#ef4444'}">${item.overall_score !== undefined && item.overall_score !== null ? item.overall_score : '--'} / 100</strong></td>
            <td><span class="badge-priority priority-${(item.letter_grade || 'C').toLowerCase() === 'a' || (item.letter_grade || 'C').toLowerCase() === 'a+' ? 'p4' : (item.letter_grade || 'C').toLowerCase() === 'b' ? 'p3' : (item.letter_grade || 'C').toLowerCase() === 'c' ? 'p2' : (item.letter_grade || 'C').toLowerCase() === 'd' ? 'p1' : 'p0'}">Grade ${window.escapeHtml(item.letter_grade || 'C')}</span></td>
            <td style="text-align: right; display:flex; gap:6px; justify-content:flex-end;">
              <button type="button" class="btn btn-sm btn-primary" onclick="window.loadHistoricalScan(${item.id})" title="Load complete scorecard and remediation findings on the dashboard">
                <i class="fas fa-eye"></i> Inspect Findings
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.open('/report?scan_id=${item.id}', '_blank')" title="View printable executive audit report">
                Print Report
              </button>
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteHistoryRecord(${item.id})" title="Delete archived record">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Error fetching audit history:', err);
    }
  }

  async function deleteHistoryRecord(scanId) {
    if (!confirm('Are you sure you want to delete this historical audit snapshot?')) return;
    try {
      const res = await fetch(`/api/history/${scanId}`, { method: 'DELETE' });
      if (res.ok) {
        window.showToast('Audit record deleted from history.', 'success');
        fetchHistoryArchives();
      } else {
        window.showToast('Failed to delete history record.', 'error');
      }
    } catch (e) {
      window.showToast('Network error deleting record.', 'error');
    }
  }

  function renderReportingTab() {
    fetchHistoryArchives();
  }

  window.triggerExport = triggerExport;
  window.fetchHistoryArchives = fetchHistoryArchives;
  window.deleteHistoryRecord = deleteHistoryRecord;
  window.renderReportingTab = renderReportingTab;

  document.addEventListener('DOMContentLoaded', () => {
    const btnReportExportHtml = document.getElementById('btnReportExportHtml');
    const btnReportExportRaw = document.getElementById('btnReportExportRaw');
    const btnReportExportJson = document.getElementById('btnReportExportJson');
    const btnTopExportRaw = document.getElementById('btnTopExportRaw');
    const filterSelect = document.getElementById('historyTargetFilter');

    if (btnReportExportHtml) btnReportExportHtml.addEventListener('click', () => triggerExport('html'));
    if (btnReportExportRaw) btnReportExportRaw.addEventListener('click', () => triggerExport('raw'));
    if (btnReportExportJson) btnReportExportJson.addEventListener('click', () => triggerExport('json'));
    if (btnTopExportRaw) btnTopExportRaw.addEventListener('click', () => triggerExport('raw'));

    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        fetchHistoryArchives();
      });
    }
  });
})();
