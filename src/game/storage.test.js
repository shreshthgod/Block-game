import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_PROFILE, STORAGE_KEYS } from './constants.js';
import { createNewGame, resolvePlacement } from './engine.js';
import { validateSavedGame, validateSavedProfile, readBootstrap, writeSnapshot } from './storage.js';
const memory = () => {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  };
};
describe('independent versioned persistence', () => {
  it('round-trips board, tray, RNG, score, and starting best without regeneration', () => {
    const initial = createNewGame(95, 'saved', 200);
    const game = resolvePlacement(initial, {
      gameId: 'saved',
      revision: 0,
      pieceId: initial.tray[0].instanceId,
      anchorRow: 0,
      anchorColumn: 0
    }).game;
    const storage = memory();
    expect(writeSnapshot(storage, DEFAULT_PROFILE, game)).toBe(true);
    const restored = readBootstrap(storage);
    expect(restored.game).toEqual(game);
    expect(restored.profile.bestScore).toBe(200);
    expect(restored.screen).toBe('home');
    const spy = vi.spyOn(storage, 'setItem');
    writeSnapshot(storage, DEFAULT_PROFILE, game);
    expect(spy).not.toHaveBeenCalled();
  });
  it.each([null, {}, {
    schemaVersion: 2
  }, {
    ...DEFAULT_PROFILE,
    motionMode: 'fast'
  }, {
    ...DEFAULT_PROFILE,
    soundEnabled: 'yes'
  }, {
    ...DEFAULT_PROFILE,
    bestScore: -1
  }, {
    ...DEFAULT_PROFILE,
    bestScore: 1.5
  }])('rejects bad profile %j', data => expect(validateSavedProfile(data)).toBeNull());
  it.each([{
    rulesVersion: 9
  }, {
    schemaVersion: 9
  }, {
    score: NaN
  }, {
    score: -1
  }, {
    rngState: 0x100000000
  }, {
    gameId: ''
  }, {
    moveCount: 3
  }, {
    nextPieceId: 5
  }, {
    tray: [null, null, null]
  }, {
    tray: [{
      instanceId: 'p-1',
      shapeId: 99,
      colourId: 0
    }, null, null]
  }, {
    tray: [{
      instanceId: 'p-1',
      shapeId: 0,
      colourId: 7
    }, null, null]
  }, {
    tray: [{
      instanceId: 'p-1',
      shapeId: 0,
      colourId: 0
    }, {
      instanceId: 'p-1',
      shapeId: 0,
      colourId: 0
    }, null]
  }, {
    board: Array(8).fill(Array(9).fill(null))
  }, {
    board: Array.from({
      length: 9
    }, () => Array(9).fill(0))
  }])('rejects malformed games %j', change => expect(validateSavedGame({
    ...createNewGame(1, 'valid'),
    ...change
  })).toBeNull());
  it('preserves valid profile when game JSON is invalid and handles bad JSON independently', () => {
    const storage = memory();
    storage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify({
      ...DEFAULT_PROFILE,
      bestScore: 999,
      soundEnabled: false
    }));
    storage.setItem(STORAGE_KEYS.GAME, '{oops');
    const result = readBootstrap(storage);
    expect(result.game).toBeNull();
    expect(result.profile.bestScore).toBe(999);
    expect(result.profile.soundEnabled).toBe(false);
    storage.setItem(STORAGE_KEYS.PROFILE, 'invalid');
    expect(readBootstrap(storage).profile).toEqual(DEFAULT_PROFILE);
  });
  it('corrects stale status and takes the maximum best score on restore', () => {
    const game = {
      ...createNewGame(1, 'valid', 500),
      score: 700,
      status: 'gameOver'
    };
    expect(validateSavedGame(game).status).toBe('active');
    const storage = memory();
    writeSnapshot(storage, {
      ...DEFAULT_PROFILE,
      bestScore: 400
    }, game);
    expect(readBootstrap(storage).profile.bestScore).toBe(700);
    game.board = game.board.map((row, r) => row.map((_, c) => (r + c) % 2 ? 0 : null));
    game.tray = game.tray.map(p => ({
      ...p,
      shapeId: 10
    }));
    game.status = 'active';
    expect(validateSavedGame(game).status).toBe('gameOver');
  });
  it('catches denied storage and write/quota exceptions while allowing independent profile writes', () => {
    const storage = {
      getItem: () => {
        throw Error('denied');
      },
      setItem: () => {
        throw Error('quota');
      }
    };
    expect(readBootstrap(storage).saveUnavailable).toBe(true);
    expect(writeSnapshot(storage, DEFAULT_PROFILE, createNewGame(1, 'valid'))).toBe(false);
    expect(readBootstrap(null).game).toBeNull();
    const partial = memory();
    const original = partial.setItem;
    partial.setItem = (key, value) => {
      if (key === STORAGE_KEYS.GAME) throw Error('quota');
      original(key, value);
    };
    expect(writeSnapshot(partial, DEFAULT_PROFILE, createNewGame(1, 'valid'))).toBe(false);
    expect(JSON.parse(partial.getItem(STORAGE_KEYS.PROFILE))).toEqual(DEFAULT_PROFILE);
  });
});
