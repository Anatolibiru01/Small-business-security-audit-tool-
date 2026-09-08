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

        if (data.status === 'in_progress') {
          const stepNum = data.step || 1;
          const pct = Math.min(Math.max(stepNum * 25, 10), 95);
          if (radarProgressBar) radarProgressBar.style.width = `${pct}%`;
          if (radarStageTitle) radarStageTitle.textContent = data.stage || 'Executing Security Tests...';
          if (radarTickerMessage) radarTickerMessage.textContent = data.message || 'Analyzing security posture...';

          if (stepNum >= 2 && step2) step2.className = 'step active';
          if (stepNum >= 3 && step3) step3.className = 'step active';
          if (stepNum >= 4 && step4) step4.className = 'step active';
        } else if (data.status === 'completed') {
          evtSource.close();
          if (radarProgressBar) radarProgressBar.style.width = '100%';
          if (radarStageTitle) radarStageTitle.textContent = 'Audit Completed!';
          if (radarTickerMessage) radarTickerMessage.textContent = 'Ingesting report scorecard...';

          setTimeout(() => {
            if (typeof window.fetchLatestScan === 'function') {
              window.fetchLatestScan();
            }
            window.showToast('Security audit completed successfully!', 'success');
          }, 600);
        } else if (data.status === 'error') {
          evtSource.close();
          if (stateScanning) stateScanning.classList.remove('active');
          if (stateEmpty) stateEmpty.classList.add('active');
          window.showToast(data.message || 'Audit execution encountered an error.', 'error');
        }
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
          if (data.is_complete || data.stage === 'Completed' || data.scorecard) {
            // Always refresh servers fleet list in background
            if (typeof window.fetchServersList === 'function') {
              window.fetchServersList();
            }

            // Only refresh the main dashboard view if the event belongs to the currently active target
            const activeServerId = window.LynislensState.currentServerId;
            const eventServerId = data.server_id !== undefined && data.server_id !== null ? Number(data.server_id) : null;
            
            const isLocalMatch = (activeServerId === null && eventServerId === null);
            const isServerMatch = (activeServerId !== null && eventServerId !== null && Number(activeServerId) === eventServerId);

            if (isLocalMatch || isServerMatch) {
              if (typeof window.fetchLatestScan === 'function') {
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
