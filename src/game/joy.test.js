import { describe, it, expect } from 'vitest';
import { createNewGame, createEmptyBoard, resolvePlacement, recoverJoyGame, continueJoyRound } from './engine.js';
import { generateJoyTray, shapeCategory } from './joy.js';
import { findPlayableTraySequence } from './traySearch.js';
import { simulateMove, getLegalAnchors, hasAnyLegalMove } from './rules.js';
import { JOY_SHAPE_CATALOGUE as shapes } from './shapes.js';
import { readBootstrap, writeSnapshot, validateSavedGame, validateSavedProfile } from './storage.js';
import { rootReducer } from './reducer.js';
import { deriveCelebration } from '../audio/celebrations.js';
import { DEFAULT_PROFILE, STORAGE_KEYS } from './constants.js';
import { reconcileProgress } from './progress.js';
const store = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; };
const command = (g, slot = 0, row = 0, col = 0) => ({ gameId: g.gameId, revision: g.revision, pieceId: g.tray[slot]?.instanceId, anchorRow: row, anchorColumn: col });
function almostWon() {
  const g = createNewGame(42, 'joy-win', 0, 'joy');
  g.tray = [{ ...g.tray[0], shapeId: 0 }, null, null]; g.moveCount = g.revision = 2; g.statistics.linesCleared = 10;
  for (let n = 1; n < 8; n++) { g.board[0][n] = 0; g.board[n][0] = 2; }
  return g;
}
function firstCommand(g) {
  for (let slot = 0; slot < 3; slot++) if (g.tray[slot]) {
    const a = getLegalAnchors(g.board, shapes[g.tray[slot].shapeId].cells)[0]; if (a) return command(g, slot, a.row, a.col);
  }
}
describe('Joy large-piece routes', () => {
  it('keeps the fixed catalogue and offers large pieces when verified routes support them', () => {
    expect(shapes[10].cells).toHaveLength(9); expect(shapes[11].cells).toHaveLength(6); expect(shapes[12].cells).toHaveLength(6);
    let large = 0;
    for (let seed = 0; seed < 24; seed++) {
      const g = generateJoyTray(createEmptyBoard(), seed); if (g.tray.some(p => shapeCategory(shapes[p.shapeId]) === 'large')) large++;
      expect(g.trayVerified).toBe(true); expect(hasAnyLegalMove(createEmptyBoard(), g.tray)).toBe(true);
    }
    expect(large).toBeGreaterThan(10); // Broad regression, not a universal quota.
  });
  it('verifies a setup route where clearing makes a previously blocked large piece legal', () => {
    const board = createEmptyBoard().map((row, r) => row.map((_, c) => r === c ? null : 0));
    let found = false;
    for (let seed = 0; seed < 12; seed++) {
      const g = generateJoyTray(board, seed, 1, [], [], { intentions: [0, 0, 1, 0], largeTarget: 1 });
      let working = board; let lines = 0, allClear = false; const used = new Set();
      for (const step of g.diagnostics.witness) {
        const p = g.tray[step.index], shape = shapes[p.shapeId]; used.add(step.index);
        if (shapeCategory(shape) === 'large' && !getLegalAnchors(board, shape.cells).length) found = true;
        const move = simulateMove(working, shape, step.anchor); expect(move).not.toBeNull(); working = move.board;
        lines += move.lines; allClear ||= move.lines > 0 && working.flat().every(v => v === null);
      }
      expect(used.size).toBe(3); expect(lines).toBe(g.diagnostics.reachableLines); expect(allClear).toBe(g.diagnostics.allClear);
    }
    expect(found).toBe(true);
  });
  it('does not let a size preference override legal first moves or truthful bounded proofs', () => {
    const b = createEmptyBoard().map((row, r) => row.map((_, c) => (r + c) % 2 ? 0 : null));
    const a = generateJoyTray(b, 1, 1, [], [], { candidates: 1, searchNodes: 0, largeTarget: 1 });
    expect(hasAnyLegalMove(b, a.tray)).toBe(true); expect(a.diagnostics.witness).toHaveLength(3);
    expect(findPlayableTraySequence(b, [shapes[0]], 0).status).toBe('unknown');
    expect(generateJoyTray(b, 1, 1, [], [], { candidates: 1, searchNodes: 0, largeTarget: 1 })).toEqual(a);
  });
  it('returns explicit no-fit and terminates invalid configuration fallback', () => {
    const full = createEmptyBoard().map(r => r.map(() => 0));
    expect(generateJoyTray(full, 42)).toMatchObject({ noLegalPiece: true, rngState: 42 });
    expect(generateJoyTray(createEmptyBoard(), 42, 1, [], [], { intentions: [0, 0, 0, 0], candidates: Infinity })).toHaveProperty('trayVerified', true);
  });
});
describe('Joy recovery and actual wins', () => {
  it('replaces only unconsumed slots and preserves board/score with a legal next move', () => {
    const g = createNewGame(42, 'recover', 200, 'joy');
    g.board = createEmptyBoard().map((r, y) => r.map((_, x) => (x + y) % 2 ? 0 : null));
    g.tray = [null, { ...g.tray[1], shapeId: 10 }, { ...g.tray[2], shapeId: 10 }]; g.moveCount = g.revision = 1; g.score = 40; g.status = 'recovery';
    const next = recoverJoyGame(g, { gameId: g.gameId, revision: g.revision });
    expect(next.board).toBe(g.board); expect(next.score).toBe(40); expect(next.tray[0]).toBeNull();
    expect(next.tray.slice(1).every(Boolean)).toBe(true); expect(hasAnyLegalMove(next.board, next.tray)).toBe(true);
    expect(next.statistics.recoveries).toBe(1); expect(validateSavedGame(next)).toEqual(next);
    expect(recoverJoyGame(next, { gameId: g.gameId, revision: g.revision })).toBeNull();
  });
  it('Joy offers recovery while Classic still ends a no-moves game', () => {
    for (const mode of ['classic', 'joy']) {
      const g = createNewGame(42, `stuck-${mode}`, 0, mode);
      g.board = createEmptyBoard().map((r, y) => r.map((_, x) => (x + y) % 2 ? 0 : null));
      g.tray = g.tray.map((p, i) => ({ ...p, shapeId: i === 0 ? 0 : 10 }));
      const next = resolvePlacement(g, command(g));
      expect(next.game.status).toBe(mode === 'joy' ? 'recovery' : 'gameOver');
    }
  });
  it('counts simultaneous lines, earns All Clear through rules, and awards twelve-line win once', () => {
    const g = almostWon(); expect(validateSavedGame(g)).not.toBeNull();
    const resolved = resolvePlacement(g, command(g));
    expect(resolved.game).toMatchObject({ score: 310, status: 'roundWon', statistics: { linesCleared: 12, roundsWon: 1, allClears: 1, largestBurst: 2 } });
    expect(resolved.result.cleared).toHaveLength(15); expect(resolved.result.allClear).toBe(true); expect(deriveCelebration(resolved.result).phrase).toBe('All Clear!');
    expect(resolvePlacement(resolved.game, command(g))).toBeNull();
    const profile = reconcileProgress(DEFAULT_PROFILE, resolved.game);
    expect(reconcileProgress(profile, resolved.game)).toEqual(profile);
    const storage = store(); writeSnapshot(storage, profile, resolved.game);
    expect(readBootstrap(storage).profile.stats.roundsWon).toBe(1);
    expect(readBootstrap(storage).profile.stats.allClears).toBe(1);
  });
  it('Continue preserves board/tray/score/RNG and starts a new segment at the full cumulative count', () => {
    const win = resolvePlacement(almostWon(), command(almostWon())).game;
    const next = continueJoyRound(win, { gameId: win.gameId, revision: win.revision, roundId: win.round.id });
    expect(next.board).toBe(win.board); expect(next.tray).toBe(win.tray); expect(next.score).toBe(win.score); expect(next.rngState).toBe(win.rngState);
    expect(next.round).toMatchObject({ index: 2, baselineLines: 12, target: 12, won: false });
    expect(validateSavedGame(next)).toEqual(next);
    expect(continueJoyRound(next, { gameId: win.gameId, revision: win.revision, roundId: win.round.id })).toBeNull();
  });
  it('does not award All Clear for an empty fresh board or a 3 × 3 region', () => {
    const g = createNewGame(42, 'square', 0, 'joy'); g.tray[0] = { ...g.tray[0], shapeId: 10 };
    const placed = resolvePlacement(g, command(g)); expect(placed.game.score).toBe(90); expect(placed.result.allClear).toBe(false); expect(placed.game.statistics.largestPiece).toBe(9);
  });
  it('gives win priority over a simultaneous stuck state and shows recovery only after Continue', () => {
    const g = almostWon(); g.statistics.linesCleared = 11;
    g.board = createEmptyBoard().map((r, y) => r.map((_, x) => y === 0 && x > 0 ? 0 : (x + y) % 2 ? 0 : null));
    g.tray = [{ ...g.tray[0], shapeId: 0 }, { instanceId: 'p-2', shapeId: 10, colourId: 0 }, null];
    g.moveCount = g.revision = 1;
    const win = resolvePlacement(g, command(g)).game;
    expect(win.status).toBe('roundWon');
    // Win takes precedence regardless of the remaining-move test; continuation recomputes it.
    const blocked = { ...win, board: createEmptyBoard().map((r,y) => r.map((_,x) => (x+y)%2 ? 0 : null)) };
    expect(continueJoyRound(blocked, { gameId: blocked.gameId, revision: blocked.revision, roundId: blocked.round.id }).status).toBe('recovery');
  });
});
describe('Joy save and profile integrity', () => {
  it('preserves future draws across reload, including category history and committed goals', () => {
    let a = createNewGame(1, 'joy-continuation', 0, 'joy'), b = a;
    for (let move = 0; move < 24; move++) {
      if (a.status === 'roundWon') { const cmd = { gameId: a.gameId, revision: a.revision, roundId: a.round.id }; a = continueJoyRound(a, cmd); b = continueJoyRound(validateSavedGame(JSON.parse(JSON.stringify(b))), cmd); }
      if (a.status === 'recovery') { const cmd = { gameId: a.gameId, revision: a.revision }; a = recoverJoyGame(a, cmd); b = recoverJoyGame(validateSavedGame(JSON.parse(JSON.stringify(b))), cmd); }
      const cmd = firstCommand(a); a = resolvePlacement(a, cmd).game; b = resolvePlacement(validateSavedGame(JSON.parse(JSON.stringify(b))), cmd).game;
      expect(b).toEqual(a);
    }
  });
  it('migrates supported v2 Flow without changing rules or preferences, and never loads a 9 × 9 board', () => {
    const storage = store(); const old = { ...createNewGame(1, 'old-flow', 100, 'flow'), schemaVersion: 2 }; delete old.statistics;
    const profile = { ...DEFAULT_PROFILE, schemaVersion: 2, bestScores: { ...DEFAULT_PROFILE.bestScores }, selectedMode: 'flow', theme: 'forest-calm', soundEnabled: false }; delete profile.stats; delete profile.progressLedger; delete profile.bestScores.joy;
    storage.setItem('prismNine.game.v2', JSON.stringify(old)); storage.setItem('prismNine.profile.v2', JSON.stringify(profile));
    const boot = readBootstrap(storage);
    expect(boot.game).toMatchObject({ mode: 'flow', generatorVersion: 2, rulesVersion: 2, rngState: old.rngState, tray: old.tray });
    expect(boot.profile).toMatchObject({ selectedMode: 'joy', theme: 'forest-calm', soundEnabled: false });
    expect(validateSavedGame({ ...old, board: Array(9).fill(Array(9).fill(null)) })).toBeNull();
  });
  it('recovers partial profile/game writes without duplicate completed-round credit', () => {
    const won = resolvePlacement(almostWon(), command(almostWon())).game, storage = store();
    const profile = reconcileProgress(DEFAULT_PROFILE, won);
    storage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)); storage.setItem(STORAGE_KEYS.GAME, JSON.stringify(won));
    for (let i = 0; i < 3; i++) { const state = readBootstrap(storage); expect(state.profile.stats.roundsWon).toBe(1); writeSnapshot(storage, state.profile, state.game); }
    const malformed = { ...won, round: { ...won.round, won: false } };
    expect(validateSavedGame(malformed)).toBeNull();
    expect(validateSavedProfile({ ...profile, stats: { ...profile.stats, roundsWon: -1 } })).toBeNull();
  });
  it('guards duplicate recovery commands and keeps theme changes outside game RNG', () => {
    const state = rootReducer(readBootstrap(store()), { type: 'START_NEW_GAME', seed: 1, gameId: 'root-joy' });
    expect(state.game.mode).toBe('joy'); const game = state.game;
    expect(rootReducer(state, { type: 'SET_THEME', theme: 'ocean-pop' }).game).toBe(game);
    expect(rootReducer(state, { type: 'RECOVER_PIECES', command: { gameId: game.gameId, revision: game.revision } })).toBe(state);
  });
});

it('an All Clear intention offers a genuinely emptying route when one is found', () => {
  const board = createEmptyBoard(); for (let c = 0; c < 7; c++) board[0][c] = 0;
  const g = generateJoyTray(board, 42, 1, [], [], { intentions: [0, 0, 0, 1] });
  expect(g.diagnostics.allClear).toBe(true);
  let current = board, earned = false;
  for (const step of g.diagnostics.witness) { const m = simulateMove(current, shapes[step.shapeId], step.anchor); current = m.board; earned ||= m.lines > 0 && current.flat().every(c => c === null); }
  expect(earned).toBe(true);
});
