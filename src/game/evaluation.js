import { SIZE } from './constants.js';
import { getLegalAnchors } from './rules.js';
import { simulateMove } from './rules.js';
import { SHAPE_CATALOGUE } from './shapes.js';
// Distinct normalized cell sets: do not count duplicate orientations twice.
export const EVALUATION_SHAPES = [...new Map(SHAPE_CATALOGUE.map(s => [JSON.stringify(s.cells), s])).values()];
const placements = new Map(EVALUATION_SHAPES.map(shape => [shape.id, Array.from({ length: (SIZE - shape.rows + 1) * (SIZE - shape.cols + 1) }, (_, i) => {
  const row = Math.floor(i / (SIZE - shape.cols + 1)), col = i % (SIZE - shape.cols + 1);
  const cells = shape.cells.map(([r, c]) => [row + r, col + c]);
  const masks = new Map();
  for (const [r, c] of cells) masks.set(r, (masks.get(r) || 0) | (1 << c));
  return { row, col, cells, masks: [...masks] };
})]));
const legal = (board, p) => p.cells.every(([r, c]) => board[r][c] === null);
export function enumerateLegalPlacements(board, shape) {
  if (!placements.has(shape.id)) return getLegalAnchors(board, shape.cells);
  return placements.get(shape.id).filter(p => legal(board, p)).map(({ row, col }) => ({ row, col }));
}
export function simulatePlacement(board, shape, anchor) { return simulateMove(board, shape, anchor); }
export { simulateMove } from './rules.js';
export const mobility = board => {
  const rows = board.map(row => row.reduce((mask, cell, c) => cell === null ? mask : mask | (1 << c), 0));
  let count = 0;
  for (const list of placements.values()) for (const p of list) {
    let fits = true;
    for (const [r, mask] of p.masks) if (rows[r] & mask) { fits = false; break; }
    if (fits) count++;
  }
  return count;
};
export const EMPTY_BOARD_MOBILITY = [...placements.values()].reduce((sum, list) => sum + list.length, 0);
export function evaluateBoard(board) {
  const occupiedCells = board.flat().filter(c => c !== null).length;
  const totalMobility = mobility(board), normalizedMobility = totalMobility / EMPTY_BOARD_MOBILITY;
  const occupancyRatio = occupiedCells / (SIZE * SIZE);
  return { occupiedCells, emptyCells: SIZE * SIZE - occupiedCells, occupancyRatio, mobility: totalMobility, normalizedMobility,
    narrowGapCount: narrowGapCells(board).length,
    pressure: Math.max(0, Math.min(1, .45 * occupancyRatio + .55 * (1 - normalizedMobility))) };
}
export function narrowGapCells(board) {
  const occupied = (r, c) => r < 0 || r >= SIZE || c < 0 || c >= SIZE || board[r][c] !== null;
  return board.flatMap((row, r) => row.flatMap((cell, c) => cell === null && ((occupied(r - 1, c) && occupied(r + 1, c)) || (occupied(r, c - 1) && occupied(r, c + 1))) ? [[r, c]] : []));
}
export function evaluateShapeUsefulness(board, shape, mobilityLimit = Infinity) {
  const anchors = enumerateLegalPlacements(board, shape);
  let bestImmediateLines = 0, clearPlacements = 0, bestResultingMobility = 0;
  const limit = Number.isInteger(mobilityLimit) && mobilityLimit > 0 ? mobilityLimit : Infinity;
  const sampled = new Set(Array.from({ length: Math.min(anchors.length, limit) }, (_, i) => Math.floor(i * (anchors.length - 1) / Math.max(1, Math.min(anchors.length, limit) - 1))));
  for (const [index, anchor] of anchors.entries()) {
    const simulated = simulatePlacement(board, shape, anchor);
    bestImmediateLines = Math.max(bestImmediateLines, simulated.lines);
    if (simulated.lines) clearPlacements++;
    if (sampled.has(index)) bestResultingMobility = Math.max(bestResultingMobility, mobility(simulated.board));
  }
  return { shapeId: shape.id, legalPlacementCount: anchors.length, bestImmediateLines, clearPlacements, bestResultingMobility };
}

export const evaluateShape = evaluateShapeUsefulness;
