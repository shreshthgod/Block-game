// Mulberry32: uint32 state, fixed odd increment, uint32 output. No external entropy here.
export function nextRandom(rngState) {
  const nextState = rngState + 0x6D2B79F5 >>> 0;
  let t = nextState;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return {
    value: (t ^ t >>> 14) >>> 0,
    nextState
  };
}
export function sampleBounded(state, bound, next = nextRandom) {
  const limit = Math.floor(0x100000000 / bound) * bound;
  let sample;
  do {
    sample = next(state);
    state = sample.nextState;
  } while (sample.value >= limit);
  return {
    value: sample.value % bound,
    nextState: state
  };
}
export function generateTray(rngState, nextPieceId = 1, sample = sampleBounded) {
  const tray = [];
  for (let i = 0; i < 3; i++) {
    const shape = sample(rngState, 25);
    const colour = sample(shape.nextState, 7);
    rngState = colour.nextState;
    tray.push({
      instanceId: `p-${nextPieceId++}`,
      shapeId: shape.value,
      colourId: colour.value
    });
  }
  return {
    tray,
    rngState,
    nextPieceId
  };
}
