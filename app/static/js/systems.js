/**
 * Lynislens Enterprise Suite — Fleet Management & Agent Controller
 * Version 2.0.0
 */

(function() {
  async function fetchServersList() {
    try {
      const res = await fetch('/api/servers');
      if (res.ok) {
        const list = await res.json();
        window.LynislensState.serversList = list;
        renderSystemsTab();
        updateTargetServerSelect();
        renderSettingsServersTable();
      }
    } catch (err) {
      console.error('Error fetching servers:', err);
    }
  }

  function updateTargetServerSelect() {
    const select = document.getElementById('targetServerSelect');
    const badge = document.getElementById('serverConnectionBadge');
    const btnDel = document.getElementById('btnDeleteTargetServer');

    if (!select) return;

    const currentVal = window.LynislensState.currentServerId === null ? 'local' : String(window.LynislensState.currentServerId);

    let html = `<option value="local">Localhost (Local Machine)</option>`;
    (window.LynislensState.serversList || []).forEach(srv => {
      html += `<option value="${srv.id}">${window.escapeHtml(srv.name || srv.host)} (${window.escapeHtml(srv.host)})</option>`;
    });

    select.innerHTML = html;
    select.value = currentVal;

    if (badge) {
      if (currentVal === 'local') {
        badge.textContent = 'Active (Local)';
        badge.className = 'badge-status status-connected';
      } else {
        const srv = window.LynislensState.serversList.find(s => String(s.id) === currentVal);
        if (srv && srv.status === 'online') {
          badge.textContent = 'Online';
          badge.className = 'badge-status status-connected';
        } else {
          badge.textContent = 'Enrolled';
          badge.className = 'badge-status status-checking';
        }
      }
    }

    if (btnDel) {
      btnDel.style.display = currentVal !== 'local' ? 'inline-block' : 'none';
    }
  }

  function renderSystemsTab() {
    const tbody = document.getElementById('systemsInventoryTableBody');
    const countBadge = document.getElementById('systemsCountBadge');
    if (!tbody) return;

    const list = window.LynislensState.serversList || [];
    const totalCount = list.length + 1; // including Localhost
    if (countBadge) countBadge.textContent = `${totalCount} Total ${totalCount === 1 ? 'Asset' : 'Assets'}`;

    let rows = `
      <tr>
        <td><strong>Localhost Machine</strong></td>
        <td><code>127.0.0.1</code></td>
        <td><span class="badge badge-info" style="font-size:10px;">Local Subprocess</span></td>
        <td>Linux (Native Host)</td>
        <td><span class="badge-status status-connected">Active</span></td>
        <td class="mono-stat">${(window.LynislensState.currentScorecard && window.LynislensState.currentScorecard.hardening_index) || '--'} / 100</td>
        <td>${(window.LynislensState.currentScorecard && window.LynislensState.currentScorecard.total_findings) || 0} Open</td>
        <td>Real-Time</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="window.selectTargetServer('local')">Select</button>
        </td>
      </tr>
    `;

    list.forEach(srv => {
      const isOnline = srv.status === 'online';
      rows += `
        <tr>
          <td><strong>${window.escapeHtml(srv.name || srv.host)}</strong></td>
          <td><code>${window.escapeHtml(srv.host)}</code></td>
          <td><span class="badge badge-${srv.auth_type === 'push' ? 'success' : 'primary'}" style="font-size:10px;">${srv.auth_type === 'push' ? 'Push Agent' : 'Direct SSH'}</span></td>
          <td>${window.escapeHtml(srv.os_name || 'Linux')}</td>
          <td><span class="badge-status status-${isOnline ? 'connected' : 'checking'}">${isOnline ? 'Connected' : 'Enrolled'}</span></td>
          <td class="mono-stat">${srv.hardening_index !== null && srv.hardening_index !== undefined ? srv.hardening_index : '--'} / 100</td>
          <td>${srv.total_findings || 0} Open</td>
          <td>${srv.last_audit || 'Pending first run'}</td>
          <td style="text-align: right; display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="window.selectTargetServer(${srv.id})">Select</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteServer(${srv.id})">Remove</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  }

  function selectTargetServer(id) {
    window.LynislensState.currentServerId = id === 'local' ? null : Number(id);
    updateTargetServerSelect();
    if (typeof window.fetchLatestScan === 'function') {
      window.fetchLatestScan();
    }
    if (typeof window.switchMainTab === 'function') {
      window.switchMainTab('tabDashboard');
    }
  }

  async function deleteServer(id) {
    if (!confirm('Are you sure you want to decommission and remove this server asset?')) return;
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.showToast('Server asset removed successfully.', 'info');
        if (window.LynislensState.currentServerId === id) {
          window.LynislensState.currentServerId = null;
        }
        fetchServersList();
      } else {
        window.showToast('Failed to remove server.', 'error');
      }
    } catch (err) {
      window.showToast('Network error removing server.', 'error');
    }
  }

  function renderSettingsServersTable() {
    const tbody = document.getElementById('settingsServersTableBody');
    if (!tbody) return;

    const list = window.LynislensState.serversList || [];
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No enrolled remote servers. Localhost only.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(srv => `
      <tr>
        <td><strong>${window.escapeHtml(srv.name || srv.host)}</strong></td>
        <td><code>${window.escapeHtml(srv.host)}</code></td>
        <td><span class="badge badge-${srv.auth_type === 'push' ? 'success' : 'primary'}" style="font-size:10px;">${srv.auth_type === 'push' ? 'Push Agent' : 'Direct SSH'}</span></td>
        <td><span class="badge-status status-${srv.status === 'online' ? 'connected' : 'checking'}">${srv.status === 'online' ? 'Online' : 'Enrolled'}</span></td>
        <td>${srv.last_audit || 'Pending'}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteServer(${srv.id})">Decommission</button>
        </td>
      </tr>
    `).join('');
  }

  window.fetchServersList = fetchServersList;
  window.renderSystemsTab = renderSystemsTab;
  window.updateTargetServerSelect = updateTargetServerSelect;
  window.selectTargetServer = selectTargetServer;
  window.deleteServer = deleteServer;
  window.renderSettingsServersTable = renderSettingsServersTable;

  document.addEventListener('DOMContentLoaded', () => {
    const targetServerSelect = document.getElementById('targetServerSelect');
    const btnDeleteTargetServer = document.getElementById('btnDeleteTargetServer');

    if (targetServerSelect) {
      targetServerSelect.addEventListener('change', () => {
        selectTargetServer(targetServerSelect.value);
      });
    }

    if (btnDeleteTargetServer) {
      btnDeleteTargetServer.addEventListener('click', () => {
        if (window.LynislensState.currentServerId) {
          deleteServer(window.LynislensState.currentServerId);
        }
      });
    }

    // Systems sub-tabs (Inventory vs Setup)
    const btnSysSubInventory = document.getElementById('btnSysSubInventory');
    const btnSysSubSetup = document.getElementById('btnSysSubSetup');
    const sysInventoryPane = document.getElementById('sysInventoryPane');
    const sysSetupPane = document.getElementById('sysSetupPane');

    if (btnSysSubInventory && btnSysSubSetup) {
      btnSysSubInventory.addEventListener('click', () => {
        btnSysSubInventory.classList.add('active');
        btnSysSubSetup.classList.remove('active');
        if (sysInventoryPane) sysInventoryPane.style.display = 'block';
        if (sysSetupPane) sysSetupPane.style.display = 'none';
      });

      btnSysSubSetup.addEventListener('click', () => {
        btnSysSubSetup.classList.add('active');
        btnSysSubInventory.classList.remove('active');
        if (sysInventoryPane) sysInventoryPane.style.display = 'none';
        if (sysSetupPane) sysSetupPane.style.display = 'block';
      });
    }

    // Server Modal
    const serverModal = document.getElementById('serverModal');
    const btnOpenServerModalFromSys = document.getElementById('btnOpenServerModalFromSys');
    const btnStartFirstRemote = document.getElementById('btnStartFirstRemote');
    const btnCloseServerModal = document.getElementById('btnCloseServerModal');
    const btnCancelServer = document.getElementById('btnCancelServer');
    const btnDoneAgent = document.getElementById('btnDoneAgent');

    function openServerModal() {
      if (typeof window.fetchEnrollmentToken === 'function') {
        window.fetchEnrollmentToken();
      }
      if (serverModal) serverModal.classList.add('active');
    }
    function closeServerModal() {
      if (serverModal) serverModal.classList.remove('active');
    }

    window.openServerModal = openServerModal;
    window.closeServerModal = closeServerModal;

    if (btnOpenServerModalFromSys) btnOpenServerModalFromSys.addEventListener('click', openServerModal);
    if (btnStartFirstRemote) btnStartFirstRemote.addEventListener('click', openServerModal);
    if (btnCloseServerModal) btnCloseServerModal.addEventListener('click', closeServerModal);
    if (btnCancelServer) btnCancelServer.addEventListener('click', closeServerModal);
    if (btnDoneAgent) btnDoneAgent.addEventListener('click', () => { closeServerModal(); fetchServersList(); });

    // Server Modal Tab Switcher (Push vs SSH)
    const tabBtnPush = document.getElementById('tabBtnPush');
    const tabBtnSSH = document.getElementById('tabBtnSSH');
    const modalTabPush = document.getElementById('modalTabPush');
    const modalTabSSH = document.getElementById('modalTabSSH');

    if (tabBtnPush && tabBtnSSH) {
      tabBtnPush.addEventListener('click', () => {
        tabBtnPush.classList.add('active');
        tabBtnSSH.classList.remove('active');
        if (modalTabPush) modalTabPush.classList.add('active');
        if (modalTabSSH) modalTabSSH.classList.remove('active');
      });

      tabBtnSSH.addEventListener('click', () => {
        tabBtnSSH.classList.add('active');
        tabBtnPush.classList.remove('active');
        if (modalTabSSH) modalTabSSH.classList.add('active');
        if (modalTabPush) modalTabPush.classList.remove('active');
      });
    }

    // Copy command buttons
    const btnCopyAgentCmd = document.getElementById('btnCopyAgentCmd');
    const btnCopySysCmd = document.getElementById('btnCopySysCmd');
    if (btnCopyAgentCmd) {
      btnCopyAgentCmd.addEventListener('click', () => {
        const text = document.getElementById('agentCommandText')?.innerText || '';
        navigator.clipboard.writeText(text);
        window.showToast('Agent installation command copied!', 'success');
      });
    }
    if (btnCopySysCmd) {
      btnCopySysCmd.addEventListener('click', () => {
        const text = document.getElementById('sysSetupCommandText')?.innerText || '';
        navigator.clipboard.writeText(text);
        window.showToast('Setup command copied!', 'success');
      });
    }

    // SSH Form Submit
    const serverForm = document.getElementById('serverForm');
    if (serverForm) {
      serverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          host: document.getElementById('serverHost')?.value,
          port: Number(document.getElementById('serverPort')?.value || 22),
          username: document.getElementById('serverUsername')?.value,
          name: document.getElementById('serverName')?.value,
          password: document.getElementById('serverPassword')?.value,
          sudo_password: document.getElementById('serverSudoPassword')?.value,
          auth_type: 'ssh'
        };

        try {
          const res = await fetch('/api/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            window.showToast('SSH Server connected and enrolled!', 'success');
            closeServerModal();
            fetchServersList();
          } else {
            const err = await res.json();
            window.showToast(err.detail || 'Failed to save server.', 'error');
          }
        } catch (err) {
          window.showToast('Network error saving server.', 'error');
        }
      });
    }
  });
})();
