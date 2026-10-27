import { it, expect } from 'vitest';
import { calculateDrag } from './usePieceDrag.jsx';
import { canPlace, createEmptyBoard } from '../game/engine.js';
it('preserves fractional grip at expanded scale and applies touch lift using client coordinates', () => {
  const g = {
    left: 16.5,
    top: 210.25,
    cellWidth: 29.4,
    cellHeight: 29.4,
    gapX: 3,
    gapY: 3,
    pitchX: 32.4,
    pitchY: 32.4
  };
  const shape = {
      rows: 2,
      cols: 3
    },
    grip = {
      x: .25,
      y: .75
    },
    width = 94.2,
    height = 61.8;
  const x = g.left + 2 * g.pitchX + grip.x * width,
    y = g.top + 3 * g.pitchY + grip.y * height + 48;
  const result = calculateDrag(x, y, grip, shape, g, true);
  expect(result.candidate).toEqual({
    row: 3,
    col: 2
  });
  expect(calculateDrag(x, y - 48, grip, shape, g, false).candidate).toEqual(result.candidate);
  const outside = calculateDrag(-200, 0, grip, shape, g, false).candidate;
  expect(outside.col).toBeLessThan(0);
  expect(canPlace(createEmptyBoard(), [[0, 0]], outside.row, outside.col)).toBe(false);
});
it('maps mouse and lifted touch to every cell on an 8 × 8 board', () => {
  const g = { left: 10.25, top: 150.5, cellWidth: 30.125, cellHeight: 30.125, gapX: 3, gapY: 3, pitchX: 33.125, pitchY: 33.125 };
  const reached = new Set();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) for (const touch of [false, true]) {
    const result = calculateDrag(g.left + col * g.pitchX + g.cellWidth / 2, g.top + row * g.pitchY + g.cellHeight / 2 + (touch ? 48 : 0), { x: .5, y: .5 }, { rows: 1, cols: 1 }, g, touch);
    expect(result.candidate).toEqual({ row, col });
    reached.add(`${row}:${col}`);
  }
  expect(reached.size).toBe(64);
});
