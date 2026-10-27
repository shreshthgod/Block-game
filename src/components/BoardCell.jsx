import { memo } from 'react';
// Only changed values/focus/ghost flags rerender a cell. Grid events are delegated.
export const BoardCell = memo(function BoardCell({
  row,
  col,
  value,
  preview,
  valid,
  previewColour,
  active,
  disabled,
  clearing,
  linePreview,
  placed
}) {
  return <button type="button" role="gridcell" tabIndex={active ? 0 : -1} data-row={row} data-col={col} data-value={value ?? ''} aria-label={`Row ${row + 1}, column ${col + 1}, ${value === null ? 'empty' : 'occupied block'}${preview ? valid ? ', valid preview' : ', cannot place' : ''}`} aria-disabled={disabled} className={`board-cell ${value !== null ? `tile colour-${value}` : ''} ${preview ? `cell-preview ${valid ? `preview-valid colour-${previewColour}` : 'preview-invalid'}` : ''} ${linePreview ? 'cell-line-preview' : ''} ${clearing ? 'cell-clearing' : ''} ${placed ? 'cell-placed' : ''} ${active ? 'anchor-cell' : ''}`} />;
});
