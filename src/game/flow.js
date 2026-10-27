import { SHAPE_CATALOGUE } from './shapes.js';
import { nextRandom, generateTray } from './random.js';
import { enumerateLegalPlacements, evaluateBoard, evaluateShapeUsefulness, narrowGapCells, EMPTY_BOARD_MOBILITY } from './evaluation.js';
import { simulateMove } from './rules.js';
import { findPlayableTraySequence } from './traySearch.js';
import { generateFlowTray as generateFlowV1, weightedIndex } from './flowV1.js';
export { weightedIndex } from './flowV1.js';
export { findPlayableTraySequence } from './traySearch.js';
export const FLOW_CONFIG = Object.freeze({ intentions: [.4, .4, .2], attempts: 3, searchNodes: 600, mobilitySamples: 12, repetitionPenalty: .3 });
function configuration(config) {
  const c = { ...FLOW_CONFIG, ...config };
  return {
    intentions: Array.isArray(c.intentions) && c.intentions.length === 3 && c.intentions.every(w => Number.isFinite(w) && w >= 0) && c.intentions.some(w => w > 0) ? c.intentions : FLOW_CONFIG.intentions,
    attempts: Number.isInteger(c.attempts) ? Math.max(1, Math.min(6, c.attempts)) : 3,
    searchNodes: Number.isInteger(c.searchNodes) ? Math.max(0, Math.min(5000, c.searchNodes)) : 600,
    mobilitySamples: Number.isInteger(c.mobilitySamples) ? Math.max(1, Math.min(64, c.mobilitySamples)) : 12,
    repetitionPenalty: Number.isFinite(c.repetitionPenalty) ? Math.max(0, Math.min(.6, c.repetitionPenalty)) : .3
  };
}
export function generateFlowTray(board, rngState, config = FLOW_CONFIG, nextPieceId = 1, recentShapes = []) {
  const c = configuration(config), evaluation = evaluateBoard(board);
  const gaps = new Set(narrowGapCells(board).map(String));
  const candidates = SHAPE_CATALOGUE.flatMap(shape => {
    const anchors = enumerateLegalPlacements(board, shape);
    if (!anchors.length) return [];
    const usefulness = evaluateShapeUsefulness(board, shape, c.mobilitySamples);
    const gapCoverage = Math.max(...anchors.map(a => shape.cells.filter(([r, col]) => gaps.has(String([r + a.row, col + a.col]))).length)) / shape.cells.length;
    return [{ shape, ...usefulness, gapCoverage }];
  });
  const history = [...recentShapes].slice(-6);
  if (!candidates.length) return { generatorVersion: 2, configVersion: 2, tray: [null, null, null], rngState, nextPieceId, recentShapes: history, noLegalPiece: true, diagnostics: { status: 'no-legal-piece', nodes: 0, attempts: 0, witness: null } };
  const intentionDraw = weightedIndex(c.intentions, rngState); rngState = intentionDraw.nextState;
  let intention = ['build', 'clear', 'challenge'][intentionDraw.value];
  const clearing = candidates.filter(s => s.clearPlacements > 0);
  if (intention === 'clear' && !clearing.length) intention = 'build';
  const weight = (candidate, recent) => {
    const mobility = candidate.bestResultingMobility / EMPTY_BOARD_MOBILITY;
    const usefulness = intention === 'challenge'
      ? 1 + 1.5 / Math.sqrt(candidate.legalPlacementCount) + .12 * candidate.shape.cells.length
      : 1 + 2 * mobility + 1.5 * candidate.gapCoverage + (candidate.clearPlacements ? intention === 'clear' ? 3 : .4 : 0);
    const size = .65 + .15 * Math.min(5, candidate.shape.cells.length);
    return size * usefulness / (1 + c.repetitionPenalty * recent.filter(id => id === candidate.shape.id).length);
  };
  const sample = (pool, recent) => {
    const draw = weightedIndex(pool.map(s => weight(s, recent)), rngState); rngState = draw.nextState;
    return pool[draw.value].shape;
  };
  let selected, proof, attempts = 0, nodes = 0, unknownSearches = 0;
  for (; attempts < c.attempts; attempts++) {
    const recent = [...history], shapes = [];
    for (let slot = 0; slot < 3; slot++) {
      const shape = sample(slot === 0 && intention === 'clear' ? clearing : candidates, recent);
      shapes.push(shape); recent.push(shape.id);
    }
    selected = shapes; proof = findPlayableTraySequence(board, shapes, c.searchNodes); nodes += proof.nodes;
    if (proof.status === 'unknown') unknownSearches++;
    if (proof.status === 'verified') { attempts++; break; }
  }
  let constructiveFallback = false;
  if (proof.status !== 'verified') {
    // A bounded constructive path; every shape also belongs to the initial-board fit pool.
    // This is an actual witness, never a claim based on budget exhaustion.
    let working = board; const shapes = [], witness = [];
    for (let slot = 0; slot < 3; slot++) {
      const available = candidates.filter(s => enumerateLegalPlacements(working, s.shape).length > 0);
      if (!available.length) break;
      const pool = slot === 0 && intention === 'clear' ? available.filter(s => s.clearPlacements > 0) : available;
      const shape = sample(pool, [...history, ...shapes.map(s => s.id)]);
      const anchors = enumerateLegalPlacements(working, shape);
      const anchor = slot === 0 && intention === 'clear' ? anchors.find(a => simulateMove(working, shape, a).lines > 0) : anchors[0];
      working = simulateMove(working, shape, anchor).board;
      witness.push({ index: slot, shapeId: shape.id, anchor }); shapes.push(shape);
    }
    if (shapes.length === 3) { selected = shapes; proof = { status: 'verified', witness }; constructiveFallback = true; }
    // Otherwise keep the last individually fitting tray, honestly marked unknown/impossible.
  }
  const tray = selected.map(shape => {
    const colourId = nextRandom(Math.imul(nextPieceId, 0x9e3779b9) >>> 0).value % 7;
    return { instanceId: `p-${nextPieceId++}`, shapeId: shape.id, colourId };
  });
  return { generatorVersion: 2, configVersion: 2, tray, rngState, nextPieceId, recentShapes: [...history, ...selected.map(s => s.id)].slice(-6),
    diagnostics: { status: proof.status, witness: proof.witness, intention, attempts, nodes, unknownSearches, constructiveFallback, candidateCount: candidates.length, pressure: evaluation.pressure } };
}
// Search witnesses and diagnostics are developer data, never persisted or shown as hints.
export function generateModeTray(board, rngState, nextPieceId, mode, recentShapes = [], generatorVersion = mode === 'flow' ? 2 : 1) {
  if (mode === 'classic') return { ...generateTray(rngState, nextPieceId), recentShapes: [] };
  if (generatorVersion === 1) return generateFlowV1(board, rngState, undefined, nextPieceId, recentShapes);
  const { diagnostics: _diagnostics, noLegalPiece: _noLegalPiece, ...stable } = generateFlowTray(board, rngState, FLOW_CONFIG, nextPieceId, recentShapes);
  return stable;
}
