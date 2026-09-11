/**
 * Lynislens Enterprise Suite — Settings & SecOps Alerting Center
 * Version 2.0.0
 */

(function() {
  async function fetchEnrollmentToken() {
    try {
      const res = await fetch('/api/token');
      if (res.ok) {
        const data = await res.json();
        window.LynislensState.activeEnrollmentToken = data.token;

        const sysTokenInput = document.getElementById('sysActiveToken');
        const tokenInput = document.getElementById('settingsActiveToken');
        if (sysTokenInput) sysTokenInput.value = data.token;
        if (tokenInput) tokenInput.value = data.token;

        updateAgentCommandBoxes(data.token);
      }
    } catch (err) {
      console.error('Error fetching enrollment token:', err);
    }
  }

  async function generateNewToken() {
    try {
      const res = await fetch('/api/token/rotate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        window.LynislensState.activeEnrollmentToken = data.token;
        
        const sysTokenInput = document.getElementById('sysActiveToken');
        const tokenInput = document.getElementById('settingsActiveToken');
        if (sysTokenInput) sysTokenInput.value = data.token;
        if (tokenInput) tokenInput.value = data.token;

        updateAgentCommandBoxes(data.token);
        window.showToast('New cryptographic enrollment token generated!', 'success');
      }
    } catch (err) {
      window.showToast('Failed to rotate token.', 'error');
    }
  }

  function formatHubUrl(rawInput) {
    let val = (rawInput || '').trim();
    if (!val) {
      return window.location.origin;
    }

    let protocol = 'http://';
    if (val.startsWith('https://')) {
      protocol = 'https://';
      val = val.slice(8);
    } else if (val.startsWith('http://')) {
      protocol = 'http://';
      val = val.slice(7);
    }

    // Strip trailing slashes or subpaths
    val = val.split('/')[0].trim();
    if (!val) {
      return window.location.origin;
    }

    // Auto-append port 8000 (or current host port) if user only entered IP / hostname
    const defaultPort = window.location.port || '8000';
    if (!val.includes(':') && defaultPort) {
      val = `${val}:${defaultPort}`;
    }

    return `${protocol}${val}`;
  }

  function getEffectiveHubUrl() {
    const inputSys = document.getElementById('sysCustomHubUrl');
    const inputModal = document.getElementById('modalCustomHubUrl');
    let saved = null;
    try { saved = localStorage.getItem('lynislens_custom_hub_url'); } catch(e) {}
    
    const activeVal = inputSys?.value || inputModal?.value || saved || '';
    return formatHubUrl(activeVal);
  }

  function setEffectiveHubUrl(rawUrl, syncInputs = true) {
    const cleanUrl = formatHubUrl(rawUrl);

    try {
      localStorage.setItem('lynislens_custom_hub_url', cleanUrl);
    } catch (e) {}

    if (syncInputs) {
      const inputSys = document.getElementById('sysCustomHubUrl');
      const inputModal = document.getElementById('modalCustomHubUrl');
      if (inputSys && inputSys.value !== cleanUrl) inputSys.value = cleanUrl;
      if (inputModal && inputModal.value !== cleanUrl) inputModal.value = cleanUrl;
    }

    const isLoopback = cleanUrl.includes('127.0.0.1') || cleanUrl.includes('localhost');
    const badgeText = isLoopback ? 'Localhost (127.0.0.1)' : 'Reachable Host IP';
    const badgeClass = isLoopback ? 'badge badge-warning' : 'badge badge-success';

    const sysBadge = document.getElementById('sysSetupHostIpBadge');
    const modalBadge = document.getElementById('modalHostIpBadge');
    if (sysBadge) {
      sysBadge.className = badgeClass;
      sysBadge.textContent = badgeText;
    }
    if (modalBadge) {
      modalBadge.className = badgeClass;
      modalBadge.textContent = badgeText;
    }

    const token = window.LynislensState.activeEnrollmentToken || 'LL-TOKEN-DEFAULT';
    updateAgentCommandBoxes(token);
  }

  async function detectNetworkHostIps(applyFirst = false) {
    try {
      const res = await fetch('/api/network/info');
      if (!res.ok) return;
      const data = await res.json();
      const detected = data.detected_ips || [];
      const port = data.default_port || 8000;

      const sysContainer = document.getElementById('sysDetectedIpsContainer');
      const sysList = document.getElementById('sysDetectedIpsList');
      const modalContainer = document.getElementById('modalDetectedIpsContainer');
      const modalList = document.getElementById('modalDetectedIpsList');

      if (detected.length > 0) {
        if (sysContainer) sysContainer.style.display = 'flex';
        if (modalContainer) modalContainer.style.display = 'flex';

        const pillsHtml = detected.map(ip => {
          const url = `http://${ip}:${port}`;
          return `<button type="button" class="btn btn-sm btn-secondary btn-ip-pill" data-ip-url="${url}" style="padding: 2px 8px; font-size: 11px; font-family: var(--font-mono);">${ip}:${port}</button>`;
        }).join('');

        if (sysList) sysList.innerHTML = pillsHtml;
        if (modalList) modalList.innerHTML = pillsHtml;

        // Attach click listeners to pills
        document.querySelectorAll('.btn-ip-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-ip-url');
            if (url) {
              setEffectiveHubUrl(url);
              window.showToast(`Hub Host URL updated to ${url}`, 'success');
            }
          });
        });

        if (applyFirst && detected[0]) {
          const recommendedUrl = `http://${detected[0]}:${port}`;
          setEffectiveHubUrl(recommendedUrl);
          window.showToast(`Auto-detected Host LAN IP: ${recommendedUrl}`, 'info');
        }
      }
    } catch (err) {
      console.warn('Network auto-detection error:', err);
    }
  }

  function updateAgentCommandBoxes(token) {
    const hubUrl = getEffectiveHubUrl();
    const cronSelect = document.getElementById('sysCronIntervalSelect')?.value 
      || document.getElementById('agentCronIntervalSelect')?.value 
      || document.getElementById('settingsCronIntervalSelect')?.value 
      || 'daily';

    const cmd = `curl -sSL ${hubUrl}/install.sh | sudo bash -s -- --token ${token} --server ${hubUrl} --cron ${cronSelect}`;

    const agentCommandText = document.getElementById('agentCommandText');
    const sysSetupCommandText = document.getElementById('sysSetupCommandText');
    const sysSetupCommandTextPane = document.getElementById('sysSetupCommandTextPane');
    const nativeLynisInjectCmd = document.getElementById('nativeLynisInjectCmd');
    const nativeLynisPrfContent = document.getElementById('nativeLynisPrfContent');
    const sysSetupNativeInjectCmd = document.getElementById('sysSetupNativeInjectCmd');

    if (agentCommandText) agentCommandText.textContent = cmd;
    if (sysSetupCommandText) sysSetupCommandText.textContent = cmd;
    if (sysSetupCommandTextPane) sysSetupCommandTextPane.textContent = cmd;

    const injectStr = `echo -e "\\nupload=yes\\nupload_server=${hubUrl}/api/lynis/upload/\\nlicense_key=${token}" | sudo tee -a /etc/lynis/custom.prf`;
    if (nativeLynisInjectCmd) nativeLynisInjectCmd.textContent = injectStr;
    if (sysSetupNativeInjectCmd) sysSetupNativeInjectCmd.textContent = injectStr;

    if (nativeLynisPrfContent) {
      nativeLynisPrfContent.textContent = `upload=yes\nupload_server=${hubUrl}/api/lynis/upload/\nlicense_key=${token}`;
    }

    const sysSetupHealthCheckCmd = document.getElementById('sysSetupHealthCheckCmd');
    if (sysSetupHealthCheckCmd) sysSetupHealthCheckCmd.textContent = `curl ${hubUrl}/health`;

    const agentHealthCheckCmd = document.getElementById('agentHealthCheckCmd');
    if (agentHealthCheckCmd) agentHealthCheckCmd.textContent = `curl ${hubUrl}/health`;

    const sysSetupNativeCheckCmd = document.getElementById('sysSetupNativeCheckCmd');
    if (sysSetupNativeCheckCmd) sysSetupNativeCheckCmd.textContent = `curl -s ${hubUrl}/api/lynis/license/`;

    const nativeLynisCheckCmd = document.getElementById('nativeLynisCheckCmd');
    if (nativeLynisCheckCmd) nativeLynisCheckCmd.textContent = `curl -s ${hubUrl}/api/lynis/license/`;
  }

  function loadSavedSettings() {
    // 1. Idle Sleep / Auto-Logout Timeout
    const idleSelect = document.getElementById('settingsIdleTimeoutSelect');
    if (idleSelect && typeof window.getIdleTimeout === 'function') {
      const currentTimeout = window.getIdleTimeout();
      idleSelect.value = String(currentTimeout);
    }

    // 2. Profile Details
    const profileJson = localStorage.getItem('lynislens_profile');
    if (profileJson) {
      try {
        const profile = JSON.parse(profileJson);
        const orgNameInput = document.getElementById('settingsOrgName');
        const auditorNameInput = document.getElementById('settingsAuditorName');
        const benchmarkSelect = document.getElementById('settingsBenchmarkPolicy');
        if (orgNameInput && profile.company) orgNameInput.value = profile.company;
        if (auditorNameInput && profile.auditorName) auditorNameInput.value = profile.auditorName;
        if (benchmarkSelect && profile.benchmarkCode) benchmarkSelect.value = profile.benchmarkCode;
      } catch (e) {}
    }

    // 3. Webhook Settings
    const webhookJson = localStorage.getItem('lynislens_webhook');
    if (webhookJson) {
      try {
        const webhook = JSON.parse(webhookJson);
        const typeInput = document.getElementById('settingsWebhookType');
        const triggerInput = document.getElementById('settingsWebhookTrigger');
        const urlInput = document.getElementById('settingsWebhookUrl');

        if (typeInput && webhook.type) typeInput.value = webhook.type;
        if (triggerInput && webhook.trigger) triggerInput.value = webhook.trigger;
        if (urlInput && webhook.url) urlInput.value = webhook.url;
      } catch (e) {}
    }
  }

  function saveIdleTimeoutSetting() {
    const idleSelect = document.getElementById('settingsIdleTimeoutSelect');
    if (!idleSelect) return;
    const val = parseInt(idleSelect.value, 10);
    if (typeof window.setIdleTimeout === 'function') {
      window.setIdleTimeout(val);
      const label = idleSelect.options[idleSelect.selectedIndex]?.text || 'Timeout';
      window.showToast(`Inactivity Sleep Timeout set to: ${label}`, 'success');
    }
  }

  function saveProfileSettings() {
    const orgName = document.getElementById('settingsOrgName')?.value || 'Enterprise Security Hub';
    const auditorName = document.getElementById('settingsAuditorName')?.value || 'SecOps Auditor';
    const benchmarkCode = document.getElementById('settingsBenchmarkPolicy')?.value || 'CIS';

    const profile = {
      auditorName,
      company: orgName,
      role: 'Enterprise Security Lead',
      benchmarkCode: benchmarkCode,
      benchmark: `${benchmarkCode} Security Benchmark Policy`
    };

    localStorage.setItem('lynislens_profile', JSON.stringify(profile));
    if (typeof window.updateUserProfileDisplay === 'function') {
      window.updateUserProfileDisplay();
    }
    window.showToast('Auditor profile details saved.', 'success');
  }

  function saveWebhookSettings() {
    const type = document.getElementById('settingsWebhookType')?.value;
    const trigger = document.getElementById('settingsWebhookTrigger')?.value;
    const url = document.getElementById('settingsWebhookUrl')?.value;

    if (!url) {
      window.showToast('Please enter a valid webhook target endpoint URL.', 'error');
      return;
    }

    localStorage.setItem('lynislens_webhook', JSON.stringify({ type, trigger, url }));
    window.showToast('SecOps webhook configuration saved.', 'success');
  }

  async function testWebhookAlert() {
    const url = document.getElementById('settingsWebhookUrl')?.value;
    if (!url) {
      window.showToast('Please enter a target webhook URL before testing.', 'error');
      return;
    }

    window.showToast('Sending test alert payload to webhook endpoint...', 'info');
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: url })
      });
      if (res.ok) {
        window.showToast('Test alert dispatched successfully!', 'success');
      } else {
        window.showToast('Webhook endpoint returned an error status.', 'error');
      }
    } catch (err) {
      window.showToast('Network error dispatching test webhook.', 'error');
    }
  }

  function renderSettingsTab() {
    fetchEnrollmentToken();
    loadSavedSettings();
    if (typeof window.renderSettingsServersTable === 'function') {
      window.renderSettingsServersTable();
    }
  }

  window.fetchEnrollmentToken = fetchEnrollmentToken;
  window.generateNewToken = generateNewToken;
  window.updateAgentCommandBoxes = updateAgentCommandBoxes;
  window.renderSettingsTab = renderSettingsTab;
  window.saveIdleTimeoutSetting = saveIdleTimeoutSetting;
  window.getEffectiveHubUrl = getEffectiveHubUrl;
  window.setEffectiveHubUrl = setEffectiveHubUrl;
  window.detectNetworkHostIps = detectNetworkHostIps;

  document.addEventListener('DOMContentLoaded', () => {
    // Initialize Hub URL from storage or default
    const savedHubUrl = localStorage.getItem('lynislens_custom_hub_url') || window.location.origin;
    setEffectiveHubUrl(savedHubUrl, true);

    // Run network IP detection in background to discover LAN IPs
    detectNetworkHostIps(false);

    // Host IP input listeners for real-time dynamic updates on every keystroke/paste
    const sysCustomHubUrl = document.getElementById('sysCustomHubUrl');
    const modalCustomHubUrl = document.getElementById('modalCustomHubUrl');

    if (sysCustomHubUrl) {
      ['input', 'keyup', 'paste', 'change'].forEach(evt => {
        sysCustomHubUrl.addEventListener(evt, () => {
          setEffectiveHubUrl(sysCustomHubUrl.value, false);
          if (modalCustomHubUrl && modalCustomHubUrl.value !== sysCustomHubUrl.value) {
            modalCustomHubUrl.value = sysCustomHubUrl.value;
          }
        });
      });
    }

    if (modalCustomHubUrl) {
      ['input', 'keyup', 'paste', 'change'].forEach(evt => {
        modalCustomHubUrl.addEventListener(evt, () => {
          setEffectiveHubUrl(modalCustomHubUrl.value, false);
          if (sysCustomHubUrl && sysCustomHubUrl.value !== modalCustomHubUrl.value) {
            sysCustomHubUrl.value = modalCustomHubUrl.value;
          }
        });
      });
    }

    // Auto-detect and reset buttons
    const btnDetectSysHostIp = document.getElementById('btnDetectSysHostIp');
    const btnDetectModalHostIp = document.getElementById('btnDetectModalHostIp');
    const btnResetSysHostIp = document.getElementById('btnResetSysHostIp');

    if (btnDetectSysHostIp) {
      btnDetectSysHostIp.addEventListener('click', () => {
        detectNetworkHostIps(true);
      });
    }

    if (btnDetectModalHostIp) {
      btnDetectModalHostIp.addEventListener('click', () => {
        detectNetworkHostIps(true);
      });
    }

    if (btnResetSysHostIp) {
      btnResetSysHostIp.addEventListener('click', () => {
        setEffectiveHubUrl(window.location.origin, true);
        window.showToast('Reset Hub Host URL to localhost origin.', 'info');
      });
    }

    const btnSettingsRefreshToken = document.getElementById('btnSettingsRefreshToken');
    const btnSysRefreshToken = document.getElementById('btnSysRefreshToken');
    const btnRefreshTokens = document.getElementById('btnRefreshTokens');
    const btnRefreshTokensNative = document.getElementById('btnRefreshTokensNative');
    
    const btnSettingsSaveProfile = document.getElementById('btnSettingsSaveProfile');
    const btnSaveWebhook = document.getElementById('btnSaveWebhook');
    const btnTestWebhook = document.getElementById('btnTestWebhook');
    const btnSaveIdleTimeout = document.getElementById('btnSaveIdleTimeout');
    const settingsIdleTimeoutSelect = document.getElementById('settingsIdleTimeoutSelect');

    const btnSettingsCopyCmd = document.getElementById('btnSettingsCopyCmd');
    const btnCopySysCmd = document.getElementById('btnCopySysCmd');
    const btnCopySysCmdPane = document.getElementById('btnCopySysCmdPane');

    const agentCronIntervalSelect = document.getElementById('agentCronIntervalSelect');
    const sysCronIntervalSelect = document.getElementById('sysCronIntervalSelect');
    const settingsCronIntervalSelect = document.getElementById('settingsCronIntervalSelect');

    [btnSettingsRefreshToken, btnSysRefreshToken, btnRefreshTokens, btnRefreshTokensNative].forEach(btn => {
      if (btn) btn.addEventListener('click', generateNewToken);
    });

    if (btnSettingsSaveProfile) btnSettingsSaveProfile.addEventListener('click', saveProfileSettings);
    if (btnSaveWebhook) btnSaveWebhook.addEventListener('click', saveWebhookSettings);
    if (btnTestWebhook) btnTestWebhook.addEventListener('click', testWebhookAlert);
    if (btnSaveIdleTimeout) btnSaveIdleTimeout.addEventListener('click', saveIdleTimeoutSetting);

    if (settingsIdleTimeoutSelect) {
      settingsIdleTimeoutSelect.addEventListener('change', saveIdleTimeoutSetting);
    }

    [btnSettingsCopyCmd, btnCopySysCmd, btnCopySysCmdPane].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          const hubUrl = getEffectiveHubUrl();
          const token = window.LynislensState.activeEnrollmentToken || 'LL-TOKEN-DEFAULT';
          const cronVal = (sysCronIntervalSelect || agentCronIntervalSelect || settingsCronIntervalSelect)?.value || 'daily';
          const cmd = `curl -sSL ${hubUrl}/install.sh | sudo bash -s -- --token ${token} --server ${hubUrl} --cron ${cronVal}`;
          window.copyToClipboard(cmd, btn, '1-Line install command copied to clipboard!');
        });
      }
    });

    [agentCronIntervalSelect, sysCronIntervalSelect, settingsCronIntervalSelect].forEach(sel => {
      if (sel) {
        sel.addEventListener('change', () => {
          const val = sel.value;
          [agentCronIntervalSelect, sysCronIntervalSelect, settingsCronIntervalSelect].forEach(other => {
            if (other && other !== sel) other.value = val;
          });
          if (window.LynislensState.activeEnrollmentToken) {
            updateAgentCommandBoxes(window.LynislensState.activeEnrollmentToken);
          }
        });
      }
    });

    // Settings tab change password form
    const settingsChangePasswordForm = document.getElementById('settingsChangePasswordForm');
    if (settingsChangePasswordForm) {
      settingsChangePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currInput = document.getElementById('settingsCurrentPass');
        const nextInput = document.getElementById('settingsNewPass');
        const confInput = document.getElementById('settingsConfirmPass');

        const curr = currInput ? currInput.value.trim() : '';
        const next = nextInput ? nextInput.value.trim() : '';
        const conf = confInput ? confInput.value.trim() : '';

        const validPass = typeof window.getMasterPassword === 'function' ? window.getMasterPassword() : 'lynislens';

        if (curr !== validPass) {
          window.showToast('Current master password is incorrect.', 'error');
          return;
        }
        if (next.length < 6) {
          window.showToast('New password must be at least 6 characters.', 'error');
          return;
        }
        if (next !== conf) {
          window.showToast('New passwords do not match.', 'error');
          return;
        }

        if (typeof window.setMasterPassword === 'function') {
          window.setMasterPassword(next);
        }
        settingsChangePasswordForm.reset();
        window.showToast('Master Access Password updated successfully!', 'success');
      });
    }
  });
})();
