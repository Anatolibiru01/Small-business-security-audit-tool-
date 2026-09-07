/**
 * Lynislens Enterprise Suite — Findings & Batch Remediation Controller
 * Version 2.0.0
 */

(function() {
  function getFilteredFindings(scorecard) {
    if (!scorecard || !scorecard.remediation_feed) return [];
    let list = scorecard.remediation_feed;

    const sev = window.LynislensState.activeSeverityFilter;
    const cat = window.LynislensState.activeCategoryFilter;
    const query = window.LynislensState.activeSearchQuery.trim().toLowerCase();

    if (sev && sev !== 'ALL') {
      list = list.filter(item => (item.severity || '').toLowerCase() === sev.toLowerCase());
    }

    if (cat && cat !== 'ALL') {
      list = list.filter(item => (item.category || '').toLowerCase() === cat.toLowerCase());
    }

    if (query) {
      list = list.filter(item => {
        const tId = (item.test_id || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const fix = (item.remediation_cmd || item.fix_command || '').toLowerCase();
        return tId.includes(query) || title.includes(query) || desc.includes(query) || fix.includes(query);
      });
    }

    return list;
  }

  function renderFindingsFeed(scorecard) {
    const feed = document.getElementById('remediationFeed');
    const countText = document.getElementById('remediationCountText');
    const findingsCountBadge = document.getElementById('findingsCountBadge');
    const filterBadge = document.getElementById('remediationActiveFilterBadge');

    if (!feed) return;

    const rawList = (scorecard && scorecard.remediation_feed) || [];
    if (findingsCountBadge) findingsCountBadge.textContent = rawList.length;

    // Update filter counts in sidebar
    const filterCritCount = document.getElementById('filterCritCount');
    const filterHighCount = document.getElementById('filterHighCount');
    const filterMedCount = document.getElementById('filterMedCount');
    const filterLowCount = document.getElementById('filterLowCount');

    if (filterCritCount) filterCritCount.textContent = rawList.filter(i => (i.severity || '').toLowerCase() === 'critical').length;
    if (filterHighCount) filterHighCount.textContent = rawList.filter(i => (i.severity || '').toLowerCase() === 'high').length;
    if (filterMedCount) filterMedCount.textContent = rawList.filter(i => (i.severity || '').toLowerCase() === 'medium').length;
    if (filterLowCount) filterLowCount.textContent = rawList.filter(i => (i.severity || '').toLowerCase() === 'low').length;

    const filtered = getFilteredFindings(scorecard);
    if (countText) countText.textContent = `Showing ${filtered.length} of ${rawList.length} items`;

    const isFiltered = window.LynislensState.activeSeverityFilter !== 'ALL' || 
                       window.LynislensState.activeCategoryFilter !== 'ALL' || 
                       window.LynislensState.activeSearchQuery !== '';

    if (filterBadge) filterBadge.style.display = isFiltered ? 'inline-block' : 'none';

    if (!filtered.length) {
      feed.innerHTML = `<div class="empty-message">No matching findings found for current filter.</div>`;
      updateBatchPlaybookToolbar();
      return;
    }

    feed.innerHTML = filtered.map((item, idx) => {
      const sev = item.severity || 'Medium';
      const sevClass = sev.toLowerCase();
      const testId = item.test_id || `CHECK-${idx + 1}`;
      const title = item.title || 'Security Configuration Hardening';
      const fixCmd = item.remediation_cmd || item.fix_command || '';
      const compliance = item.compliance_mapping || {};
      const complianceKeys = Object.keys(compliance);

      return `
        <div class="remediation-card sev-border-${sevClass}" data-test-id="${window.escapeHtml(testId)}">
          <div class="remediation-card-header">
            <div class="remediation-header-left">
              <input type="checkbox" class="chk-finding-select" data-test-id="${window.escapeHtml(testId)}" title="Select for playbook">
              <span class="badge-priority priority-${sevClass === 'critical' ? 'p1' : sevClass === 'high' ? 'p2' : sevClass === 'medium' ? 'p3' : 'p4'}">
                ${window.escapeHtml(sev)}
              </span>
              <span class="finding-testid-pill">${window.escapeHtml(testId)}</span>
              <span class="remediation-title" title="${window.escapeHtml(title)}">${window.escapeHtml(title)}</span>
            </div>
            <button type="button" class="btn-toggle-detail" aria-label="Toggle details" title="Toggle remediation details">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <div class="remediation-card-body" style="display:none;">
            ${item.description ? `<p class="finding-desc">${window.escapeHtml(item.description)}</p>` : ''}
            
            ${fixCmd ? `
              <div class="remediation-action-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-size:11px; font-weight:700; color:var(--brand-orange);">Recommended Remediation CLI:</span>
                  <button type="button" class="btn btn-sm btn-secondary btn-copy-cmd" data-copy-cmd="${window.escapeHtml(fixCmd)}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy Fix</span>
                  </button>
                </div>
                <pre class="code-snippet-box"><code>${window.escapeHtml(fixCmd)}</code></pre>
              </div>
            ` : ''}

            ${complianceKeys.length ? `
              <div class="compliance-tag-row">
                <span style="font-size:10.5px; color:var(--text-muted); font-weight:600;">Regulatory Mappings:</span>
                ${complianceKeys.map(k => `<span class="badge badge-info" style="font-size:10px;">${window.escapeHtml(k)}: ${window.escapeHtml(compliance[k])}</span>`).join(' ')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach card expansion listeners
    feed.querySelectorAll('.remediation-card').forEach(card => {
      const header = card.querySelector('.remediation-card-header');
      const body = card.querySelector('.remediation-card-body');
      const toggleBtn = card.querySelector('.btn-toggle-detail');

      if (header && body) {
        header.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.closest('.btn-copy-cmd')) return;
          const isHidden = body.style.display === 'none';
          body.style.display = isHidden ? 'block' : 'none';
          card.classList.toggle('expanded', isHidden);
          if (toggleBtn) toggleBtn.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
      }
    });

    // Copy command buttons
    feed.querySelectorAll('.btn-copy-cmd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmd = btn.getAttribute('data-copy-cmd');
        if (cmd) {
          navigator.clipboard.writeText(cmd);
          window.showToast('Remediation command copied to clipboard!', 'success');
        }
      });
    });

    // Checkbox selections for batch playbook
    feed.querySelectorAll('.chk-finding-select').forEach(chk => {
      chk.addEventListener('change', updateBatchPlaybookToolbar);
    });

    updateBatchPlaybookToolbar();
  }

  function getSelectedFindingObjects() {
    const checked = Array.from(document.querySelectorAll('.chk-finding-select:checked'));
    const testIds = checked.map(c => c.getAttribute('data-test-id'));
    const rawList = (window.LynislensState.currentScorecard && window.LynislensState.currentScorecard.remediation_feed) || [];
    return rawList.filter(item => testIds.includes(item.test_id));
  }

  function updateBatchPlaybookToolbar() {
    const checked = document.querySelectorAll('.chk-finding-select:checked');
    const badge = document.getElementById('batchSelectedCountBadge');
    const countSpan = document.getElementById('batchPlaybookCount');
    const chkAll = document.getElementById('chkSelectAllFindings');

    const totalVisible = document.querySelectorAll('.chk-finding-select').length;

    if (badge) {
      badge.textContent = `${checked.length} Selected`;
      badge.style.display = checked.length > 0 ? 'inline-block' : 'none';
    }
    if (countSpan) countSpan.textContent = checked.length;
    if (chkAll) chkAll.checked = totalVisible > 0 && checked.length === totalVisible;
  }

  function generatePlaybookContent(format = 'sh') {
    const findings = getSelectedFindingObjects();
    if (!findings.length) {
      return format === 'sh' 
        ? '#!/usr/bin/env bash\n# No findings selected for batch remediation.\n'
        : '---\n# No findings selected for batch remediation.\n- hosts: all\n  tasks: []\n';
    }

    if (format === 'sh') {
      let script = `#!/usr/bin/env bash\n# =============================================================================\n`;
      script += `# Lynislens Enterprise Automated Remediation Playbook\n`;
      script += `# Generated at: ${new Date().toISOString()}\n`;
      script += `# Selected Controls: ${findings.length}\n`;
      script += `# =============================================================================\n\nset -euo pipefail\n\necho "Starting Lynislens Batch Remediation..."\n\n`;

      findings.forEach(f => {
        const cmd = f.remediation_cmd || f.fix_command || '# No automatic command';
        script += `# [${f.test_id}] ${f.title} (${f.severity})\n`;
        script += `echo "Remediating ${f.test_id}..."\n`;
        script += `${cmd}\n\n`;
      });

      script += `echo "Remediation complete. Re-run 'lynislens' audit to verify."\n`;
      return script;
    } else {
      let yml = `---\n# Lynislens Enterprise Ansible Remediation Playbook\n- name: Apply Lynislens Hardening Baselines\n  hosts: all\n  become: true\n  tasks:\n`;
      findings.forEach(f => {
        const cmd = f.remediation_cmd || f.fix_command || 'echo "skipped"';
        yml += `    - name: "[${f.test_id}] ${f.title}"\n      shell: "${cmd.replace(/"/g, '\\"')}"\n      changed_when: true\n\n`;
      });
      return yml;
    }
  }

  window.renderFindingsFeed = renderFindingsFeed;
  window.getFilteredFindings = getFilteredFindings;
  window.generatePlaybookContent = generatePlaybookContent;

  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const severityFilterSelect = document.getElementById('severityFilterSelect');
    const categoryFilterSelect = document.getElementById('categoryFilterSelect');
    const btnResetFindingsFilter = document.getElementById('btnResetFindingsFilter');
    const btnToggleAll = document.getElementById('btnToggleAllFindingDropdowns');
    const chkSelectAll = document.getElementById('chkSelectAllFindings');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        window.LynislensState.activeSearchQuery = searchInput.value;
        renderFindingsFeed(window.LynislensState.currentScorecard);
      });
    }

    if (severityFilterSelect) {
      severityFilterSelect.addEventListener('change', () => {
        window.LynislensState.activeSeverityFilter = severityFilterSelect.value;
        renderFindingsFeed(window.LynislensState.currentScorecard);
      });
    }

    if (categoryFilterSelect) {
      categoryFilterSelect.addEventListener('change', () => {
        window.LynislensState.activeCategoryFilter = categoryFilterSelect.value;
        renderFindingsFeed(window.LynislensState.currentScorecard);
      });
    }

    if (btnResetFindingsFilter) {
      btnResetFindingsFilter.addEventListener('click', () => {
        window.LynislensState.activeSearchQuery = '';
        window.LynislensState.activeSeverityFilter = 'ALL';
        window.LynislensState.activeCategoryFilter = 'ALL';

        if (searchInput) searchInput.value = '';
        if (severityFilterSelect) severityFilterSelect.value = 'ALL';
        if (categoryFilterSelect) categoryFilterSelect.value = 'ALL';

        renderFindingsFeed(window.LynislensState.currentScorecard);
      });
    }

    if (btnToggleAll) {
      btnToggleAll.addEventListener('click', () => {
        const cards = document.querySelectorAll('.remediation-card');
        const anyCollapsed = Array.from(cards).some(c => {
          const body = c.querySelector('.remediation-card-body');
          return body && body.style.display === 'none';
        });

        cards.forEach(card => {
          const body = card.querySelector('.remediation-card-body');
          const toggleBtn = card.querySelector('.btn-toggle-detail');
          if (body) {
            body.style.display = anyCollapsed ? 'block' : 'none';
            card.classList.toggle('expanded', anyCollapsed);
            if (toggleBtn) toggleBtn.style.transform = anyCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        });

        btnToggleAll.textContent = anyCollapsed ? 'Collapse All' : 'Expand All';
      });
    }

    if (chkSelectAll) {
      chkSelectAll.addEventListener('change', () => {
        const isChecked = chkSelectAll.checked;
        document.querySelectorAll('.chk-finding-select').forEach(chk => {
          chk.checked = isChecked;
        });
        updateBatchPlaybookToolbar();
      });
    }

    // Playbook Modal
    const playbookModal = document.getElementById('playbookModal');
    const btnGenerateBatchPlaybook = document.getElementById('btnGenerateBatchPlaybook');
    const btnClosePlaybookModal = document.getElementById('btnClosePlaybookModal');
    const btnClosePlaybook = document.getElementById('btnClosePlaybook');
    const btnPlaybookFormatSh = document.getElementById('btnPlaybookFormatSh');
    const btnPlaybookFormatAnsible = document.getElementById('btnPlaybookFormatAnsible');
    const playbookCodeViewer = document.getElementById('playbookCodeViewer');
    const btnCopyPlaybook = document.getElementById('btnCopyPlaybook');
    const btnDownloadPlaybook = document.getElementById('btnDownloadPlaybook');

    let currentPlaybookFormat = 'sh';

    function openPlaybookModal() {
      const selected = getSelectedFindingObjects();
      if (!selected.length) {
        window.showToast('Please select at least one finding checkbox first.', 'info');
        return;
      }
      if (playbookModal) playbookModal.classList.add('active');
      updatePlaybookViewer();
    }

    function closePlaybookModal() {
      if (playbookModal) playbookModal.classList.remove('active');
    }

    function updatePlaybookViewer() {
      if (!playbookCodeViewer) return;
      playbookCodeViewer.textContent = generatePlaybookContent(currentPlaybookFormat);
    }

    if (btnGenerateBatchPlaybook) btnGenerateBatchPlaybook.addEventListener('click', openPlaybookModal);
    if (btnClosePlaybookModal) btnClosePlaybookModal.addEventListener('click', closePlaybookModal);
    if (btnClosePlaybook) btnClosePlaybook.addEventListener('click', closePlaybookModal);

    if (btnPlaybookFormatSh) {
      btnPlaybookFormatSh.addEventListener('click', () => {
        currentPlaybookFormat = 'sh';
        btnPlaybookFormatSh.classList.add('active');
        if (btnPlaybookFormatAnsible) btnPlaybookFormatAnsible.classList.remove('active');
        updatePlaybookViewer();
      });
    }

    if (btnPlaybookFormatAnsible) {
      btnPlaybookFormatAnsible.addEventListener('click', () => {
        currentPlaybookFormat = 'yml';
        btnPlaybookFormatAnsible.classList.add('active');
        if (btnPlaybookFormatSh) btnPlaybookFormatSh.classList.remove('active');
        updatePlaybookViewer();
      });
    }

    if (btnCopyPlaybook) {
      btnCopyPlaybook.addEventListener('click', () => {
        const text = generatePlaybookContent(currentPlaybookFormat);
        navigator.clipboard.writeText(text);
        window.showToast('Playbook copied to clipboard!', 'success');
      });
    }

    if (btnDownloadPlaybook) {
      btnDownloadPlaybook.addEventListener('click', () => {
        const text = generatePlaybookContent(currentPlaybookFormat);
        const ext = currentPlaybookFormat === 'sh' ? 'sh' : 'yml';
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lynislens-remediation-playbook.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
})();
