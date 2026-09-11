/**
 * Lynislens Enterprise Suite — Real-Time SSE Streaming Client
 * Version 2.0.0
 */

(function() {
  function startLiveAuditStream() {
    if (window.LynislensState.eventSource) {
      window.LynislensState.eventSource.close();
    }

    const stateScanning = document.getElementById('scanningState');
    const stateResults = document.getElementById('resultsState');
    const stateEmpty = document.getElementById('emptyState');

    if (stateEmpty) stateEmpty.classList.remove('active');
    if (stateResults) stateResults.classList.remove('active');
    if (stateScanning) stateScanning.classList.add('active');

    const radarProgressBar = document.getElementById('radarProgressBar');
    const radarTickerMessage = document.getElementById('radarTickerMessage');
    const radarStageTitle = document.getElementById('radarStageTitle');

    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');

    if (step1) step1.className = 'step active';
    if (step2) step2.className = 'step';
    if (step3) step3.className = 'step';
    if (step4) step4.className = 'step';

    if (radarProgressBar) radarProgressBar.style.width = '10%';
    if (radarStageTitle) radarStageTitle.textContent = 'Initializing Audit Worker...';
    if (radarTickerMessage) radarTickerMessage.textContent = 'Spawning Lynis privileged diagnostic engine...';

    // Construct SSE stream URL
    let streamUrl = '/api/scan/stream';
    if (window.LynislensState.currentServerId) {
      streamUrl += `?server_id=${window.LynislensState.currentServerId}`;
    }

    const evtSource = new EventSource(streamUrl);
    window.LynislensState.eventSource = evtSource;

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Error handling
        if (data.error || data.stage === 'Failed' || data.status === 'error') {
          evtSource.close();
          if (stateScanning) stateScanning.classList.remove('active');
          if (stateEmpty) stateEmpty.classList.add('active');
          window.showToast(data.message || data.error || 'Audit execution encountered an error.', 'error');
          return;
        }

        // 2. Scan Completion handling
        if (data.is_complete || data.stage === 'Completed' || data.status === 'completed' || (data.progress_percent && data.progress_percent >= 100)) {
          evtSource.close();
          if (radarProgressBar) radarProgressBar.style.width = '100%';
          if (radarStageTitle) radarStageTitle.textContent = 'Audit Completed!';
          if (radarTickerMessage) radarTickerMessage.textContent = data.message || 'Ingesting report scorecard...';

          if (step1) step1.className = 'step active';
          if (step2) step2.className = 'step active';
          if (step3) step3.className = 'step active';
          if (step4) step4.className = 'step active';

          setTimeout(() => {
            if (data.scorecard) {
              const eventServerId = data.server_id !== undefined && data.server_id !== null ? Number(data.server_id) : null;
              if (eventServerId !== null) {
                window.LynislensState.currentServerId = eventServerId;
                try { localStorage.setItem('lynislens_selected_server', String(eventServerId)); } catch(e){}
                if (typeof window.updateTargetServerSelect === 'function') {
                  window.updateTargetServerSelect();
                }
              }
              if (window.LynislensState.currentServerId === null) {
                window.LynislensState.localScorecard = data.scorecard;
              }
              window.LynislensState.currentScorecard = data.scorecard;
              if (typeof window.updateDashboardView === 'function') {
                window.updateDashboardView(data.scorecard);
              }
              if (typeof window.renderFindingsFeed === 'function') {
                window.renderFindingsFeed(data.scorecard);
              }
              if (typeof window.refreshDashboardSnapshotDropdown === 'function') {
                window.refreshDashboardSnapshotDropdown();
              }
            } else if (typeof window.fetchLatestScan === 'function') {
              window.fetchLatestScan();
            }

            if (typeof window.renderComplianceTab === 'function') {
              window.renderComplianceTab();
            }
            if (typeof window.renderImprovementTab === 'function') {
              window.renderImprovementTab();
            }
            if (typeof window.fetchServersList === 'function') {
              window.fetchServersList();
            }
            window.showToast('Security audit completed successfully!', 'success');
          }, 600);
          return;
        }

        // 3. Live in-progress updates
        const pct = data.progress_percent || 10;
        if (radarProgressBar) radarProgressBar.style.width = `${pct}%`;
        if (radarStageTitle) radarStageTitle.textContent = data.stage || 'Executing Security Tests...';
        if (radarTickerMessage) radarTickerMessage.textContent = data.message || 'Analyzing security posture...';

        if (pct >= 25 && step2) step2.className = 'step active';
        if (pct >= 50 && step3) step3.className = 'step active';
        if (pct >= 75 && step4) step4.className = 'step active';
      } catch (err) {
        console.error('SSE Message parsing error:', err);
      }
    };

    evtSource.onerror = (err) => {
      console.warn('SSE stream closed or interrupted:', err);
      evtSource.close();
      setTimeout(() => {
        if (typeof window.fetchLatestScan === 'function') {
          window.fetchLatestScan();
        }
      }, 1000);
    };
  }

  let ambientSource = null;

  function initAmbientSSEStream() {
    if (ambientSource) {
      ambientSource.close();
      ambientSource = null;
    }

    try {
      ambientSource = new EventSource('/api/scan/stream');
      ambientSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.is_complete || data.stage === 'Completed' || data.status === 'completed' || data.scorecard) {
            // Always refresh servers fleet list in background
            if (typeof window.fetchServersList === 'function') {
              window.fetchServersList();
            }

            const activeServerId = window.LynislensState.currentServerId;
            const eventServerId = data.server_id !== undefined && data.server_id !== null ? Number(data.server_id) : null;
            
            const snapshotSelect = document.getElementById('dashboardSnapshotSelect');
            const isViewingLatest = !snapshotSelect || snapshotSelect.value === 'latest';

            const isLocalMatch = (activeServerId === null && eventServerId === null);
            const isServerMatch = (activeServerId !== null && eventServerId !== null && Number(activeServerId) === eventServerId);

            // Update if exact target match OR if currently viewing live latest audit
            if (isLocalMatch || isServerMatch || isViewingLatest) {
              if (data.scorecard) {
                if (eventServerId !== null && (activeServerId === null || isViewingLatest)) {
                  window.LynislensState.currentServerId = eventServerId;
                  try { localStorage.setItem('lynislens_selected_server', String(eventServerId)); } catch(e){}
                  if (typeof window.updateTargetServerSelect === 'function') {
                    window.updateTargetServerSelect();
                  }
                }
                if (window.LynislensState.currentServerId === null) {
                  window.LynislensState.localScorecard = data.scorecard;
                }
                window.LynislensState.currentScorecard = data.scorecard;
                if (typeof window.updateDashboardView === 'function') {
                  window.updateDashboardView(data.scorecard);
                }
                if (typeof window.renderFindingsFeed === 'function') {
                  window.renderFindingsFeed(data.scorecard);
                }
                if (typeof window.renderComplianceTab === 'function') {
                  window.renderComplianceTab();
                }
                if (typeof window.renderImprovementTab === 'function') {
                  window.renderImprovementTab();
                }
                if (typeof window.refreshDashboardSnapshotDropdown === 'function') {
                  window.refreshDashboardSnapshotDropdown();
                }
              } else if (typeof window.fetchLatestScan === 'function') {
                window.fetchLatestScan();
              }
            }
          }
        } catch (e) {}
      };
      ambientSource.onerror = () => {
        if (ambientSource) ambientSource.close();
        ambientSource = null;
        setTimeout(initAmbientSSEStream, 5000);
      };
    } catch (err) {
      console.warn('Could not initialize ambient SSE stream:', err);
    }
  }

  window.startLiveAuditStream = startLiveAuditStream;
  window.initAmbientSSEStream = initAmbientSSEStream;
})();
