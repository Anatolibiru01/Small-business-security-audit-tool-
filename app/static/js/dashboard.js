/**
 * Lynislens Enterprise Suite — Dashboard Analytics & Executive Visualizations
 * Version 2.0.0
 */

(function() {
  function getThemeChartTextColor() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? '#94a3b8' : '#475569';
  }

  function getThemeGridColor() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)';
  }

  // =========================================================================
  // DYNAMIC TIME & CALENDAR MATRIX MODULE
  // =========================================================================
  let currentSelectedDate = new Date();

  function getAuditTimestamp(scorecard) {
    if (scorecard) {
      const ts = scorecard.scan_time || scorecard.timestamp;
      if (ts) {
        // Handle "YYYY-MM-DD HH:MM:SS" or ISO formats
        const parsed = new Date(typeof ts === 'string' ? ts.replace(' ', 'T') : ts);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return new Date();
  }

  function updateCalendarMatrix(targetDateOrScorecard) {
    let targetDate;
    if (targetDateOrScorecard instanceof Date) {
      targetDate = targetDateOrScorecard;
    } else if (targetDateOrScorecard && typeof targetDateOrScorecard === 'object') {
      targetDate = getAuditTimestamp(targetDateOrScorecard);
    } else {
      targetDate = new Date();
    }
    currentSelectedDate = targetDate;

    const curYear = targetDate.getFullYear();
    const curMonth = targetDate.getMonth(); // 0 to 11

    // Update Year Selector Buttons
    const yearContainer = document.getElementById('calYearRow');
    if (yearContainer) {
      const years = [curYear - 2, curYear - 1, curYear, curYear + 1];
      yearContainer.innerHTML = '';
      years.forEach(yr => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `cal-year-btn ${yr === curYear ? 'active' : ''}`;
        btn.textContent = yr;
        btn.onclick = (e) => {
          e.preventDefault();
          document.querySelectorAll('.cal-year-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentSelectedDate.setFullYear(yr);
          if (window.LynislensState && window.LynislensState.trendChart) {
            window.LynislensState.trendChart.update();
          }
        };
        yearContainer.appendChild(btn);
      });
    }

    // Update Month Buttons (Highlight the actual current month)
    const monthBtns = document.querySelectorAll('.cal-month-btn');
    monthBtns.forEach((btn) => {
      const mIdx = parseInt(btn.getAttribute('data-month'), 10);
      if (mIdx === curMonth) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      btn.onclick = (e) => {
        e.preventDefault();
        monthBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSelectedDate.setMonth(mIdx);
        // Refresh trend chart highlight to this month
        if (window.LynislensState && window.LynislensState.trendChart) {
          const chart = window.LynislensState.trendChart;
          if (chart.data && chart.data.datasets && chart.data.datasets.length >= 2) {
            chart.data.datasets[0].pointRadius = (ctx) => ctx.dataIndex === mIdx ? 6 : 0;
            chart.data.datasets[1].backgroundColor = chart.data.datasets[1].data.map((_, i) => i === mIdx ? '#0d9488' : 'rgba(148, 163, 184, 0.4)');
            chart.update();
          }
        }
      };
    });
  }

  function initLiveTimeClock() {
    function tick() {
      const now = new Date();
      const clockElem = document.getElementById('auditLiveClock');
      if (clockElem) {
        const monthShort = now.toLocaleString('en-US', { month: 'short' });
        const day = now.getDate();
        const year = now.getFullYear();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        clockElem.textContent = `${monthShort} ${day}, ${year} • ${timeStr}`;
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  function renderExecutiveSummary(scorecard) {
    if (!scorecard) return;

    // Helper function for smooth animated number ticker
    function animateValue(elem, targetVal, duration = 1200, suffix = '') {
      if (!elem || targetVal === null || targetVal === undefined || isNaN(targetVal)) return;
      const start = 0;
      const startTime = performance.now();
      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.round(start + (targetVal - start) * ease);
        elem.textContent = `${current}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          elem.textContent = `${targetVal}${suffix}`;
        }
      }
      requestAnimationFrame(tick);
    }

    // Score & Grade
    const scoreNumber = document.getElementById('scoreNumber');
    const gradeBadge = document.getElementById('gradeBadge');
    const score = (scorecard.overall_score !== undefined && scorecard.overall_score !== null)
      ? scorecard.overall_score
      : (scorecard.hardening_index !== undefined ? scorecard.hardening_index : null);

    if (scoreNumber) {
      if (score !== null) {
        animateValue(scoreNumber, score, 1400);
        if (score >= 90) scoreNumber.style.color = '#10b981';
        else if (score >= 80) scoreNumber.style.color = '#0d9488';
        else if (score >= 70) scoreNumber.style.color = '#d97706';
        else if (score >= 60) scoreNumber.style.color = '#ea580c';
        else scoreNumber.style.color = '#ef4444';
      } else {
        scoreNumber.textContent = '--';
      }
    }

    if (gradeBadge) {
      let grade = scorecard.letter_grade;
      if (score !== null) {
        const s = score;
        if (s >= 95) grade = 'A+';
        else if (s >= 90) grade = 'A';
        else if (s >= 80) grade = 'B';
        else if (s >= 70) grade = 'C';
        else if (s >= 60) grade = 'D';
        else grade = 'F';
      }
      grade = grade || 'C';
      gradeBadge.textContent = `Grade ${grade}`;
      gradeBadge.className = `grade-badge grade-${grade.toLowerCase().replace(/[^a-z]/g, '')}`;
    }

    // Host & System Info
    const hostNameVal = document.getElementById('hostNameVal');
    const osNameVal = document.getElementById('osNameVal');
    const nodeIpVal = document.getElementById('nodeIpVal');
    const kernelVal = document.getElementById('kernelVal');
    const nodePkgsVal = document.getElementById('nodePkgsVal');
    const metricFirewall = document.getElementById('metricFirewall');

    if (hostNameVal) hostNameVal.textContent = scorecard.hostname || 'Local Machine';
    if (osNameVal) osNameVal.textContent = `${scorecard.os_name || 'Linux OS'} ${scorecard.os_version || ''}`.trim();
    if (nodeIpVal) nodeIpVal.textContent = scorecard.ip_address || '127.0.0.1';
    if (kernelVal) kernelVal.textContent = scorecard.os_kernel_version || scorecard.kernel || '--';
    if (nodePkgsVal) {
      const pkgs = scorecard.installed_packages || 0;
      const vuln = scorecard.vulnerable_packages || 0;
      nodePkgsVal.textContent = vuln > 0 ? `${pkgs} pkgs (${vuln} vuln)` : `${pkgs} pkgs`;
    }

    if (metricFirewall) {
      if (scorecard.firewall_active) {
        metricFirewall.innerHTML = '<span class="badge-status status-connected"><i class="fas fa-shield-alt"></i> Active & Filtering</span>';
      } else {
        metricFirewall.innerHTML = '<span class="badge-status status-disconnected"><i class="fas fa-shield-slash"></i> Inactive / Open</span>';
      }
    }

    // Hardening Index & Metrics
    const hardeningIndexVal = document.getElementById('hardeningIndexVal');
    const kpiHardeningScore = document.getElementById('kpiHardeningScore');
    const riskLevelPill = document.getElementById('riskLevelPill');
    const metricWarnings = document.getElementById('metricWarnings');
    const metricSuggestions = document.getElementById('metricSuggestions');

    const hIndex = (scorecard.hardening_index !== undefined && scorecard.hardening_index !== null)
      ? scorecard.hardening_index
      : ((scorecard.overall_score !== undefined && scorecard.overall_score !== null) ? scorecard.overall_score : (score !== null ? score : null));
    if (hardeningIndexVal) {
      hardeningIndexVal.textContent = `${hIndex !== null ? hIndex : '--'} / 100 Audit Score`;
    }
    if (kpiHardeningScore && hIndex !== null) {
      animateValue(kpiHardeningScore, hIndex, 1200, '%');
    }

    // KPI Card 4: Remediation & Benchmark Progress with Slider
    const kpiRemediationPercent = document.getElementById('kpiRemediationPercent');
    const kpiSliderFill = document.getElementById('kpiSliderFill');
    const kpiSliderThumb = document.getElementById('kpiSliderThumb');
    const kpiTasksFixedLabel = document.getElementById('kpiTasksFixedLabel');
    const crit = scorecard.critical_count || 0;
    const high = scorecard.high_count || 0;
    const med = scorecard.medium_count || 0;
    const low = scorecard.low_count || 0;
    const totalFindings = crit + high + med + low;
    
    let compliancePct = 60;
    let passedControls = 24;
    let totalControls = 32;

    if (typeof window.computeFrameworkScore === 'function') {
      const fwData = window.computeFrameworkScore('CIS', scorecard);
      if (fwData && fwData.score) {
        compliancePct = fwData.score;
        passedControls = fwData.passed;
        totalControls = (fwData.passed + fwData.failed + fwData.partial) || 32;
      }
    } else if (scorecard.compliance_score) {
      compliancePct = Math.round(scorecard.compliance_score);
    } else if (score !== null) {
      compliancePct = Math.min(Math.max(Math.round(score * 0.92), 35), 98);
    }

    if (kpiRemediationPercent) {
      animateValue(kpiRemediationPercent, compliancePct, 1200, '%');
    }
    if (kpiSliderFill) {
      setTimeout(() => { kpiSliderFill.style.width = `${compliancePct}%`; }, 150);
    }
    if (kpiSliderThumb) {
      setTimeout(() => { kpiSliderThumb.style.left = `${compliancePct}%`; }, 150);
    }
    if (kpiTasksFixedLabel) {
      kpiTasksFixedLabel.textContent = `${passedControls} / ${totalControls} CIS Controls Compliant`;
    }

    if (riskLevelPill) {
      const risk = scorecard.risk_level || 'Moderate Risk';
      riskLevelPill.textContent = risk;
      riskLevelPill.className = 'badge-priority ' + (
        risk.includes('Critical') ? 'priority-p1' :
        risk.includes('High') ? 'priority-p2' :
        risk.includes('Moderate') ? 'priority-p3' : 'priority-p4'
      );
    }

    if (metricWarnings) metricWarnings.textContent = crit + high;
    if (metricSuggestions) metricSuggestions.textContent = med + low;

    const findingsCountBadge = document.getElementById('findingsCountBadge');
    if (findingsCountBadge) {
      findingsCountBadge.textContent = (scorecard.remediation_feed && scorecard.remediation_feed.length) || scorecard.total_findings || totalFindings;
    }

    // Right Column: Security Subsystems Control Progress Bars (Dynamic from scorecard)
    const categories = scorecard.categories || {};
    const taskContainer = document.getElementById('taskManagerList');
    if (taskContainer) {
      const standardCats = [
        { name: 'Identity & Access', key: 'identity', defaultScore: 85, colorClass: 'bar-blue' },
        { name: 'Kernel & OS Posture', key: 'kernel', defaultScore: 75, colorClass: 'bar-teal' },
        { name: 'Network & Perimeter', key: 'network', defaultScore: 80, colorClass: 'bar-emerald' },
        { name: 'Patch & Packages', key: 'patch', defaultScore: 90, colorClass: 'bar-orange' },
        { name: 'Logging & Forensics', key: 'log', defaultScore: 70, colorClass: 'bar-blue' }
      ];

      taskContainer.innerHTML = standardCats.map((cat, i) => {
        const foundKey = Object.keys(categories).find(k => k.toLowerCase().includes(cat.key));
        const catData = foundKey ? categories[foundKey] : null;
        const score = (catData && catData.score !== undefined) ? Math.round(catData.score) : cat.defaultScore;
        const issues = catData ? catData.total_issues : 0;
        
        let barColor = cat.colorClass;
        if (score < 60) barColor = 'bar-red';
        else if (score < 75) barColor = 'bar-orange';

        return `
          <div class="task-row" title="${window.escapeHtml(cat.name)}: ${score}% (${issues} active findings)">
            <span class="task-label" title="${window.escapeHtml(cat.name)}">${window.escapeHtml(cat.name)}</span>
            <div class="task-bar-track">
              <div class="task-bar-fill ${barColor}" id="dynTaskBar_${i}" style="width: 0%;"></div>
            </div>
            <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-main); min-width: 34px; text-align: right;">${score}%</span>
          </div>
        `;
      }).join('');

      setTimeout(() => {
        standardCats.forEach((cat, i) => {
          const bar = document.getElementById(`dynTaskBar_${i}`);
          if (bar) {
            const foundKey = Object.keys(categories).find(k => k.toLowerCase().includes(cat.key));
            const catData = foundKey ? categories[foundKey] : null;
            const score = (catData && catData.score !== undefined) ? Math.round(catData.score) : cat.defaultScore;
            bar.style.width = `${score}%`;
          }
        });
      }, 150);
    }

    // Update dynamic calendar matrix based on audit time
    updateCalendarMatrix(scorecard);
  }

  function renderDoughnutChart(scorecard) {
    const ctx = document.getElementById('severityPieChart');
    if (!ctx) return;

    if (window.LynislensState.pieChart) {
      window.LynislensState.pieChart.destroy();
    }

    const crit = scorecard.critical_count || 0;
    const high = scorecard.high_count || 0;
    const med = scorecard.medium_count || 0;
    const low = scorecard.low_count || 0;
    const totalFindings = crit + high + med + low;
    const info = (scorecard.total_findings || totalFindings) - totalFindings;

    const legendCountRed = document.getElementById('legendCountRed');
    const legendCountYellow = document.getElementById('legendCountYellow');
    const legendCountGreen = document.getElementById('legendCountGreen');
    const legendCountBlue = document.getElementById('legendCountBlue');

    if (legendCountRed) legendCountRed.textContent = crit + high;
    if (legendCountYellow) legendCountYellow.textContent = med;
    if (legendCountGreen) legendCountGreen.textContent = low;
    if (legendCountBlue) legendCountBlue.textContent = Math.max(info, 0);

    const chartData = (totalFindings === 0 && info === 0)
      ? [0, 0, 1, 0]
      : [crit + high, med, low, Math.max(info, 0)];

    window.LynislensState.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical / High Warnings', 'Medium Suggestions', 'Low Priority Hardening', 'Informational Items'],
        datasets: [{
          data: chartData,
          backgroundColor: ['#ef4444', '#f59e0b', '#0d9488', '#38bdf8'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1800,
          easing: 'easeOutCubic'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { size: 12, family: 'Inter' },
            bodyFont: { size: 12, family: 'Inter' },
            padding: 10,
            cornerRadius: 8
          }
        }
      }
    });
  }

  function renderCategoryBarChart(scorecard) {
    const ctx = document.getElementById('categoryBarChart');
    if (!ctx) return;

    if (window.LynislensState.barChart) {
      window.LynislensState.barChart.destroy();
    }

    const categories = scorecard.categories || {};
    const standardKeys = [
      { key: 'network', label: 'Network' },
      { key: 'identity', label: 'Identity' },
      { key: 'patch', label: 'Patching' },
      { key: 'log', label: 'Logging' },
      { key: 'kernel', label: 'Kernel & OS' }
    ];

    let labels = [];
    let dataVals = [];

    if (Object.keys(categories).length > 0) {
      standardKeys.forEach(sk => {
        const found = Object.keys(categories).find(k => k.toLowerCase().includes(sk.key));
        labels.push(sk.label);
        dataVals.push(found && categories[found].score !== undefined ? Math.round(categories[found].score) : 80);
      });
    } else {
      labels = standardKeys.map(k => k.label);
      dataVals = [85, 70, 90, 75, 80];
    }

    // Compute average score
    const avgScore = dataVals.length ? Math.round(dataVals.reduce((a, b) => a + b, 0) / dataVals.length) : 0;
    const categoryAvgBadge = document.getElementById('categoryAvgBadge');
    if (categoryAvgBadge) categoryAvgBadge.textContent = `Avg: ${avgScore}%`;

    window.LynislensState.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Audit Score %',
            data: dataVals,
            backgroundColor: dataVals.map(v => v >= 80 ? 'rgba(13, 148, 136, 0.85)' : v >= 60 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(239, 68, 68, 0.85)'),
            hoverBackgroundColor: dataVals.map(v => v >= 80 ? '#0d9488' : v >= 60 ? '#f59e0b' : '#ef4444'),
            borderRadius: 6,
            barPercentage: 0.55
          },
          {
            label: 'Baseline Target (100%)',
            data: dataVals.map(() => 100),
            backgroundColor: 'rgba(148, 163, 184, 0.15)',
            hoverBackgroundColor: 'rgba(148, 163, 184, 0.25)',
            borderRadius: 6,
            barPercentage: 0.55
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1800,
          easing: 'easeOutQuart',
          delay: (ctx) => ctx.type === 'data' ? ctx.dataIndex * 90 + ctx.datasetIndex * 60 : 0
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: getThemeGridColor() },
            ticks: { color: getThemeChartTextColor(), font: { size: 9.5, family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: getThemeChartTextColor(), font: { size: 9, family: 'Inter' } }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, boxHeight: 10, font: { size: 9.5, family: 'Inter' }, color: getThemeChartTextColor() }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { size: 11, family: 'Inter' },
            bodyFont: { size: 11, family: 'Inter' },
            padding: 8,
            cornerRadius: 6
          }
        }
      }
    });
  }

  async function renderHistoryTrendChart(scorecard) {
    const ctx = document.getElementById('historyTrendChart');
    if (!ctx) return;

    if (window.LynislensState.trendChart) {
      window.LynislensState.trendChart.destroy();
    }

    const currentScore = (scorecard && (scorecard.hardening_index !== undefined && scorecard.hardening_index !== null ? scorecard.hardening_index : scorecard.overall_score)) || 70;
    const auditDate = getAuditTimestamp(scorecard);
    const curMonthIdx = auditDate.getMonth(); // 0 to 11

    const currentServerId = window.LynislensState.currentServerId;
    const targetQuery = (currentServerId !== null && currentServerId !== undefined) ? String(currentServerId) : 'local';

    let historyScans = [];
    try {
      const res = await fetch(`/api/history?server_id=${targetQuery}&limit=10`);
      if (res.ok) {
        historyScans = await res.json();
      }
    } catch (e) {
      console.warn('Could not load history for trend chart:', e);
    }

    // Chronological scans (oldest to newest)
    let sortedScans = Array.isArray(historyScans) ? [...historyScans].reverse() : [];

    let labels = [];
    let trendScores = [];
    let activityBars = [];

    if (sortedScans.length >= 2) {
      sortedScans.forEach(s => {
        let d = new Date(s.timestamp);
        if (isNaN(d.getTime())) d = auditDate;
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(label);
        trendScores.push(s.overall_score !== undefined && s.overall_score !== null ? s.overall_score : currentScore);
        activityBars.push(s.total_findings || 5);
      });
    } else {
      // 12 Months timeline adapting to real audit month
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      labels = months;
      trendScores = months.map((_, i) => i === curMonthIdx ? currentScore : null);
      activityBars = months.map((_, i) => i === curMonthIdx ? Math.max((scorecard ? (scorecard.total_findings || 7) : 7) * 8, 30) : 0);
    }

    const isSingleMonthMode = labels.length === 12;
    const barColors = activityBars.map((_, i) => (isSingleMonthMode && i === curMonthIdx) ? '#0d9488' : 'rgba(148, 163, 184, 0.35)');

    window.LynislensState.trendChart = new Chart(ctx, {
      data: {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: 'Hardening Index',
            data: trendScores,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.08)',
            fill: true,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 2.5,
            pointRadius: (ctx) => (!isSingleMonthMode || ctx.dataIndex === curMonthIdx) ? 6 : 0,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#0d9488',
            pointBorderWidth: 3,
            order: 1
          },
          {
            type: 'bar',
            label: 'Audit Activity',
            data: activityBars,
            backgroundColor: barColors,
            borderRadius: 4,
            barPercentage: 0.55,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1800,
          easing: 'easeOutQuart'
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: getThemeGridColor() },
            ticks: { color: getThemeChartTextColor(), font: { size: 9, family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: getThemeChartTextColor(), font: { size: 8.5, family: 'Inter' } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { size: 11, family: 'Inter' },
            bodyFont: { size: 11, family: 'Inter' },
            padding: 8,
            cornerRadius: 6
          }
        }
      }
    });
  }

  function renderDefenseRadarChart(scorecard) {
    const ctx = document.getElementById('defenseRadarChart');
    if (!ctx) return;

    if (window.LynislensState.radarChart) {
      window.LynislensState.radarChart.destroy();
    }

    const categories = scorecard.categories || {};
    function getCatScore(keyword, defaultVal) {
      const found = Object.keys(categories).find(k => k.toLowerCase().includes(keyword.toLowerCase()));
      if (found && categories[found].score !== undefined) {
        return Math.round(categories[found].score);
      }
      return defaultVal;
    }

    const domainLabels = [
      'Identity & Access',
      'Kernel & Memory',
      'Network & Firewall',
      'Crypto & TLS',
      'Logging & Audit',
      'Patch & Integrity'
    ];

    const radarValues = [
      getCatScore('identity', 85),
      getCatScore('kernel', 75),
      getCatScore('network', 80),
      getCatScore('crypto', 90),
      getCatScore('log', 70),
      getCatScore('patch', 90)
    ];

    window.LynislensState.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: domainLabels,
        datasets: [{
          label: 'Defense Health %',
          data: radarValues,
          backgroundColor: 'rgba(168, 85, 247, 0.22)',
          borderColor: '#a855f7',
          borderWidth: 2,
          pointBackgroundColor: '#c084fc',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1800,
          easing: 'easeOutBack'
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false, stepSize: 25 },
            grid: { color: getThemeGridColor() },
            angleLines: { color: getThemeGridColor() },
            pointLabels: { color: getThemeChartTextColor(), font: { size: 9, family: 'Inter', weight: '600' } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { size: 11, family: 'Inter' },
            bodyFont: { size: 11, family: 'Inter' },
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (ctx) => `Defense Health: ${ctx.raw}%`
            }
          }
        }
      }
    });
  }

  function renderAttackSurfaceTable(scorecard) {
    const tbody = document.getElementById('attackSurfaceTableBody');
    const badge = document.getElementById('portExposureBadge');
    if (!tbody) return;

    const ports = scorecard.listening_ports || [
      { port: 22, service: 'sshd', protocol: 'tcp', shield: 'Active' },
      { port: 80, service: 'nginx/web', protocol: 'tcp', shield: 'Filtered' },
      { port: 443, service: 'https/ssl', protocol: 'tcp', shield: 'Secure' }
    ];

    if (badge) {
      badge.textContent = `${ports.length} Open Ports`;
      badge.className = ports.length > 5 ? 'badge-status status-checking' : 'badge-status status-connected';
    }

    tbody.innerHTML = ports.map(p => `
      <tr>
        <td style="font-family: var(--font-mono); font-weight:700; color:var(--brand-orange); padding:4px 8px;">:${p.port}</td>
        <td style="padding:4px 8px;">${window.escapeHtml(p.service)}</td>
        <td style="padding:4px 8px; text-transform:uppercase; color:var(--text-muted);">${window.escapeHtml(p.protocol)}</td>
        <td style="padding:4px 8px;"><span class="badge badge-success" style="font-size:9.5px; padding:1px 6px;">${window.escapeHtml(p.shield || 'Shielded')}</span></td>
      </tr>
    `).join('');
  }

  function updateDashboardView(scorecard) {
    window.LynislensState.currentScorecard = scorecard;

    const stateScanning = document.getElementById('scanningState');
    const stateResults = document.getElementById('resultsState');
    const stateEmpty = document.getElementById('emptyState');

    if (stateScanning) stateScanning.classList.remove('active');

    if (!scorecard || scorecard.overall_score === undefined || scorecard.overall_score === null) {
      if (stateEmpty) stateEmpty.classList.add('active');
      if (stateResults) stateResults.classList.remove('active');
      return;
    }

    if (stateEmpty) stateEmpty.classList.remove('active');
    if (stateResults) stateResults.classList.add('active');

    renderExecutiveSummary(scorecard);
    renderDoughnutChart(scorecard);
    renderCategoryBarChart(scorecard);
    renderHistoryTrendChart(scorecard);
    renderDefenseRadarChart(scorecard);
    renderAttackSurfaceTable(scorecard);

    if (typeof window.renderFindingsFeed === 'function') {
      window.renderFindingsFeed(scorecard);
    }
  }

  async function refreshDashboardSnapshotDropdown() {
    const select = document.getElementById('dashboardSnapshotSelect');
    if (!select) return;

    const currentServerId = window.LynislensState.currentServerId;
    const targetQuery = (currentServerId !== null && currentServerId !== undefined) ? String(currentServerId) : 'local';

    try {
      const res = await fetch(`/api/history?server_id=${targetQuery}&limit=15`);
      if (res.ok) {
        const historyList = await res.json();
        let html = `<option value="latest">● Live Latest Audit</option>`;
        historyList.forEach((item) => {
          const time = item.timestamp || `Snapshot #${item.id}`;
          const score = (item.overall_score !== undefined && item.overall_score !== null) ? `${item.overall_score}/100` : '--';
          const grade = item.letter_grade ? `(${item.letter_grade})` : '';
          html += `<option value="${item.id}">Snapshot: ${time} — ${score} ${grade}</option>`;
        });
        select.innerHTML = html;
        select.value = 'latest';
      }
    } catch (e) {
      console.warn('Could not load snapshots list:', e);
    }
  }

  async function fetchLatestScan() {
    // Hide historical notice banner if active
    const histBanner = document.getElementById('historicalAuditBanner');
    if (histBanner) histBanner.style.display = 'none';

    const select = document.getElementById('dashboardSnapshotSelect');
    if (select) select.value = 'latest';

    let url = '/api/scan/latest';
    if (window.LynislensState.currentServerId !== null && window.LynislensState.currentServerId !== undefined) {
      url += `?server_id=${window.LynislensState.currentServerId}`;
    } else if (window.LynislensState.isExplicitTarget) {
      url += `?server_id=local`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        // Auto-align active target if currentServerId was null or unselected and scorecard has a specific server_id
        if (window.LynislensState.currentServerId === null && data.server_id !== undefined && data.server_id !== null) {
          window.LynislensState.currentServerId = Number(data.server_id);
          try {
            localStorage.setItem('lynislens_selected_server', String(data.server_id));
          } catch (e) {}
          if (typeof window.updateTargetServerSelect === 'function') {
            window.updateTargetServerSelect();
          }
        }

        if (window.LynislensState.currentServerId === null) {
          window.LynislensState.localScorecard = data;
        }
        window.LynislensState.currentScorecard = data;
        updateDashboardView(data);
        refreshDashboardSnapshotDropdown();

        if (typeof window.renderFindingsFeed === 'function') {
          window.renderFindingsFeed(data);
        }
        if (typeof window.renderComplianceTab === 'function') {
          window.renderComplianceTab();
        }
        if (typeof window.renderImprovementTab === 'function') {
          window.renderImprovementTab();
        }
      } else {
        updateDashboardView(null);
      }
    } catch (e) {
      console.error('Error fetching scan scorecard:', e);
      updateDashboardView(null);
    }
  }

  async function loadHistoricalScan(scanId) {
    try {
      const res = await fetch(`/api/history/${scanId}`);
      if (!res.ok) {
        window.showToast('Unable to retrieve historical audit record.', 'error');
        return;
      }
      const data = await res.json();
      window.LynislensState.currentScorecard = data;
      updateDashboardView(data);

      if (typeof window.renderFindingsFeed === 'function') {
        window.renderFindingsFeed(data);
      }
      if (typeof window.renderComplianceTab === 'function') {
        window.renderComplianceTab();
      }
      if (typeof window.renderImprovementTab === 'function') {
        window.renderImprovementTab();
      }

      const histBanner = document.getElementById('historicalAuditBanner');
      const histText = document.getElementById('historicalAuditBannerText');
      if (histBanner) {
        histBanner.style.display = 'flex';
      }
      if (histText) {
        const timeStr = data.scan_time || 'Archive';
        const hostStr = data.hostname || 'Selected Target';
        histText.textContent = `Viewing historical snapshot of ${hostStr} from ${timeStr}`;
      }

      const select = document.getElementById('dashboardSnapshotSelect');
      if (select) {
        select.value = String(scanId);
      }

      if (typeof window.switchMainTab === 'function') {
        window.switchMainTab('tabDashboard');
      }
      window.showToast(`Loaded historical audit snapshot (${data.scan_time || 'Archive'}).`, 'info');
    } catch (err) {
      console.error('Error loading historical scan:', err);
      window.showToast('Network error loading historical audit.', 'error');
    }
  }

  window.renderExecutiveSummary = renderExecutiveSummary;
  window.renderDoughnutChart = renderDoughnutChart;
  window.renderCategoryBarChart = renderCategoryBarChart;
  window.renderHistoryTrendChart = renderHistoryTrendChart;
  window.renderDefenseRadarChart = renderDefenseRadarChart;
  window.renderAttackSurfaceTable = renderAttackSurfaceTable;
  window.updateDashboardView = updateDashboardView;
  window.fetchLatestScan = fetchLatestScan;
  window.loadHistoricalScan = loadHistoricalScan;
  window.refreshDashboardSnapshotDropdown = refreshDashboardSnapshotDropdown;

  document.addEventListener('DOMContentLoaded', () => {
    // Snapshot selector
    const snapshotSelect = document.getElementById('dashboardSnapshotSelect');
    if (snapshotSelect) {
      snapshotSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'latest') {
          fetchLatestScan();
        } else {
          loadHistoricalScan(val);
        }
      });
    }

    // Scan trigger buttons
    const btnTriggerScan = document.getElementById('btnTriggerScan');
    const btnStartFirstScan = document.getElementById('btnStartFirstScan');
    const scanModal = document.getElementById('scanModal');
    const btnCloseScanModal = document.getElementById('btnCloseScanModal');
    const btnCancelScan = document.getElementById('btnCancelScan');
    const scanForm = document.getElementById('scanForm');

    function openScanModal() {
      if (!scanModal) return;
      const targetName = document.getElementById('modalTargetServerName');
      const targetHost = document.getElementById('modalTargetServerHost');
      const targetBadge = document.getElementById('modalTargetServerBadge');
      const preflightMsg = document.getElementById('modalPreflightMsg');

      const currentServerId = window.LynislensState.currentServerId;
      const servers = window.LynislensState.servers || [];
      const currentServer = servers.find(s => s.id === currentServerId);

      if (currentServer) {
        if (targetName) targetName.textContent = currentServer.name || currentServer.host;
        if (targetHost) targetHost.textContent = `${currentServer.host} (${currentServer.auth_type === 'push' ? 'Push Agent Node' : 'Remote SSH Execution'})`;
        if (targetBadge) {
          targetBadge.textContent = currentServer.auth_type === 'push' ? 'Push Agent' : 'Direct SSH';
          targetBadge.className = 'badge-status status-connected';
        }
        if (preflightMsg) {
          preflightMsg.textContent = currentServer.auth_type === 'push' 
            ? 'Push agents upload scheduled audit telemetry automatically over HTTPS.' 
            : 'Lynislens will connect over SSH (Port 22), run a Lynis audit, and stream the security report.';
        }
      } else {
        if (targetName) targetName.textContent = 'Localhost (Local Machine)';
        if (targetHost) targetHost.textContent = '127.0.0.1 (Local Execution)';
        if (targetBadge) {
          targetBadge.textContent = 'Local Host';
          targetBadge.className = 'badge-status status-checking';
        }
        if (preflightMsg) {
          preflightMsg.textContent = 'Lynis requires root privileges to audit local system security configuration.';
        }
      }

      scanModal.classList.add('active');
    }
    function closeScanModal() {
      if (scanModal) scanModal.classList.remove('active');
    }

    window.openScanModal = openScanModal;
    window.closeScanModal = closeScanModal;

    if (btnTriggerScan) btnTriggerScan.addEventListener('click', openScanModal);
    if (btnStartFirstScan) btnStartFirstScan.addEventListener('click', openScanModal);
    if (btnCloseScanModal) btnCloseScanModal.addEventListener('click', closeScanModal);
    if (btnCancelScan) btnCancelScan.addEventListener('click', closeScanModal);

    if (scanForm) {
      scanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        closeScanModal();

        const sudoPassword = document.getElementById('sudoPassword')?.value || '';
        const sudoUsername = document.getElementById('sudoUsername')?.value || 'root';
        const payload = {
          server_id: window.LynislensState.currentServerId,
          username: sudoUsername,
          password: sudoPassword,
          sudo_password: sudoPassword
        };

        try {
          const res = await fetch('/api/scan/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await res.json();
          if (res.ok) {
            window.showToast('Security audit initiated.', 'info');
            if (typeof window.startLiveAuditStream === 'function') {
              window.startLiveAuditStream();
            }
          } else {
            window.showToast(result.detail || 'Failed to start audit.', 'error');
          }
        } catch (err) {
          window.showToast('Network error triggering audit.', 'error');
        }
      });
    }

    // Export PDF Trigger
    const btnOpenExport = document.getElementById('btnOpenExport');
    if (btnOpenExport) {
      btnOpenExport.addEventListener('click', () => {
        if (typeof window.triggerExport === 'function') {
          window.triggerExport('html');
        } else {
          window.open('/report', '_blank');
        }
      });
    }

    // Quick Go to Findings
    const btnQuickGoFindings = document.getElementById('btnQuickGoFindings');
    if (btnQuickGoFindings) {
      btnQuickGoFindings.addEventListener('click', () => {
        if (typeof window.switchDashboardSubView === 'function') {
          window.switchDashboardSubView('findings');
        }
      });
    }

    // Initialize Real-Time Clock & Dynamic Calendar Matrix
    initLiveTimeClock();
    updateCalendarMatrix(null);
  });
})();
