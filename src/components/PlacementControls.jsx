import { Icon } from './Icon.jsx';
export function PlacementControls({
  selected,
  valid,
  candidate,
  onPlace,
  onCancel,
  disabled
}) {
  if (!selected) return <div className="placement-idle"><span className="instruction-dot" /> Pick a piece. Find its place.</div>;
  return <div className="placement-controls"><p>{candidate ? valid ? <><Icon name="check" size={16} /> Ready at {candidate.row + 1}, {candidate.col + 1}</> : <><Icon name="close" size={16} /> Doesn’t fit here</> : 'Choose a board anchor'}<span>Anchor = top-left of the shape</span></p><button className="button small quiet" onClick={onCancel}>Cancel</button><button className="button small primary" disabled={!valid || disabled} onClick={onPlace}>Place <Icon name="arrow" size={16} /></button></div>;
}
