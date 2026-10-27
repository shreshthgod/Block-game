import { describe, it, expect } from 'vitest';
import { createEmptyBoard, createNewGame, resolvePlacement, getLegalAnchors, simulateMove } from './engine.js';
import { generateFlowTray, generateModeTray, findPlayableTraySequence } from './flow.js';
import { generateFlowTray as oldFlow } from './flowV1.js';
import { validateSavedGame, validateSavedProfile } from './storage.js';
import { SHAPE_CATALOGUE as shapes } from './shapes.js';
import { DEFAULT_PROFILE } from './constants.js';
const checker = () => createEmptyBoard().map((row, r) => row.map((_, c) => (r + c) % 2 ? 0 : null));
function replay(board, tray, witness) {
  const used = new Set();
  for (const step of witness) {
    expect(used.has(step.index)).toBe(false); used.add(step.index);
    expect(tray[step.index].shapeId).toBe(step.shapeId);
    const next = simulateMove(board, shapes[step.shapeId], step.anchor);
    expect(next).not.toBeNull(); board = next.board;
  }
  expect(used.size).toBe(3);
}
describe('Flow v2 geometry and bounded connectivity', () => {
  it('reproduces the previous policy mismatch without rewriting it', () => {
    const board = checker(), old = oldFlow(board, 0);
    expect(old.tray.map(p => p.shapeId)).toEqual([0, 3, 0]);
    expect(getLegalAnchors(board, shapes[3].cells)).toHaveLength(0);
    const current = generateFlowTray(board, 0);
    expect(current.tray.every(p => getLegalAnchors(board, shapes[p.shapeId].cells).length > 0)).toBe(true);
  });
  it('only samples initially fitting shapes and replays every verified witness with real rules', () => {
    const diagonal = createEmptyBoard().map((row, r) => row.map((_, c) => r === c ? null : 0));
    for (const board of [createEmptyBoard(), checker(), diagonal]) for (let seed = 0; seed < 16; seed++) {
      const g = generateFlowTray(board, seed);
      for (const p of g.tray) expect(getLegalAnchors(board, shapes[p.shapeId].cells).length).toBeGreaterThan(0);
      if (g.diagnostics.status === 'verified') replay(board, g.tray, g.diagnostics.witness);
      expect(g.diagnostics.attempts).toBeLessThanOrEqual(3);
      expect(g.diagnostics.nodes).toBeLessThanOrEqual(1800);
      expect(generateFlowTray(board, seed)).toEqual(g);
    }
  });
  it('distinguishes an exhausted budget from exhaustive impossibility', () => {
    expect(findPlayableTraySequence(createEmptyBoard(), [shapes[0], shapes[0], shapes[0]], 0)).toMatchObject({ status: 'unknown', nodes: 0, witness: null });
    expect(findPlayableTraySequence(checker(), [shapes[1], shapes[0]], 1000).status).toBe('impossible');
    expect(findPlayableTraySequence(createEmptyBoard(), [shapes[0], shapes[0], shapes[0]], 3).status).toBe('verified');
  });
  it('can verify a different order with a clear between placements', () => {
    const board = createEmptyBoard().map((row, r) => row.map((_, c) => r === c ? null : 0));
    const selected = [shapes[4], shapes[0], shapes[8]];
    const proof = findPlayableTraySequence(board, selected, 600);
    expect(proof.status).toBe('verified'); expect(proof.witness[0].index).toBe(1);
    replay(board, selected.map(s => ({ shapeId: s.id })), proof.witness);
  });
  it('bounded retries and constructive fallback stay fitting even with no search budget', () => {
    const g = generateFlowTray(checker(), 4, { attempts: 2, searchNodes: 0 });
    expect(g.diagnostics).toMatchObject({ attempts: 2, unknownSearches: 2, constructiveFallback: true, status: 'verified' });
    replay(checker(), g.tray, g.diagnostics.witness);
  });
  it('returns explicit no-legal-piece without retries or RNG consumption', () => {
    const g = generateFlowTray(createEmptyBoard().map(row => row.map(() => 0)), 42);
    expect(g).toMatchObject({ noLegalPiece: true, rngState: 42, nextPieceId: 1, tray: [null, null, null] });
  });
  it('a Clear intention includes a real immediate-clear opportunity, with a Build fallback', () => {
    const board = createEmptyBoard(); board[0].fill(0); board[0][7] = null;
    for (const searchNodes of [0, 600]) {
      const g = generateFlowTray(board, 42, { intentions: [0, 1, 0], searchNodes });
      expect(g.diagnostics.intention).toBe('clear');
      expect(g.tray.some(p => getLegalAnchors(board, shapes[p.shapeId].cells).some(a => simulateMove(board, shapes[p.shapeId], a).lines > 0))).toBe(true);
    }
    expect(generateFlowTray(createEmptyBoard(), 42, { intentions: [0, 1, 0] }).diagnostics.intention).toBe('build');
  });
  it('persists original Flow continuation instead of silently switching algorithms', () => {
    let game = { ...createNewGame(42, 'old-flow', 0, 'flow'), ...oldFlow(createEmptyBoard(), 42), generatorVersion: 1, configVersion: 1 };
    game = validateSavedGame(JSON.parse(JSON.stringify(game)));
    expect(game.generatorVersion).toBe(1);
    for (let slot = 0; slot < 3; slot++) {
      const anchor = getLegalAnchors(game.board, shapes[game.tray[slot].shapeId].cells)[0];
      const prior = game;
      game = resolvePlacement(game, { gameId: game.gameId, revision: game.revision, pieceId: game.tray[slot].instanceId, anchorRow: anchor.row, anchorColumn: anchor.col }).game;
      if (slot === 2) {
        const expected = generateModeTray(game.board, prior.rngState, prior.nextPieceId, 'flow', prior.recentShapes, 1);
        expect(game.tray).toEqual(expected.tray); expect(game.rngState).toBe(expected.rngState);
      }
    }
    expect(createNewGame(42, 'new-flow', 0, 'flow')).toMatchObject({ generatorVersion: 2, configVersion: 2 });
  });
  it('migrates audio preferences, validates controls, and omits search/audio events from saves', () => {
    const old = { ...DEFAULT_PROFILE, soundEnabled: false };
    delete old.effectsEnabled; delete old.voiceEnabled; delete old.effectsVolume; delete old.voiceVolume;
    expect(validateSavedProfile(old)).toMatchObject({ soundEnabled: false, effectsEnabled: false, voiceEnabled: false });
    expect(validateSavedProfile({ ...DEFAULT_PROFILE, voiceVolume: NaN })).toBeNull();
    expect(validateSavedProfile({ ...DEFAULT_PROFILE, voiceEnabled: 'yes' })).toBeNull();
    const game = createNewGame(42, 'no-diagnostics', 0, 'flow');
    expect(game.diagnostics).toBeUndefined(); expect(validateSavedGame(game)).toEqual(game);
  });
});
it('clear streak survives save without changing score, then resets on non-clear', () => {
  const game = createNewGame(1, 'streak', 0, 'classic');
  game.tray = game.tray.map(p => ({ ...p, shapeId: 0 }));
  game.board[0].fill(0); game.board[0][0] = null;
  const clearing = resolvePlacement(game, { gameId: game.gameId, revision: 0, pieceId: game.tray[0].instanceId, anchorRow: 0, anchorColumn: 0 }).game;
  expect(clearing).toMatchObject({ score: 110, clearStreak: 1 });
  const restored = validateSavedGame(JSON.parse(JSON.stringify(clearing)));
  expect(restored.clearStreak).toBe(1);
  const next = resolvePlacement(restored, { gameId: restored.gameId, revision: 1, pieceId: restored.tray[1].instanceId, anchorRow: 0, anchorColumn: 0 }).game;
  expect(next).toMatchObject({ score: 120, clearStreak: 0 });
});
