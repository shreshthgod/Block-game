import { enumerateLegalPlacements } from './evaluation.js';
import { simulateMove } from './rules.js';
// A node is one simulated legal placement. Budget decisions never read a clock.
export function findPlayableTraySequence(board, shapes, budget = 600, options = {}) {
  const limit = Number.isInteger(budget) ? Math.max(0, Math.min(5000, budget)) : 600;
  let nodes = 0, exhausted = false;
  const dead = new Set();
  function search(current, remaining, earnedAllClear = false) {
    if (!remaining.length) return !options.requireAllClear || earnedAllClear ? [] : null;
    const key = current.map(row => row.map(c => c === null ? '0' : '1').join('')).join('') + ':' + (options.requireAllClear && earnedAllClear ? 'clear:' : '') + remaining.map(i => shapes[i].id).sort((a, b) => a - b).join(',');
    if (dead.has(key)) return null;
    const triedShapes = new Set(), outcomes = new Set();
    for (const index of remaining) {
      const shape = shapes[index];
      if (!shape || triedShapes.has(shape.id)) continue;
      triedShapes.add(shape.id);
      for (const anchor of enumerateLegalPlacements(current, shape)) {
        if (nodes >= limit) { exhausted = true; return null; }
        nodes++;
        const next = simulateMove(current, shape, anchor);
        const outcome = next.board.map(row => row.map(c => c === null ? '0' : '1').join('')).join('') + ':' + shape.id;
        if (outcomes.has(outcome)) continue;
        outcomes.add(outcome);
        const rest = search(next.board, remaining.filter(i => i !== index), earnedAllClear || (next.lines > 0 && next.board.flat().every(c => c === null)));
        if (rest) return [{ index, shapeId: shape.id, anchor }, ...rest];
        if (exhausted) return null;
      }
    }
    dead.add(key); return null;
  }
  const witness = search(board, shapes.map((_, i) => i));
  return { status: witness ? 'verified' : exhausted ? 'unknown' : 'impossible', witness, nodes };
}
