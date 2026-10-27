import { useGameState } from '../context/GameProvider.jsx';
export function StorageNotice() {
  const {
    saveUnavailable
  } = useGameState();
  return saveUnavailable ? <p className="storage-notice" role="status">Saving is unavailable. You can keep playing; progress lasts until this page closes.</p> : null;
}
