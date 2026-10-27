import { useGameCommands, useGameState } from '../context/GameProvider.jsx';
import { Icon } from './Icon.jsx';
export function RestartDialog() {
  const c = useGameCommands();
  const { game } = useGameState();
  return <><div className="dialog-emblem"><Icon name="restart" size={30} /></div><h2 id="dialog-title">A fresh canvas?</h2><p id="dialog-description">This replaces your current game. Your best score and settings stay with you.{game?.mode === 'flow' && ' New games use Joy, with round goals and free recovery.'}</p><div className="dialog-actions"><button className="button primary" onClick={c.restart}>Start new game <Icon name="arrow" /></button><button className="button secondary" onClick={c.closeModal}>Keep playing</button></div></>;
}
