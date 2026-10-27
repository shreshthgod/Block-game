import { reconcileProgress } from './progress.js';
import { THEMES } from '../themes.js';
import { createNewGame, resolvePlacement, recoverJoyGame, continueJoyRound } from './engine.js';
export function rootReducer(state, action) {
  switch (action.type) {
    case 'START_NEW_GAME':
    case 'CONFIRM_RESTART':
      {
        if (!Number.isInteger(action.seed) || action.seed < 0 || action.seed > 0xffffffff || typeof action.gameId !== 'string' || !action.gameId) return state;
        if (action.type === 'START_NEW_GAME' && ((state.game && state.game.status !== 'gameOver') || state.legacyGame)) return {
          ...state,
          activeModal: {
            type: 'restart',
            returnTo: null
          },
          pendingResolution: null
        };
        const selectedMode = state.screen === 'game' ? state.game?.mode : state.profile.selectedMode;
        const mode = selectedMode === 'flow' ? 'joy' : selectedMode ?? 'joy';
        return {
          ...state,
          game: createNewGame(action.seed, action.gameId, state.profile.bestScores?.[mode] ?? 0, mode),
          legacyGame: null,
          profile: { ...state.profile, theme: state.profile.rotateTheme && THEMES.some(t => t.id === action.theme) ? action.theme : state.profile.theme },
          screen: 'game',
          activeModal: null,
          pendingResolution: null
        };
      }
    case 'CONTINUE_GAME':
      return state.game && state.game.status !== 'gameOver' ? {
        ...state,
        screen: 'game',
        activeModal: null,
        pendingResolution: null
      } : state;
    case 'PLACE_PIECE':
      {
        if (state.screen !== 'game' || state.activeModal) return state;
        const resolved = resolvePlacement(state.game, action.command);
        return resolved ? {
          ...state,
          game: resolved.game,
          profile: reconcileProgress({
            ...state.profile,
            bestScore: resolved.game.mode === 'classic' ? Math.max(state.profile.bestScore, resolved.game.score) : state.profile.bestScore,
            bestScores: { ...state.profile.bestScores, [resolved.game.mode]: Math.max(state.profile.bestScores?.[resolved.game.mode] ?? 0, resolved.game.score) }
          }, resolved.game),
          pendingResolution: resolved.result
        } : state;
      }
    case 'RECOVER_PIECES':
    case 'CONTINUE_ROUND': {
      if (state.screen !== 'game' || state.activeModal) return state;
      const game = action.type === 'RECOVER_PIECES' ? recoverJoyGame(state.game, action.command) : continueJoyRound(state.game, action.command);
      return game ? { ...state, game, profile: reconcileProgress(state.profile, game), pendingResolution: null } : state;
    }
    case 'COMPLETE_RESOLUTION':
      return state.pendingResolution?.token === action.token ? {
        ...state,
        pendingResolution: null
      } : state;
    case 'OPEN_MODAL':
      if (!['pause', 'settings', 'help', 'restart', 'collection'].includes(action.modal)) return state;
      return {
        ...state,
        pendingResolution: null,
        activeModal: {
          type: action.modal,
          returnTo: state.activeModal?.type === 'pause' ? 'pause' : null
        }
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        activeModal: state.activeModal?.returnTo ? {
          type: state.activeModal.returnTo,
          returnTo: null
        } : null
      };
    case 'GO_HOME':
      return {
        ...state,
        screen: 'home',
        activeModal: null,
        pendingResolution: null
      };
    case 'BACKGROUND':
      return state.screen === 'game' && state.game && state.game.status !== 'gameOver' ? {
        ...state,
        pendingResolution: null,
        activeModal: state.activeModal || {
          type: 'pause',
          returnTo: null
        }
      } : {
        ...state,
        pendingResolution: null
      };
    case 'SET_MODE':
      return ['joy', 'classic'].includes(action.mode) ? { ...state, profile: { ...state.profile, selectedMode: action.mode } } : state;
    case 'SET_THEME':
      return THEMES.some(t => t.id === action.theme) ? { ...state, profile: { ...state.profile, theme: action.theme } } : state;
    case 'SET_THEME_ROTATION':
      return typeof action.enabled === 'boolean' ? { ...state, profile: { ...state.profile, rotateTheme: action.enabled } } : state;
    case 'SET_AUDIO_OPTION': {
      const bool = ['effectsEnabled', 'voiceEnabled'].includes(action.key) && typeof action.value === 'boolean';
      const volume = ['effectsVolume', 'voiceVolume'].includes(action.key) && Number.isFinite(action.value) && action.value >= 0 && action.value <= 1;
      return bool || volume ? { ...state, profile: { ...state.profile, [action.key]: action.value } } : state;
    }
    case 'SET_SOUND':
      return typeof action.enabled === 'boolean' ? {
        ...state,
        profile: {
          ...state.profile,
          soundEnabled: action.enabled
        }
      } : state;
    case 'SET_MOTION':
      return ['auto', 'reduced'].includes(action.mode) ? {
        ...state,
        profile: {
          ...state.profile,
          motionMode: action.mode
        }
      } : state;
    case 'DISMISS_TUTORIAL':
      return {
        ...state,
        profile: {
          ...state.profile,
          tutorialDismissed: true
        }
      };
    default:
      return state;
  }
}
