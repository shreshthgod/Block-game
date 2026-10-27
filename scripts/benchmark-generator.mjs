import { build } from 'vite';
import { chromium } from '@playwright/test';
// Bundle the actual pure generator for a browser probe; no production debug API.
const bundle = await build({ configFile: false, logLevel: 'silent', build: { write: false, lib: { entry: 'src/game/flow.js', formats: ['es'], fileName: 'flow-probe' }, minify: true } });
const outputs = Array.isArray(bundle) ? bundle : [bundle];
const code = outputs.flatMap(o => o.output).find(o => o.type === 'chunk').code;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const report = await page.evaluate(async encoded => {
    const { generateFlowTray } = await import(`data:text/javascript;base64,${encoded}`);
    const empty = () => Array.from({ length: 8 }, () => Array(8).fill(null));
    const fixtures = [empty(), empty().map((r, y) => r.map((_, x) => (x + y) % 2 ? 0 : null)), empty().map((r, y) => r.map((_, x) => x === y ? null : 0))];
    const samples = [], boardStats = [];
    for (const [index, board] of fixtures.entries()) {
      const times = [];
      for (let seed = 0; seed < 24; seed++) {
        const start = performance.now(); const g = generateFlowTray(board, seed); const elapsed = performance.now() - start;
        samples.push(elapsed); times.push(elapsed);
        if (g.diagnostics.status !== 'verified') throw Error('Unexpected unverified probe tray');
      }
      times.sort((a, b) => a - b); boardStats.push({ fixture: ['empty', 'isolated spaces', 'diagonal gaps'][index], medianMs: times[12], p95Ms: times[22], maxMs: times.at(-1) });
    }
    samples.sort((a, b) => a - b);
    return { samples: samples.length, medianMs: samples[36], p95Ms: samples[68], maxMs: samples.at(-1), boardStats, userAgent: navigator.userAgent, note: 'Headless desktop Chromium, unthrottled. Each synchronous generation measured directly; no FPS or real-device latency claim.' };
  }, Buffer.from(code).toString('base64'));
  console.log(JSON.stringify({ browser: browser.version(), ...report }, null, 2));
} finally { await browser.close(); }
