import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createNewGame } from '../../src/game/engine.js';
import { DEFAULT_PROFILE } from '../../src/game/constants.js';
test('performance recording: drag and crossing-line burst', async ({
  page,
  context,
  browser
}, testInfo) => {
  const game = createNewGame(42, 'performance-fixture', 0);
  game.tray[0] = {
    ...game.tray[0],
    shapeId: 0,
    colourId: 0
  };
  for (let n = 1; n < 8; n++) {
    game.board[0][n] = 0;
    game.board[n][0] = 2;
  }
  await page.addInitScript(({
    game,
    profile
  }) => {
    localStorage.setItem('prismNine.game.v3', JSON.stringify(game));
    localStorage.setItem('prismNine.profile.v3', JSON.stringify(profile));
  }, {
    game,
    profile: {
      ...DEFAULT_PROFILE,
      motionMode: 'auto',
      tutorialDismissed: true
    }
  });
  await page.goto('/');
  await page.getByRole('button', {
    name: 'Continue game'
  }).click();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const before = await cdp.send('Performance.getMetrics');
  await cdp.send('Tracing.start', {
    categories: 'devtools.timeline,v8,blink.user_timing',
    transferMode: 'ReturnAsStream'
  });
  await page.evaluate(() => {
    const data = {
      frames: [],
      longTasks: [],
      overlayWrites: 0,
      cellClassChanges: 0,
      maxParticles: 0,
      phase: 'drag'
    };
    const tasks = PerformanceObserver.supportedEntryTypes.includes('longtask') ? new PerformanceObserver(list => {
      for (const item of list.getEntries()) data.longTasks.push({
        start: item.startTime,
        duration: item.duration
      });
    }) : null;
    tasks?.observe({
      type: 'longtask'
    });
    const mutations = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target.matches('.drag-overlay')) data.overlayWrites++;
        if (record.type === 'attributes' && record.target.matches('.board-cell') && record.attributeName === 'class') data.cellClassChanges++;
      }
      data.maxParticles = Math.max(data.maxParticles, document.querySelectorAll('.clear-particle').length);
    });
    mutations.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    let previous = null,
      frame;
    const sample = now => {
      if (previous !== null) data.frames.push({
        phase: data.phase,
        interval: now - previous
      });
      previous = now;
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    window.__finishPrismBenchmark = () => {
      cancelAnimationFrame(frame);
      tasks?.disconnect();
      mutations.disconnect();
      return data;
    };
    window.__setPrismBenchmarkPhase = phase => {
      data.phase = phase;
    };
  });
  try {
    const source = await page.locator('[data-slot="0"] .piece-shape').boundingBox();
    const first = await page.locator('[data-row="0"][data-col="0"]').boundingBox();
    const next = await page.locator('[data-row="0"][data-col="1"]').boundingBox();
    const pitch = next.x - first.x;
    await page.mouse.move(source.x + source.width * .5, source.y + source.height * .5);
    await page.mouse.down();
    // A repeatable 96-input trajectory, plus micro-movement within one candidate.
    for (let i = 0; i < 96; i++) {
      const t = i / 95;
      await page.mouse.move(first.x + (2.5 + 3 * t) * pitch, first.y + (4 + Math.sin(t * Math.PI * 2)) * pitch);
    }
    for (let i = 0; i < 24; i++) await page.mouse.move(first.x + 5.5 * pitch + i / 100, first.y + 4.5 * pitch);
    await page.evaluate(() => window.__setPrismBenchmarkPhase('clear'));
    await page.mouse.move(first.x + first.width * .5, first.y + first.height * .5);
    await page.mouse.up();
    await expect(page.locator('.clear-particle')).toHaveCount(15);
    await expect(page.locator('.resolution-effects')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prismNine.game.v3')).score)).toBe(310);
  } finally {
    const data = await page.evaluate(() => window.__finishPrismBenchmark());
    const after = await cdp.send('Performance.getMetrics');
    const values = result => Object.fromEntries(result.metrics.map(metric => [metric.name, metric.value]));
    const a = values(after),
      b = values(before);
    const intervals = data.frames.map(frame => frame.interval).sort((x, y) => x - y);
    const report = {
      browser: browser.version(),
      viewport: page.viewportSize(),
      environment: await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        dpr: devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency
      })),
      ...data,
      frameIntervalSummaryMs: {
        count: intervals.length,
        median: intervals[Math.floor(intervals.length * .5)] ?? null,
        p95: intervals[Math.floor(intervals.length * .95)] ?? null,
        max: intervals.at(-1) ?? null,
        over25ms: intervals.filter(n => n > 25).length
      },
      metricsDelta: Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount', 'JSHeapUsedSize'].map(key => [key, a[key] - b[key]])),
      note: 'RAF intervals and task counters are observations, not proof of GPU dropped frames or real-device input latency.'
    };
    const reportPath = testInfo.outputPath('performance.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    await testInfo.attach('performance', {
      path: reportPath,
      contentType: 'application/json'
    });
    const completed = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.end');
    const {
      stream
    } = await completed;
    const chunks = [];
    while (true) {
      const chunk = await cdp.send('IO.read', {
        handle: stream
      });
      chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
      if (chunk.eof) break;
    }
    await cdp.send('IO.close', {
      handle: stream
    });
    const tracePath = testInfo.outputPath('performance-trace.json');
    await writeFile(tracePath, Buffer.concat(chunks));
    await testInfo.attach('performance-trace', {
      path: tracePath,
      contentType: 'application/json'
    });
    await cdp.detach();
  }
});
