import { RecoveryDialog, RoundWinDialog } from './JoyDialogs.jsx';
import { CollectionDialog } from './CollectionDialog.jsx';
import { themeStyle } from '../themes.js';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGameCommands, useGameState } from '../context/GameProvider.jsx';
import { Icon } from './Icon.jsx';
import { PauseDialog } from './PauseDialog.jsx';
import { RestartDialog } from './RestartDialog.jsx';
import { HelpDialog } from './HelpDialog.jsx';
import { SettingsDialog } from './SettingsDialog.jsx';
import { GameOverDialog } from './GameOverDialog.jsx';
const CONTENT = {
  pause: PauseDialog,
  recovery: RecoveryDialog,
  roundWin: RoundWinDialog,
  collection: CollectionDialog,
  restart: RestartDialog,
  help: HelpDialog,
  settings: SettingsDialog,
  gameOver: GameOverDialog
};
function Dialog({
  type,
  reduced
}) {
  const ref = useRef(null);
  const { profile } = useGameState();
  const {
    closeModal: close
  } = useGameCommands();
  useEffect(() => {
    const opener = document.activeElement,
      main = document.querySelector('main'),
      priorInert = main?.inert;
    if (main) main.inert = true;
    const root = ref.current;
    const focusable = () => [...root.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
    (focusable()[0] || root).focus({
      preventScroll: true
    });
    const keydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!['gameOver', 'recovery', 'roundWin'].includes(type)) close();
      }
      if (event.key === 'Tab') {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (!items.length) {
          event.preventDefault();
          root.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    root.addEventListener('keydown', keydown);
    return () => {
      root.removeEventListener('keydown', keydown);
      if (main) main.inert = priorInert;
      if (opener?.isConnected) opener.focus({
        preventScroll: true
      });else document.querySelector('main button')?.focus({
        preventScroll: true
      });
    };
  }, [type, close]);
  const Content = CONTENT[type];
  return createPortal(<div style={themeStyle(profile.theme)} data-theme={profile.theme} className="modal-backdrop" data-motion={reduced ? 'reduced' : 'auto'}><section className={`dialog dialog-${type}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" ref={ref} tabIndex={-1}>{!['gameOver', 'recovery', 'roundWin'].includes(type) && <button className="icon-button dialog-close" aria-label="Close dialog" onClick={close}><Icon name="close" /></button>}<Content /></section></div>, document.body);
}
export function ModalHost() {
  const {
    activeModal,
    screen,
    game,
    pendingResolution,
    reduced
  } = useGameState();
  const statusDialog = { gameOver: 'gameOver', recovery: 'recovery', roundWon: 'roundWin' }[game?.status];
  const type = activeModal?.type || (screen === 'game' && !pendingResolution ? statusDialog : null);
  return type ? <Dialog key={type} type={type} reduced={reduced} /> : null;
}
