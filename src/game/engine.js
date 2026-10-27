import { RULES_VERSION, SCHEMA_VERSION, SIZE, GENERATOR_VERSION, GENERATOR_CONFIG_VERSION, JOY_RULES_VERSION, ROUND_TARGET, EMPTY_STATISTICS, JOY_GENERATOR_VERSION, JOY_CONFIG_VERSION } from './constants.js';
import { getShapeById } from './shapes.js';
import { generateJoyState, generateRecoveryPieces } from './joy.js';
import { generateModeTray } from './flow.js';
export { getShapeById } from './shapes.js';
export { createEmptyBoard, canPlace, getLegalAnchors, hasAnyLegalMove, findCompletedLines, getUniqueClearedCells, calculateMoveScore, simulateMove } from './rules.js';
import { createEmptyBoard, hasAnyLegalMove, simulateMove } from './rules.js';
export function createNewGame(seed, gameId, startingBestScore = 0, mode = 'classic') {
  const generated = mode === 'joy' ? generateJoyState(createEmptyBoard(), seed, 1) : generateModeTray(createEmptyBoard(), seed, 1, mode);
  return {
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: mode === 'joy' ? JOY_RULES_VERSION : RULES_VERSION,
    gameId,
    boardSize: SIZE,
    mode,
    generatorVersion: mode === 'joy' ? JOY_GENERATOR_VERSION : mode === 'flow' ? GENERATOR_VERSION : 1,
    configVersion: mode === 'joy' ? JOY_CONFIG_VERSION : mode === 'flow' ? GENERATOR_CONFIG_VERSION : 1,
    seed,
    board: createEmptyBoard(),
    ...generated,
    score: 0,
    clearStreak: 0,
    statistics: { ...EMPTY_STATISTICS },
    ...(mode === 'joy' ? { round: { index: 1, id: `${gameId}:round:1`, target: ROUND_TARGET, baselineLines: 0, won: false }, discardedPieces: 0 } : {}),
    startingBestScore,
    status: 'active',
    moveCount: 0,
    revision: 0
  };
}
function immutable(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}
export function resolvePlacement(game, command, generate = null) {
  if (!game || !command || game.status !== 'active' || game.gameId !== command.gameId || game.revision !== command.revision) return null;
  const slot = game.tray.findIndex(piece => piece?.instanceId === command.pieceId);
  if (slot < 0) return null;
  const piece = game.tray[slot],
    shape = getShapeById(piece.shapeId);
  const {
    anchorRow: row,
    anchorColumn: col
  } = command;
  const simulated = simulateMove(game.board, shape, { row, col }, piece.colourId);
  if (!simulated) return null;
  const { placed, afterPlacement, completedLines, cleared, board, points } = simulated;
  const tray = game.tray.map((piece, i) => i === slot ? null : piece);
  const refill = tray.every(piece => piece === null) ? (generate ? generate(game.rngState, game.nextPieceId, board) : game.mode === 'joy' ? generateJoyState(board, game.rngState, game.nextPieceId, game.recentShapes, game.recentCategories) : generateModeTray(board, game.rngState, game.nextPieceId, game.mode, game.recentShapes, game.generatorVersion)) : {
    tray,
    rngState: game.rngState,
    nextPieceId: game.nextPieceId
  };
  const lineCount = completedLines.rows.length + completedLines.columns.length;
  const allClear = cleared.length > 0 && board.flat().every(c => c === null);
  const statistics = { ...EMPTY_STATISTICS, ...game.statistics };
  statistics.linesCleared += lineCount;
  statistics.largestBurst = Math.max(statistics.largestBurst, lineCount);
  statistics.largestPiece = Math.max(statistics.largestPiece, shape.cells.length);
  statistics.allClears += allClear ? 1 : 0;
  const roundWon = game.mode === 'joy' && !game.round.won && statistics.linesCleared >= game.round.baselineLines + game.round.target;
  if (roundWon) statistics.roundsWon++;
  const movesRemain = hasAnyLegalMove(board, refill.tray);
  const finalGame = {
    ...game,
    ...refill,
    board,
    score: game.score + points.total,
    clearStreak: cleared.length ? (game.clearStreak ?? 0) + 1 : 0,
    revision: game.revision + 1,
    moveCount: game.moveCount + 1,
    statistics,
    ...(game.mode === 'joy' ? { round: { ...game.round, won: game.round.won || roundWon } } : {}),
    status: roundWon ? 'roundWon' : movesRemain ? 'active' : game.mode === 'joy' ? 'recovery' : 'gameOver'
  };
  return {
    game: finalGame,
    result: immutable({
      allClear, roundWon,
      clearStreak: finalGame.clearStreak,
      gameOver: finalGame.status === 'gameOver',
      record: finalGame.score > game.startingBestScore && game.score <= game.startingBestScore,
      token: `${game.gameId}:${finalGame.revision}`,
      placed,
      completedLines,
      cleared,
      points,
      snapshots: {
        before: game.board,
        afterPlacement,
        final: board
      }
    })
  };
}

export function continueJoyRound(game, command) {
  if (!game || game.mode !== 'joy' || game.status !== 'roundWon' || !matchesGame(game, command) || command.roundId !== game.round.id) return null;
  const index = game.round.index + 1;
  return { ...game, revision: game.revision + 1, round: { index, id: `${game.gameId}:round:${index}`, target: ROUND_TARGET, baselineLines: game.statistics.linesCleared, won: false }, status: hasAnyLegalMove(game.board, game.tray) ? 'active' : 'recovery' };
}
function matchesGame(game, command) { return command && command.gameId === game.gameId && command.revision === game.revision; }
export function recoverJoyGame(game, command) {
  if (!game || game.mode !== 'joy' || game.status !== 'recovery' || !matchesGame(game, command)) return null;
  const generated = generateRecoveryPieces(game); if (!generated) return null;
  return { ...game, ...generated, discardedPieces: game.discardedPieces + game.tray.filter(Boolean).length, statistics: { ...game.statistics, recoveries: game.statistics.recoveries + 1 }, revision: game.revision + 1, status: hasAnyLegalMove(game.board, generated.tray) ? 'active' : 'recovery' };
}
