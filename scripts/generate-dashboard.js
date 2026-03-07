#!/usr/bin/env node
// Dashboard generator for Selenium + Cucumber artifacts

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

const runsHistory = loadJsonArray(cfg.runsHistoryFile);
runsHistory.unshift(stripHeavyTests(currentRun));
const trimmedRuns = runsHistory.slice(0, 120);
writeJson(cfg.runsHistoryFile, trimmedRuns);

const testRunsHistory = loadJsonArray(cfg.testRunsHistoryFile);
testRunsHistory.unshift({
  runId: currentRun.runId,
  runNumber: currentRun.runNumber,
  branch: currentRun.branch,
  browser: currentRun.browser,
  date: currentRun.date,
  reportUrl: currentRun.reportUrl,
  tests: currentRun.tests,
});
const trimmedTestRuns = testRunsHistory.slice(0, 60);
writeJson(cfg.testRunsHistoryFile, trimmedTestRuns);

const indexHtml = renderIndexPage(trimmedRuns, cfg.repo);
const testsHtml = renderTestsPage(trimmedTestRuns, cfg.repo);

fs.writeFileSync(path.join(cfg.dashboardDir, 'index.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(cfg.dashboardDir, 'tests.html'), testsHtml, 'utf8');

console.log(`Dashboard generated: ${cfg.dashboardDir}/index.html, ${cfg.dashboardDir}/tests.html`);
console.log(`Run summary: ${currentRun.status} | ${currentRun.passed} passed | ${currentRun.failed} failed | ${currentRun.rate}%`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const v = argv[i];
    if (v.startsWith('--')) out[v.slice(2)] = argv[i + 1];
  }
  return out;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function listCucumberJsonFiles(inputPath) {
  if (!fs.existsSync(inputPath)) return [];
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  return fs
    .readdirSync(inputPath)
    .filter((f) => f.endsWith('.json') && f.includes('cucumber'))
    .map((f) => path.join(inputPath, f));
}

function detectBrowser(filePath) {
  const f = path.basename(filePath).toLowerCase();
  if (f.includes('chrome')) return 'chrome';
  if (f.includes('firefox')) return 'firefox';
  if (f.includes('edge')) return 'edge';
  return 'unknown';
}

function scenarioResult(steps) {
  let failed = false;
  let skipped = false;
  let durationNs = 0;
  for (const st of steps || []) {
    const r = st.result || {};
    if (r.status === 'failed') failed = true;
    if (r.status === 'skipped') skipped = true;
    durationNs += r.duration || 0;
  }
  const status = failed ? 'failed' : skipped ? 'flaky' : 'passed';
  return { status, durationMs: Math.round(durationNs / 1e6) };
}

function buildCurrentRun(files, config) {
  let passed = 0;
  let failed = 0;
  let flaky = 0;
  let durationMs = 0;
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
      for (const scenario of feature.elements || []) {
        const sr = scenarioResult(scenario.steps || []);
        durationMs += sr.durationMs;
        if (sr.status === 'passed') passed += 1;
        else if (sr.status === 'failed') failed += 1;
        else flaky += 1;

        const errors = [];
        for (const st of scenario.steps || []) {
          const msg = st.result && st.result.error_message;
          if (msg) errors.push(String(msg));
        }

        tests.push({
          title: `${feature.name || 'Feature'} :: ${scenario.name || 'Scenario'}`,
          status: sr.status,
          duration: sr.durationMs,
          errors: errors.slice(0, 2),
          browser,
        });
      }
    }
  }

  const total = passed + failed + flaky;
  const rate = total ? Math.round((passed / total) * 100) : 0;
  const status = failed > 0 ? 'FAIL' : 'PASS';

  const reportUrl = config.repo
    ? `https://${config.repo.split('/')[0]}.github.io/${config.repo.split('/')[1]}/`
    : '#';

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
    duration: durationMs,
    rate,
    status,
    reportUrl,
    tests,
  };
}

function stripHeavyTests(run) {
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

function loadJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function fmtDate(iso) {
  return String(iso).replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace('Z', ' UTC');
}

function fmtDuration(ms) {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function browserEmoji(label) {
  const l = String(label).toLowerCase();
  if (l.includes('chrome')) return 'CH';
  if (l.includes('firefox')) return 'FF';
  if (l.includes('edge')) return 'ED';
  return 'BR';
}

function renderIndexPage(history, repo) {
  const totalRuns = history.length;
  const passRuns = history.filter((r) => r.status === 'PASS').length;
  const failRuns = history.filter((r) => r.status === 'FAIL').length;
  const totalFlaky = history.reduce((a, r) => a + (r.flaky || 0), 0);
  const avgRate = totalRuns ? Math.round(history.reduce((a, r) => a + (r.rate || 0), 0) / totalRuns) : 0;
  const latest = history[0];

  const rows = history.map((r) => {
    const badge = r.status === 'PASS' ? 'pass' : 'fail';
    return `<tr>
      <td><span class="badge ${badge}">${r.status}</span></td>
      <td class="mono">${fmtDate(r.date)}</td>
      <td><span class="branch">${escapeHtml(r.branch)}</span></td>
      <td>${browserEmoji(r.browser)} ${escapeHtml(r.browser)}</td>
      <td class="ok">${r.passed}</td>
      <td class="bad">${r.failed}</td>
      <td class="warn">${r.flaky || 0}</td>
      <td>${fmtDuration(r.duration)}</td>
      <td>${r.rate}%</td>
      <td><a href="${r.reportUrl}" target="_blank" rel="noreferrer">Open</a></td>
    </tr>`;
  }).join('');

  const trend = history.slice(0, 20).reverse().map((r) => r.rate || 0);
  const trendBars = trend.map((v) => `<div class="tbar" style="height:${Math.max(6, v)}%"></div>`).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard</title>
<style>
:root{--bg:#0a0f1f;--panel:#10182d;--panel2:#16213b;--line:#22365c;--text:#e6eefc;--muted:#90a4c7;--ok:#22c55e;--bad:#ef4444;--warn:#f59e0b;--a:#38bdf8}
*{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:radial-gradient(900px 400px at 90% -10%,#1f3c7a55,transparent),var(--bg);color:var(--text)}
.wrap{max-width:1260px;margin:0 auto;padding:26px}.nav{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:16px}
.brand{font-weight:800;font-size:26px}.repo{color:var(--muted);font-size:12px}.tabs a{color:var(--muted);text-decoration:none;padding:7px 12px;border:1px solid var(--line);border-radius:8px}.tabs a.active{color:var(--a);border-color:var(--a)}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.card{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:12px;padding:14px}.lbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.val{font-size:34px;font-weight:800;margin-top:4px}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.latest{margin-top:12px;background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-left:3px solid ${latest && latest.status === 'PASS' ? 'var(--ok)' : 'var(--bad)'};border-radius:12px;padding:12px;display:flex;gap:12px;flex-wrap:wrap}
.trend{margin-top:12px;background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:12px;padding:12px}.bars{height:90px;display:flex;align-items:end;gap:4px;margin-top:8px}.tbar{flex:1;min-height:6px;background:linear-gradient(180deg,#34d399,#10b981);border-radius:4px 4px 0 0}
.tbl{margin-top:12px;background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:12px;overflow:auto}
table{width:100%;border-collapse:collapse}th,td{padding:10px 12px;border-bottom:1px solid var(--line);font-size:13px;text-align:left}th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.badge{padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700}.badge.pass{background:#14532d;color:#86efac}.badge.fail{background:#7f1d1d;color:#fca5a5}
.branch{font-family:Consolas,monospace;background:#1a2848;border:1px solid var(--line);padding:2px 6px;border-radius:6px}.mono{font-family:Consolas,monospace;color:var(--muted)}
a{color:var(--a);text-decoration:none}
@media(max-width:1000px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.grid{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
  <div class="nav"><div><div class="brand">Test Dashboard</div><div class="repo">${escapeHtml(repo || 'repository')} | updated ${fmtDate(new Date().toISOString())}</div></div><div class="tabs"><a class="active" href="index.html">Overview</a> <a href="tests.html">Test Analytics</a></div></div>
  <div class="grid">
    <div class="card"><div class="lbl">Total Runs</div><div class="val">${totalRuns}</div></div>
    <div class="card"><div class="lbl">Passed Runs</div><div class="val ok">${passRuns}</div></div>
    <div class="card"><div class="lbl">Failed Runs</div><div class="val bad">${failRuns}</div></div>
    <div class="card"><div class="lbl">Avg Pass Rate</div><div class="val">${avgRate}%</div></div>
    <div class="card"><div class="lbl">Flaky Scenarios</div><div class="val warn">${totalFlaky}</div></div>
  </div>
  ${latest ? `<div class="latest"><span class="badge ${latest.status === 'PASS' ? 'pass' : 'fail'}">${latest.status}</span><span>${escapeHtml(latest.branch)}</span><span>${escapeHtml(latest.browser)}</span><span class="ok">${latest.passed} passed</span><span class="bad">${latest.failed} failed</span><span class="warn">${latest.flaky || 0} flaky</span><span>${fmtDuration(latest.duration)}</span><a href="${latest.reportUrl}" target="_blank" rel="noreferrer">Latest report</a></div>` : ''}
  <div class="trend"><div class="lbl">Pass Rate Trend (last ${trend.length} runs)</div><div class="bars">${trendBars}</div></div>
  <div class="tbl"><table><thead><tr><th>Status</th><th>Date</th><th>Branch</th><th>Browser</th><th>Passed</th><th>Failed</th><th>Flaky</th><th>Duration</th><th>Rate</th><th>Report</th></tr></thead><tbody>${rows || '<tr><td colspan="10">No runs yet</td></tr>'}</tbody></table></div>
</div></body></html>`;
}

function renderTestsPage(testRuns, repo) {
  const map = new Map();

  for (const run of testRuns) {
    for (const t of run.tests || []) {
      if (!map.has(t.title)) {
        map.set(t.title, {
          title: t.title,
          total: 0,
          passed: 0,
          failed: 0,
          flaky: 0,
          avgDuration: 0,
          lastStatus: t.status,
          lastDate: run.date,
          history: [],
        });
      }
      const e = map.get(t.title);
      e.total += 1;
      if (t.status === 'passed') e.passed += 1;
      else if (t.status === 'failed') e.failed += 1;
      else e.flaky += 1;
      e.avgDuration = Math.round(((e.avgDuration * (e.total - 1)) + (t.duration || 0)) / e.total);
      if (e.history.length < 20) {
        e.history.push({
          runId: run.runId,
          branch: run.branch,
          browser: run.browser,
          date: run.date,
          status: t.status,
          duration: t.duration || 0,
          errors: t.errors || [],
          reportUrl: run.reportUrl,
        });
      }
    }
  }

  const tests = Array.from(map.values()).map((e) => ({ ...e, passRate: e.total ? Math.round((e.passed / e.total) * 100) : 0 }))
    .sort((a, b) => b.failed - a.failed || a.title.localeCompare(b.title));

  const cards = tests.map((t, idx) => {
    const sev = t.passRate < 50 ? 'critical' : t.passRate < 80 ? 'high' : t.failed > 0 ? 'medium' : 'good';
    const historyRows = t.history.map((h) => `<div class="hrow"><span class="st ${h.status}">${h.status.toUpperCase()}</span><span class="mono">${fmtDate(h.date)}</span><span class="mono">${escapeHtml(h.browser)}</span><span class="mono">${fmtDuration(h.duration)}</span>${h.reportUrl ? `<a href="${h.reportUrl}" target="_blank" rel="noreferrer">report</a>` : ''}${h.errors && h.errors[0] ? `<pre>${escapeHtml(String(h.errors[0]).slice(0, 280))}</pre>` : ''}</div>`).join('');
    return `<div class="card" data-title="${escapeHtml(t.title).toLowerCase()}" data-status="${t.lastStatus}" data-passrate="${t.passRate}" style="animation-delay:${idx * 0.03}s">
      <div class="head" onclick="toggle('${idx}')"><span class="sev ${sev}">${sev}</span><span class="title">${escapeHtml(t.title)}</span><span class="met"><b class="ok">${t.passed}</b>/<b class="bad">${t.failed}</b>/<b class="warn">${t.flaky}</b></span><span class="rate">${t.passRate}%</span><span id="ico-${idx}">▸</span></div>
      <div class="body" id="body-${idx}" style="display:none"><div class="sub">avg ${fmtDuration(t.avgDuration)} | total ${t.total} runs</div>${historyRows || '<div class="sub">No history</div>'}</div>
    </div>`;
  }).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test Analytics</title>
<style>
:root{--bg:#0a0f1f;--panel:#10182d;--panel2:#16213b;--line:#22365c;--text:#e6eefc;--muted:#90a4c7;--ok:#22c55e;--bad:#ef4444;--warn:#f59e0b;--a:#38bdf8}
*{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:radial-gradient(900px 400px at 90% -10%,#1f3c7a55,transparent),var(--bg);color:var(--text)}
.wrap{max-width:1260px;margin:0 auto;padding:26px}.nav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.brand{font-weight:800;font-size:26px}.repo{color:var(--muted);font-size:12px}.tabs a{color:var(--muted);text-decoration:none;padding:7px 12px;border:1px solid var(--line);border-radius:8px}.tabs a.active{color:var(--a);border-color:var(--a)}
.ctrl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:10px}.ctrl input,.ctrl select{background:#0f1730;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px 10px}.count{color:var(--muted);font-size:12px;margin-left:auto}
.list{display:flex;flex-direction:column;gap:8px}.card{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:12px;overflow:hidden;animation:in .3s ease both}.head{display:flex;align-items:center;gap:8px;padding:10px;cursor:pointer}.title{font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.met{font-family:Consolas,monospace}.rate{font-family:Consolas,monospace;color:var(--muted)}
.sev{font-size:11px;text-transform:uppercase;padding:2px 6px;border-radius:999px}.sev.critical{background:#7f1d1d;color:#fecaca}.sev.high{background:#78350f;color:#fde68a}.sev.medium{background:#312e81;color:#c7d2fe}.sev.good{background:#14532d;color:#bbf7d0}
.body{border-top:1px solid var(--line);padding:10px}.sub{color:var(--muted);font-size:12px}.hrow{margin-top:8px;padding:8px;border:1px solid var(--line);border-radius:8px;background:#0f1730;display:grid;gap:6px}.st{padding:2px 6px;border-radius:999px;font-size:11px;width:max-content}.st.passed{background:#14532d;color:#bbf7d0}.st.failed{background:#7f1d1d;color:#fecaca}.st.flaky{background:#78350f;color:#fde68a}
.mono{font-family:Consolas,monospace;color:var(--muted);font-size:12px}pre{white-space:pre-wrap;word-break:break-word;background:#111827;border:1px solid var(--line);border-radius:8px;padding:8px;color:#fca5a5;font-family:Consolas,monospace;font-size:12px}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}a{color:var(--a)}@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
</style></head><body><div class="wrap">
  <div class="nav"><div><div class="brand">Test Analytics</div><div class="repo">${escapeHtml(repo || 'repository')} | ${tests.length} unique tests</div></div><div class="tabs"><a href="index.html">Overview</a> <a class="active" href="tests.html">Test Analytics</a></div></div>
  <div class="ctrl"><input id="q" placeholder="Search test" oninput="apply()"><select id="s" onchange="apply()"><option value="all">All</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="flaky">Flaky</option></select><select id="o" onchange="apply()"><option value="fail">Sort failures</option><option value="rate">Sort pass rate</option><option value="name">Sort name</option></select><span id="c" class="count">${tests.length} tests</span></div>
  <div class="list" id="list">${cards || '<div class="sub">No test analytics yet.</div>'}</div>
</div>
<script>
function toggle(i){const b=document.getElementById('body-'+i);const ic=document.getElementById('ico-'+i);const o=b.style.display!=='none';b.style.display=o?'none':'';ic.textContent=o?'▸':'▾';}
function apply(){const q=(document.getElementById('q').value||'').toLowerCase();const s=document.getElementById('s').value;const o=document.getElementById('o').value;const list=document.getElementById('list');const cards=[...list.querySelectorAll('.card')];let v=0;cards.forEach(c=>{const t=c.getAttribute('data-title')||'';const st=c.getAttribute('data-status')||'';const sh=(!q||t.includes(q))&&(s==='all'||s===st);c.style.display=sh?'':'none';if(sh)v++;});const vis=cards.filter(c=>c.style.display!=='none');vis.sort((a,b)=>{if(o==='name')return (a.getAttribute('data-title')||'').localeCompare(b.getAttribute('data-title')||'');if(o==='rate')return Number(a.getAttribute('data-passrate')||0)-Number(b.getAttribute('data-passrate')||0);const af=Number((a.querySelector('.met .bad')||{textContent:'0'}).textContent||0);const bf=Number((b.querySelector('.met .bad')||{textContent:'0'}).textContent||0);return bf-af;});vis.forEach(c=>list.appendChild(c));document.getElementById('c').textContent=v+' tests';}
</script>
</body></html>`;
}

function escapeHtml(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
