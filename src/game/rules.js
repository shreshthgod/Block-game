import { SIZE } from './constants.js';
import { getShapeById } from './shapes.js';
export const createEmptyBoard = () => Array.from({
  length: SIZE
}, () => Array(SIZE).fill(null));
export function canPlace(board, cells, row, col) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || !cells?.length) return false;
  return cells.every(([r, c]) => {
    const y = row + r,
      x = col + c;
    return y >= 0 && y < SIZE && x >= 0 && x < SIZE && board[y][x] === null;
  });
}
export function getLegalAnchors(board, cells) {
  const anchors = [];
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) if (canPlace(board, cells, row, col)) anchors.push({
    row,
    col
  });
  return anchors;
}
export function hasAnyLegalMove(board, tray) {
  return tray.some(piece => piece && getLegalAnchors(board, getShapeById(piece.shapeId).cells).length > 0);
}
export function findCompletedLines(board) {
  const rows = [],
    columns = [];
  for (let n = 0; n < SIZE; n++) {
    if (board[n].every(cell => cell !== null)) rows.push(n);
    if (board.every(row => row[n] !== null)) columns.push(n);
  }
  return {
    rows,
    columns
  };
}
export function getUniqueClearedCells(rows, columns) {
  const cells = new Set();
  for (const row of rows) for (let col = 0; col < SIZE; col++) cells.add(`${row},${col}`);
  for (const col of columns) for (let row = 0; row < SIZE; row++) cells.add(`${row},${col}`);
  return [...cells].map(key => key.split(',').map(Number));
}
export function calculateMoveScore(pieceCellCount, rowCount, columnCount) {
  const lines = rowCount + columnCount;
  const placementPoints = 10 * pieceCellCount,
    linePoints = 100 * lines,
    bonus = 50 * lines * (lines - 1);
  return {
    placementPoints,
    linePoints,
    bonus,
    total: placementPoints + linePoints + bonus
  };
}
export function simulateMove(board, shape, anchor, colourId = 0) {
  if (!shape || !canPlace(board, shape.cells, anchor.row, anchor.col)) return null;
  const placed = shape.cells.map(([r, c]) => [anchor.row + r, anchor.col + c]);
  const afterPlacement = board.map(row => [...row]);
  for (const [r, c] of placed) afterPlacement[r][c] = colourId;
  const completedLines = findCompletedLines(afterPlacement);
  const cleared = getUniqueClearedCells(completedLines.rows, completedLines.columns);
  const final = afterPlacement.map(row => [...row]);
  for (const [r, c] of cleared) final[r][c] = null;
  const points = calculateMoveScore(shape.cells.length, completedLines.rows.length, completedLines.columns.length);
  return { board: final, afterPlacement, placed, completedLines, cleared, points, lines: completedLines.rows.length + completedLines.columns.length };
}
