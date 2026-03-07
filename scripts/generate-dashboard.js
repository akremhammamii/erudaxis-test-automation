const fs = require('fs');
const path = require('path');

const RESULTS_DIR = './test-results';
const LATEST_DIR = path.join(RESULTS_DIR, 'latest');
const DASHBOARD_DIR = './dashboard';
const HISTORY_FILE = path.join(RESULTS_DIR, 'history.json');
const DASHBOARD_HISTORY_FILE = path.join(DASHBOARD_DIR, 'history.json');
const MAX_HISTORY = 30;

main();

function main() {
  ensureDir(DASHBOARD_DIR);

  const history = loadHistory();
  const current = readLatestResults();

  const run = {
    runNumber: history.length + 1,
    timestamp: new Date().toISOString(),
    date: formatDate(new Date()),
    ...current,
  };

  history.unshift(run);
  const trimmed = history.slice(0, MAX_HISTORY);

  ensureDir(RESULTS_DIR);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  fs.writeFileSync(DASHBOARD_HISTORY_FILE, JSON.stringify(trimmed, null, 2));

  const html = renderDashboard(trimmed);
  fs.writeFileSync(path.join(DASHBOARD_DIR, 'index.html'), html, 'utf8');

  console.log(`Dashboard generated with ${trimmed.length} run(s)`);
}

function loadHistory() {
  const source = fs.existsSync(HISTORY_FILE)
    ? HISTORY_FILE
    : fs.existsSync(DASHBOARD_HISTORY_FILE)
      ? DASHBOARD_HISTORY_FILE
      : null;

  if (!source) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(source, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLatestResults() {
  if (!fs.existsSync(LATEST_DIR)) return emptyResults();

  const files = fs.readdirSync(LATEST_DIR).filter((f) => f.endsWith('.json') && f.includes('cucumber'));
  if (files.length === 0) return emptyResults();

  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const browsers = new Set();
  const byBrowser = {};

  for (const file of files) {
    const browser = detectBrowser(file);
    browsers.add(browser);

    if (!byBrowser[browser]) {
      byBrowser[browser] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    }

    try {
      const json = JSON.parse(fs.readFileSync(path.join(LATEST_DIR, file), 'utf8'));
      for (const feature of json || []) {
        for (const scenario of feature.elements || []) {
          totalTests += 1;
          byBrowser[browser].total += 1;

          const steps = scenario.steps || [];
          const allPassed = steps.length > 0 && steps.every((s) => s.result && s.result.status === 'passed');
          const hasSkipped = steps.some((s) => s.result && s.result.status === 'skipped');

          if (allPassed) {
            passed += 1;
            byBrowser[browser].passed += 1;
          } else if (hasSkipped) {
            skipped += 1;
            byBrowser[browser].skipped += 1;
          } else {
            failed += 1;
            byBrowser[browser].failed += 1;
          }
        }
      }
    } catch (err) {
      console.error(`Cannot parse ${file}: ${err.message}`);
    }
  }

  const passRate = percent(passed, totalTests);
  return {
    totalTests,
    passed,
    failed,
    skipped,
    passRate,
    status: failed > 0 ? 'failure' : totalTests > 0 ? 'success' : 'unknown',
    browsers: Array.from(browsers).join(', ') || 'N/A',
    browserCount: browsers.size,
    byBrowser,
  };
}

function emptyResults() {
  return {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    passRate: 0,
    status: 'unknown',
    browsers: 'N/A',
    browserCount: 0,
    byBrowser: {},
  };
}

function detectBrowser(fileName) {
  const f = fileName.toLowerCase();
  if (f.includes('chrome')) return 'Chrome';
  if (f.includes('firefox')) return 'Firefox';
  return 'Unknown';
}

function percent(value, total) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function formatDate(date) {
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function renderDashboard(history) {
  const latest = history[0] || emptyResults();
  const averagePassRate = history.length
    ? Number((history.reduce((sum, r) => sum + (r.passRate || 0), 0) / history.length).toFixed(1))
    : 0;

  const trendBars = history
    .slice(0, 20)
    .reverse()
    .map((r) => {
      const color = r.passRate >= 80 ? 'var(--ok)' : r.passRate >= 50 ? 'var(--warn)' : 'var(--bad)';
      return `<div class="bar-wrap"><div class="bar" style="height:${Math.max(r.passRate, 4)}%;background:${color}"></div></div>`;
    })
    .join('');

  const browserChips = Object.entries(latest.byBrowser || {})
    .map(([name, s]) => `<span class="chip">${name}: ${s.passed}/${s.total}</span>`)
    .join('');

  const rows = history
    .map((r) => {
      const badgeClass = r.status === 'success' ? 'ok' : r.status === 'failure' ? 'bad' : 'muted';
      return `
        <tr>
          <td>#${r.runNumber}</td>
          <td>${escapeHtml(r.date || '')}</td>
          <td><span class="badge ${badgeClass}">${r.status.toUpperCase()}</span></td>
          <td>${r.passRate}%</td>
          <td>${r.passed} / ${r.totalTests}</td>
          <td>${escapeHtml(r.browsers || 'N/A')}</td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Erudaxis QA Dashboard</title>
  <style>
    :root {
      --bg: #0b132b;
      --panel: #111b38;
      --panel-2: #152448;
      --text: #e8eefc;
      --muted: #9db0d8;
      --ok: #2ecc71;
      --bad: #ff5f6d;
      --warn: #f5b041;
      --line: rgba(255,255,255,0.1);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background: radial-gradient(1200px 500px at 80% -20%, #284a9b 0%, transparent 65%), var(--bg);
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .hero { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 30px; }
    .sub { color: var(--muted); font-size: 14px; }

    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 16px;
      min-height: 116px;
    }
    .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
    .value { font-size: 34px; font-weight: 700; margin-top: 6px; }
    .value.ok { color: var(--ok); }
    .value.bad { color: var(--bad); }
    .value.warn { color: var(--warn); }
    .chips { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--line); padding: 4px 8px; border-radius: 999px; color: var(--muted); font-size: 12px; }

    .trend {
      margin-top: 20px;
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 16px;
    }
    .bars { height: 120px; display: flex; align-items: end; gap: 6px; margin-top: 14px; }
    .bar-wrap { flex: 1; height: 100%; display: flex; align-items: end; }
    .bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; }

    .table {
      margin-top: 20px;
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--line); font-size: 14px; }
    th { color: var(--muted); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }

    .badge { font-size: 11px; padding: 4px 8px; border-radius: 999px; font-weight: 700; }
    .badge.ok { background: rgba(46,204,113,.2); color: var(--ok); }
    .badge.bad { background: rgba(255,95,109,.2); color: var(--bad); }
    .badge.muted { background: rgba(157,176,216,.2); color: var(--muted); }

    @media (max-width: 900px) {
      .grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .hero { flex-direction: column; align-items: flex-start; }
    }
    @media (max-width: 640px) {
      .grid { grid-template-columns: 1fr; }
      th, td { padding: 10px; font-size: 12px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div>
        <h1>Erudaxis QA Dashboard</h1>
        <div class="sub">Automated Selenium + Cucumber results</div>
      </div>
      <div class="sub">Last update: ${escapeHtml(formatDate(new Date()))}</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="label">Total Runs</div>
        <div class="value">${history.length}</div>
      </div>
      <div class="card">
        <div class="label">Average Pass Rate</div>
        <div class="value ${averagePassRate >= 80 ? 'ok' : averagePassRate >= 50 ? 'warn' : 'bad'}">${averagePassRate}%</div>
      </div>
      <div class="card">
        <div class="label">Latest Run</div>
        <div class="value ${latest.passRate >= 80 ? 'ok' : latest.passRate >= 50 ? 'warn' : 'bad'}">${latest.passRate}%</div>
        <div class="sub">${latest.passed} passed, ${latest.failed} failed, ${latest.skipped} skipped</div>
      </div>
      <div class="card">
        <div class="label">Browsers (Latest)</div>
        <div class="value">${latest.browserCount || 0}</div>
        <div class="chips">${browserChips || '<span class="chip">No data</span>'}</div>
      </div>
    </div>

    <div class="trend">
      <div class="label">Pass Rate Trend (up to last 20 runs)</div>
      <div class="bars">${trendBars}</div>
    </div>

    <div class="table">
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Date</th>
            <th>Status</th>
            <th>Pass Rate</th>
            <th>Passed / Total</th>
            <th>Browsers</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6">No history yet</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
