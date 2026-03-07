const fs = require('fs');
const path = require('path');

// Configuration adaptée à votre architecture
const RESULTS_DIR = './test-results';
const DASHBOARD_DIR = './dashboard';
const HISTORY_FILE = path.join(RESULTS_DIR, 'history.json');
const MAX_HISTORY = 20;

console.log('🚀 Génération du dashboard...');

// Créer le dossier dashboard
if (!fs.existsSync(DASHBOARD_DIR)) {
    fs.mkdirSync(DASHBOARD_DIR, { recursive: true });
}

// Charger l'historique
let history = [];
if (fs.existsSync(HISTORY_FILE)) {
    try {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        console.warn('⚠️ Impossible de charger l\'historique, création d\'un nouveau');
        history = [];
    }
}

// Lire les résultats actuels
const latestResults = readLatestResults();

if (latestResults.totalTests === 0) {
    console.warn('⚠️ Aucun test trouvé');
} else {
    console.log(`✅ ${latestResults.totalTests} tests trouvés`);
}

// Ajouter au historique
const run = {
    runNumber: history.length + 1,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }),
    ...latestResults
};

history.unshift(run);
history = history.slice(0, MAX_HISTORY);

// Sauvegarder l'historique
fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
console.log(`💾 Historique sauvegardé (${history.length} runs)`);

// Générer le dashboard HTML
generateDashboard(history);

console.log('✅ Dashboard généré avec succès !');
console.log(`📊 URL: https://VOTRE_USERNAME.github.io/erudaxis-test-automation/`);

// === FONCTIONS ===

function readLatestResults() {
    const latestDir = path.join(RESULTS_DIR, 'latest');

    if (!fs.existsSync(latestDir)) {
        console.warn('⚠️ Dossier latest non trouvé');
        return getEmptyResults();
    }

    const cucumberFiles = fs.readdirSync(latestDir)
        .filter(f => f.endsWith('.json') && f.includes('cucumber'));

    if (cucumberFiles.length === 0) {
        console.warn('⚠️ Aucun fichier JSON trouvé');
        return getEmptyResults();
    }

    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const browsers = new Set();

    cucumberFiles.forEach(file => {
        const browser = file.includes('chrome') ? 'Chrome' :
                       file.includes('firefox') ? 'Firefox' : 'Unknown';
        browsers.add(browser);

        try {
            const content = JSON.parse(
                fs.readFileSync(path.join(latestDir, file), 'utf8')
            );

            content.forEach(feature => {
                if (!feature.elements) return;

                feature.elements.forEach(scenario => {
                    totalTests++;
                    const allPassed = scenario.steps.every(s => s.result.status === 'passed');
                    const hasSkipped = scenario.steps.some(s => s.result.status === 'skipped');

                    if (allPassed) {
                        passed++;
                    } else if (hasSkipped) {
                        skipped++;
                    } else {
                        failed++;
                    }
                });
            });
        } catch (e) {
            console.error(`❌ Erreur lors de la lecture de ${file}:`, e.message);
        }
    });

    const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0;

    return {
        totalTests,
        passed,
        failed,
        skipped,
        passRate: parseFloat(passRate),
        browsers: Array.from(browsers).join(', '),
        status: failed === 0 ? 'success' : 'failure'
    };
}

function getEmptyResults() {
    return {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        passRate: 0,
        browsers: 'N/A',
        status: 'unknown'
    };
}

function generateDashboard(history) {
    const stats = calculateStats(history);
    const sparklineData = history.slice(0, 20).reverse().map(r => r.passRate);

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erudaxis Test Dashboard</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧪</text></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container { max-width: 1400px; margin: 0 auto; }

        header {
            text-align: center;
            margin-bottom: 3rem;
        }

        h1 {
            color: white;
            font-size: 3rem;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 1.1rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #667eea, #764ba2);
        }

        .stat-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }

        .stat-label {
            font-size: 0.875rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 0.75rem;
            font-weight: 600;
        }

        .stat-value {
            font-size: 3rem;
            font-weight: 800;
            color: #1f2937;
            line-height: 1;
        }

        .stat-trend {
            font-size: 0.875rem;
            margin-top: 0.75rem;
            color: #6b7280;
        }

        .success { color: #10b981; }
        .failure { color: #ef4444; }
        .warning { color: #f59e0b; }

        .history-card {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .history-title {
            font-size: 1.75rem;
            font-weight: 800;
            margin-bottom: 2rem;
            color: #1f2937;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .run-header {
            display: grid;
            grid-template-columns: 80px 200px 120px 100px 220px 150px;
            gap: 1rem;
            padding: 1rem;
            font-weight: 700;
            color: #6b7280;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #e5e7eb;
        }

        .run-item {
            display: grid;
            grid-template-columns: 80px 200px 120px 100px 220px 150px;
            gap: 1rem;
            padding: 1.25rem 1rem;
            border-bottom: 1px solid #f3f4f6;
            align-items: center;
            transition: all 0.2s;
        }

        .run-item:hover {
            background: linear-gradient(90deg, #f9fafb, transparent);
            border-left: 3px solid #667eea;
            padding-left: calc(1rem - 3px);
        }

        .run-number {
            font-weight: 800;
            color: #667eea;
            font-size: 1.5rem;
        }

        .run-date {
            color: #6b7280;
            font-size: 0.875rem;
            font-family: 'Courier New', monospace;
        }

        .badge {
            display: inline-block;
            padding: 0.4rem 1rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge-success {
            background: linear-gradient(135deg, #d1fae5, #a7f3d0);
            color: #065f46;
        }

        .badge-failure {
            background: linear-gradient(135deg, #fee2e2, #fecaca);
            color: #991b1b;
        }

        .badge-unknown {
            background: linear-gradient(135deg, #e5e7eb, #d1d5db);
            color: #4b5563;
        }

        .sparkline {
            width: 100%;
            height: 50px;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .animate {
            animation: fadeIn 0.6s ease-out;
        }

        footer {
            text-align: center;
            margin-top: 3rem;
            color: rgba(255,255,255,0.8);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .run-header, .run-item {
                grid-template-columns: 1fr;
                gap: 0.5rem;
            }

            .run-item {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="animate">
            <h1>🧪 Erudaxis Test Dashboard</h1>
            <p class="subtitle">Automated Selenium WebDriver Testing | Cucumber BDD</p>
        </header>

        <div class="stats-grid animate" style="animation-delay: 0.1s;">
            <div class="stat-card">
                <div class="stat-label">📊 Total Runs</div>
                <div class="stat-value">${history.length}</div>
                <div class="stat-trend">Test executions tracked</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">📈 Overall Pass Rate</div>
                <div class="stat-value ${stats.avgPassRate >= 80 ? 'success' : stats.avgPassRate >= 50 ? 'warning' : 'failure'}">
                    ${stats.avgPassRate}%
                </div>
                <div class="stat-trend">Average across all runs</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">🎯 Last Run</div>
                <div class="stat-value ${history[0].status === 'success' ? 'success' : 'failure'}">
                    ${history[0].passRate}%
                </div>
                <div class="stat-trend">
                    ✅ ${history[0].passed} passed ·
                    ❌ ${history[0].failed} failed ·
                    ⏭️ ${history[0].skipped} skipped
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-label">📉 Trend (Last ${sparklineData.length})</div>
                <svg class="sparkline" viewBox="0 0 200 50" preserveAspectRatio="none">
                    <!-- Grille -->
                    <line x1="0" y1="12.5" x2="200" y2="12.5" stroke="#f3f4f6" stroke-width="1"/>
                    <line x1="0" y1="25" x2="200" y2="25" stroke="#e5e7eb" stroke-width="1"/>
                    <line x1="0" y1="37.5" x2="200" y2="37.5" stroke="#f3f4f6" stroke-width="1"/>

                    <!-- Ligne de tendance -->
                    <polyline
                        fill="none"
                        stroke="${stats.avgPassRate >= 80 ? '#10b981' : '#ef4444'}"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        points="${generateSparkline(sparklineData)}"
                    />

                    <!-- Points -->
                    ${sparklineData.map((value, index) => {
                        const x = (index / (sparklineData.length - 1)) * 200;
                        const y = 50 - ((value / 100) * 50);
                        return `<circle cx="${x}" cy="${y}" r="3" fill="${value >= 80 ? '#10b981' : '#ef4444'}" />`;
                    }).join('')}
                </svg>
            </div>
        </div>

        <div class="history-card animate" style="animation-delay: 0.2s;">
            <h2 class="history-title">
                <span>📋 Test Run History</span>
            </h2>

            <div class="run-header">
                <div>RUN</div>
                <div>DATE</div>
                <div>STATUS</div>
                <div>PASS RATE</div>
                <div>RESULTS</div>
                <div>BROWSERS</div>
            </div>

            ${history.map(run => `
                <div class="run-item">
                    <div class="run-number">#${run.runNumber}</div>
                    <div class="run-date">${run.date}</div>
                    <div>
                        <span class="badge badge-${run.status}">
                            ${run.status === 'success' ? '✓ PASS' : run.status === 'failure' ? '✗ FAIL' : '? UNKNOWN'}
                        </span>
                    </div>
                    <div class="${run.passRate >= 80 ? 'success' : run.passRate >= 50 ? 'warning' : 'failure'}"
                         style="font-weight: 700; font-size: 1.125rem;">
                        ${run.passRate}%
                    </div>
                    <div style="font-size: 0.875rem; color: #6b7280; font-family: monospace;">
                        ✅ ${run.passed} · ❌ ${run.failed} · ⏭️ ${run.skipped} / ${run.totalTests}
                    </div>
                    <div style="font-size: 0.75rem; color: #9ca3af; font-weight: 600;">
                        ${run.browsers}
                    </div>
                </div>
            `).join('')}
        </div>

        <footer class="animate" style="animation-delay: 0.3s;">
            <p>🚀 Powered by Selenium WebDriver + Cucumber + GitHub Actions</p>
            <p style="margin-top: 0.5rem; font-size: 0.75rem;">
                Last updated: ${new Date().toLocaleString('fr-FR')}
            </p>
        </footer>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(path.join(DASHBOARD_DIR, 'index.html'), html);
}

function calculateStats(history) {
    if (history.length === 0) {
        return { avgPassRate: 0 };
    }

    const avgPassRate = history.reduce((sum, r) => sum + r.passRate, 0) / history.length;
    return { avgPassRate: parseFloat(avgPassRate.toFixed(1)) };
}

function generateSparkline(data) {
    if (data.length === 0) return '';
    if (data.length === 1) return '0,25 200,25';

    const width = 200;
    const height = 50;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value / 100) * height);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    return points.join(' ');
}