import { EMPTY_STATISTICS } from './constants.js';
const additive = ['roundsWon', 'linesCleared', 'allClears', 'recoveries'];
// Per-game monotone watermarks make refresh/partial writes idempotent.
export function reconcileProgress(profile, game) {
  if (!game?.statistics) return profile;
  const prior = Object.hasOwn(profile.progressLedger ?? {}, game.gameId) ? profile.progressLedger[game.gameId] : EMPTY_STATISTICS;
  const stats = { ...EMPTY_STATISTICS, ...profile.stats };
  const watermark = { ...EMPTY_STATISTICS, ...prior };
  for (const key of additive) {
    stats[key] += Math.max(0, game.statistics[key] - watermark[key]);
    watermark[key] = Math.max(watermark[key], game.statistics[key]);
  }
  for (const key of ['largestBurst', 'largestPiece']) { stats[key] = Math.max(stats[key], game.statistics[key]); watermark[key] = Math.max(watermark[key], game.statistics[key]); }
  return { ...profile, stats, progressLedger: { ...profile.progressLedger, [game.gameId]: watermark } };
}
export const MILESTONES = [
  { id: 'first-win', name: 'First Joy', description: 'Complete a round', key: 'roundsWon', target: 1, icon: '★' },
  { id: 'triple', name: 'Triple sparkle', description: 'Clear three lines at once', key: 'largestBurst', target: 3, icon: '✦' },
  { id: 'all-clear', name: 'Fresh canvas', description: 'Earn an All Clear', key: 'allClears', target: 1, icon: '◇' },
  { id: 'square', name: 'Big possibilities', description: 'Place a 3 × 3 piece', key: 'largestPiece', target: 9, icon: '▦' },
  { id: 'hundred', name: 'Colour collector', description: 'Clear 100 lifetime lines', key: 'linesCleared', target: 100, icon: '✿' }
];
