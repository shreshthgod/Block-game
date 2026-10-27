export const BOARD_SIZE = 8;
export const SIZE = BOARD_SIZE; // Existing imports share the single definition.
export const SCHEMA_VERSION = 3;
export const RULES_VERSION = 2;
export const COLOURS = ['#2DD4E7', '#A855F7', '#FF9B3D', '#F55370', '#4388FF', '#72D94C', '#FFD34D'];
export const COLOUR_NAMES = ['cyan', 'purple', 'orange', 'pink', 'blue', 'green', 'yellow'];
export const DEFAULT_PROFILE = Object.freeze({
  schemaVersion: 3,
  bestScore: 0, // Classic 8 × 8 compatibility alias.
  bestScores: { classic: 0, flow: 0, joy: 0 },
  legacyBestScore: 0,
  stats: { roundsWon: 0, linesCleared: 0, largestBurst: 0, allClears: 0, largestPiece: 0, recoveries: 0 },
  progressLedger: {},
  selectedMode: 'joy',
  theme: 'candy-carnival',
  rotateTheme: false,
  soundEnabled: true,
  effectsEnabled: true,
  voiceEnabled: true,
  effectsVolume: .65,
  voiceVolume: .8,
  motionMode: 'auto',
  tutorialDismissed: false
});
export const STORAGE_KEYS = {
  PROFILE: 'prismNine.profile.v3',
  GAME: 'prismNine.game.v3'
};

export const MODES = ['classic', 'flow', 'joy'];
export const GENERATOR_VERSION = 2;
export const GENERATOR_CONFIG_VERSION = 2;

export const ROUND_TARGET = 12;
export const JOY_RULES_VERSION = 3;
export const EMPTY_STATISTICS = Object.freeze({ roundsWon: 0, linesCleared: 0, largestBurst: 0, allClears: 0, largestPiece: 0, recoveries: 0 });

export const JOY_GENERATOR_VERSION = 3;
export const JOY_CONFIG_VERSION = 3;
