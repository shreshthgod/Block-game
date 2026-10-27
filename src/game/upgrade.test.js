import { describe, it, expect } from 'vitest';
import { createEmptyBoard, createNewGame, resolvePlacement, getLegalAnchors, findCompletedLines, canPlace } from './engine.js';
import { SHAPE_CATALOGUE } from './shapes.js';
import { evaluateBoard, evaluateShapeUsefulness, enumerateLegalPlacements, EMPTY_BOARD_MOBILITY } from './evaluation.js';
import { generateFlowTray, generateModeTray, weightedIndex } from './flow.js';
import { generateTray } from './random.js';
import { validateSavedGame, validateLegacyGame, readBootstrap, writeSnapshot } from './storage.js';
import { rootReducer } from './reducer.js';
import { DEFAULT_PROFILE, STORAGE_KEYS } from './constants.js';
const command = (game, slot, anchor) => ({ gameId: game.gameId, revision: game.revision, pieceId: game.tray[slot].instanceId, anchorRow: anchor.row, anchorColumn: anchor.col });
const store = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; };
function firstMove(game) {
  for (let slot = 0; slot < 3; slot++) if (game.tray[slot]) {
    const anchors = getLegalAnchors(game.board, SHAPE_CATALOGUE[game.tray[slot].shapeId].cells);
    if (anchors.length) return command(game, slot, anchors[0]);
  }
  return null;
}
describe('8 × 8 rules and evaluation', () => {
  it('contains exactly 64 cells and accepts all catalogue shapes at every fitting edge', () => {
    const board = createEmptyBoard();
    expect(board.flat()).toHaveLength(64);
    for (const shape of SHAPE_CATALOGUE) {
      for (const row of [0, 8 - shape.rows]) for (const col of [0, 8 - shape.cols]) expect(canPlace(board, shape.cells, row, col)).toBe(true);
      expect(canPlace(board, shape.cells, 9 - shape.rows, 0)).toBe(false);
      expect(canPlace(board, shape.cells, 0, 9 - shape.cols)).toBe(false);
      expect(enumerateLegalPlacements(board, shape)).toEqual(getLegalAnchors(board, shape.cells));
    }
  });
  it('seven occupied cells do not clear; eight clear a row or column', () => {
    const board = createEmptyBoard();
    for (let i = 0; i < 7; i++) { board[0][i] = 0; board[i][0] = 0; }
    expect(findCompletedLines(board)).toEqual({ rows: [], columns: [] });
    board[0][7] = 0; board[7][0] = 0;
    expect(findCompletedLines(board)).toEqual({ rows: [0], columns: [0] });
  });
  it('uses a fixed 8 × 8 mobility reference and distinguishes equally occupied boards', () => {
    const empty = evaluateBoard(createEmptyBoard());
    expect(empty).toMatchObject({ occupiedCells: 0, emptyCells: 64, normalizedMobility: 1, pressure: 0 });
    expect(EMPTY_BOARD_MOBILITY).toBe(SHAPE_CATALOGUE.reduce((sum, s) => sum + (9 - s.rows) * (9 - s.cols), 0));
    const a = createEmptyBoard().map((row, r) => row.map(() => r < 4 ? 0 : null));
    const b = createEmptyBoard().map((row, r) => row.map((_, c) => (r + c) % 2 ? 0 : null));
    expect(evaluateBoard(a).occupancyRatio).toBe(.5);
    expect(evaluateBoard(a).mobility).toBeGreaterThan(evaluateBoard(b).mobility);
    expect(evaluateBoard(b).pressure).toBeGreaterThan(evaluateBoard(a).pressure);
  });
  it('counts distinct clear opportunities and resulting mobility', () => {
    const board = createEmptyBoard(); board[0].fill(0); board[0][7] = null;
    const u = evaluateShapeUsefulness(board, SHAPE_CATALOGUE[0]);
    expect(u).toMatchObject({ legalPlacementCount: 57, bestImmediateLines: 1, clearPlacements: 1, bestResultingMobility: EMPTY_BOARD_MOBILITY });
  });
});
describe('deterministic bounded generation', () => {
  it('Classic preserves exact independent shape/colour draws', () => {
    for (const seed of [0, 1, 42, 0xffffffff]) {
      const game = createNewGame(seed, 'classic', 0, 'classic');
      expect({ tray: game.tray, rngState: game.rngState, nextPieceId: game.nextPieceId }).toEqual(generateTray(seed));
      expect(generateModeTray(createEmptyBoard(), seed, 4, 'classic').tray).toEqual(generateTray(seed, 4).tray);
    }
  });
  it.each([[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0], [-1, NaN, 0]])('is repeatable under policy weights %j', (...weights) => {
    const board = createEmptyBoard(); board[0].fill(0); board[0][7] = null;
    const config = { low: weights, medium: weights, high: weights };
    const a = generateFlowTray(board, 42, config, 10, [0, 0]);
    expect(generateFlowTray(board, 42, config, 10, [0, 0])).toEqual(a);
    expect(a.tray).toHaveLength(3);
    expect(a.tray.every(p => SHAPE_CATALOGUE[p.shapeId])).toBe(true);
    expect(a.recentShapes).toHaveLength(5);
  });
  it('handles no clear candidates, no fitting candidates and zero/empty weights', () => {
    const blocked = createEmptyBoard().map(row => row.map(() => 0));
    for (const board of [blocked, createEmptyBoard()]) expect(generateFlowTray(board, 4, { low: [0, 0, 1], high: [0, 0, 1] }).tray).toHaveLength(3);
    expect(weightedIndex([0, 0], 1).value).toBeLessThan(2);
    expect(weightedIndex([], 1).value).toBe(0);
  });
  it('refills from the post-clear board in the same atomic move', () => {
    const game = createNewGame(4, 'refill', 0, 'flow');
    game.tray = [{ ...game.tray[0], shapeId: 0 }, null, null];
    game.moveCount = game.revision = 2;
    for (let n = 1; n < 8; n++) { game.board[0][n] = 0; game.board[n][0] = 1; }
    const resolved = resolvePlacement(game, command(game, 0, { row: 0, col: 0 }));
    expect(resolved.result.cleared).toHaveLength(15);
    expect(resolved.game.score).toBe(310);
    const expected = generateModeTray(createEmptyBoard(), game.rngState, game.nextPieceId, 'flow', game.recentShapes);
    expect(resolved.game.tray).toEqual(expected.tray);
    expect(resolved.game.rngState).toBe(expected.rngState);
    expect(resolved.game.recentShapes).toEqual(expected.recentShapes);
    expect(Object.isFrozen(resolved.result.snapshots.afterPlacement[0])).toBe(true);
    expect(resolvePlacement(resolved.game, command(game, 0, { row: 0, col: 0 }))).toBeNull();
  });
  it.each(['classic', 'flow'])('save/reload preserves future %s draws and every committed field', mode => {
    let continuous = createNewGame(143, 'continuation', 0, mode), reloaded = continuous;
    for (let i = 0; i < 24; i++) {
      const cmd = firstMove(continuous); if (!cmd) break;
      continuous = resolvePlacement(continuous, cmd).game;
      reloaded = resolvePlacement(validateSavedGame(JSON.parse(JSON.stringify(reloaded))), cmd).game;
      expect(reloaded).toEqual(continuous);
    }
    expect(continuous.moveCount).toBeGreaterThan(6);
  });
});
describe('safe save migration and independent presentation', () => {
  it('detects and preserves valid legacy data without cropping; confirms replacement', () => {
    const storage = store();
    const legacy = { ...createNewGame(1, 'legacy'), schemaVersion: 1, rulesVersion: 1, board: Array.from({ length: 9 }, () => Array(9).fill(null)), score: 200 };
    storage.setItem('prismNine.game.v1', JSON.stringify(legacy));
    storage.setItem('prismNine.profile.v1', JSON.stringify({ schemaVersion: 1, bestScore: 800, soundEnabled: false, motionMode: 'reduced', tutorialDismissed: true, theme: 'forest-calm' }));
    const state = readBootstrap(storage);
    expect(state.game).toBeNull(); expect(state.legacyGame).toEqual(legacy);
    expect(validateSavedGame(legacy)).toBeNull(); expect(validateLegacyGame(legacy)).toEqual(legacy);
    expect(state.profile).toMatchObject({ legacyBestScore: 800, bestScores: { classic: 0, flow: 0, joy: 0 }, soundEnabled: false, theme: 'forest-calm' });
    writeSnapshot(storage, state.profile, null);
    expect(storage.getItem('prismNine.game.v1')).toBe(JSON.stringify(legacy));
    const confirm = rootReducer(state, { type: 'START_NEW_GAME', seed: 1, gameId: 'new' });
    expect(confirm.activeModal.type).toBe('restart'); expect(confirm.game).toBeNull();
    const next = rootReducer(confirm, { type: 'CONFIRM_RESTART', seed: 1, gameId: 'new' });
    writeSnapshot(storage, next.profile, next.game);
    expect(storage.getItem('prismNine.legacy9.game.v1')).toBe(JSON.stringify(legacy));
    expect(storage.getItem('prismNine.game.v1')).toBeNull();
    expect(readBootstrap(storage).game.board.flat()).toHaveLength(64);
  });
  it('rejects dimensions, unsupported generator versions, and corrupt history while retaining profile', () => {
    const game = createNewGame(1, 'valid', 0, 'flow');
    for (const change of [{ boardSize: 9 }, { board: Array(9).fill(Array(9).fill(null)) }, { board: Array(8).fill(Array(7).fill(null)) }, { generatorVersion: 99 }, { recentShapes: [25] }, { recentShapes: [] }]) expect(validateSavedGame({ ...game, ...change })).toBeNull();
    const storage = store(); writeSnapshot(storage, { ...DEFAULT_PROFILE, theme: 'candy-pop' }, game);
    storage.setItem(STORAGE_KEYS.GAME, '{bad');
    expect(readBootstrap(storage).profile.theme).toBe('candy-pop');
  });
  it('themes do not change game identity, history, board or RNG; separate mode bests', () => {
    let state = rootReducer(readBootstrap(store()), { type: 'START_NEW_GAME', seed: 1, gameId: 'flow' });
    const game = state.game;
    for (const theme of ['candy-pop', 'forest-calm', 'midnight-gold']) { state = rootReducer(state, { type: 'SET_THEME', theme }); expect(state.game).toBe(game); }
    state = rootReducer(state, { type: 'PLACE_PIECE', command: firstMove(game) });
    expect(state.profile.bestScores.joy).toBeGreaterThan(0); expect(state.profile.bestScores.classic).toBe(0);
    const oldToken = state.pendingResolution.token;
    state = rootReducer(state, { type: 'PLACE_PIECE', command: firstMove(state.game) });
    expect(state.game.moveCount).toBe(2); expect(state.pendingResolution.token).not.toBe(oldToken);
    expect(rootReducer(state, { type: 'COMPLETE_RESOLUTION', token: oldToken })).toBe(state);
  });
});
