import { SHAPE_CATALOGUE } from './shapes.js';
import { nextRandom } from './random.js';
import { evaluateBoard, evaluateShapeUsefulness } from './evaluation.js';
export const FLOW_CONFIG = Object.freeze({
  low: [.50, .35, .15], medium: [.35, .40, .25], high: [.25, .45, .30],
  fitBoost: 4, clearBoost: 6, repetitionPenalty: .18
});
function weightsForPressure(pressure, config) {
  const weights = config[pressure < .35 ? 'low' : pressure <= .70 ? 'medium' : 'high'];
  return Array.isArray(weights) && weights.length === 3 && weights.every(w => Number.isFinite(w) && w >= 0) && weights.some(w => w > 0) ? weights : [1, 0, 0];
}
export function weightedIndex(weights, state) {
  const safe = weights.map(w => Number.isFinite(w) && w > 0 ? w : 0);
  const total = safe.reduce((a, b) => a + b, 0);
  const draw = nextRandom(state);
  if (!total) return { value: Math.floor(draw.value / 0x100000000 * weights.length) || 0, nextState: draw.nextState };
  let threshold = draw.value / 0x100000000 * total;
  for (let i = 0; i < safe.length; i++) { threshold -= safe[i]; if (threshold < 0) return { value: i, nextState: draw.nextState }; }
  return { value: safe.length - 1, nextState: draw.nextState };
}
export function generateFlowTray(board, rngState, config = FLOW_CONFIG, nextPieceId = 1, recentShapes = []) {
  config = { ...FLOW_CONFIG, ...config };
  const evaluation = evaluateBoard(board);
  const policyDraw = weightedIndex(weightsForPressure(evaluation.pressure, config), rngState);
  rngState = policyDraw.nextState;
  let policy = ['random', 'fit', 'clear'][policyDraw.value];
  // Reused across all three samples; never evaluated during pointer motion.
  const usefulness = policy === 'random' ? [] : SHAPE_CATALOGUE.map(shape => evaluateShapeUsefulness(board, shape));
  if (policy === 'clear' && !usefulness.some(u => u.clearPlacements)) policy = 'fit';
  if (policy === 'fit' && !usefulness.some(u => u.legalPlacementCount)) policy = 'random';
  const boost = (value, fallback) => Number.isFinite(value) && value >= 0 ? value : fallback;
  const penalty = Math.min(.5, boost(config.repetitionPenalty, .18));
  const history = [...recentShapes].slice(-6), shapes = [];
  for (let i = 0; i < 3; i++) {
    const weights = SHAPE_CATALOGUE.map(shape => {
      const u = usefulness[shape.id];
      const opportunity = policy === 'fit' ? (u.legalPlacementCount > 0 ? boost(config.fitBoost, 4) : 0) : policy === 'clear' ? (u.clearPlacements > 0 ? boost(config.clearBoost, 6) : 0) : 0;
      return (1 + opportunity) / (1 + penalty * history.filter(id => id === shape.id).length);
    });
    const draw = weightedIndex(weights, rngState);
    rngState = draw.nextState;
    shapes.push(draw.value); history.push(draw.value);
    if (history.length > 6) history.shift();
  }
  // Independent cosmetic hash: no decorative draw advances gameplay continuation.
  // Classic intentionally retains its original interleaved shape/colour RNG contract.
  const tray = shapes.map(shapeId => {
    const colourId = nextRandom(Math.imul(nextPieceId, 0x9e3779b9) >>> 0).value % 7;
    return { instanceId: `p-${nextPieceId++}`, shapeId, colourId };
  });
  return { tray, rngState, nextPieceId, recentShapes: history };
}
