import { getShapeById } from '../game/shapes.js';
export function Piece({
  piece,
  expanded
}) {
  const shape = getShapeById(piece.shapeId);
  const style = {
    '--piece-cell': shape.rows >= 5 || shape.cols >= 5 ? 'var(--long-piece-cell,14px)' : shape.cells.length >= 6 && shape.rows < 4 && shape.cols < 4 ? 'var(--large-piece-cell,21px)' : 'var(--regular-piece-cell,18px)',
    gridTemplateColumns: `repeat(${shape.cols}, var(--piece-cell))`,
    gridTemplateRows: `repeat(${shape.rows}, var(--piece-cell-y, var(--piece-cell)))`,
    ...(expanded ? {
      '--piece-cell': `${expanded.cellWidth}px`,
      '--piece-cell-y': `${expanded.cellHeight}px`,
      columnGap: expanded.gapX,
      rowGap: expanded.gapY
    } : {})
  };
  return <span className={`piece-shape colour-${piece.colourId}`} style={style} aria-hidden="true">{shape.cells.map(([r, c]) => <span className="tile" key={`${r}:${c}`} style={{
      gridRow: r + 1,
      gridColumn: c + 1
    }} />)}</span>;
}
