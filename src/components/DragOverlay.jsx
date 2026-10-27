import { themeStyle } from '../themes.js';
import { useGameState } from '../context/GameProvider.jsx';
import { createPortal } from 'react-dom';
import { Piece } from './Piece.jsx';
export function DragOverlay({
  drag,
  overlayRef,
  reduced
}) {
  const { profile } = useGameState();
  if (!drag) return null;
  return createPortal(<div style={themeStyle(profile.theme)} ref={overlayRef} aria-hidden="true" data-motion={reduced ? 'reduced' : 'auto'} className={`drag-overlay drag-${drag.phase} ${drag.valid ? 'drag-valid' : 'drag-invalid'}`}>
      <Piece piece={drag.piece} expanded={drag} />
      {drag.phase === 'dragging' && !drag.valid && <span className="drag-warning">× Doesn’t fit here</span>}
    </div>, document.body);
}
