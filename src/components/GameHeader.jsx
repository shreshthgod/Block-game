import { useEffect, useRef, useState } from 'react';
import { useGameCommands, useGameState } from '../context/GameProvider.jsx';
import { Brand, Icon } from './Icon.jsx';
function AnimatedScore({
  value,
  reduced
}) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (reduced) {
      current.current = value;
      setDisplay(value);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / 260, 1);
      current.current = Math.round(from + (value - from) * (1 - (1 - t) ** 3));
      setDisplay(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <><span aria-hidden="true">{display.toLocaleString()}</span><span className="sr-only">{value.toLocaleString()}</span></>;
}
export function GameHeader() {
  const {
    game,
    profile,
    reduced
  } = useGameState();
  const commands = useGameCommands();
  return <header className="game-header"><div className="game-nav"><button className="icon-button" aria-label="Home" onClick={commands.home}><Icon name="home" /></button><Brand /><div className="nav-actions"><button className="icon-button" aria-label="Pause" onClick={() => commands.openModal('pause')}><Icon name="pause" /></button><button className="icon-button" aria-label="Settings" onClick={() => commands.openModal('settings')}><Icon name="settings" /></button></div></div><div className="score-panel"><div className="current-score"><span className="score-label">Score</span><strong data-testid="score"><AnimatedScore value={game.score} reduced={reduced} /></strong></div><span className="score-divider" /><div className="best-score"><span className="score-label"><Icon name="crown" size={15} /> Best · {game.mode === 'joy' ? 'Joy' : game.mode === 'flow' ? 'Flow' : 'Classic'}</span><strong>{(profile.bestScores?.[game.mode] ?? profile.bestScore).toLocaleString()}</strong></div><span className="score-prism" aria-hidden="true">✧</span></div>{game.mode === 'joy' && <div className="goal-panel"><div><strong>Round {game.round.index}</strong><span>{Math.min(game.round.target, game.statistics.linesCleared - game.round.baselineLines)} / {game.round.target} lines</span></div><progress aria-label="Round lines cleared" max={game.round.target} value={Math.min(game.round.target, game.statistics.linesCleared - game.round.baselineLines)} /></div>}</header>;
}
