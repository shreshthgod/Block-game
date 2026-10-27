import { simulateMove } from '../game/rules.js';
import { SIZE } from '../game/constants.js';
import { BoardCell } from './BoardCell.jsx';
export function Board({
  board,
  gridRef,
  candidate,
  piece,
  shape,
  valid,
  focus,
  setFocus,
  onChoose,
  onCommit,
  disabled,
  resolution
}) {
  const preview = new Set(piece && candidate ? shape.cells.map(([r, c]) => `${candidate.row + r}:${candidate.col + c}`) : []);
  const previewMove = valid && piece && candidate ? simulateMove(board, shape, candidate) : null;
  const lineRows = new Set(previewMove?.completedLines.rows), lineCols = new Set(previewMove?.completedLines.columns);
  const placed = new Set(resolution?.placed.map(([r, c]) => `${r}:${c}`));
  const onKeyDown = event => {
    const directions = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0]
    };
    if (directions[event.key]) {
      event.preventDefault();
      const [dr, dc] = directions[event.key];
      const row = Math.max(0, Math.min(SIZE - 1, focus.row + dr)),
        col = Math.max(0, Math.min(SIZE - 1, focus.col + dc));
      gridRef.current.querySelector(`[data-row="${row}"][data-col="${col}"]`).focus({
        preventScroll: true
      });
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!disabled) onCommit();
    }
  };
  const cellFrom = event => event.target.closest('[role="gridcell"]');
  return <div className="board-frame"><div className="board-grid" ref={gridRef} role="grid" style={{ '--board-size': SIZE }} aria-label={`${SIZE} by ${SIZE} puzzle board`} aria-rowcount={SIZE} aria-colcount={SIZE} aria-describedby="game-instructions" onKeyDown={onKeyDown} onClick={event => {
      const cell = cellFrom(event);
      if (cell && !disabled) onChoose(Number(cell.dataset.row), Number(cell.dataset.col));
    }} onFocus={event => {
      const cell = cellFrom(event);
      if (cell) setFocus(Number(cell.dataset.row), Number(cell.dataset.col));
    }}>{board.map((row, r) => <div className="board-row" role="row" key={r}>{row.map((value, c) => <BoardCell key={`${r}:${c}`} row={r} col={c} value={value} preview={preview.has(`${r}:${c}`)} previewColour={preview.has(`${r}:${c}`) ? piece?.colourId : null} valid={preview.has(`${r}:${c}`) && valid} active={focus.row === r && focus.col === c} disabled={disabled} linePreview={lineRows.has(r) || lineCols.has(c)} clearing={false} placed={placed.has(`${r}:${c}`)} />)}</div>)}</div></div>;
}
