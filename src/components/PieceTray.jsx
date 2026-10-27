import { getShapeById } from '../game/shapes.js';
import { getLegalAnchors } from '../game/rules.js';
import { Piece } from './Piece.jsx';
import { Icon } from './Icon.jsx';
export function PieceTray({
  tray,
  board,
  selected,
  drag,
  handlers,
  disabled
}) {
  return (
    <div className="tray" aria-label="Available pieces">
      {tray.map((piece, index) => {
        const needsRoom = piece && board && !getLegalAnchors(board, getShapeById(piece.shapeId).cells).length;
        const shape = piece ? getShapeById(piece.shapeId) : null;
        return (
          <div
            className={`tray-slot ${selected === piece?.instanceId ? 'slot-selected' : ''} ${drag?.piece.instanceId === piece?.instanceId ? 'slot-dragging' : ''}`}
            key={index}
            data-slot={index}
          >
            <span className="slot-number" aria-hidden="true">0{index + 1}</span>
            {piece ? (
              <>
                <button
                  className="piece-button"
                  disabled={disabled}
                  aria-label={`Piece ${index + 1}: ${shape.name}, ${shape.cells.length} cells${needsRoom ? ', make room first' : ''}`} 
                  aria-describedby={`footprint-${piece.instanceId}`}
                  aria-pressed={selected === piece.instanceId}
                  {...handlers(piece)}
                >
                  <Piece key={piece.instanceId} piece={piece} />{needsRoom && <span className="make-room">Make room first</span>}
                </button>
                <span className="sr-only" id={`footprint-${piece.instanceId}`}>
                  Shape footprint from its anchor: {shape.cells.map(([row, col]) => `row offset ${row}, column offset ${col}`).join('; ')}.
                </span>
              </>
            ) : (
              <span className="slot-used" aria-label={`Slot ${index + 1} used`}><Icon name="check" size={22} /></span>
            )}
          </div>
        );
      })}
    </div>
  );
}
