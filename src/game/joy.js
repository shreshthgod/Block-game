import { SIZE, JOY_GENERATOR_VERSION, JOY_CONFIG_VERSION } from './constants.js';
import { JOY_SHAPE_CATALOGUE } from './shapes.js';
import { enumerateLegalPlacements, evaluateBoard } from './evaluation.js';
import { simulateMove } from './rules.js';
import { nextRandom } from './random.js';
import { weightedIndex } from './flowV1.js';
import { findPlayableTraySequence } from './traySearch.js';
export const JOY_EMPTY_BOARD_MOBILITY = JOY_SHAPE_CATALOGUE.reduce((n, s) => n + (SIZE - s.rows + 1) * (SIZE - s.cols + 1), 0);
export const JOY_CONFIG = Object.freeze({ intentions: [.30, .45, .20, .05], candidates: 3, largeTarget: .60, searchNodes: 400, allClearNodes: 350, anchorSamples: 8 });
export const shapeCategory = shape => shape.cells.length >= 6 ? 'large' : shape.cells.length >= 4 ? 'medium' : 'small';
const boardKey = b => b.map(r => r.map(c => c === null ? '0' : '1').join('')).join('');
function configValues(config) {
  const c = { ...JOY_CONFIG, ...config };
  return { ...JOY_CONFIG,
    intentions: Array.isArray(c.intentions) && c.intentions.length === 4 && c.intentions.every(w => Number.isFinite(w) && w >= 0) && c.intentions.some(w => w > 0) ? c.intentions : JOY_CONFIG.intentions,
    candidates: Number.isInteger(c.candidates) ? Math.max(1, Math.min(5, c.candidates)) : 3,
    largeTarget: Number.isFinite(c.largeTarget) ? Math.max(0, Math.min(1, c.largeTarget)) : .6,
    searchNodes: Number.isInteger(c.searchNodes) ? Math.max(0, Math.min(1500, c.searchNodes)) : 400,
    allClearNodes: Number.isInteger(c.allClearNodes) ? Math.max(0, Math.min(1000, c.allClearNodes)) : 350,
    anchorSamples: Number.isInteger(c.anchorSamples) ? Math.max(1, Math.min(12, c.anchorSamples)) : 8 };
}
// Joy constructs real routes, allowing a later piece to fit only after earlier clears.
export function generateJoyTray(board, rngState, nextPieceId = 1, recentShapes = [], recentCategories = [], config = JOY_CONFIG, count = 3) {
  count = Number.isInteger(count) ? Math.max(1, Math.min(3, count)) : 3;
  const c = configValues(config), cache = new Map();
  const analyze = current => {
    const key = boardKey(current); if (cache.has(key)) return cache.get(key);
    const rowCounts = current.map(r => r.filter(v => v !== null).length);
    const colCounts = Array.from({ length: SIZE }, (_, col) => current.filter(r => r[col] !== null).length);
    const fitting = JOY_SHAPE_CATALOGUE.flatMap(shape => {
      const anchors = enumerateLegalPlacements(current, shape); if (!anchors.length) return [];
      const clears = anchors.flatMap(anchor => {
        const addedRows = {}, addedCols = {};
        for (const [r, col] of shape.cells) { addedRows[r + anchor.row] = (addedRows[r + anchor.row] || 0) + 1; addedCols[col + anchor.col] = (addedCols[col + anchor.col] || 0) + 1; }
        // Cheap prefilter only; actual clear information always comes from shared rules.
        if (!Object.entries(addedRows).some(([r, n]) => rowCounts[r] + n === SIZE) && !Object.entries(addedCols).some(([col, n]) => colCounts[col] + n === SIZE)) return [];
        const move = simulateMove(current, shape, anchor);
        return move.lines ? [{ anchor, move }] : [];
      });
      return [{ shape, anchors, clears, category: shapeCategory(shape) }];
    });
    const base = evaluateBoard(current);
    const mobility = fitting.reduce((n, s) => n + s.anchors.length, 0), normalizedMobility = mobility / JOY_EMPTY_BOARD_MOBILITY;
    const result = { fitting, evaluation: { ...base, mobility, normalizedMobility, pressure: Math.max(0, Math.min(1, .45 * base.occupancyRatio + .55 * (1 - normalizedMobility))) } }; cache.set(key, result); return result;
  };
  const initial = analyze(board), history = recentShapes.slice(-6), categories = recentCategories.slice(-6);
  if (!initial.fitting.length) return { generatorVersion: JOY_GENERATOR_VERSION, configVersion: JOY_CONFIG_VERSION, tray: Array(count).fill(null), rngState, nextPieceId, recentShapes: history, recentCategories: categories, noLegalPiece: true, diagnostics: { status: 'no-legal-piece', witness: null } };
  const draw = weights => { const d = weightedIndex(weights, rngState); rngState = d.nextState; return d.value; };
  const intention = ['build', 'burst', 'setup', 'allClear'][draw(c.intentions)];
  const wantLarge = intention === 'setup' || draw([1 - c.largeTarget, c.largeTarget]) === 1;
  const proposals = []; let searchNodes = 0, unknownSearches = 0;
  for (let attempt = 0; attempt < c.candidates; attempt++) {
    let working = board; const selected = [], witness = []; let clears = 0, allClear = false;
    for (let slot = 0; slot < count; slot++) {
      const available = analyze(working).fitting; if (!available.length) break;
      let pool = available;
      const opportunities = available.filter(s => s.clears.length);
      if (slot === 0 && intention !== 'build' && opportunities.length) {
        const emptying = opportunities.filter(s => s.clears.some(({ move }) => move.board.flat().every(v => v === null)));
        pool = intention === 'allClear' && emptying.length ? emptying : opportunities;
      }
      else if (wantLarge && !selected.some(s => shapeCategory(s) === 'large')) {
        const large = available.filter(s => s.category === 'large');
        if (large.length) pool = large;
      }
      const shapeInfo = pool[draw(pool.map(s => {
        const repeat = [...history, ...selected.map(p => p.id)].filter(id => id === s.shape.id).length;
        const sizeRepeat = [...categories, ...selected.map(shapeCategory)].filter(k => k === s.category).length;
        const base = s.category === 'small' ? (s.clears.length ? 1.5 : .3) : s.category === 'medium' ? 3 : 2.4;
        return base * (1 + (s.clears.length ? 2.5 : 0)) / (1 + .22 * repeat + .10 * sizeRepeat);
      }))];
      const shape = shapeInfo.shape;
      let options;
      if (shapeInfo.clears.length) {
        const emptying = shapeInfo.clears.filter(({ move }) => move.board.flat().every(v => v === null));
        options = (intention === 'allClear' && emptying.length ? emptying : shapeInfo.clears).slice(0, 12);
      }
      else options = Array.from({ length: Math.min(c.anchorSamples, shapeInfo.anchors.length) }, (_, i) => {
        const anchor = shapeInfo.anchors[Math.floor(i * (shapeInfo.anchors.length - 1) / Math.max(1, Math.min(c.anchorSamples, shapeInfo.anchors.length) - 1))];
        return { anchor, move: simulateMove(working, shape, anchor) };
      });
      const scores = options.map(({ move }) => {
        const empty = move.board.flat().every(v => v === null);
        const largeAfter = JOY_SHAPE_CATALOGUE.filter(s => shapeCategory(s) === 'large').reduce((n, s) => n + enumerateLegalPlacements(move.board, s).length, 0);
        return 1 + move.lines * 4 + (empty && move.lines ? 15 : 0) + (intention === 'setup' ? Math.min(6, largeAfter / 8) : 0);
      });
      const option = options[draw(scores)]; working = option.move.board;
      clears += option.move.lines; allClear ||= option.move.lines > 0 && working.flat().every(v => v === null);
      witness.push({ index: slot, shapeId: shape.id, anchor: option.anchor }); selected.push(shape);
    }
    if (selected.length !== count) continue;
    let proof = findPlayableTraySequence(board, selected, c.searchNodes); searchNodes += proof.nodes;
    if (proof.status === 'unknown') unknownSearches++;
    // Construction is itself a verified witness even if generic search used its budget.
    if (proof.status !== 'verified') proof = { status: 'verified', witness, constructive: true };
    else proof = { ...proof, witness }; // Keep the same route used by the quality metrics.
    if (intention === 'allClear') {
      const special = findPlayableTraySequence(board, selected, c.allClearNodes, { requireAllClear: true }); searchNodes += special.nodes;
      if (special.status === 'unknown') unknownSearches++;
      if (special.status === 'verified') {
        proof = special; working = board; clears = 0; allClear = false;
        for (const step of special.witness) { const move = simulateMove(working, JOY_SHAPE_CATALOGUE[step.shapeId], step.anchor); working = move.board; clears += move.lines; allClear ||= move.lines > 0 && working.flat().every(v => v === null); }
      }
    }
    proposals.push({ shapes: selected, witness: proof.witness, clears, allClear, large: selected.some(s => shapeCategory(s) === 'large'), mobility: analyze(working).evaluation.normalizedMobility });
  }
  if (!proposals.length) {
    // Defensive bounded fallback: all pieces individually fit initially, with real route proof.
    const single = JOY_SHAPE_CATALOGUE[0], shapes = Array(count).fill(single);
    const proof = findPlayableTraySequence(board, shapes, 100);
    proposals.push({ shapes, witness: proof.witness, clears: 0, allClear: false, large: false, mobility: 0 });
  }
  const preferred = intention === 'allClear' && proposals.some(p => p.allClear) ? proposals.filter(p => p.allClear) : wantLarge && proposals.some(p => p.large) ? proposals.filter(p => p.large) : proposals;
  const chosen = preferred[draw(preferred.map(p => 1 + p.clears * 2 + (p.large ? 2 : 0) + (p.allClear ? 8 : 0) + p.mobility))];
  const tray = chosen.shapes.map(shape => ({ instanceId: `p-${nextPieceId++}`, shapeId: shape.id, colourId: nextRandom(Math.imul(nextPieceId - 1, 0x9e3779b9) >>> 0).value % 7 }));
  return { generatorVersion: JOY_GENERATOR_VERSION, configVersion: JOY_CONFIG_VERSION, tray, rngState, nextPieceId, recentShapes: [...history, ...chosen.shapes.map(s => s.id)].slice(-6), recentCategories: [...categories, ...chosen.shapes.map(shapeCategory)].slice(-6), trayVerified: !!chosen.witness,
    diagnostics: { status: chosen.witness ? 'verified' : 'unknown', witness: chosen.witness, intention, wantLarge, large: chosen.large, reachableLines: chosen.clears, allClear: chosen.allClear, searchNodes, unknownSearches, candidates: proposals.length, initialLargeFits: initial.fitting.some(s => s.category === 'large') } };
}
export function generateRecoveryPieces(game) {
  const slots = game.tray.flatMap((piece, slot) => piece ? [slot] : []);
  if (!slots.length) return null;
  const generated = generateJoyTray(game.board, game.rngState, game.nextPieceId, game.recentShapes, game.recentCategories, JOY_CONFIG, slots.length);
  if (generated.noLegalPiece) return null;
  const { diagnostics: _diagnostics, ...stable } = generated;
  return { ...stable, tray: game.tray.map((piece, slot) => piece ? generated.tray[slots.indexOf(slot)] : null) };
}
export function generateJoyState(...args) { const { diagnostics: _diagnostics, noLegalPiece: _noLegalPiece, ...stable } = generateJoyTray(...args); return stable; }
