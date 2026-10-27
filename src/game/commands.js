// Entropy belongs at the user-command boundary, never in a reducer or render.
let fallbackCounter = 0;
export function prepareNewGame() {
  let seed, gameId;
  try {
    const values = crypto.getRandomValues(new Uint32Array(3));
    seed = values[0];
    gameId = `prism-${values[1].toString(16)}-${values[2].toString(16)}`;
  } catch {
    // Non-cryptographic fallback for old/restricted browsers. Games need variation, not secrecy.
    seed = (Date.now() ^ Math.floor(Math.random() * 0x100000000) ^ ++fallbackCounter) >>> 0;
    gameId = `prism-${Date.now().toString(36)}-${seed.toString(16)}-${fallbackCounter}`;
  }
  return {
    seed,
    gameId
  };
}
