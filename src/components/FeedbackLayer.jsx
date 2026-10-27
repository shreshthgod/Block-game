import { deriveCelebration } from '../audio/celebrations.js';
import { SIZE } from '../game/constants.js';
import { Icon } from './Icon.jsx';
import { createClearParticles } from './clearParticles.js';
export function FeedbackLayer({
  result,
  reduced
}) {
  const lines = result.completedLines.rows.length + result.completedLines.columns.length;
  const celebration = deriveCelebration(result);
  const particles = reduced ? [] : createClearParticles(result);
  return <div className={`resolution-effects ${result.allClear ? 'all-clear-effect' : ''}`} data-lines={lines} key={result.token} data-resolution={result.token} aria-hidden="true">
    {lines > 0 && <div className="clear-lines" style={{ '--board-size': SIZE }}>{result.completedLines.rows.map(row => <i key={`r-${row}`} className="line-sweep" style={{ gridRow: row + 1, gridColumn: '1 / -1' }} />)}{result.completedLines.columns.map(col => <i key={`c-${col}`} className="line-sweep column-sweep" style={{ gridColumn: col + 1, gridRow: '1 / -1' }} />)}</div>}
    {lines > 0 && <div className={`clear-snapshot ${reduced ? 'simple-clear' : ''}`} style={{ '--board-size': SIZE }}>{result.snapshots.afterPlacement.flatMap((row, r) => row.map((colour, c) => <i key={`${r}:${c}`} className={result.cleared.some(([y, x]) => y === r && x === c) ? `snapshot-tile tile colour-${colour}` : ''} />))}</div>}
    {particles.length > 0 && <div className="clear-burst">{particles.map(particle => <i key={particle.id} className="clear-particle" data-cleared-cell={particle.id} style={{
        left: `calc(${(particle.col + 0.5) / SIZE * 100}% + ${3 * particle.col - (SIZE - 1) * 3 * (particle.col + 0.5) / SIZE}px)`,
        top: `calc(${(particle.row + 0.5) / SIZE * 100}% + ${3 * particle.row - (SIZE - 1) * 3 * (particle.row + 0.5) / SIZE}px)`,
        '--particle-colour': particle.colour,
        '--particle-x': `${particle.dx}px`,
        '--particle-y': `${particle.dy}px`,
        '--particle-spin': particle.spin
      }} />)}</div>}
    <div className={`feedback ${lines ? 'feedback-clear' : ''}`}>
      <strong>+{result.points.total}</strong>
      <span>{lines ? <><Icon name="sparkle" size={16} /> {result.allClear ? 'ALL CLEAR!' : celebration?.phrase} <small>{lines} {lines === 1 ? 'line' : 'lines'}</small></> : celebration?.phrase || 'Nice placement'}
        {result.roundWon && <small>Round complete · You did it!</small>}
        {result.points.bonus > 0 && <small>Includes +{result.points.bonus} multi-line bonus</small>}
      </span>
    </div>
  </div>;
}
