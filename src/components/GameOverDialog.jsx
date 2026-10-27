import { useGameCommands, useGameState } from '../context/GameProvider.jsx';
import { Icon } from './Icon.jsx';
export function GameOverDialog() {
  const {
    game,
    profile
  } = useGameState();
  const c = useGameCommands();
  const record = game.score > game.startingBestScore;
  return <><div className="dialog-emblem gold"><Icon name={record ? 'crown' : 'sparkle'} size={32} /></div><span className="eyebrow">{record ? 'A NEW PERSONAL BEST!' : 'EVERY GAME IS A FRESH START'}</span><h2 id="dialog-title">Beautifully played.</h2><p id="dialog-description">No remaining pieces fit.</p><div className="final-score"><span className="score-label">Final score</span><strong>{game.score.toLocaleString()}</strong><span>{game.mode === 'flow' ? 'Flow' : 'Classic'} best · {(profile.bestScores?.[game.mode] ?? profile.bestScore).toLocaleString()}</span></div><div className="dialog-actions"><button className="button primary" onClick={c.restart}>{game.mode === 'flow' ? 'Play Joy' : 'Play Again'} <Icon name="arrow" /></button><button className="button quiet" onClick={c.home}><Icon name="home" /> Home</button></div></>;
}
