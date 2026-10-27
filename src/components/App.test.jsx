import { StrictMode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameProvider } from '../context/GameProvider.jsx';
import App from '../App.jsx';
import { readBootstrap, writeSnapshot } from '../game/storage.js';
import { createNewGame } from '../game/engine.js';
import { activeObservers } from '../test/setup.js';
const saved = () => JSON.parse(localStorage.getItem('prismNine.game.v3'));
function mount({
  home = false,
  over = false
} = {}) {
  const state = readBootstrap(localStorage);
  state.profile.motionMode = 'reduced';
  state.profile.bestScore = 100;
  state.profile.bestScores.classic = 100;
  state.game = createNewGame(123, 'component-test', 100);
  state.game.tray = state.game.tray.map(p => ({
    ...p,
    shapeId: 0
  }));
  if (over) {
    state.game.status = 'gameOver';
    state.game.score = 150;
  }
  state.screen = home ? 'home' : 'game';
  const result = render(<StrictMode><GameProvider initialState={state} storage={localStorage}><App /></GameProvider></StrictMode>);
  return {
    ...result,
    user: userEvent.setup()
  };
}
async function selectPlace(user, slot, row, col) {
  await user.click(screen.getByRole('button', {
    name: new RegExp(`^Piece ${slot}:`)
  }));
  await user.click(screen.getByRole('gridcell', {
    name: new RegExp(`^Row ${row}, column ${col},`)
  }));
  await user.click(screen.getByRole('button', {
    name: /^Place/
  }));
  await waitFor(() => expect(document.querySelector('.feedback')).not.toBeInTheDocument());
}
describe('connected StrictMode experience', () => {
  it('starts a new game from Home and renders exactly 64 cells', async () => {
    const state = readBootstrap(localStorage),
      user = userEvent.setup();
    render(<StrictMode><GameProvider initialState={state} storage={localStorage}><App /></GameProvider></StrictMode>);
    await user.click(screen.getByRole('button', {
      name: 'New Game'
    }));
    expect(screen.getAllByRole('gridcell')).toHaveLength(64);
    expect(screen.getAllByRole('row')).toHaveLength(8);
    expect(screen.getAllByRole('button', {
      name: /^Piece/
    })).toHaveLength(3);
    expect(saved().score).toBe(0);
  });
  it('selects, previews, places, consumes stable slots, refills once, and awards once', async () => {
    const {
      user
    } = mount();
    const original = saved();
    await selectPlace(user, 2, 2, 3);
    expect(saved().score).toBe(10);
    expect(saved().board[1][2]).toBe(original.tray[1].colourId);
    expect(saved().tray[1]).toBeNull();
    expect(saved().tray[0]).toEqual(original.tray[0]);
    await selectPlace(user, 1, 1, 1);
    expect(saved().tray[0]).toBeNull();
    expect(saved().nextPieceId).toBe(4);
    await selectPlace(user, 3, 3, 3);
    expect(saved().score).toBe(30);
    expect(saved().revision).toBe(3);
    expect(saved().nextPieceId).toBe(7);
    expect(saved().tray.every(Boolean)).toBe(true);
  });
  it('keyboard arrows and Enter place at the chosen anchor; Escape cancels', async () => {
    const {
      user
    } = mount();
    const piece = screen.getByRole('button', {
      name: /^Piece 1:/
    });
    piece.focus();
    await user.keyboard('{Enter}');
    const cell = screen.getByRole('gridcell', {
      name: /^Row 1, column 1,/
    });
    cell.focus();
    await user.keyboard('{ArrowRight}{ArrowDown}{Enter}');
    await waitFor(() => expect(saved().revision).toBe(1));
    expect(saved().board[1][1]).not.toBeNull();
    await waitFor(() => expect(document.querySelector('.feedback')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', {
      name: /^Piece 2:/
    }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', {
      name: 'Cancel'
    })).not.toBeInTheDocument();
  });
  it('pause/settings gate input, trap focus, update preferences, and restore focus', async () => {
    const {
      user
    } = mount();
    const pause = screen.getByRole('button', {
      name: 'Pause'
    });
    await user.click(pause);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('A moment to pause.');
    expect(document.querySelector('main').inert).toBe(true);
    const before = localStorage.getItem('prismNine.game.v3');
    fireEvent.click(screen.getAllByRole('gridcell')[0]);
    expect(localStorage.getItem('prismNine.game.v3')).toBe(before);
    await user.keyboard('{Escape}');
    expect(pause).toHaveFocus();
    const settings = screen.getByRole('button', {
      name: 'Settings'
    });
    await user.click(settings);
    await user.click(screen.getByRole('switch', {
      name: 'Sound'
    }));
    await user.click(screen.getByLabelText('Auto'));
    expect(JSON.parse(localStorage.getItem('prismNine.profile.v3'))).toMatchObject({
      soundEnabled: false,
      motionMode: 'auto'
    });
    const done = screen.getByRole('button', {
      name: /Done/
    });
    done.focus();
    await user.tab();
    expect(screen.getByRole('button', {
      name: 'Close dialog'
    })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(settings).toHaveFocus();
  });
  it('confirms restart, preserves best/settings, and resumes after cancelling', async () => {
    const {
      user
    } = mount();
    await selectPlace(user, 1, 1, 1);
    await user.click(screen.getByRole('button', {
      name: 'Pause'
    }));
    await user.click(screen.getByRole('button', {
      name: 'Restart'
    }));
    await user.click(screen.getByRole('button', {
      name: 'Keep playing'
    }));
    expect(screen.getByRole('button', {
      name: 'Resume'
    })).toBeInTheDocument();
    await user.click(screen.getByRole('button', {
      name: 'Restart'
    }));
    const id = saved().gameId;
    await user.click(screen.getByRole('button', {
      name: 'Start new game'
    }));
    expect(saved().gameId).not.toBe(id);
    expect(saved().score).toBe(0);
    expect(saved().board.flat().every(x => x === null)).toBe(true);
    expect(saved().startingBestScore).toBe(100);
  });
  it('finished games replay directly and show the final board behind the overlay', async () => {
    const {
      user
    } = mount({
      over: true
    });
    expect(screen.getByText('No remaining pieces fit.')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(64);
    await user.click(screen.getByRole('button', {
      name: 'Play Again'
    }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saved().score).toBe(0);
  });
  it('restores the exact board, tray, score and generator and preserves Home progress', async () => {
    const game = createNewGame(42, 'restored', 80);
    game.board[4][4] = 3;
    game.score = 40;
    writeSnapshot(localStorage, {
      schemaVersion: 1,
      bestScore: 80,
      soundEnabled: false,
      motionMode: 'reduced',
      tutorialDismissed: true
    }, game);
    const bootstrap = readBootstrap(localStorage),
      user = userEvent.setup();
    render(<GameProvider initialState={bootstrap} storage={localStorage}><App /></GameProvider>);
    await user.click(screen.getByRole('button', {
      name: 'Continue game'
    }));
    expect(screen.getByRole('gridcell', {
      name: 'Row 5, column 5, occupied block'
    })).toBeInTheDocument();
    expect(saved()).toEqual(game);
    await user.click(screen.getByRole('button', {
      name: 'Home'
    }));
    expect(screen.getByRole('button', {
      name: 'Continue game'
    })).toBeInTheDocument();
    await user.click(screen.getByRole('button', {
      name: 'New Game'
    }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(saved()).toEqual(game);
  });
  it('cleans up and recreates subscriptions across StrictMode remounts', () => {
    const baseline = activeObservers.size;
    for (let n = 0; n < 3; n++) {
      const view = mount();
      expect(activeObservers.size).toBe(baseline + 1);
      view.unmount();
      expect(activeObservers.size).toBe(baseline);
    }
  });
  it('pauses and cancels selection on visibility changes', async () => {
    const {
      user
    } = mount();
    await user.click(screen.getByRole('button', {
      name: /^Piece 1:/
    }));
    const before = saved();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(saved()).toEqual(before);
    hidden.mockRestore();
    expect(within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Resume'
    })).toBeInTheDocument();
  });
});
it('saves the authoritative cleared board during normal feedback, not the visible placed snapshot', async () => {
  const state = readBootstrap(localStorage);
  state.game = createNewGame(42, 'clear-save', 0);
  state.screen = 'game';
  state.profile.motionMode = 'auto';
  state.game.tray[0] = {
    ...state.game.tray[0],
    shapeId: 0,
    colourId: 0
  };
  for (let n = 1; n < 8; n++) {
    state.game.board[0][n] = 0;
    state.game.board[n][0] = 2;
  }
  const user = userEvent.setup();
  const view = render(<StrictMode><GameProvider initialState={state} storage={localStorage}><App /></GameProvider></StrictMode>);
  await user.click(screen.getByRole('button', {
    name: /^Piece 1:/
  }));
  await user.click(screen.getByRole('gridcell', {
    name: /^Row 1, column 1,/
  }));
  await user.click(screen.getByRole('button', {
    name: /^Place/
  }));
  expect(document.querySelector('.resolution-effects')).toBeInTheDocument();
  expect(document.querySelectorAll('.clear-particle')).toHaveLength(15);
  expect(saved().score).toBe(310);
  expect(saved().board.flat().every(cell => cell === null)).toBe(true);
  expect(readBootstrap(localStorage).game).toEqual(saved());
  await user.click(screen.getByRole('button', {
    name: 'Pause'
  }));
  expect(document.querySelector('.resolution-effects')).not.toBeInTheDocument();
  expect(document.querySelectorAll('.board-cell[data-value=""]')).toHaveLength(64);
  view.unmount();
});
it('keyboard focus visits all 64 cells and clamps at the last row and column', () => {
  const view = mount();
  const grid = screen.getByRole('grid');
  screen.getAllByRole('gridcell')[0].focus();
  const reached = new Set();
  for (let row = 0; row < 8; row++) {
    if (row > 0) {
      for (let i = 0; i < 7; i++) fireEvent.keyDown(grid, { key: 'ArrowLeft' });
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
    }
    for (let col = 0; col < 8; col++) {
      if (col) fireEvent.keyDown(grid, { key: 'ArrowRight' });
      expect(document.activeElement.dataset.row).toBe(String(row));
      expect(document.activeElement.dataset.col).toBe(String(col));
      reached.add(`${row}:${col}`);
    }
  }
  fireEvent.keyDown(grid, { key: 'ArrowRight' }); fireEvent.keyDown(grid, { key: 'ArrowDown' });
  expect(document.activeElement).toHaveAttribute('data-row', '7');
  expect(document.activeElement).toHaveAttribute('data-col', '7');
  expect(reached.size).toBe(64);
  view.unmount();
});
it('all six appearance previews are 8 × 8 and switching themes preserves the complete game', async () => {
  const { user } = mount();
  const before = saved();
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  const themes = ['Candy Carnival', 'Ocean Pop', 'Neon Arcade', 'Sunset Fiesta', 'Forest Friends', 'Cosmic Prism'];
  for (const name of themes) {
    const button = screen.getByRole('button', { name });
    expect(button.querySelectorAll('.theme-mini i')).toHaveLength(64);
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveFocus();
    expect(saved()).toEqual(before);
    expect(readBootstrap(localStorage).game).toEqual(before);
  }
  await user.click(screen.getByLabelText('New look each game'));
  await user.click(screen.getByRole('button', { name: /Done/ }));
  await user.click(screen.getByRole('button', { name: 'Pause' }));
  await user.click(screen.getByRole('button', { name: 'Restart' }));
  await user.click(screen.getByRole('button', { name: 'Start new game' }));
  expect(JSON.parse(localStorage.getItem('prismNine.profile.v3')).theme).not.toBe('cosmic-prism');
  expect(saved().mode).toBe(before.mode);
});
it('supports in-memory placement with an accurate storage-failure notice', async () => {
  const storage = { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('quota'); } };
  const state = readBootstrap(storage);
  state.game = createNewGame(1, 'memory', 0, 'classic'); state.screen = 'game';
  state.game.tray[0] = { ...state.game.tray[0], shapeId: 0 };
  const user = userEvent.setup();
  render(<GameProvider initialState={state} storage={storage}><App /></GameProvider>);
  await user.click(screen.getByRole('button', { name: /^Piece 1:/ }));
  await user.click(screen.getByRole('gridcell', { name: /^Row 1, column 1,/ }));
  await user.click(screen.getByRole('button', { name: /^Place/ }));
  expect(screen.getByTestId('score')).toHaveTextContent('10');
  expect(screen.getByRole('gridcell', { name: /^Row 1, column 1,/ })).toHaveClass('tile');
  expect(document.querySelector('.storage-notice')).toHaveTextContent(/saving is unavailable/i);
});
