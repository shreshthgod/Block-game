import { COLOURS, DEFAULT_PROFILE, RULES_VERSION, SCHEMA_VERSION, STORAGE_KEYS, SIZE, MODES, EMPTY_STATISTICS, JOY_RULES_VERSION, ROUND_TARGET } from './constants.js';
import { findCompletedLines, hasAnyLegalMove } from './engine.js';
import { shapeCategory } from './joy.js';
import { reconcileProgress } from './progress.js';
import { THEMES } from '../themes.js';
import { getShapeById } from './shapes.js';
export { STORAGE_KEYS } from './constants.js';
const counter = value => Number.isSafeInteger(value) && value >= 0;
export function validateStatistics(data) {
  if (!data || !Object.keys(EMPTY_STATISTICS).every(k => counter(data[k])) || data.largestBurst > SIZE * 2 || data.largestPiece > 9 || data.allClears > data.linesCleared || data.roundsWon * ROUND_TARGET > data.linesCleared) return null;
  return Object.fromEntries(Object.keys(EMPTY_STATISTICS).map(k => [k, data[k]]));
}
const colour = value => Number.isInteger(value) && value >= 0 && value < COLOURS.length;
export function validateSavedProfile(data) {
  if (!data || ![1, 2, SCHEMA_VERSION].includes(data.schemaVersion) || !counter(data.bestScore) || typeof data.soundEnabled !== 'boolean' || !['auto', 'reduced'].includes(data.motionMode) || typeof data.tutorialDismissed !== 'boolean') return null;
  if (['effectsEnabled', 'voiceEnabled'].some(k => data[k] !== undefined && typeof data[k] !== 'boolean') || ['effectsVolume', 'voiceVolume'].some(k => data[k] !== undefined && (!Number.isFinite(data[k]) || data[k] < 0 || data[k] > 1))) return null;
  const legacy = data.schemaVersion === 1;
  if (!legacy && (!data.bestScores || !['classic', 'flow'].every(mode => counter(data.bestScores[mode])) || (data.bestScores.joy !== undefined && !counter(data.bestScores.joy)) || !counter(data.legacyBestScore) || !MODES.includes(data.selectedMode) || (data.theme !== undefined && !THEMES.some(t => t.id === data.theme)) || (data.rotateTheme !== undefined && typeof data.rotateTheme !== 'boolean'))) return null;
  const stats = data.stats === undefined && data.schemaVersion < 3 ? { ...EMPTY_STATISTICS } : validateStatistics(data.stats);
  if (!stats) return null;
  const ledger = data.progressLedger ?? {};
  if (typeof ledger !== 'object' || Array.isArray(ledger) || Object.entries(ledger).some(([id, stats]) => !/^[a-zA-Z0-9:_-]{1,120}$/.test(id) || !validateStatistics(stats))) return null;
  const classic = legacy ? 0 : Math.max(data.bestScores.classic, data.bestScore);
  return {
    ...DEFAULT_PROFILE,
    bestScore: classic,
    bestScores: { classic, flow: legacy ? 0 : data.bestScores.flow, joy: legacy ? 0 : data.bestScores.joy ?? 0 },
    stats, progressLedger: Object.fromEntries(Object.entries(ledger).map(([id, stats]) => [id, validateStatistics(stats)])),
    legacyBestScore: legacy ? data.bestScore : data.legacyBestScore,
    soundEnabled: data.soundEnabled, motionMode: data.motionMode, tutorialDismissed: data.tutorialDismissed,
    selectedMode: data.selectedMode === 'classic' ? 'classic' : 'joy',
    theme: THEMES.some(t => t.id === data.theme) ? data.theme : data.schemaVersion < 3 ? 'prism-neon' : DEFAULT_PROFILE.theme,
    rotateTheme: legacy ? false : data.rotateTheme ?? false,
    effectsEnabled: data.effectsEnabled ?? data.soundEnabled,
    voiceEnabled: data.voiceEnabled ?? false,
    effectsVolume: data.effectsVolume ?? .65,
    voiceVolume: data.voiceVolume ?? .8
  };
}
export function validateLegacyGame(data) { return validateGame(data, true); }
export function validateSavedGame(data) { return validateGame(data, false); }
function validateGame(data, legacy) {
  if (!data || !(legacy ? [1] : [2, SCHEMA_VERSION]).includes(data.schemaVersion) || data.rulesVersion !== (legacy ? 1 : data.mode === 'joy' ? JOY_RULES_VERSION : RULES_VERSION) || typeof data.gameId !== 'string' || !/^[a-zA-Z0-9:_-]{1,120}$/.test(data.gameId)) return null;
  const size = legacy ? 9 : SIZE;
  if (!legacy && (data.boardSize !== SIZE || !MODES.includes(data.mode) || !(data.mode === 'joy' ? [3] : [1, 2]).includes(data.generatorVersion) || data.configVersion !== data.generatorVersion || (data.mode === 'classic' && data.generatorVersion !== 1) || !counter(data.seed) || data.seed > 0xffffffff || !Array.isArray(data.recentShapes) || data.recentShapes.length > 6 || data.recentShapes.some(id => !Number.isInteger(id) || (!getShapeById(id) || (data.mode !== 'joy' && id >= 25))))) return null;
  if (!Array.isArray(data.board) || data.board.length !== size || data.board.some(row => !Array.isArray(row) || row.length !== size || row.some(cell => cell !== null && !colour(cell)))) return null;
  if (!(data.mode === 'joy' ? ['active', 'recovery', 'roundWon'] : ['active', 'gameOver']).includes(data.status) || !['score', 'startingBestScore', 'moveCount', 'revision', 'nextPieceId', 'rngState'].every(key => counter(data[key]))) return null;
  if (data.clearStreak !== undefined && (!counter(data.clearStreak) || data.clearStreak > data.moveCount)) return null;
  if (data.rngState > 0xffffffff || (data.mode !== 'joy' && data.revision !== data.moveCount) || data.nextPieceId < 4 || (data.mode !== 'joy' && (data.nextPieceId - 1) % 3 !== 0)) return null;
  if (!Array.isArray(data.tray) || data.tray.length !== 3 || data.tray.every(piece => piece === null)) return null;
  const ids = new Set();
  for (const piece of data.tray) {
    if (piece === null) continue;
    if (!piece || !Number.isInteger(piece.shapeId) || !getShapeById(piece.shapeId) || (data.mode !== 'joy' && piece.shapeId >= 25) || !colour(piece.colourId) || typeof piece.instanceId !== 'string' || !/^p-[1-9]\d*$/.test(piece.instanceId) || ids.has(piece.instanceId)) return null;
    const n = Number(piece.instanceId.slice(2));
    if (!Number.isSafeInteger(n) || n >= data.nextPieceId || n < data.nextPieceId - 3) return null;
    ids.add(piece.instanceId);
  }
  if (!legacy && data.recentShapes.length !== (data.mode !== 'classic' ? Math.min(6, data.nextPieceId - 1) : 0)) return null;
  const consumed = data.tray.filter(piece => piece === null).length;
  const statistics = legacy ? null : data.statistics === undefined && data.schemaVersion === 2 ? { ...EMPTY_STATISTICS } : validateStatistics(data.statistics);
  if (!legacy && !statistics) return null;
  if (data.mode === 'joy') {
    const r = data.round;
    if (statistics.allClears > data.moveCount || statistics.linesCleared > data.moveCount * SIZE * 2 || data.discardedPieces < statistics.recoveries || data.discardedPieces > statistics.recoveries * 3) return null;
    if (data.schemaVersion !== SCHEMA_VERSION || !r || !counter(r.index) || r.index < 1 || r.id !== `${data.gameId}:round:${r.index}` || r.target !== ROUND_TARGET || !counter(r.baselineLines) || typeof r.won !== 'boolean' || r.baselineLines > statistics.linesCleared || (r.index === 1 && r.baselineLines !== 0) || r.baselineLines < (r.index - 1) * ROUND_TARGET || r.won !== (statistics.linesCleared >= r.baselineLines + r.target)) return null;
    if (statistics.roundsWon !== r.index - 1 + (r.won ? 1 : 0) || data.revision !== data.moveCount + statistics.recoveries + r.index - 1 || !counter(data.discardedPieces) || data.moveCount + (3 - consumed) + data.discardedPieces !== data.nextPieceId - 1) return null;
    if (typeof data.trayVerified !== 'boolean' || !Array.isArray(data.recentCategories) || data.recentCategories.length !== data.recentShapes.length || data.recentCategories.some((c, i) => c !== shapeCategory(getShapeById(data.recentShapes[i])))) return null;
  } else if (data.moveCount !== data.nextPieceId - 4 + consumed) return null;
  const lines = legacy ? { rows: data.board.filter(row => row.every(c => c !== null)), columns: Array.from({ length: size }, (_, c) => c).filter(c => data.board.every(row => row[c] !== null)) } : findCompletedLines(data.board);
  if (lines.rows.length || lines.columns.length) return null;
  if (legacy) return JSON.parse(JSON.stringify(data));
  return {
    boardSize: SIZE, mode: data.mode, generatorVersion: data.generatorVersion, configVersion: data.configVersion,
    seed: data.seed, recentShapes: [...data.recentShapes],
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: data.rulesVersion,
    statistics,
    ...(data.mode === 'joy' ? { round: { index: data.round.index, id: data.round.id, target: data.round.target, baselineLines: data.round.baselineLines, won: data.round.won }, discardedPieces: data.discardedPieces, recentCategories: [...data.recentCategories], trayVerified: data.trayVerified } : {}),
    gameId: data.gameId,
    board: data.board.map(row => [...row]),
    tray: data.tray.map(piece => piece ? {
      instanceId: piece.instanceId,
      shapeId: piece.shapeId,
      colourId: piece.colourId
    } : null),
    score: data.score,
    clearStreak: data.clearStreak ?? 0,
    startingBestScore: data.startingBestScore,
    moveCount: data.moveCount,
    revision: data.revision,
    nextPieceId: data.nextPieceId,
    rngState: data.rngState,
    status: data.mode === 'joy' && data.round.won ? 'roundWon' : hasAnyLegalMove(data.board, data.tray) ? 'active' : data.mode === 'joy' ? 'recovery' : 'gameOver'
  };
}
export function readBootstrap(storage) {
  let saveUnavailable = false;
  const read = key => {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    } catch {
      saveUnavailable = true;
      return null;
    }
  };
  let profile = validateSavedProfile(read(STORAGE_KEYS.PROFILE)) || validateSavedProfile(read('prismNine.profile.v2')) || validateSavedProfile(read('prismNine.profile.v1')) || {
    ...DEFAULT_PROFILE, bestScores: { ...DEFAULT_PROFILE.bestScores }, stats: { ...EMPTY_STATISTICS }, progressLedger: {}
  };
  const game = validateSavedGame(read(STORAGE_KEYS.GAME)) || validateSavedGame(read('prismNine.game.v2'));
  const legacyGame = game ? null : validateLegacyGame(read('prismNine.game.v1'));
  if (legacyGame) profile.legacyBestScore = Math.max(profile.legacyBestScore, legacyGame.score, legacyGame.startingBestScore);
  if (game) {
    profile.bestScores = { ...profile.bestScores, [game.mode]: Math.max(profile.bestScores[game.mode], game.score, game.startingBestScore) };
    profile.bestScore = profile.bestScores.classic;
    profile = reconcileProgress(profile, game);
  }
  return {
    profile,
    game,
    legacyGame,
    screen: 'home',
    activeModal: null,
    pendingResolution: null,
    saveUnavailable
  };
}
export function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export function writeSnapshot(storage, profile, game) {
  const serializedProfile = validateSavedProfile(profile);
  const serializedGame = game ? validateSavedGame(game) : null;
  let ok = !!serializedProfile && (!game || !!serializedGame);
  for (const [key, value] of [[STORAGE_KEYS.PROFILE, serializedProfile], [STORAGE_KEYS.GAME, serializedGame]]) {
    if (!value) continue;
    try {
      const json = JSON.stringify(value);
      if (storage.getItem(key) !== json) storage.setItem(key, json);
    } catch {
      ok = false;
    }
  }
  // Retire obsolete authoritative keys only after a replacement was successfully saved.
  if (ok && game && storage?.removeItem) {
    try {
      const legacy = storage.getItem('prismNine.game.v1');
      if (legacy) storage.setItem('prismNine.legacy9.game.v1', legacy);
      storage.removeItem('prismNine.game.v1');
      storage.removeItem('prismNine.profile.v1');
      const previous = storage.getItem('prismNine.game.v2');
      if (previous) storage.setItem('prismNine.archive.game.v2', previous);
      storage.removeItem('prismNine.game.v2'); storage.removeItem('prismNine.profile.v2');
    } catch { ok = false; }
  }
  return ok;
}
