import { performance } from 'node:perf_hooks';
import { createNewGame, resolvePlacement, getLegalAnchors } from '../src/game/engine.js';
import { generateModeTray, generateFlowTray, FLOW_CONFIG } from '../src/game/flow.js';
import { SHAPE_CATALOGUE } from '../src/game/shapes.js';
import { simulatePlacement, EMPTY_BOARD_MOBILITY } from '../src/game/evaluation.js';
const seeds = [1, 42, 143, 853, 2026, 32768, 65535, 0xffffffff];
const report = { generatorVersion: 2, seeds, moveCap: 120, emptyBoardMobility: EMPTY_BOARD_MOBILITY, policy: 'Max immediate lines; then largest piece; ties use slot, row, column order. No lookahead.', modes: {} };
for (const mode of ['classic', 'flow']) {
  const runs = [], frequency = Array(25).fill(0), timings = [];
  let initialFitViolations = 0, verified = 0, generationCount = 0, searchUnknown = 0, searches = 0;
  let refills = 0, unusable = 0, opportunities = 0, draws = 0, repeats = 0, previous = null;
  function observe(board, generated, refill) {
    generationCount++;
    if (generated.diagnostics?.status === 'verified') verified++;
    searchUnknown += generated.diagnostics?.unknownSearches ?? 0;
    searches += generated.diagnostics?.attempts ?? 0;
    const fits = generated.tray.map(p => getLegalAnchors(board, SHAPE_CATALOGUE[p.shapeId].cells));
    initialFitViolations += fits.filter(a => !a.length).length;
    if (refill) {
      refills++;
      if (fits.every(a => !a.length)) unusable++;
      if (generated.tray.some((p, i) => fits[i].some(a => simulatePlacement(board, SHAPE_CATALOGUE[p.shapeId], a).lines > 0))) opportunities++;
    }
    for (const p of generated.tray) { frequency[p.shapeId]++; draws++; if (p.shapeId === previous) repeats++; previous = p.shapeId; }
  }
  for (const seed of seeds) {
    previous = null;
    const start = performance.now();
    let game = createNewGame(seed, `sim-${seed}`, 0, mode), lines = 0;
    timings.push(performance.now() - start); observe(game.board, mode === 'flow' ? generateFlowTray(game.board, seed) : game, false);
    while (game.status === 'active' && game.moveCount < report.moveCap) {
      let best = null;
      for (let slot = 0; slot < 3; slot++) {
        const p = game.tray[slot]; if (!p) continue;
        const shape = SHAPE_CATALOGUE[p.shapeId];
        for (const anchor of getLegalAnchors(game.board, shape.cells)) {
          const simulated = simulatePlacement(game.board, shape, anchor);
          const value = simulated.lines * 100 + shape.cells.length;
          if (!best || value > best.value) best = { slot, anchor, value };
        }
      }
      if (!best) break;
      const resolved = resolvePlacement(game, { gameId: game.gameId, revision: game.revision, pieceId: game.tray[best.slot].instanceId, anchorRow: best.anchor.row, anchorColumn: best.anchor.col }, (rng, nextId, board) => {
        const start = performance.now();
        const generated = mode === 'flow' ? generateFlowTray(board, rng, FLOW_CONFIG, nextId, game.recentShapes) : generateModeTray(board, rng, nextId, mode, game.recentShapes);
        timings.push(performance.now() - start); observe(board, generated, true); const { diagnostics: _diagnostics, ...stable } = generated; return stable;
      });
      lines += resolved.result.completedLines.rows.length + resolved.result.completedLines.columns.length;
      game = resolved.game;
    }
    runs.push({ seed, moves: game.moveCount, lines, capped: game.moveCount === report.moveCap });
  }
  timings.sort((a, b) => a - b);
  report.modes[mode] = { runs, initialFitViolations, generationCount, verifiedCompleteTrayFraction: mode === 'flow' ? verified / generationCount : null, searchBudgetExhaustionFraction: searches ? searchUnknown / searches : 0, distinctShapes: frequency.filter(n => n > 0).length, averageMoves: runs.reduce((s, r) => s + r.moves, 0) / runs.length, totalLines: runs.reduce((s, r) => s + r.lines, 0), refills, unusableRefillFraction: unusable / refills, clearOpportunityRefillFraction: opportunities / refills, consecutiveRepetitionRate: repeats / (draws - seeds.length), shapeFrequency: Object.fromEntries(SHAPE_CATALOGUE.map(s => [s.name, frequency[s.id]])), generationMs: { samples: timings.length, median: timings[Math.floor(timings.length / 2)], p95: timings[Math.floor(timings.length * .95)], max: timings.at(-1) } };
}
console.log(JSON.stringify(report, null, 2));
