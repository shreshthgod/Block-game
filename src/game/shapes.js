export function normalizeShape(cells) {
  const minRow = Math.min(...cells.map(([r]) => r));
  const minCol = Math.min(...cells.map(([, c]) => c));
  return cells.map(([r, c]) => [r - minRow, c - minCol]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
export function isConnected(cells) {
  const keys = new Set(cells.map(String));
  const visited = new Set();
  const queue = [cells[0]];
  while (queue.length) {
    const [r, c] = queue.pop();
    if (visited.has(`${r},${c}`)) continue;
    visited.add(`${r},${c}`);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [r + dr, c + dc];
      if (keys.has(String(next)) && !visited.has(String(next))) queue.push(next);
    }
  }
  return visited.size === cells.length;
}
const rectangle = (rows, cols) => Array.from({
  length: rows * cols
}, (_, i) => [Math.floor(i / cols), i % cols]);
export function generateCatalogue() {
  const list = [];
  const add = (name, cells) => {
    const normalized = normalizeShape(cells);
    list.push(Object.freeze({
      id: list.length,
      name,
      cells: Object.freeze(normalized.map(Object.freeze)),
      rows: Math.max(...normalized.map(([r]) => r)) + 1,
      cols: Math.max(...normalized.map(([, c]) => c)) + 1
    }));
  };
  add('Single', [[0, 0]]);
  for (const direction of ['horizontal', 'vertical']) {
    for (let n = 2; n <= 5; n++) add(`${n}-cell ${direction} bar`, rectangle(direction === 'vertical' ? n : 1, direction === 'horizontal' ? n : 1));
  }
  add('Small square', rectangle(2, 2));
  add('Large square', rectangle(3, 3));
  add('Wide rectangle', rectangle(2, 3));
  add('Tall rectangle', rectangle(3, 2));
  for (const [name, base] of [['Small L', [[0, 0], [1, 0], [1, 1]]], ['T', [[0, 0], [0, 1], [0, 2], [1, 1]]], ['Long L', [[0, 0], [1, 0], [2, 0], [2, 1]]]]) {
    let cells = base;
    for (let i = 0; i < 4; i++) {
      add(`${name}, orientation ${i + 1}`, cells);
      cells = normalizeShape(cells.map(([r, c]) => [c, -r]));
    }
  }
  return Object.freeze(list);
}
export const SHAPE_CATALOGUE = generateCatalogue();
// Joy adds four explicit six-cell L orientations; legacy catalogue indices/distribution stay fixed.
const joyExtras = [];
let sixL = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]];
for (let orientation = 0; orientation < 4; orientation++) {
  const cells = normalizeShape(sixL);
  joyExtras.push(Object.freeze({ id: SHAPE_CATALOGUE.length + orientation, name: `Six-cell L, orientation ${orientation + 1}`, cells: Object.freeze(cells.map(Object.freeze)), rows: Math.max(...cells.map(([r]) => r)) + 1, cols: Math.max(...cells.map(([, c]) => c)) + 1 }));
  sixL = normalizeShape(sixL.map(([r, c]) => [c, -r]));
}
export const JOY_SHAPE_CATALOGUE = Object.freeze([...SHAPE_CATALOGUE, ...joyExtras]);
export const getShapeById = id => JOY_SHAPE_CATALOGUE[id] ?? null;
