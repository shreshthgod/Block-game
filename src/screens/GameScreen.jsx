import { SIZE } from '../game/constants.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameCommands, useGameState } from '../context/GameProvider.jsx';
import { canPlace } from '../game/engine.js';
import { getShapeById } from '../game/shapes.js';
import { useBoardGeometry } from '../hooks/useBoardGeometry.jsx';
import { usePieceDrag } from '../hooks/usePieceDrag.jsx';
import { GameHeader } from '../components/GameHeader.jsx';
import { Board } from '../components/Board.jsx';
import { PieceTray } from '../components/PieceTray.jsx';
import { DragOverlay } from '../components/DragOverlay.jsx';
import { PlacementControls } from '../components/PlacementControls.jsx';
import { FeedbackLayer } from '../components/FeedbackLayer.jsx';
import { LiveAnnouncer } from '../components/LiveAnnouncer.jsx';
import { Icon } from '../components/Icon.jsx';
export function GameScreen() {
  const {
    game,
    profile,
    activeModal,
    pendingResolution,
    reduced
  } = useGameState();
  const commands = useGameCommands();
  const [selected, setSelected] = useState(null),
    [anchor, setAnchor] = useState(null),
    [focus, setFocus] = useState({
      row: 0,
      col: 0
    }),
    [notice, setNotice] = useState('');
  const cancelDragRef = useRef(null);
  const cancelSelection = useCallback(() => {
    setSelected(null);
    setAnchor(null);
  }, []);
  const geometryChanged = useCallback(() => {
    cancelDragRef.current?.();
  }, []);
  const {
    gridRef,
    geometryRef,
    measure
  } = useBoardGeometry(geometryChanged);
  const disabled = !!activeModal || game.status !== 'active';
  const onSelect = piece => {
    commands.activateAudio();
    setSelected(previous => previous === piece.instanceId ? null : piece.instanceId);
    setAnchor(null);
    setNotice('');
  };
  const tryPlace = (piece, candidate) => {
    if (disabled || !piece || !candidate) return;
    if (!canPlace(game.board, getShapeById(piece.shapeId).cells, candidate.row, candidate.col)) {
      setNotice('Cannot place here. Try an empty space that fits the whole piece.');
      commands.playSound('reject');
      return;
    }
    commands.place({
      gameId: game.gameId,
      revision: game.revision,
      pieceId: piece.instanceId,
      anchorRow: candidate.row,
      anchorColumn: candidate.col
    });
    cancelSelection();
    setNotice('');
  };
  const onDrop = (piece, candidate) => {
    setSelected(piece.instanceId);
    setAnchor(candidate);
    tryPlace(piece, candidate);
  };
  const isValidCandidate = useCallback((piece, candidate) => canPlace(game.board, getShapeById(piece.shapeId).cells, candidate.row, candidate.col), [game.board]);
  const {
    drag,
    overlayRef,
    cancelDrag,
    handlers
  } = usePieceDrag({
    geometryRef,
    measure,
    disabled,
    reduced,
    isValidCandidate,
    onSelect,
    onDrop,
    onCancel: cancelSelection,
    onPickup: () => {
      commands.activateAudio();
      commands.playSound('pickup');
    }
  });
  useEffect(() => {
    cancelDragRef.current = cancelDrag;
  }, [cancelDrag]);
  useEffect(() => {
    if (activeModal) {
      cancelDrag();
      cancelSelection();
    }
  }, [activeModal, cancelDrag, cancelSelection]);
  const piece = drag?.piece || game.tray.find(piece => piece?.instanceId === selected);
  const shape = piece ? getShapeById(piece.shapeId) : null;
  const candidate = drag ? drag.phase === 'dragging' ? drag.candidate : null : anchor;
  const valid = !!(piece && candidate && canPlace(game.board, shape.cells, candidate.row, candidate.col));
  const boardFocus = (row, col) => {
    setFocus({
      row,
      col
    });
    if (selected) setAnchor({
      row,
      col
    });
  };
  const resolutionMessage = pendingResolution ? `Placed ${pendingResolution.placed.length} cells. Earned ${pendingResolution.points.total} points. ${pendingResolution.completedLines.rows.length + pendingResolution.completedLines.columns.length} lines cleared.${pendingResolution.points.bonus ? ` Includes ${pendingResolution.points.bonus} multi-line bonus.` : ''}${game.status === 'roundWon' ? ' Round complete. You did it!' : game.status === 'recovery' ? ' New Pieces assistance is available.' : game.status === 'gameOver' ? ' Game over. No remaining pieces fit.' : ''}` : '';
  // Presentation snapshots never replace the authoritative final board in game state.
  const displayBoard = game.board;
  return <section className="game-screen"><GameHeader /><div className="board-meta"><span>MAKE A LITTLE ROOM</span><span><i /> {SIZE} × {SIZE} · {game.mode.toUpperCase()}{game.mode === 'flow' && game.generatorVersion === 1 ? ' · ORIGINAL' : ''}</span></div><div className="board-stage"><Board board={displayBoard} gridRef={gridRef} candidate={candidate} piece={piece} shape={shape} valid={valid} focus={focus} setFocus={boardFocus} disabled={disabled} onChoose={(row, col) => {
        if (selected) setAnchor({
          row,
          col
        });
      }} onCommit={() => tryPlace(piece, candidate)} resolution={pendingResolution} />{pendingResolution && <FeedbackLayer result={pendingResolution} reduced={reduced} />}</div><div className="tray-label"><span>YOUR PIECES</span><span>Use all 3 pieces to refill</span></div><PieceTray board={game.board} tray={game.tray} selected={selected} drag={drag} handlers={handlers} disabled={disabled} /><PlacementControls selected={piece} valid={valid} candidate={candidate} onPlace={() => tryPlace(piece, candidate)} onCancel={() => {
      cancelDrag();
      cancelSelection();
      setNotice('');
    }} disabled={disabled} />{notice && <p className="invalid-notice">× {notice}</p>}<div className={`game-instructions ${profile.tutorialDismissed ? 'instructions-compact' : ''}`} id="game-instructions"><Icon name="help" size={18} /><p>Place blocks. Fill rows or columns.<br />Keep space for the next pieces.{!profile.tutorialDismissed && <span>Drag a piece, or select it, choose a cell, then Place.</span>}</p>{!profile.tutorialDismissed && <button className="icon-button" aria-label="Dismiss first-time instructions" onClick={() => commands.dispatch({
        type: 'DISMISS_TUTORIAL'
      })}><Icon name="close" size={16} /></button>}</div><footer className="game-footer"><span>NO TIMER. JUST YOUR NEXT MOVE.</span><button onClick={() => commands.openModal('help')}>How to play <Icon name="arrow" size={14} /></button></footer><DragOverlay drag={drag} overlayRef={overlayRef} reduced={reduced} /><LiveAnnouncer message={notice || resolutionMessage} eventId={pendingResolution?.token || notice} /></section>;
}
