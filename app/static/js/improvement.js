/**
 * Lynislens Enterprise Suite — Automated Improvement Plan Controller
 * Version 2.0.0
 */

(function() {
  function renderImprovementTab() {
    const container = document.getElementById('improvementPlanContainer');
    if (!container) return;

    const scorecard = window.LynislensState.currentScorecard;
    const findings = (scorecard && scorecard.remediation_feed) || [];

    if (!findings.length) {
      container.innerHTML = `<div class="empty-message">No improvement plan loaded. Execute a security scan first.</div>`;
      return;
    }

    // Group findings into 3 phases: Quick Wins (Phase 1), Foundation (Phase 2), Strategic Hardening (Phase 3)
    const phase1 = findings.filter(f => (f.severity || '').toLowerCase() === 'critical' || ((f.severity || '').toLowerCase() === 'high' && (f.remediation_cmd || f.fix_command)));
    const phase2 = findings.filter(f => (f.severity || '').toLowerCase() === 'medium');
    const phase3 = findings.filter(f => (f.severity || '').toLowerCase() === 'low' || (!phase1.includes(f) && !phase2.includes(f)));

    function renderPhaseColumn(title, subtitle, badgeClass, items, scoreGain) {
      return `
        <div class="panel roadmap-phase-card">
          <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:var(--text-main); font-size:13px;">${window.escapeHtml(title)}</strong>
              <div style="font-size:11px; color:var(--text-muted); font-weight:normal;">${window.escapeHtml(subtitle)}</div>
            </div>
            <span class="badge ${badgeClass}" style="font-size:10px;">+${scoreGain} Pts Potential</span>
          </div>
          <div class="panel-body" style="padding:10px;">
            ${!items.length ? '<div style="font-size:11.5px; color:var(--text-muted); text-align:center; padding:15px;">No active tasks in this phase.</div>' : ''}
            ${items.map(item => {
              const testId = item.test_id || 'HARDEN-01';
              const fix = item.remediation_cmd || item.fix_command || '';
              return `
                <div class="roadmap-item-box" style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:6px; padding:10px; margin-bottom:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span class="badge badge-primary" style="font-size:9.5px; font-family:var(--font-mono);">${window.escapeHtml(testId)}</span>
                      <strong style="font-size:12px; color:var(--text-main);">${window.escapeHtml(item.title || 'Hardening Task')}</strong>
                    </div>
                    <span class="badge-priority priority-${(item.severity || 'medium').toLowerCase() === 'critical' ? 'p1' : (item.severity || 'medium').toLowerCase() === 'high' ? 'p2' : 'p3'}">${window.escapeHtml(item.severity || 'Med')}</span>
                  </div>
                  ${fix ? `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; background:var(--bg-card); padding:4px 8px; border-radius:4px; gap:6px;">
                      <code style="font-size:10.5px; color:var(--brand-orange); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${window.escapeHtml(fix)}</code>
                      <button type="button" class="btn btn-sm btn-secondary btn-icon-copy btn-copy-cmd" data-copy-cmd="${window.escapeHtml(fix)}" title="Copy Command">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:14px;">
        ${renderPhaseColumn('Phase 1: Immediate Remediation', 'Critical vulnerabilities & instant 1-command fixes', 'badge-danger', phase1, 14)}
        ${renderPhaseColumn('Phase 2: Baseline Hardening', 'Configuration drift & service access controls', 'badge-warning', phase2, 8)}
        ${renderPhaseColumn('Phase 3: Defense in Depth', 'Suggestions, log retention & continuous audit', 'badge-success', phase3, 4)}
      </div>
    `;

    container.querySelectorAll('.btn-copy-cmd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmd = btn.getAttribute('data-copy-cmd');
        if (cmd) {
          window.copyToClipboard(cmd, btn, 'Command copied to clipboard!');
        }
      });
    });
  }

  window.renderImprovementTab = renderImprovementTab;
})();
