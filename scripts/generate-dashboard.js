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

  fs.writeFileSync(path.join(DASHBOARD_DIR, 'index.html'), renderDashboard(trimmed), 'utf8');
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

  for (const file of files) {
    const browser = detectBrowser(file);
    browsers.add(browser);
    try {
      const json = JSON.parse(fs.readFileSync(path.join(LATEST_DIR, file), 'utf8'));
      for (const feature of json || []) {
        for (const scenario of feature.elements || []) {
          totalTests += 1;
          const steps = scenario.steps || [];
          const allPassed = steps.length > 0 && steps.every((s) => s.result && s.result.status === 'passed');
          const hasSkipped = steps.some((s) => s.result && s.result.status === 'skipped');
          if (allPassed) passed += 1;
          else if (hasSkipped) skipped += 1;
          else failed += 1;
        }
      }
    } catch (err) {
      console.error(`Cannot parse ${file}: ${err.message}`);
    }
  }

  return {
    totalTests,
    passed,
    failed,
    skipped,
    passRate: percent(passed, totalTests),
    status: failed > 0 ? 'failure' : totalTests > 0 ? 'success' : 'unknown',
    browsers: Array.from(browsers).join(', ') || 'N/A',
    browserCount: browsers.size,
  };
}

function emptyResults() {
  return { totalTests: 0, passed: 0, failed: 0, skipped: 0, passRate: 0, status: 'unknown', browsers: 'N/A', browserCount: 0 };
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
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function renderDashboard(history) {
  const latest = history[0] || emptyResults();
  const avg = history.length ? Number((history.reduce((s, r) => s + (r.passRate || 0), 0) / history.length).toFixed(1)) : 0;
  const last20 = history.slice(0, 20).reverse();
  const bars = last20.map((r) => {
    const c = r.passRate >= 80 ? '#16a34a' : r.passRate >= 50 ? '#d97706' : '#dc2626';
    return `<div class="b"><span style="height:${Math.max(r.passRate, 4)}%;background:${c}"></span></div>`;
  }).join('');

  const rows = history.map((r) => {
    const badge = r.status === 'success' ? 'ok' : r.status === 'failure' ? 'ko' : 'na';
    return `<tr>
      <td>#${r.runNumber}</td>
      <td>${esc(r.date)}</td>
      <td><span class="badge ${badge}">${r.status.toUpperCase()}</span></td>
      <td>${r.passRate}%</td>
      <td>${r.passed}/${r.totalTests}</td>
      <td>${esc(r.browsers || 'N/A')}</td>
    </tr>`;
  }).join('');

  const ring = `background:conic-gradient(#16a34a 0 ${latest.passRate}%, #e5e7eb ${latest.passRate}% 100%);`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QA Dashboard</title>
<style>
:root{--bg:#f4f7fb;--card:#fff;--text:#0f172a;--muted:#64748b;--line:#e2e8f0}
*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,Segoe UI,Arial,sans-serif;color:var(--text)}
.wrap{max-width:1200px;margin:0 auto;padding:24px}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.h1{font-size:28px;font-weight:800}.sub{color:var(--muted);font-size:13px}
.cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.v{font-size:30px;font-weight:800;margin-top:4px}
.mid{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.bars{height:130px;display:flex;align-items:flex-end;gap:5px;margin-top:12px}.b{flex:1;height:100%;display:flex;align-items:flex-end}.b span{width:100%;border-radius:5px 5px 0 0;display:block}
.ring{width:110px;height:110px;border-radius:50%;position:relative;margin:8px auto 6px}.ring::after{content:"";position:absolute;inset:14px;background:#fff;border-radius:50%}
.ringv{position:relative;z-index:2;text-align:center;margin-top:-78px;font-weight:800;font-size:22px}
.table{margin-top:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:auto}
table{width:100%;border-collapse:collapse}th,td{padding:10px 12px;border-bottom:1px solid var(--line);font-size:13px;text-align:left}th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
tr:last-child td{border-bottom:none}.badge{padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700}.ok{background:#dcfce7;color:#166534}.ko{background:#fee2e2;color:#991b1b}.na{background:#e2e8f0;color:#475569}
@media(max-width:1000px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.mid{grid-template-columns:1fr}}
@media(max-width:640px){.cards{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div><div class="h1">Test Execution Dashboard</div><div class="sub">Selenium + Cucumber + GitHub Actions</div></div>
    <div class="sub">Updated: ${esc(formatDate(new Date()))}</div>
  </div>

  <div class="cards">
    <div class="card"><div class="l">Total Runs</div><div class="v">${history.length}</div></div>
    <div class="card"><div class="l">Average Pass Rate</div><div class="v">${avg}%</div></div>
    <div class="card"><div class="l">Latest Pass Rate</div><div class="v">${latest.passRate}%</div></div>
    <div class="card"><div class="l">Latest Passed</div><div class="v">${latest.passed}</div></div>
    <div class="card"><div class="l">Latest Failed</div><div class="v">${latest.failed}</div></div>
  </div>

  <div class="mid">
    <div class="panel">
      <div class="l">Pass Rate Trend (Last ${last20.length} runs)</div>
      <div class="bars">${bars}</div>
    </div>
    <div class="panel" style="text-align:center">
      <div class="l">Latest Quality</div>
      <div class="ring" style="${ring}"></div>
      <div class="ringv">${latest.passRate}%</div>
      <div class="sub">Browsers: ${esc(latest.browsers || 'N/A')}</div>
    </div>
  </div>

  <div class="table">
    <table>
      <thead><tr><th>Run</th><th>Date</th><th>Status</th><th>Pass Rate</th><th>Passed/Total</th><th>Browsers</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No history yet</td></tr>'}</tbody>
    </table>
  </div>
</div>
</body>
</html>`;
}

function esc(v){
  return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
