#!/usr/bin/env node
/**
 * generate-dashboard.js
 * Reads Cucumber JSON report(s) + appends to run history + generates HTML dashboard
 */

const fs = require('fs');
const path = require('path');

const args = {};
process.argv.slice(2).forEach((v, i, a) => {
  if (v.startsWith('--')) args[v.slice(2)] = a[i + 1];
});

const browser = args.browser || 'all';
const branch = args.branch || 'main';
const runId = args['run-id'] || '0';
const runNumber = args['run-number'] || '0';
const repo = args.repo || '';
const jsonPath = args['json-path'] || 'test-results/latest';

const dashboardDir = 'dashboard';
const historyFile = path.join(dashboardDir, 'runs-history.json');
const outFile = path.join(dashboardDir, 'index.html');

function listJsonFiles(inputPath) {
  if (!fs.existsSync(inputPath)) return [];
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  return fs
    .readdirSync(inputPath)
    .filter((f) => f.endsWith('.json') && f.includes('cucumber'))
    .map((f) => path.join(inputPath, f));
}

function parseCucumber(files) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let duration = 0;
  const browsers = new Set();

  for (const filePath of files) {
    const lower = path.basename(filePath).toLowerCase();
    if (lower.includes('chrome')) browsers.add('chrome');
    else if (lower.includes('firefox')) browsers.add('firefox');
    else browsers.add('unknown');

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const feature of data || []) {
        for (const scenario of feature.elements || []) {
          let scenarioPassed = true;
          let scenarioSkipped = false;
          for (const step of scenario.steps || []) {
            const result = step.result || {};
            duration += result.duration || 0;
            if (result.status === 'failed') scenarioPassed = false;
            if (result.status === 'skipped') scenarioSkipped = true;
          }
          if (scenarioPassed) passed += 1;
          else if (scenarioSkipped) skipped += 1;
          else failed += 1;
        }
      }
    } catch (e) {
      console.warn(`Skipping invalid JSON: ${filePath}`);
    }
  }

  return {
    passed,
    failed,
    skipped,
    total: passed + failed + skipped,
    duration: Math.round(duration / 1e9),
    browsers: Array.from(browsers).join(', '),
  };
}

function loadHistory() {
  if (!fs.existsSync(historyFile)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

const browserIcon = { chrome: 'Chrome', firefox: 'Firefox', edge: 'Edge', safari: 'Safari', unknown: 'Unknown' };

function fmtDuration(secs) {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function fmtDate(iso) {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace('Z', ' UTC');
}

function passRate(p, t) {
  return t === 0 ? 0 : Math.round((p / t) * 100);
}

function trendPoint(index, total, value, maxVal, width, height) {
  const x = total <= 1 ? width : (index / (total - 1)) * width;
  const y = height - (value / maxVal) * height;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function buildTrendSVG(runs) {
  const W = 700;
  const H = 80;
  if (runs.length < 2) return '<div style="color:#8b949e;font-size:12px">Not enough history for trend.</div>';
  const points = runs.map((r, i) => trendPoint(i, runs.length, r.rate, 100, W, H)).join(' ');
  const fill = runs.map((r, i) => trendPoint(i, runs.length, r.rate, 100, W, H));
  const area = `0,${H} ${fill.join(' ')} ${W},${H}`;
  return `
  <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width:100%;height:80px">
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${area}" fill="url(#tg)"/>
    <polyline points="${points}" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;
}

function browserBreakdownHtml(byBrowser) {
  return Object.entries(byBrowser)
    .map(([b, s]) => {
      const r = s.runs === 0 ? 0 : Math.round((s.passed / s.runs) * 100);
      return `
    <div class="breakdown-row">
      <span class="b-icon">${browserIcon[b] || b}</span>
      <span class="b-count">${s.runs} runs</span>
      <div class="b-bar-wrap"><div class="b-bar" style="width:${r}%"></div></div>
      <span class="b-rate">${r}%</span>
      <span class="b-detail">${s.passed} pass</span>
    </div>`;
    })
    .join('');
}

function branchBreakdownHtml(byBranch) {
  return Object.entries(byBranch)
    .map(([b, s]) => {
      const r = s.runs === 0 ? 0 : Math.round((s.passed / s.runs) * 100);
      return `
    <div class="breakdown-row">
      <span class="b-icon">${b}</span>
      <span class="b-count">${s.runs} runs</span>
      <div class="b-bar-wrap"><div class="b-bar" style="width:${r}%"></div></div>
      <span class="b-rate">${r}%</span>
      <span class="b-detail">${s.passed} pass</span>
    </div>`;
    })
    .join('');
}

function runTableRows(trimmed) {
  return trimmed
    .map((r) => {
      const badge = r.status === 'PASS' ? '<span class="badge pass">PASS</span>' : '<span class="badge fail">FAIL</span>';
      return `
    <tr>
      <td>${badge}</td>
      <td class="mono">${fmtDate(r.date)}</td>
      <td>${r.branch}</td>
      <td>${r.browser}</td>
      <td class="green">${r.passed}</td>
      <td class="red">${r.failed}</td>
      <td>${fmtDuration(r.duration)}</td>
      <td>${r.rate}%</td>
      <td><a href="${r.reportUrl}" target="_blank" rel="noreferrer">View</a></td>
    </tr>`;
    })
    .join('');
}

if (!fs.existsSync(dashboardDir)) fs.mkdirSync(dashboardDir, { recursive: true });

const files = listJsonFiles(jsonPath);
const stats = parseCucumber(files);
const now = new Date().toISOString();
const status = stats.failed === 0 ? 'PASS' : 'FAIL';
const rate = passRate(stats.passed, stats.total);
const reportUrl = repo ? `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/` : '#';

const newRun = {
  id: runId,
  runNumber,
  branch,
  browser: stats.browsers || browser,
  status,
  passed: stats.passed,
  failed: stats.failed,
  total: stats.total,
  duration: stats.duration,
  rate,
  date: now,
  reportUrl,
};

const history = loadHistory();
history.unshift(newRun);
const trimmed = history.slice(0, 100);
fs.writeFileSync(historyFile, JSON.stringify(trimmed, null, 2));

const totalRuns = trimmed.length;
const passedRuns = trimmed.filter((r) => r.status === 'PASS').length;
const failedRuns = trimmed.filter((r) => r.status === 'FAIL').length;
const avgRate = totalRuns ? Math.round(trimmed.reduce((a, r) => a + r.rate, 0) / totalRuns) : 0;
const latestRun = trimmed[0] || newRun;
const trend20 = trimmed.slice(0, 20).reverse();

const byBrowser = {};
for (const r of trimmed) {
  const key = String(r.browser || 'unknown').toLowerCase();
  if (!byBrowser[key]) byBrowser[key] = { runs: 0, passed: 0 };
  byBrowser[key].runs += 1;
  if (r.status === 'PASS') byBrowser[key].passed += 1;
}

const byBranch = {};
for (const r of trimmed) {
  if (!byBranch[r.branch]) byBranch[r.branch] = { runs: 0, passed: 0 };
  byBranch[r.branch].runs += 1;
  if (r.status === 'PASS') byBranch[r.branch].passed += 1;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Selenium Test Dashboard</title>
  <style>
    :root { --bg:#0d1117; --surface:#161b22; --border:#30363d; --text:#e6edf3; --muted:#8b949e; --green:#3fb950; --red:#f85149; --blue:#58a6ff; --accent:#d2a8ff; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:var(--bg); color:var(--text); font-family:Segoe UI, Arial, sans-serif; min-height:100vh; }
    .mono { font-family:Consolas, monospace; }
    header { background:var(--surface); border-bottom:1px solid var(--border); padding:1.5rem 2rem; display:flex; align-items:center; gap:1rem; }
    header h1 { font-size:1.35rem; font-weight:800; }
    header .sub { font-size:0.8rem; color:var(--muted); font-family:Consolas, monospace; }
    main { max-width:1200px; margin:0 auto; padding:2rem; }
    .grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.5rem; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem 1.5rem; }
    .label { font-size:0.75rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.4rem; }
    .value { font-size:2.1rem; font-weight:800; line-height:1; }
    .sub { font-size:0.75rem; color:var(--muted); margin-top:0.3rem; }
    .pass-card .value { color:var(--green); } .fail-card .value { color:var(--red); } .rate-card .value { color:var(--accent); }
    .latest-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.5rem; }
    .latest-row { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
    .badge { display:inline-block; padding:0.2rem 0.55rem; border-radius:4px; font-size:0.72rem; font-weight:700; }
    .badge.pass { background:rgba(63,185,80,.15); color:var(--green); border:1px solid rgba(63,185,80,.3); }
    .badge.fail { background:rgba(248,81,73,.15); color:var(--red); border:1px solid rgba(248,81,73,.3); }
    .chart-wrap { width:100%; overflow:hidden; border-radius:6px; }
    .breakdown-row { display:grid; grid-template-columns:120px 70px 1fr 50px 80px; align-items:center; gap:0.75rem; padding:0.5rem 0; border-bottom:1px solid var(--border); font-size:0.85rem; }
    .breakdown-row:last-child { border-bottom:none; }
    .b-bar-wrap { background:#21262d; border-radius:4px; height:6px; } .b-bar { background:var(--green); height:6px; border-radius:4px; }
    table { width:100%; border-collapse:collapse; font-size:0.82rem; } th { text-align:left; padding:0.5rem 0.75rem; font-size:0.72rem; color:var(--muted); border-bottom:1px solid var(--border); }
    td { padding:0.55rem 0.75rem; border-bottom:1px solid #21262d; } tr:hover td { background:#1c2128; }
    .green { color:var(--green); font-weight:600; } .red { color:var(--red); font-weight:600; }
    a { color:var(--blue); text-decoration:none; } a:hover { text-decoration:underline; }
    @media (max-width:768px) { .grid4{grid-template-columns:1fr 1fr;} .grid2{grid-template-columns:1fr;} .breakdown-row{grid-template-columns:1fr 1fr;} }
  </style>
</head>
<body>
<header>
  <div><h1>Selenium Test Dashboard</h1><div class="sub">${repo || 'repository'} · Last run: ${fmtDate(now)}</div></div>
</header>
<main>
  <div class="grid4">
    <div class="card"><div class="label">Total Runs</div><div class="value">${totalRuns}</div></div>
    <div class="card pass-card"><div class="label">Passed Runs</div><div class="value">${passedRuns}</div></div>
    <div class="card fail-card"><div class="label">Failed Runs</div><div class="value">${failedRuns}</div></div>
    <div class="card rate-card"><div class="label">Avg Pass Rate</div><div class="value">${avgRate}%</div></div>
  </div>

  <div class="latest-card">
    <div class="label">Latest Run</div>
    <div class="latest-row">
      <span class="badge ${latestRun.status.toLowerCase()}">${latestRun.status}</span>
      <span>${latestRun.branch}</span>
      <span>${latestRun.browser}</span>
      <span class="green">${latestRun.passed} passed</span>
      <span class="red">${latestRun.failed} failed</span>
      <span>${fmtDuration(latestRun.duration)}</span>
      <a href="${latestRun.reportUrl}" target="_blank" rel="noreferrer">Open report</a>
    </div>
  </div>

  <div class="grid2">
    <div class="card"><div class="label">Pass Rate Trend</div><div class="chart-wrap">${buildTrendSVG(trend20)}</div></div>
    <div class="card"><div class="label">Browser Breakdown</div>${browserBreakdownHtml(byBrowser)}</div>
  </div>

  <div class="grid2">
    <div class="card"><div class="label">Branch Breakdown</div>${branchBreakdownHtml(byBranch)}</div>
    <div class="card"><div class="label">Run History</div><div style="overflow-x:auto"><table><thead><tr><th>Status</th><th>Date</th><th>Branch</th><th>Browser</th><th>Passed</th><th>Failed</th><th>Duration</th><th>Rate</th><th>Report</th></tr></thead><tbody>${runTableRows(trimmed)}</tbody></table></div></div>
  </div>
</main>
</body>
</html>`;

fs.writeFileSync(outFile, html);
console.log(`Dashboard generated: ${outFile}`);
console.log(`Latest: ${status} | ${stats.passed} passed ${stats.failed} failed | ${rate}%`);
