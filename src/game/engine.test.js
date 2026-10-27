import { describe, it, expect } from 'vitest';
import { SHAPE_CATALOGUE, normalizeShape, isConnected } from './shapes.js';
import { nextRandom, sampleBounded, generateTray } from './random.js';
import { createEmptyBoard, createNewGame, canPlace, getLegalAnchors, hasAnyLegalMove, findCompletedLines, getUniqueClearedCells, calculateMoveScore, resolvePlacement } from './engine.js';
const piece = (id, shapeId = 0) => ({
  instanceId: `p-${id}`,
  shapeId,
  colourId: id % 7
});
const base = (shape = 0) => ({
  ...createNewGame(42, 'test', 200),
  tray: [piece(1, shape), piece(2), piece(3)]
});
const command = (game, row = 0, col = 0, slot = 0) => ({
  gameId: game.gameId,
  revision: game.revision,
  pieceId: game.tray[slot].instanceId,
  anchorRow: row,
  anchorColumn: col
});
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
describe('catalogue and exact placement', () => {
  it('has exactly 25 unique, connected, normalized immutable shapes', () => {
    expect(SHAPE_CATALOGUE).toHaveLength(25);
    expect(new Set(SHAPE_CATALOGUE.map(s => JSON.stringify(s.cells))).size).toBe(25);
    for (const shape of SHAPE_CATALOGUE) {
      expect(shape.cells).toEqual(normalizeShape(shape.cells));
      expect(isConnected(shape.cells)).toBe(true);
    }
    expect(normalizeShape([[4, -3], [5, -3], [5, -2]])).toEqual([[0, 0], [1, 0], [1, 1]]);
  });
  it('validates every board edge, occupied coordinates, and integer anchors', () => {
    const board = freeze(createEmptyBoard()),
      single = [[0, 0]];
    for (const [r, c] of [[0, 0], [0, 7], [7, 0], [7, 7]]) expect(canPlace(board, single, r, c)).toBe(true);
    for (const [r, c] of [[-1, 0], [0, -1], [9, 0], [0, 9], [0.5, 0], [NaN, 0], [Infinity, 0]]) expect(canPlace(board, single, r, c)).toBe(false);
    expect(canPlace(board, [[0, 0], [0, 1]], 7, 6)).toBe(true);
    expect(canPlace(board, [[0, 0], [0, 1]], 7, 7)).toBe(false);
    expect(canPlace(board, [[0, 0], [1, 0]], 7, 0)).toBe(false);
    expect(getLegalAnchors(board, single)).toHaveLength(64);
  });
  it('allows an occupied empty corner in a shape bounding box', () => {
    const board = createEmptyBoard();
    board[0][0] = 0;
    expect(canPlace(board, [[0, 1], [1, 0], [1, 1]], 0, 0)).toBe(true);
    board[1][1] = 1;
    expect(canPlace(board, [[0, 1], [1, 0], [1, 1]], 0, 0)).toBe(false);
  });
});
describe('scoring and simultaneous clears', () => {
  it.each([[4, 0, 0, 40], [4, 1, 0, 140], [2, 2, 0, 320], [1, 1, 1, 310], [5, 3, 0, 650], [1, 2, 2, 1010]])('scores %i cells, %i rows, %i columns = %i', (p, r, c, total) => expect(calculateMoveScore(p, r, c).total).toBe(total));
  it('places without clearing and never mutates prior state', () => {
    const game = freeze(base(9));
    const result = resolvePlacement(game, command(game));
    expect(result.game.score).toBe(40);
    expect(result.result.cleared).toHaveLength(0);
    expect(result.game.board[1][1]).toBe(1);
    expect(game.board[0][0]).toBeNull();
    expect(result.game.startingBestScore).toBe(200);
    expect(result.game.revision).toBe(1);
  });
  it.each(['row', 'column'])('clears one %s and preserves unrelated cells', direction => {
    const game = base();
    for (let n = 1; n < 8; n++) game.board[direction === 'row' ? 0 : n][direction === 'row' ? n : 0] = 2;
    game.board[5][5] = 3;
    const result = resolvePlacement(game, command(game));
    expect(result.game.score).toBe(110);
    expect(result.result.cleared).toHaveLength(8);
    expect(result.game.board[5][5]).toBe(3);
  });
  it('two rows with a vertical domino clear 16 cells for 320 points', () => {
    const game = base(5);
    for (let r = 0; r < 2; r++) for (let c = 1; c < 8; c++) game.board[r][c] = 0;
    const result = resolvePlacement(game, command(game));
    expect(result.game.score).toBe(320);
    expect(result.result.cleared).toHaveLength(16);
    expect(result.result.completedLines.rows).toEqual([0, 1]);
  });
  it('a crossing row and column clear 15 unique cells for 310 points', () => {
    const game = base();
    for (let n = 1; n < 8; n++) {
      game.board[0][n] = 0;
      game.board[n][0] = 2;
    }
    const result = resolvePlacement(game, command(game));
    expect(result.game.score).toBe(310);
    expect(result.result.cleared).toHaveLength(15);
    expect(result.game.board.flat().filter(x => x !== null)).toHaveLength(0);
    expect(getUniqueClearedCells([0, 2], [1, 4])).toHaveLength(28);
  });
  it('a full 3 by 3 region remains and earns only placement points', () => {
    const game = base(10),
      result = resolvePlacement(game, command(game));
    expect(result.game.score).toBe(90);
    expect(result.game.board.flat().filter(x => x !== null)).toHaveLength(9);
    expect(findCompletedLines(result.game.board)).toEqual({
      rows: [],
      columns: []
    });
  });
});
describe('tray, legal moves, and transaction guards', () => {
  it('consumes only one slot and refills exactly after all three are consumed', () => {
    const game = base();
    const first = resolvePlacement(game, command(game, 0, 0, 1)).game;
    expect(first.tray).toEqual([game.tray[0], null, game.tray[2]]);
    expect(first.tray[0]).toBe(game.tray[0]);
    expect(first.rngState).toBe(game.rngState);
    expect(first.nextPieceId).toBe(4);
    const second = resolvePlacement(first, command(first, 2, 2, 0)).game;
    const third = resolvePlacement(second, command(second, 4, 4, 2)).game;
    expect(third.tray.every(Boolean)).toBe(true);
    expect(third.nextPieceId).toBe(7);
    expect(third.rngState).not.toBe(game.rngState);
    expect(third.tray.map(p => p.instanceId)).toEqual(['p-4', 'p-5', 'p-6']);
  });
  it('one blocked piece and one fitting piece remain active', () => {
    const board = createEmptyBoard().map((row, r) => row.map((_, c) => (r + c) % 2 ? 0 : null));
    expect(hasAnyLegalMove(board, [piece(1, 10), piece(2), null])).toBe(true);
    expect(hasAnyLegalMove(board, [piece(1, 10), piece(2, 9), null])).toBe(false);
    const game = {
      ...base(),
      board,
      tray: [piece(1), piece(2, 10), piece(3)]
    };
    expect(resolvePlacement(game, command(game)).game.status).toBe('active');
    game.tray[2] = piece(3, 9);
    expect(resolvePlacement(game, command(game)).game.status).toBe('gameOver');
  });
  it('checks cleared board before game over', () => {
    const game = base();
    game.board = createEmptyBoard().map((row, r) => row.map((_, c) => r === c ? null : 0));
    game.tray = [piece(1), piece(2, 4), null];
    expect(getLegalAnchors(game.board, SHAPE_CATALOGUE[4].cells)).toHaveLength(0);
    const result = resolvePlacement(game, command(game));
    expect(result.game.status).toBe('active');
    expect(getLegalAnchors(result.game.board, SHAPE_CATALOGUE[4].cells).length).toBeGreaterThan(0);
  });
  it('checks the newly refilled tray without rescue rerolls', () => {
    const game = base();
    game.board = createEmptyBoard().map((row, r) => row.map((_, c) => (r + c) % 2 ? 0 : null));
    game.tray = [piece(1), null, null];
    let calls = 0;
    const blocked = (rngState, nextPieceId) => {
      calls++;
      return {
        rngState: 123,
        nextPieceId: nextPieceId + 3,
        tray: [piece(nextPieceId, 10), piece(nextPieceId + 1, 9), piece(nextPieceId + 2, 9)]
      };
    };
    expect(resolvePlacement(game, command(game), blocked).game.status).toBe('gameOver');
    expect(calls).toBe(1);
    const fitting = (rngState, nextPieceId) => ({
      ...blocked(rngState, nextPieceId),
      tray: [piece(nextPieceId), piece(nextPieceId + 1, 9), piece(nextPieceId + 2, 9)]
    });
    expect(resolvePlacement(game, command(game), fitting).game.status).toBe('active');
  });
  it('rejects overlap, bad anchors, duplicate and stale commands without RNG or input mutation', () => {
    const game = freeze(base());
    for (const change of [{
      anchorRow: -1
    }, {
      anchorColumn: 9
    }, {
      anchorRow: 0.2
    }, {
      gameId: 'other'
    }, {
      revision: 1
    }, {
      pieceId: 'missing'
    }]) expect(resolvePlacement(game, {
      ...command(game),
      ...change
    })).toBeNull();
    const cmd = command(game),
      next = resolvePlacement(game, cmd).game;
    expect(resolvePlacement(next, cmd)).toBeNull();
    expect(resolvePlacement(next, {
      ...command(next, 0, 0, 1)
    })).toBeNull();
    expect(next.rngState).toBe(game.rngState);
  });
});
describe('deterministic unbiased generation', () => {
  it('uses reproducible stored state, unique piece IDs, and independent replacement draws', () => {
    expect(createNewGame(42, 'same')).toEqual(createNewGame(42, 'same'));
    const first = generateTray(100, 1),
      saved = JSON.parse(JSON.stringify(first));
    expect(generateTray(saved.rngState, saved.nextPieceId)).toEqual(generateTray(first.rngState, first.nextPieceId));
    const duplicate = generateTray(4, 1, state => ({
      value: 0,
      nextState: state + 1
    }));
    expect(duplicate.tray.map(p => p.shapeId)).toEqual([0, 0, 0]);
    expect(duplicate.rngState).toBe(10);
    for (let s = 0; s < 500; s++) {
      const generated = generateTray(s);
      expect(generated.tray.every(p => p.shapeId >= 0 && p.shapeId < 25 && p.colourId >= 0 && p.colourId < 7)).toBe(true);
    }
  });
  it('rejects the high tail rather than introducing modulo bias', () => {
    const samples = [0xffffffff, 49];
    let calls = 0;
    expect(sampleBounded(0, 25, state => ({
      value: samples[calls++],
      nextState: state + 1
    }))).toEqual({
      value: 24,
      nextState: 2
    });
    expect(calls).toBe(2);
    expect(nextRandom(42)).toEqual({
      value: 2581720956,
      nextState: 1831565855
    });
  });
});
