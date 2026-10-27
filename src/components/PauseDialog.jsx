import { useGameCommands } from '../context/GameProvider.jsx';
import { Icon } from './Icon.jsx';
export function PauseDialog() {
  const c = useGameCommands();
  return <><div className="dialog-emblem"><Icon name="pause" size={30} /></div><span className="eyebrow">TAKE YOUR TIME</span><h2 id="dialog-title">A moment to pause.</h2><p id="dialog-description">Your next move can wait. Your board will be here when you’re ready. Finish for now with Home, and continue whenever you like.</p><div className="dialog-actions"><button className="button primary" onClick={c.closeModal}>Resume <Icon name="arrow" /></button><button className="button secondary" onClick={() => c.openModal('restart')}><Icon name="restart" /> Restart</button><button className="button quiet" onClick={c.home}><Icon name="home" /> Home</button></div></>;
}
