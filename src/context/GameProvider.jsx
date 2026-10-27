import { createContext, useContext, useMemo, useReducer, useEffect, useRef, useCallback } from 'react';
import { chooseNewTheme } from '../themes.js';
import { rootReducer } from '../game/reducer.js';
import { prepareNewGame } from '../game/commands.js';
import { useGamePersistence } from '../hooks/useGamePersistence.jsx';
import { useReducedMotion } from '../hooks/useReducedMotion.jsx';
import { useResolutionEffects } from '../hooks/useResolutionEffects.jsx';
import { useAnnouncer } from '../hooks/useAnnouncer.jsx';
import { useGameAudio } from '../hooks/useGameAudio.jsx';
import { useVisibilityPause } from '../hooks/useVisibilityPause.jsx';
const StateContext = createContext(null),
  CommandsContext = createContext(null);
export function GameProvider({
  initialState,
  storage,
  children
}) {
  const [state, dispatch] = useReducer(rootReducer, initialState);
  const themeRef = useRef(state.profile.theme);
  useEffect(() => { themeRef.current = state.profile.theme; }, [state.profile.theme]);
  const saveUnavailable = useGamePersistence(state.profile, state.game, storage, initialState.saveUnavailable);
  const reduced = useReducedMotion(state.profile.motionMode);
  useResolutionEffects(state.pendingResolution, reduced, dispatch);
  const paused = !!state.activeModal || state.screen !== 'game';
  const voice = useAnnouncer(state.profile, paused, state.game?.gameId, state.pendingResolution, state.game?.status === 'roundWon');
  const {
    activate: activateEffects,
    play,
    suspend
  } = useGameAudio(state.profile.soundEnabled && state.profile.effectsEnabled, paused, state.pendingResolution, state.game?.status, { volume: state.profile.effectsVolume, ducked: voice.speaking });
  const activateVoice = voice.activate, cancelVoice = voice.cancel, previewVoice = voice.preview;
  const activate = useCallback(() => { activateVoice(); activateEffects(); }, [activateVoice, activateEffects]);
  const suspendAll = useCallback(() => { cancelVoice(); suspend(); }, [cancelVoice, suspend]);
  useVisibilityPause(dispatch, suspendAll);
  const commands = useMemo(() => ({
    dispatch,
    newGame: () => {
      cancelVoice();
      activate();
      dispatch({
        type: 'START_NEW_GAME',
        ...prepareNewGame(),
        theme: chooseNewTheme(themeRef.current)
      });
    },
    restart: () => {
      cancelVoice();
      activate();
      dispatch({
        type: 'CONFIRM_RESTART',
        ...prepareNewGame(),
        theme: chooseNewTheme(themeRef.current)
      });
    },
    continueGame: () => {
      activate();
      dispatch({
        type: 'CONTINUE_GAME'
      });
    },
    openModal: modal => { cancelVoice(); dispatch({ type: 'OPEN_MODAL', modal }); },
    closeModal: () => {
      activate();
      dispatch({
        type: 'CLOSE_MODAL'
      });
    },
    home: () => { cancelVoice(); dispatch({ type: 'GO_HOME' }); },
    place: command => {
      activate();
      dispatch({
        type: 'PLACE_PIECE',
        command
      });
    },
    activateAudio: activate,
    playSound: play,
    previewVoice,
    recover: command => { activate(); dispatch({ type: 'RECOVER_PIECES', command }); },
    continueRound: command => { cancelVoice(); activate(); dispatch({ type: 'CONTINUE_ROUND', command }); }
  }), [activate, play, cancelVoice, previewVoice]);
  return <CommandsContext.Provider value={commands}><StateContext.Provider value={{
      ...state,
      saveUnavailable,
      reduced,
      voiceNotice: voice.notice
    }}>{children}</StateContext.Provider></CommandsContext.Provider>;
}
export function useGameState() {
  return useContext(StateContext);
}
export function useGameCommands() {
  return useContext(CommandsContext);
}
