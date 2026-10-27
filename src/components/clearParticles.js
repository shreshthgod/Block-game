import { SIZE } from '../game/constants.js';
export const MAX_CLEAR_PARTICLES = SIZE * SIZE;
// Presentation-only deterministic directions. No RNG calls or mutable token history.
export function createClearParticles(result) {
  const unique = new Map(result.cleared.map(([row, col]) => [`${row}:${col}`, [row, col]]));
  return [...unique.entries()].slice(0, MAX_CLEAR_PARTICLES).map(([id, [row, col]]) => {
    const angle = (row * 73 + col * 137 + result.placed.length * 19) % 360 * Math.PI / 180;
    const distance = 14 + (row * 7 + col * 11) % 17;
    return {
      id,
      row,
      col,
      colour: `var(--colour-${result.snapshots.afterPlacement[row][col]})`,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      spin: `${(row + col) % 2 ? -95 : 95}deg`
    };
  });
}
