import { describe, it, expect } from 'vitest';
import { rootReducer } from './reducer.js';
import { readBootstrap } from './storage.js';
const start = () => rootReducer(readBootstrap({
  getItem: () => null
}), {
  type: 'START_NEW_GAME',
  seed: 1,
  gameId: 'game-one'
});
const cmd = state => ({
  gameId: state.game.gameId,
  revision: state.game.revision,
  pieceId: state.game.tray[0].instanceId,
  anchorRow: 0,
  anchorColumn: 0
});
describe('authoritative root transitions', () => {
  it('is pure and rejects commands while on home or paused; stale commands during effects', () => {
    const state = start(),
      action = {
        type: 'PLACE_PIECE',
        command: cmd(state)
      };
    expect(rootReducer(state, action)).toEqual(rootReducer(state, action));
    const home = rootReducer(state, {
      type: 'GO_HOME'
    });
    expect(rootReducer(home, action)).toBe(home);
    const paused = rootReducer(state, {
      type: 'OPEN_MODAL',
      modal: 'pause'
    });
    expect(rootReducer(paused, action)).toBe(paused);
    const next = rootReducer(state, action);
    expect(rootReducer(next, action)).toBe(next);
    expect(next.profile.bestScores.joy).toBe(next.game.score);
    expect(next.game.startingBestScore).toBe(0);
  });
  it('tokens only complete matching presentation and cannot affect restarted games', () => {
    const state = start(),
      resolved = rootReducer(state, {
        type: 'PLACE_PIECE',
        command: cmd(state)
      });
    expect(rootReducer(resolved, {
      type: 'COMPLETE_RESOLUTION',
      token: 'old'
    })).toBe(resolved);
    expect(rootReducer(resolved, {
      type: 'COMPLETE_RESOLUTION',
      token: resolved.pendingResolution.token
    }).pendingResolution).toBeNull();
    const configured = rootReducer(rootReducer(resolved, {
      type: 'SET_SOUND',
      enabled: false
    }), {
      type: 'SET_MOTION',
      mode: 'reduced'
    });
    const restarted = rootReducer(configured, {
      type: 'CONFIRM_RESTART',
      seed: 9,
      gameId: 'game-two'
    });
    expect(restarted.game.score).toBe(0);
    expect(restarted.game.board.flat().every(c => c === null)).toBe(true);
    expect(restarted.profile).toEqual(configured.profile);
    expect(restarted.game.startingBestScore).toBe(configured.profile.bestScores[restarted.game.mode]);
    expect(rootReducer(restarted, {
      type: 'PLACE_PIECE',
      command: cmd(state)
    })).toBe(restarted);
    expect(rootReducer(restarted, {
      type: 'COMPLETE_RESOLUTION',
      token: resolved.pendingResolution.token
    })).toBe(restarted);
  });
  it('confirms active replacement, preserves progress at home, and backgrounding pauses', () => {
    const state = start();
    const home = rootReducer(state, {
      type: 'GO_HOME'
    });
    expect(home.game).toBe(state.game);
    const confirm = rootReducer(home, {
      type: 'START_NEW_GAME',
      seed: 2,
      gameId: 'other'
    });
    expect(confirm.activeModal.type).toBe('restart');
    expect(confirm.game).toBe(state.game);
    const background = rootReducer(state, {
      type: 'BACKGROUND'
    });
    expect(background.activeModal.type).toBe('pause');
    expect(background.game).toBe(state.game);
  });
});
