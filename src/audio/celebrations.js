export function deriveCelebration(result) {
  if (!result) return null;
  const lines = result.completedLines.rows.length + result.completedLines.columns.length;
  const event = (kind, phrase) => ({ key: `${result.token}:${kind}`, kind, phrase, priority: { allClear: 100, win: 80, mega: 70, triple: 60, double: 50, record: 40, combo: 30, single: 20, gameOver: 10 }[kind] });
  if (result.allClear) return event('allClear', 'All Clear!');
  if (result.roundWon && lines === 0) return event('win', 'You did it!');
  if (lines >= 4) return event('mega', 'Mega Burst!');
  if (lines === 3) return event('triple', 'Triple Burst!');
  if (lines === 2) return event('double', 'Double Burst!');
  if (result.roundWon && lines === 1) return event('single', 'Burst!');
  if (result.record) return event('record', 'New Best!');
  if (lines && result.clearStreak >= 3 && result.clearStreak % 3 === 0) return event('combo', 'Amazing!');
  if (lines === 1) return event('single', 'Burst!');
  // Omit game-over speech when a higher-priority final celebration exists.
  return result.gameOver ? event('gameOver', 'Nice game!') : null;
}
