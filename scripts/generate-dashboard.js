#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = parseArgs(process.argv.slice(2));
const cfg = {
  branch: args.branch || 'main',
  runId: args['run-id'] || '0',
  runNumber: args['run-number'] || '0',
  repo: args.repo || '',
  jsonPath: args['json-path'] || 'test-results/latest',
  dashboardDir: 'dashboard',
  runsHistoryFile: path.join('dashboard', 'runs-history.json'),
  testRunsHistoryFile: path.join('dashboard', 'test-runs-history.json'),
};

ensureDir(cfg.dashboardDir);

const files = listCucumberJsonFiles(cfg.jsonPath);
const currentRun = buildCurrentRun(files, cfg);

const runsHistory = [stripHeavyRun(currentRun), ...loadJsonArray(cfg.runsHistoryFile).map(normalizeRun)].slice(0, 120);
writeJson(cfg.runsHistoryFile, runsHistory);

const testRunsHistory = [stripHeavyTestRun(currentRun), ...loadJsonArray(cfg.testRunsHistoryFile).map(normalizeTestRun)].slice(0, 60);
writeJson(cfg.testRunsHistoryFile, testRunsHistory);

fs.writeFileSync(path.join(cfg.dashboardDir, 'index.html'), renderIndexPage(runsHistory, testRunsHistory, cfg.repo), 'utf8');
fs.writeFileSync(path.join(cfg.dashboardDir, 'tests.html'), renderTestsPage(testRunsHistory, cfg.repo), 'utf8');

console.log(`Dashboard generated: ${cfg.dashboardDir}/index.html and ${cfg.dashboardDir}/tests.html`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] && argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function listCucumberJsonFiles(inputPath) {
  if (!fs.existsSync(inputPath)) return [];
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  return fs.readdirSync(inputPath)
    .filter((name) => name.endsWith('.json') && name.toLowerCase().includes('cucumber'))
    .map((name) => path.join(inputPath, name));
}

function detectBrowser(filePath) {
  const lower = path.basename(filePath).toLowerCase();
  if (lower.includes('chrome')) return 'chrome';
  if (lower.includes('firefox')) return 'firefox';
  if (lower.includes('edge')) return 'edge';
  if (lower.includes('safari')) return 'safari';
  return 'unknown';
}

function scenarioResult(steps) {
  let failed = false;
  let flaky = false;
  let durationNs = 0;
  for (const step of steps || []) {
    const r = step.result || {};
    if (r.status === 'failed') failed = true;
    if (r.status === 'skipped' || r.status === 'pending' || r.status === 'undefined') flaky = true;
    durationNs += Number(r.duration || 0);
  }
  return { status: failed ? 'failed' : (flaky ? 'flaky' : 'passed'), durationMs: Math.round(durationNs / 1e6) };
}

function buildCurrentRun(files, config) {
  let passed = 0;
  let failed = 0;
  let flaky = 0;
  let duration = 0;
  const browsers = new Set();
  const tests = [];

  for (const file of files) {
    const browser = detectBrowser(file);
    browsers.add(browser);
    let content = [];
    try {
      content = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    for (const feature of content || []) {
      const suite = feature.name || 'Feature';
      const featureFile = feature.uri ? path.basename(feature.uri) : path.basename(file);
      for (const scenario of feature.elements || []) {
        const result = scenarioResult(scenario.steps || []);
        duration += result.durationMs;
        if (result.status === 'passed') passed += 1;
        else if (result.status === 'failed') failed += 1;
        else flaky += 1;
        const errors = [];
        for (const st of scenario.steps || []) {
          const message = st.result && st.result.error_message;
          if (message) errors.push(String(message));
        }
        tests.push({
          title: `${suite} :: ${scenario.name || 'Scenario'}`,
          suite,
          scenario: scenario.name || 'Scenario',
          file: featureFile,
          browser,
          status: result.status,
          duration: result.durationMs,
          tags: (scenario.tags || []).map((t) => String(t.name || '')).filter(Boolean),
          errors: errors.slice(0, 3),
        });
      }
    }
  }

  const total = passed + failed + flaky;
  const rate = total ? Math.round((passed / total) * 100) : 0;
  const reportUrl = resolveReportUrl(config.repo, config.runId);

  return {
    runId: String(config.runId),
    runNumber: String(config.runNumber),
    branch: config.branch,
    browser: Array.from(browsers).join(', ') || 'unknown',
    date: new Date().toISOString(),
    passed,
    failed,
    flaky,
    total,
    duration,
    rate,
    status: failed > 0 ? 'FAIL' : 'PASS',
    reportUrl,
    tests,
  };
}

function resolveReportUrl(repo, runId) {
  if (repo && repo.includes('/') && isLikelyWorkflowRunId(runId)) {
    return `https://github.com/${repo}/actions/runs/${runId}`;
  }
  return '#';
}

function isLikelyWorkflowRunId(value) {
  return /^\d{7,}$/.test(String(value || ''));
}

function stripHeavyRun(run) {
  return {
    runId: run.runId,
    runNumber: run.runNumber,
    branch: run.branch,
    browser: run.browser,
    date: run.date,
    passed: run.passed,
    failed: run.failed,
    flaky: run.flaky,
    total: run.total,
    duration: run.duration,
    rate: run.rate,
    status: run.status,
    reportUrl: run.reportUrl,
  };
}

function stripHeavyTestRun(run) {
  return {
    ...stripHeavyRun(run),
    tests: run.tests || [],
  };
}

function normalizeRun(entry) {
  const passed = Number(entry.passed || 0);
  const failed = Number(entry.failed || 0);
  const flaky = Number(entry.flaky || entry.skipped || 0);
  const total = Number(entry.total || (passed + failed + flaky));
  const rate = Number.isFinite(Number(entry.rate)) ? Number(entry.rate) : (total ? Math.round((passed / total) * 100) : 0);
  const status = String(entry.status || (failed > 0 ? 'FAIL' : 'PASS')).toUpperCase() === 'FAIL' ? 'FAIL' : 'PASS';
  const isoDate = String(entry.date || entry.timestamp || new Date().toISOString());
  const fallbackUrl = resolveReportUrl(cfg.repo, String(entry.runId || entry.id || entry.runNumber || ''));
  const existingUrl = String(entry.reportUrl || '');
  const keepExisting = existingUrl && existingUrl !== '#' && !isGithubPagesRootUrl(existingUrl, cfg.repo);
  return {
    runId: String(entry.runId || entry.id || entry.runNumber || '0'),
    runNumber: String(entry.runNumber || entry.runId || '0'),
    branch: entry.branch || 'main',
    browser: entry.browser || entry.browsers || 'unknown',
    date: isoDate.includes('T') ? isoDate : new Date().toISOString(),
    passed,
    failed,
    flaky,
    total,
    duration: Number(entry.duration || 0),
    rate,
    status,
    reportUrl: keepExisting ? existingUrl : fallbackUrl,
  };
}

function isGithubPagesRootUrl(url, repo) {
  if (!repo || !repo.includes('/')) return false;
  const [owner, name] = repo.split('/');
  const normalized = String(url || '').replace(/\/+$/, '');
  return normalized === `https://${owner}.github.io/${name}`;
}

function normalizeTestRun(entry) {
  const run = normalizeRun(entry);
  return {
    ...run,
    tests: Array.isArray(entry.tests) ? entry.tests.map((t) => ({
      title: t.title || 'Untitled Test',
      suite: t.suite || inferSuite(t.title),
      scenario: t.scenario || t.title || 'Scenario',
      file: t.file || 'unknown',
      browser: t.browser || run.browser,
      status: t.status || 'passed',
      duration: Number(t.duration || 0),
      tags: Array.isArray(t.tags) ? t.tags : [],
      errors: Array.isArray(t.errors) ? t.errors : [],
    })) : [],
  };
}

function inferSuite(title) {
  const t = String(title || '');
  return t.includes('::') ? t.split('::')[0].trim() : 'Suite';
}

function fmtDate(iso) {
  return String(iso || '').replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace('Z', ' UTC');
}

function fmtDuration(ms) {
  const n = Number(ms || 0);
  if (n < 1000) return `${n}ms`;
  const s = n / 1000;
  if (s < 60) return `${s.toFixed(1).replace(/\.0$/, '')}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function escapeHtml(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function browserLabel(v) {
  const lower = String(v || 'unknown').toLowerCase();
  if (lower.includes('chrome')) return 'chrome';
  if (lower.includes('firefox')) return 'firefox';
  if (lower.includes('edge')) return 'edge';
  if (lower.includes('safari')) return 'safari';
  return lower;
}

function computeRate(passed, failed, flaky) {
  const total = Number(passed || 0) + Number(failed || 0) + Number(flaky || 0);
  return total ? Math.round((Number(passed || 0) / total) * 100) : 0;
}

function sparkline(values) {
  const v = values.length ? values : [0];
  const width = 88;
  const height = 24;
  const step = v.length > 1 ? width / (v.length - 1) : 0;
  const points = v.map((value, i) => `${Math.round(step * i)},${Math.round(height - (value / 100) * (height - 4) - 2)}`).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" class="spark"><polyline points="${points}"></polyline></svg>`;
}

function trendSvg(values) {
  const data = values.length ? values : [0];
  const width = 760;
  const height = 180;
  const pad = 16;
  const step = data.length > 1 ? (width - 2 * pad) / (data.length - 1) : 0;
  const points = data.map((r, i) => `${Math.round((pad + i * step) * 10) / 10},${Math.round((height - pad - (r / 100) * (height - 2 * pad)) * 10) / 10}`).join(' ');
  const dots = data.map((r, i) => {
    const x = Math.round((pad + i * step) * 10) / 10;
    const y = Math.round((height - pad - (r / 100) * (height - 2 * pad)) * 10) / 10;
    return `<circle cx="${x}" cy="${y}" r="3"></circle>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" class="trend-svg"><polyline points="${points}"></polyline>${dots}</svg>`;
}
function renderIndexPage(runsInput, testRunsInput, repo) {
  const runs = runsInput.map(normalizeRun);
  const testRuns = testRunsInput.map(normalizeTestRun);
  const totalRuns = runs.length;
  const passedRuns = runs.filter((r) => r.status === 'PASS').length;
  const failedRuns = runs.filter((r) => r.status === 'FAIL').length;
  const passRate = totalRuns ? Math.round(runs.reduce((a, r) => a + r.rate, 0) / totalRuns) : 0;
  const flakyTotal = runs.reduce((a, r) => a + Number(r.flaky || 0), 0);
  const latest = runs[0];
  const trend = runs.slice(0, 20).reverse().map((r) => r.rate);
  const last7 = runs.slice(0, 7);
  const last7Passed = last7.reduce((a, r) => a + Number(r.passed || 0), 0);
  const last7Failed = last7.reduce((a, r) => a + Number(r.failed || 0), 0);
  const last7Flaky = last7.reduce((a, r) => a + Number(r.flaky || 0), 0);
  const last7Duration = last7.length ? Math.round(last7.reduce((a, r) => a + Number(r.duration || 0), 0) / last7.length) : 0;
  const last7TotalTests = last7Passed + last7Failed + last7Flaky;
  const last7PassRate = last7TotalTests ? Math.round((last7Passed / last7TotalTests) * 100) : 0;
  const last7FailRate = last7TotalTests ? Math.round((last7Failed / last7TotalTests) * 100) : 0;
  const last7FlakyRate = last7TotalTests ? Math.round((last7Flaky / last7TotalTests) * 100) : 0;
  const stabilityScore = Math.max(0, last7PassRate - Math.round(last7FlakyRate / 2));
  const branchOptions = [...new Set(runs.map((r) => r.branch))].filter(Boolean).sort();
  const browserOptions = [...new Set(runs.map((r) => r.browser))].filter(Boolean).sort();

  const byBrowser = aggregateRuns(runs, (r) => browserLabel(r.browser));
  const byBranch = aggregateRuns(runs, (r) => r.branch);
  const failures = buildFailureArchive(testRuns);

  const rows = runs.map((run) => `<tr data-branch="${escapeHtml(run.branch)}" data-browser="${escapeHtml(run.browser.toLowerCase())}" data-date="${escapeHtml(run.date.slice(0, 10))}">
    <td><span class="badge ${run.status === 'PASS' ? 'ok' : 'bad'}">${run.status}</span></td>
    <td class="mono">${fmtDate(run.date)}</td>
    <td><span class="chip">${escapeHtml(run.branch)}</span></td>
    <td>${escapeHtml(browserLabel(run.browser))}</td>
    <td class="ok">${run.passed}</td>
    <td class="bad">${run.failed}</td>
    <td class="warn">${run.flaky}</td>
    <td class="mono">${fmtDuration(run.duration)}</td>
    <td>${run.rate}%</td>
    <td>${run.reportUrl && run.reportUrl !== '#' ? `<a href="${escapeHtml(run.reportUrl)}" target="_blank" rel="noreferrer">Open</a>` : '<span class="mono">N/A</span>'}</td>
  </tr>`).join('');

  const failureCards = failures.map((f, idx) => `<div class="fcard" data-title="${escapeHtml(f.title.toLowerCase())}">
    <div class="fhead" onclick="toggleFail(${idx})"><span class="sev">${escapeHtml(f.severity)}</span><span class="ftitle">${escapeHtml(f.title)}</span><span class="mono">${f.failed} fails | ${f.passRate}% pass</span><span id="ficon-${idx}">+</span></div>
    <div class="fbody" id="fbody-${idx}" style="display:none">${f.history.map((h) => `<div class="hrow"><div><span class="badge bad">FAILED</span> <span class="chip">${escapeHtml(h.branch)}</span> <span class="mono">${escapeHtml(browserLabel(h.browser))}</span> <span class="mono">${fmtDate(h.date)}</span></div><pre>${escapeHtml(h.error)}</pre></div>`).join('')}</div>
  </div>`).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0e1a;--sf:#111827;--sf2:#1a2235;--bd:#1e2d45;--ac:#00e5ff;--ac2:#7c3aed;--ok:#10b981;--bad:#f43f5e;--warn:#f59e0b;--txt:#e2e8f0;--mu:#64748b}
*{box-sizing:border-box}body{margin:0;font-family:Syne,sans-serif;background:var(--bg);color:var(--txt)}body:before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,229,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.wrap{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:24px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.brand{display:flex;align-items:center;gap:10px}.logo-icon{width:38px;height:38px;border-radius:9px;background:linear-gradient(135deg,var(--ac),var(--ac2));display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;box-shadow:0 0 20px rgba(0,229,255,.28)}.logo{font-weight:800;font-size:24px;background:linear-gradient(90deg,#fff,var(--ac));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.meta{font-family:'JetBrains Mono',monospace;color:var(--mu);font-size:12px}.tabs{display:flex;gap:8px;border-bottom:1px solid var(--bd);padding-bottom:12px;margin:14px 0}.tabs a{font-family:'JetBrains Mono',monospace;color:var(--mu);text-decoration:none;border:1px solid var(--bd);background:var(--sf2);padding:5px 12px;border-radius:7px;transition:.15s}.tabs a.on,.tabs a:hover{color:var(--ac);border-color:var(--ac)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.card{position:relative;background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:14px;animation:up .35s ease both;overflow:hidden}.card:before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--ac),transparent)}.lbl{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mu);text-transform:uppercase}.val{font-size:34px;font-weight:800;line-height:1;margin-top:5px}.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}.spark{width:88px;height:24px}.spark polyline{fill:none;stroke:var(--ac);stroke-width:2;stroke-linecap:round}
.latest{margin-top:12px;background:var(--sf);border:1px solid var(--bd);border-left:3px solid ${latest && latest.status === 'PASS' ? 'var(--ok)' : 'var(--bad)'};border-radius:10px;padding:11px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.badge{padding:2px 8px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700}.badge.ok{background:rgba(16,185,129,.16);color:var(--ok)}.badge.bad{background:rgba(244,63,94,.16);color:var(--bad)}.chip{font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid var(--bd);border-radius:5px;background:var(--sf2);padding:2px 6px;color:var(--ac)}
.panel{margin-top:12px;background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:12px;animation:up .35s ease both}.title{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mu);text-transform:uppercase;margin-bottom:8px;letter-spacing:.06em}.trend-svg{width:100%;height:150px}.trend-svg polyline{fill:none;stroke:var(--ac);stroke-width:3;stroke-linecap:round}.trend-svg circle{fill:var(--ac)}.trend-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:8px}.tbox{background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:7px}.tlabel{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mu);text-transform:uppercase}.tvalue{font-size:18px;font-weight:800}.tchips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.tchip{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mu);background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:3px 6px}
.split{display:grid;grid-template-columns:1fr 1fr;gap:12px}.brow{display:flex;align-items:center;gap:8px;margin:7px 0}.bar{flex:1;height:7px;border-radius:4px;background:var(--sf2);overflow:hidden;border:1px solid var(--bd)}.fill{height:100%}
table{width:100%;border-collapse:collapse}th,td{padding:8px 10px;border-bottom:1px solid var(--bd);font-size:13px;text-align:left}th{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mu);text-transform:uppercase}tbody tr{animation:up .28s ease both}tbody tr:hover{background:rgba(0,229,255,.04)}input,select{font-family:'JetBrains Mono',monospace;background:var(--sf2);color:var(--txt);border:1px solid var(--bd);border-radius:6px;padding:4px 8px}.mono{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mu)}.controls{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.fcard{border:1px solid var(--bd);border-radius:9px;overflow:hidden;margin-bottom:8px}.fhead{background:var(--sf2);padding:8px;display:flex;gap:8px;align-items:center;cursor:pointer}.sev{font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid rgba(244,63,94,.4);padding:2px 6px;border-radius:4px;color:#fb7185}.ftitle{font-weight:700;flex:1}.fbody{padding:8px}.hrow{border-top:1px solid var(--bd);padding-top:8px;margin-top:8px}.hrow:first-child{border-top:none;margin-top:0;padding-top:0}pre{background:#0f1527;border:1px solid var(--bd);border-radius:6px;padding:7px;color:#fca5a5;white-space:pre-wrap;word-break:break-word;font-family:'JetBrains Mono',monospace;font-size:12px}
a{color:var(--ac);text-decoration:none}
@media(max-width:900px){.split{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
<div class="top"><div class="brand"><div class="logo-icon">TD</div><div><div class="logo">Test Dashboard</div><div class="meta">${escapeHtml(repo || 'repository')}</div></div></div><div class="meta">updated ${fmtDate(new Date().toISOString())}</div></div>
<div class="tabs"><a class="on" href="index.html">Overview</a><a href="tests.html">Test Analytics</a></div>
<div class="kpis">
<div class="card"><div class="lbl">Total Runs</div><div class="val">${totalRuns}</div></div>
<div class="card"><div class="lbl">Passed Runs</div><div class="val ok">${passedRuns}</div></div>
<div class="card"><div class="lbl">Failed Runs</div><div class="val bad">${failedRuns}</div></div>
<div class="card"><div class="lbl">Pass Rate</div><div class="val">${passRate}%</div><div>${sparkline(trend.slice(-8))}</div></div>
<div class="card"><div class="lbl">Flaky Tests</div><div class="val warn">${flakyTotal}</div></div>
</div>
${latest ? `<div class="latest"><span class="badge ${latest.status === 'PASS' ? 'ok' : 'bad'}">${latest.status}</span><span class="chip">${escapeHtml(latest.branch)}</span><span class="mono">${escapeHtml(browserLabel(latest.browser))}</span><span class="ok">${latest.passed} passed</span><span class="bad">${latest.failed} failed</span><span class="warn">${latest.flaky} flaky</span><span class="mono">${fmtDuration(latest.duration)}</span>${latest.reportUrl && latest.reportUrl !== '#' ? `<a href="${escapeHtml(latest.reportUrl)}" target="_blank" rel="noreferrer">Latest report</a>` : '<span class="mono">No report link</span>'}</div>` : ''}
<div class="panel"><div class="title">Execution Stats (last ${last7.length} runs)</div><div class="trend-stats"><div class="tbox"><div class="tlabel">Global Pass</div><div class="tvalue ok">${last7PassRate}%</div></div><div class="tbox"><div class="tlabel">Global Fail</div><div class="tvalue bad">${last7FailRate}%</div></div><div class="tbox"><div class="tlabel">Flaky Rate</div><div class="tvalue warn">${last7FlakyRate}%</div></div><div class="tbox"><div class="tlabel">Avg Duration</div><div class="tvalue">${fmtDuration(last7Duration)}</div></div><div class="tbox"><div class="tlabel">Scenarios</div><div class="tvalue">${last7TotalTests}</div></div><div class="tbox"><div class="tlabel">Stability Score</div><div class="tvalue ${stabilityScore >= 80 ? 'ok' : stabilityScore >= 60 ? 'warn' : 'bad'}">${stabilityScore}%</div></div></div><div class="tchips"><span class="tchip">Passed: ${last7Passed}</span><span class="tchip">Failed: ${last7Failed}</span><span class="tchip">Flaky: ${last7Flaky}</span><span class="tchip">Runs used: ${last7.length}</span></div></div>
<div class="split">
<div class="panel"><div class="title">Browser Breakdown</div>${renderBreakdown(byBrowser)}</div>
<div class="panel"><div class="title">Branch Breakdown</div>${renderBreakdown(byBranch)}</div>
</div>
<div class="panel"><div class="title">Run History</div><div class="controls"><span class="mono" id="count">${runs.length} runs</span><select id="branch" onchange="filterRuns()"><option value="all">All branches</option>${branchOptions.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}</select><select id="browser" onchange="filterRuns()"><option value="all">All browsers</option>${browserOptions.map((b) => `<option value="${escapeHtml(b.toLowerCase())}">${escapeHtml(browserLabel(b))}</option>`).join('')}</select><input id="day" type="date" onchange="filterRuns()"></div><table><thead><tr><th>Status</th><th>Date</th><th>Branch</th><th>Browser</th><th>Passed</th><th>Failed</th><th>Flaky</th><th>Duration</th><th>Rate</th><th>Report</th></tr></thead><tbody id="runRows">${rows || '<tr><td colspan="10">No runs.</td></tr>'}</tbody></table></div>
<div class="panel"><div class="title">Failure Archive</div><div class="controls"><input id="failSearch" placeholder="Search failing test" oninput="filterFailures()"></div><div id="failList">${failureCards || '<div class="mono">No failures.</div>'}</div></div>
</div>
<script>
function filterRuns(){const b=document.getElementById('branch').value;const br=document.getElementById('browser').value;const d=document.getElementById('day').value;const rows=[...document.querySelectorAll('#runRows tr')];let n=0;rows.forEach(r=>{const okB=b==='all'||r.dataset.branch===b;const okBr=br==='all'||(r.dataset.browser||'').includes(br);const okD=!d||(r.dataset.date===d);const show=okB&&okBr&&okD;r.style.display=show?'':'none';if(show)n++;});document.getElementById('count').textContent=n+' runs';}
function toggleFail(i){const b=document.getElementById('fbody-'+i);const ic=document.getElementById('ficon-'+i);const open=b.style.display!=='none';b.style.display=open?'none':'';ic.textContent=open?'+':'-';}
function filterFailures(){const q=(document.getElementById('failSearch').value||'').toLowerCase();document.querySelectorAll('#failList .fcard').forEach(c=>{c.style.display=(!q||c.dataset.title.includes(q))?'':'none';});}
</script></body></html>`;
}

function aggregateRuns(runs, keyFn) {
  const map = new Map();
  for (const run of runs) {
    const key = keyFn(run) || 'unknown';
    if (!map.has(key)) map.set(key, { key, runs: 0, passed: 0, failed: 0, flaky: 0 });
    const row = map.get(key);
    row.runs += 1;
    row.passed += run.passed;
    row.failed += run.failed;
    row.flaky += run.flaky;
  }
  return Array.from(map.values()).map((r) => ({ ...r, rate: computeRate(r.passed, r.failed, r.flaky) })).sort((a, b) => b.rate - a.rate);
}

function renderBreakdown(items) {
  if (!items.length) return '<div class="mono">No data.</div>';
  return items.map((i) => {
    const color = i.rate >= 80 ? 'var(--ok)' : (i.rate >= 60 ? 'var(--warn)' : 'var(--bad)');
    return `<div class="brow"><div class="mono" style="min-width:90px">${escapeHtml(i.key)}</div><div class="bar"><div class="fill" style="width:${Math.max(i.rate, 3)}%;background:${color}"></div></div><div class="mono" style="min-width:40px;text-align:right">${i.rate}%</div><div class="mono" style="min-width:84px;text-align:right">${i.passed}P ${i.failed}F ${i.flaky}FL</div></div>`;
  }).join('');
}

function buildFailureArchive(testRuns) {
  const map = new Map();
  for (const run of testRuns) {
    for (const test of run.tests || []) {
      if (test.status !== 'failed') continue;
      if (!map.has(test.title)) map.set(test.title, { title: test.title, failed: 0, passed: 0, flaky: 0, history: [] });
      const e = map.get(test.title);
      e.failed += 1;
      if (e.history.length < 10) {
        e.history.push({
          branch: run.branch,
          browser: test.browser || run.browser,
          date: run.date,
          error: (test.errors && test.errors[0]) || 'No error message',
        });
      }
    }
  }
  for (const run of testRuns) {
    for (const test of run.tests || []) {
      const e = map.get(test.title);
      if (!e) continue;
      if (test.status === 'passed') e.passed += 1;
      if (test.status === 'flaky') e.flaky += 1;
    }
  }
  return Array.from(map.values())
    .map((e) => ({ ...e, passRate: computeRate(e.passed, e.failed, e.flaky), severity: computeSeverity(e) }))
    .sort((a, b) => b.failed - a.failed);
}

function computeSeverity(e) {
  if (e.failed >= 5) return 'critical';
  if (e.failed >= 2) return 'high';
  return 'medium';
}
function renderTestsPage(testRunsInput, repo) {
  const testRuns = testRunsInput.map(normalizeTestRun);
  const stats = buildTestsStats(testRuns);
  const tests = stats.tests;
  const suites = stats.suites;
  const avgRate = tests.length ? Math.round(tests.reduce((a, t) => a + t.passRate, 0) / tests.length) : 0;
  const topFail = tests[0];
  const topFlaky = tests.slice().sort((a, b) => b.flaky - a.flaky)[0];
  const browsers = [...new Set(testRuns.flatMap((r) => (r.tests || []).map((t) => browserLabel(t.browser || r.browser))))].filter(Boolean).sort();
  const branches = [...new Set(testRuns.map((r) => r.branch))].filter(Boolean).sort();

  const suiteCards = suites.map((s) => {
    const clr = s.passRate >= 80 ? 'var(--ok)' : (s.passRate >= 60 ? 'var(--warn)' : 'var(--bad)');
    return `<div class="suite" onclick="filterByFile('${escapeHtml(jsString(s.file.toLowerCase()))}')"><div class="sn">${escapeHtml(s.file)}</div><div class="sm mono">${s.tests} tests | ${s.passed}P ${s.failed}F ${s.flaky}FL</div><div class="bar"><div class="fill" style="width:${Math.max(s.passRate,3)}%;background:${clr}"></div></div><div class="mono">${s.passRate}%</div></div>`;
  }).join('');

  const rows = tests.map((t, i) => `<tr class="trow" data-id="t${i}" data-title="${escapeHtml(t.title.toLowerCase())}" data-file="${escapeHtml(t.file.toLowerCase())}" data-tags="${escapeHtml(t.tags.join(' ').toLowerCase())}" data-status="${escapeHtml(t.lastStatus)}" data-passrate="${t.passRate}" data-failed="${t.failed}" data-flaky="${t.flaky}" data-dur="${t.avgDuration}" onclick="toggleRow('t${i}')">
    <td><span class="sev ${t.passRate < 50 ? 'sev-bad' : t.failed > 0 ? 'sev-warn' : 'sev-ok'}">${t.passRate < 50 ? 'critical' : t.failed > 0 ? 'risky' : 'stable'}</span> ${escapeHtml(t.title)}</td>
    <td class="mono">${escapeHtml(t.file)}</td>
    <td>${statusBadgeTest(t.lastStatus)}</td>
    <td>${trendDots(t.trend)}</td>
    <td class="ok">${t.passed}</td>
    <td class="bad">${t.failed}</td>
    <td class="warn">${t.flaky}</td>
    <td>${t.passRate}%</td>
    <td class="mono">${fmtDuration(t.avgDuration)}</td>
    <td class="mono" id="arr-t${i}">+</td>
  </tr>
  <tr class="drow" id="dr-t${i}" style="display:none"><td colspan="10"><div class="detail"><div class="two"><div><div class="mono">Browser Breakdown</div>${miniBreakdown(t.byBrowser)}</div><div><div class="mono">Branch Breakdown</div>${miniBreakdown(t.byBranch)}</div></div><div class="mono" style="margin:8px 0 4px">Run History</div>${t.history.map((h, idx) => `<div class="hitem"><div>${statusBadgeTest(h.status)} <span class="chip">${escapeHtml(h.branch)}</span> <span class="mono">${escapeHtml(browserLabel(h.browser))}</span> <span class="mono">${idx === 0 ? 'latest' : '#' + (idx + 1)}</span> <span class="mono">${fmtDate(h.date)}</span></div>${h.error ? `<pre>${escapeHtml(h.error)}</pre>` : ''}</div>`).join('')}</div></td></tr>`).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tests Analytics</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0e1a;--sf:#111827;--sf2:#1a2235;--bd:#1e2d45;--ac:#00e5ff;--ok:#10b981;--bad:#f43f5e;--warn:#f59e0b;--txt:#e2e8f0;--mu:#64748b}
*{box-sizing:border-box}body{margin:0;font-family:Syne,sans-serif;background:var(--bg);color:var(--txt)}body:before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,229,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}.wrap{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:22px}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.nav{display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--bd);padding-bottom:12px}.nav-brand{display:flex;align-items:center;gap:10px;margin-right:auto}.nav-icon{width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--ac),#7c3aed);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;box-shadow:0 0 20px rgba(0,229,255,.26)}.name{font-weight:800;font-size:21px;background:linear-gradient(90deg,#fff,var(--ac));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.nav a{font-family:'JetBrains Mono',monospace;color:var(--mu);text-decoration:none;border:1px solid var(--bd);background:var(--sf2);padding:5px 12px;border-radius:7px;transition:.15s}.nav a.on,.nav a:hover{color:var(--ac);border-color:var(--ac)}
.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:10px}.card{position:relative;background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:12px;animation:up .35s ease both;overflow:hidden}.card:before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--ac),transparent)}.lbl{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mu);text-transform:uppercase}.val{font-size:30px;font-weight:800}.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.switch{display:flex;gap:8px;margin:10px 0}.btn{font-family:'JetBrains Mono',monospace;background:var(--sf2);color:var(--mu);border:1px solid var(--bd);padding:6px 12px;border-radius:8px;cursor:pointer;transition:.15s}.btn.on,.btn:hover{border-color:var(--ac);color:var(--ac)}
.ctl{display:flex;gap:8px;flex-wrap:wrap;background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:8px}.ctl input,.ctl select{font-family:'JetBrains Mono',monospace;background:var(--sf2);color:var(--txt);border:1px solid var(--bd);border-radius:6px;padding:4px 8px}.count{margin-left:auto;font-family:'JetBrains Mono',monospace;color:var(--mu);font-size:12px}
.suites{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:10px 0}.suite{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:9px;cursor:pointer;transition:.15s}.suite:hover{border-color:rgba(0,229,255,.35);box-shadow:0 3px 16px rgba(0,229,255,.1)}.sn{font-family:'JetBrains Mono',monospace;color:var(--ac);font-size:12px}.sm{font-size:11px;color:var(--mu)}.mono{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mu)}
.bar{height:6px;background:var(--sf2);border:1px solid var(--bd);border-radius:4px;overflow:hidden;margin:6px 0}.fill{height:100%}
table{width:100%;border-collapse:collapse;background:var(--sf);border:1px solid var(--bd);border-radius:10px;overflow:hidden}th,td{padding:8px 9px;border-bottom:1px solid var(--bd);font-size:12px;text-align:left}th{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mu);text-transform:uppercase}tbody tr{animation:up .28s ease both}tbody tr.trow:hover{background:rgba(0,229,255,.04)}.badge{padding:2px 8px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700}.b-ok{background:rgba(16,185,129,.16);color:var(--ok)}.b-bad{background:rgba(244,63,94,.16);color:var(--bad)}.b-warn{background:rgba(245,158,11,.16);color:var(--warn)}
.sev{font-family:'JetBrains Mono',monospace;font-size:10px;border-radius:4px;padding:2px 5px;margin-right:5px}.sev-ok{color:var(--ok);border:1px solid rgba(16,185,129,.35)}.sev-warn{color:var(--warn);border:1px solid rgba(245,158,11,.35)}.sev-bad{color:var(--bad);border:1px solid rgba(244,63,94,.35)}
.dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:2px}.d-passed{background:var(--ok)}.d-failed{background:var(--bad)}.d-flaky{background:var(--warn)}
.detail{background:#0f1527;padding:8px}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hitem{border-top:1px solid var(--bd);padding-top:7px;margin-top:7px}.hitem:first-child{border-top:none;margin-top:0;padding-top:0}.chip{font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid var(--bd);border-radius:5px;background:var(--sf2);padding:2px 6px;color:var(--ac)}pre{background:#0d1222;border:1px solid var(--bd);border-radius:6px;padding:7px;color:#fca5a5;white-space:pre-wrap;word-break:break-word;font-family:'JetBrains Mono',monospace;font-size:12px}
@media(max-width:900px){.two{grid-template-columns:1fr}th:nth-child(4),td:nth-child(4){display:none}}
</style></head><body><div class="wrap">
<div class="nav"><div class="nav-brand"><div class="nav-icon">TA</div><div class="name">Tests Analytics</div></div><a href="index.html">Overview</a><a class="on" href="tests.html">Tests</a></div>
<div class="sum">
<div class="card"><div class="lbl">Unique Tests</div><div class="val">${tests.length}</div></div>
<div class="card"><div class="lbl">Avg Pass Rate</div><div class="val">${avgRate}%</div></div>
<div class="card"><div class="lbl">Most Failing</div><div class="val bad">${topFail ? topFail.failed : 0}</div><div class="mono">${escapeHtml(topFail ? topFail.title : '-')}</div></div>
<div class="card"><div class="lbl">Most Flaky</div><div class="val warn">${topFlaky ? topFlaky.flaky : 0}</div><div class="mono">${escapeHtml(topFlaky ? topFlaky.title : '-')}</div></div>
</div>
<div class="switch"><button class="btn on" id="allBtn" onclick="setView('all')">All Tests</button><button class="btn" id="suiteBtn" onclick="setView('suite')">By Suite</button></div>
<div class="ctl"><input id="q" placeholder="Search test/file/tag" oninput="applyFilters()"><select id="fb" onchange="applyFilters()"><option value="">All browsers</option>${browsers.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}</select><select id="fr" onchange="applyFilters()"><option value="">All branches</option>${branches.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}</select><select id="fs" onchange="applyFilters()"><option value="" selected>All statuses</option><option value="failed">Failed only</option><option value="passed">Passed last</option><option value="flaky">Flaky last</option></select><select id="fo" onchange="applyFilters()"><option value="failures" selected>Most failures</option><option value="rate-asc">Pass rate worst first</option><option value="rate-desc">Pass rate best first</option><option value="name">A-Z</option><option value="file">By file</option><option value="duration">Slowest</option></select><span class="count" id="count">${tests.length} tests</span></div>
<div id="suiteView" style="display:none"><div class="suites">${suiteCards || '<div class="mono">No suite data.</div>'}</div></div>
<div id="allView"><table><thead><tr><th>Test</th><th>File</th><th>Status</th><th>Trend</th><th>Pass</th><th>Fail</th><th>Flaky</th><th>Rate</th><th>Avg Duration</th><th></th></tr></thead><tbody id="rows">${rows || '<tr><td colspan="10">No tests.</td></tr>'}</tbody></table></div>
<div class="mono" style="margin-top:8px">${escapeHtml(repo || 'repository')} | updated ${fmtDate(new Date().toISOString())}</div>
</div>
<script>
function setView(v){document.getElementById('allView').style.display=v==='all'?'':'none';document.getElementById('suiteView').style.display=v==='suite'?'':'none';document.getElementById('allBtn').classList.toggle('on',v==='all');document.getElementById('suiteBtn').classList.toggle('on',v==='suite');}
function toggleRow(id){const d=document.getElementById('dr-'+id);const a=document.getElementById('arr-'+id);const open=d.style.display!=='none';d.style.display=open?'none':'';a.textContent=open?'+':'-';}
function applyFilters(){const q=(document.getElementById('q').value||'').toLowerCase();const b=(document.getElementById('fb').value||'').toLowerCase();const r=document.getElementById('fr').value;const s=document.getElementById('fs').value;const o=document.getElementById('fo').value;const body=document.getElementById('rows');const vis=[];body.querySelectorAll('tr.trow').forEach(row=>{const d=document.getElementById('dr-'+row.dataset.id);const mq=!q||row.dataset.title.includes(q)||row.dataset.file.includes(q)||row.dataset.tags.includes(q);const ms=!s||row.dataset.status===s;let mb=!b;if(!mb&&d)d.querySelectorAll('.mono').forEach(el=>{if(el.textContent.toLowerCase().includes(b))mb=true;});let mr=!r;if(!mr&&d)d.querySelectorAll('.chip').forEach(el=>{if(el.textContent.trim()===r)mr=true;});const show=mq&&ms&&mb&&mr;row.style.display=show?'':'none';if(d&&!show)d.style.display='none';if(show)vis.push(row);});const num=(r,k)=>Number(r.dataset[k]||0);const str=(r,k)=>r.dataset[k]||'';vis.sort((a,b)=>{if(o==='name')return str(a,'title').localeCompare(str(b,'title'));if(o==='file')return str(a,'file').localeCompare(str(b,'file'));if(o==='rate-asc')return num(a,'passrate')-num(b,'passrate');if(o==='rate-desc')return num(b,'passrate')-num(a,'passrate');if(o==='duration')return num(b,'dur')-num(a,'dur');return num(b,'failed')-num(a,'failed');});vis.forEach(rw=>{const d=document.getElementById('dr-'+rw.dataset.id);body.appendChild(rw);if(d)body.appendChild(d);});document.getElementById('count').textContent=vis.length+' tests';}
function filterByFile(file){setView('all');document.getElementById('q').value=file;applyFilters();}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('fs').value='';document.getElementById('fo').value='failures';applyFilters();});
</script></body></html>`;
}

function statusBadgeTest(status) {
  if (status === 'failed') return '<span class="badge b-bad">FAILED</span>';
  if (status === 'flaky') return '<span class="badge b-warn">FLAKY</span>';
  return '<span class="badge b-ok">PASSED</span>';
}

function trendDots(values) {
  return values.slice(0, 12).map((v) => `<span class="dot d-${escapeHtml(v)}"></span>`).join('');
}

function miniBreakdown(items) {
  if (!items.length) return '<div class="mono">No data.</div>';
  return items.map((i) => {
    const color = i.rate >= 80 ? 'var(--ok)' : (i.rate >= 60 ? 'var(--warn)' : 'var(--bad)');
    return `<div class="mono" style="display:flex;align-items:center;gap:8px;margin:5px 0"><span style="min-width:90px">${escapeHtml(i.name)}</span><span>${i.passed}P ${i.failed}F ${i.flaky}FL</span><span style="flex:1" class="bar"><span class="fill" style="display:block;width:${Math.max(i.rate,3)}%;background:${color}"></span></span><span>${i.rate}%</span></div>`;
  }).join('');
}
function buildTestsStats(testRuns) {
  const testsMap = new Map();
  for (const run of testRuns) {
    for (const t of run.tests || []) {
      if (!testsMap.has(t.title)) {
        testsMap.set(t.title, {
          title: t.title,
          file: t.file || 'unknown',
          tags: new Set(),
          total: 0,
          passed: 0,
          failed: 0,
          flaky: 0,
          avgDuration: 0,
          lastStatus: t.status,
          history: [],
          trend: [],
          browserMap: new Map(),
          branchMap: new Map(),
        });
      }
      const e = testsMap.get(t.title);
      e.total += 1;
      e.avgDuration = Math.round(((e.avgDuration * (e.total - 1)) + Number(t.duration || 0)) / e.total);
      if (t.status === 'passed') e.passed += 1;
      else if (t.status === 'failed') e.failed += 1;
      else e.flaky += 1;
      e.lastStatus = t.status;
      (t.tags || []).forEach((tag) => e.tags.add(tag));
      addMini(e.browserMap, browserLabel(t.browser || run.browser), t.status);
      addMini(e.branchMap, run.branch, t.status);
      if (e.history.length < 20) e.history.push({ status: t.status, branch: run.branch, browser: t.browser || run.browser, date: run.date, duration: t.duration, error: (t.errors || [])[0] || '' });
      if (e.trend.length < 12) e.trend.push(t.status);
    }
  }
  const tests = Array.from(testsMap.values()).map((e) => ({
    ...e,
    tags: Array.from(e.tags),
    passRate: e.total ? Math.round((e.passed / e.total) * 100) : 0,
    byBrowser: Array.from(e.browserMap.entries()).map(([name, s]) => ({ name, ...s, rate: computeRate(s.passed, s.failed, s.flaky) })),
    byBranch: Array.from(e.branchMap.entries()).map(([name, s]) => ({ name, ...s, rate: computeRate(s.passed, s.failed, s.flaky) })),
  })).sort((a, b) => b.failed - a.failed || b.flaky - a.flaky || a.title.localeCompare(b.title));

  const suiteMap = new Map();
  for (const t of tests) {
    if (!suiteMap.has(t.file)) suiteMap.set(t.file, { file: t.file, tests: 0, passed: 0, failed: 0, flaky: 0 });
    const s = suiteMap.get(t.file);
    s.tests += 1;
    s.passed += t.passed;
    s.failed += t.failed;
    s.flaky += t.flaky;
  }
  const suites = Array.from(suiteMap.values()).map((s) => ({ ...s, passRate: computeRate(s.passed, s.failed, s.flaky) })).sort((a, b) => b.failed - a.failed);

  return { tests, suites };
}

function addMini(map, key, status) {
  const k = key || 'unknown';
  if (!map.has(k)) map.set(k, { passed: 0, failed: 0, flaky: 0 });
  const r = map.get(k);
  if (status === 'passed') r.passed += 1;
  else if (status === 'failed') r.failed += 1;
  else r.flaky += 1;
}

function jsString(v) {
  return String(v || '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}
