import { test, expect } from '@playwright/test';
import { createNewGame, getLegalAnchors, resolvePlacement } from '../../src/game/engine.js';
import { SHAPE_CATALOGUE } from '../../src/game/shapes.js';
import { CORE_THEMES as THEMES } from '../../src/themes.js';
import { DEFAULT_PROFILE } from '../../src/game/constants.js';
function fixture(shapeId = 9) {
  const game = createNewGame(42, 'browser-fixture', 200);
  game.tray = game.tray.map((p, i) => ({
    ...p,
    shapeId: i === 0 ? shapeId : 0
  }));
  return game;
}
async function boot(page, game = fixture(), profile = {
  ...DEFAULT_PROFILE,
  motionMode: 'reduced',
  tutorialDismissed: true,
  bestScore: 200
}) {
  await page.addInitScript(({
    game,
    profile
  }) => {
    if (!sessionStorage.getItem('prism-test-boot')) {
      localStorage.setItem('prismNine.game.v3', JSON.stringify(game));
      localStorage.setItem('prismNine.profile.v3', JSON.stringify(profile));
      sessionStorage.setItem('prism-test-boot', 'yes');
    }
  }, {
    game,
    profile
  });
  await page.goto('/');
  await page.getByRole('button', {
    name: 'Continue game'
  }).click();
  await expect(page.getByRole('gridcell')).toHaveCount(64);
}
const snapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem('prismNine.game.v3')));
async function pickup(page, slot = 0) {
  const source = page.locator(`[data-slot="${slot}"] .piece-shape`),
    rect = await source.boundingBox();
  await page.mouse.move(rect.x + rect.width * .35, rect.y + rect.height * .4);
  await page.mouse.down();
  return {
    x: .35,
    y: .4
  };
}
async function targetFor(page, shape, anchor, grip, touch = false) {
  return page.locator('.board-grid').evaluate((grid, {
    shape,
    anchor,
    grip,
    touch
  }) => {
    // Independent geometry oracle: actual cell rectangles, including transformed gaps.
    const first = grid.querySelector('[data-row="0"][data-col="0"]').getBoundingClientRect();
    const nextX = grid.querySelector('[data-row="0"][data-col="1"]').getBoundingClientRect();
    const nextY = grid.querySelector('[data-row="1"][data-col="0"]').getBoundingClientRect();
    const pitchX = nextX.left - first.left,
      pitchY = nextY.top - first.top;
    const gapX = pitchX - first.width,
      gapY = pitchY - first.height;
    return {
      x: first.left + anchor.col * pitchX + grip.x * (shape.cols * first.width + (shape.cols - 1) * gapX),
      y: first.top + anchor.row * pitchY + grip.y * (shape.rows * first.height + (shape.rows - 1) * gapY) + (touch ? 48 : 0)
    };
  }, {
    shape,
    anchor,
    grip,
    touch
  });
}
const browserErrors = new WeakMap();
test.beforeEach(async ({
  page
}) => {
  const errors = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
});
test.afterEach(async ({
  page
}) => {
  expect(browserErrors.get(page)).toEqual([]);
});
for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1440, 900], [844, 390]]) {
  test(`responsive square board and dialogs at ${width} × ${height}`, async ({
    page
  }, testInfo) => {
    await page.setViewportSize({
      width,
      height
    });
    let game = createNewGame(853, 'visual-fixture', 500);
    for (let n = 0; n < 8 && game.status === 'active'; n++) {
      const slot = game.tray.findIndex(Boolean),
        p = game.tray[slot],
        shape = SHAPE_CATALOGUE[p.shapeId],
        anchors = getLegalAnchors(game.board, shape.cells);
      if (!anchors.length) break;
      const anchor = anchors[n * 17 % anchors.length];
      game = resolvePlacement(game, {
        gameId: game.gameId,
        revision: game.revision,
        pieceId: p.instanceId,
        anchorRow: anchor.row,
        anchorColumn: anchor.col
      }).game;
    }
    await boot(page, game);
    const board = await page.locator('.board-frame').boundingBox();
    expect(Math.abs(board.width - board.height)).toBeLessThan(1);
    expect(board.width).toBeLessThanOrEqual(480);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const pieces = page.locator('.tray-slot');
    await expect(pieces).toHaveCount(3);
    await page.screenshot({
      path: testInfo.outputPath(`game-${width}x${height}.png`),
      fullPage: true
    });
    await page.getByRole('button', {
      name: 'Settings',
      exact: true
    }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const dialog = await page.getByRole('dialog').boundingBox();
    expect(dialog.x).toBeGreaterThanOrEqual(0);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(width);
    expect(dialog.height).toBeLessThanOrEqual(height);
    await page.screenshot({
      path: testInfo.outputPath(`settings-${width}x${height}.png`)
    });
    const stable = await snapshot(page);
    for (const theme of THEMES) {
      const option = page.getByRole('button', { name: theme.name, exact: true });
      await expect(option.locator('.theme-mini i')).toHaveCount(64);
      await option.click();
      expect(await snapshot(page)).toEqual(stable);
      await page.getByRole('button', { name: /Done/ }).click();
      await expect(page.locator('.app')).toHaveAttribute('data-theme', theme.id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${theme.id}-${width}x${height}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', {
      name: 'Settings',
      exact: true
    })).toBeFocused();
  });
}
for (const [shapeId, row, col] of [[0, 0, 0], [9, 6, 6], [17, 0, 5], [21, 5, 6]]) {
  test(`mouse preview matches committed cells for shape ${shapeId} at edge ${row},${col}`, async ({
    page
  }) => {
    await boot(page, fixture(shapeId));
    const before = await snapshot(page),
      shape = SHAPE_CATALOGUE[shapeId];
    const grip = await pickup(page),
      target = await targetFor(page, shape, {
        row,
        col
      }, grip);
    await page.mouse.move(target.x, target.y, {
      steps: 12
    });
    await expect(page.locator('.preview-valid')).toHaveCount(shape.cells.length);
    const preview = await page.locator('.preview-valid').evaluateAll(cells => cells.map(cell => [Number(cell.dataset.row), Number(cell.dataset.col)]));
    await page.mouse.up();
    await expect.poll(async () => (await snapshot(page)).revision).toBe(1);
    const after = await snapshot(page);
    expect(after.score).toBe(shape.cells.length * 10);
    expect(after.rngState).toBe(before.rngState);
    for (const [r, c] of preview) expect(after.board[r][c]).toBe(before.tray[0].colourId);
  });
}
test('invalid drop, Escape, and resize cancel without changing the saved transaction', async ({
  page
}) => {
  await boot(page);
  const before = await snapshot(page);
  await pickup(page);
  await page.mouse.move(1, 20, {
    steps: 8
  });
  await expect(page.locator('.drag-warning')).toHaveText('× Doesn’t fit here');
  await page.mouse.up();
  expect(await snapshot(page)).toEqual(before);
  await pickup(page);
  await page.mouse.move(100, 300, {
    steps: 8
  });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.drag-overlay')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  await pickup(page);
  await page.mouse.move(120, 320, {
    steps: 8
  });
  await page.setViewportSize({
    width: 420,
    height: 844
  });
  await expect(page.locator('.drag-overlay')).toHaveCount(0);
  await page.mouse.up();
  expect(await snapshot(page)).toEqual(before);
});
test('keyboard loop, save during feedback, and exact refresh continuation', async ({
  page
}) => {
  await boot(page, fixture(0), {
    ...DEFAULT_PROFILE,
    bestScore: 200,
    tutorialDismissed: true
  });
  await page.getByRole('button', {
    name: /^Piece 1:/
  }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('gridcell').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).revision).toBe(1);
  const committed = await snapshot(page);
  await page.reload();
  await page.getByRole('button', {
    name: 'Continue game'
  }).click();
  expect(await snapshot(page)).toEqual(committed);
  await expect(page.locator('[data-row="1"][data-col="1"]')).toHaveAttribute('data-value', String(committed.board[1][1]));
});
test('fractional geometry after scrolling and long scores remain inside the viewport', async ({
  page
}) => {
  await page.setViewportSize({
    width: 390,
    height: 600
  });
  await boot(page, fixture(0));
  await page.evaluate(() => window.scrollTo(0, 110));
  const grip = await pickup(page),
    target = await targetFor(page, SHAPE_CATALOGUE[0], {
      row: 6,
      col: 6
    }, grip);
  await page.mouse.move(target.x, target.y, {
    steps: 10
  });
  await expect(page.locator('.preview-valid')).toHaveCount(1);
  await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).revision).toBe(1);
  await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('prismNine.game.v3'));
    g.score = 9007199254740000;
    localStorage.setItem('prismNine.game.v3', JSON.stringify(g));
  });
  await page.reload();
  await page.getByRole('button', {
    name: 'Continue game'
  }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('emulated touch uses the lifted piece candidate above the finger', async ({
  browser
}) => {
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844
    },
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  await boot(page, fixture(9));
  const source = await page.locator('[data-slot="0"] .piece-shape').boundingBox();
  const grip = {
    x: .35,
    y: .4
  };
  const start = {
    x: source.x + source.width * grip.x,
    y: source.y + source.height * grip.y
  };
  const target = await targetFor(page, SHAPE_CATALOGUE[9], {
    row: 6,
    col: 6
  }, grip, true);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{
      ...start,
      id: 1
    }]
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{
      ...target,
      id: 1
    }]
  });
  await expect(page.locator('.preview-valid')).toHaveCount(4);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
  await expect.poll(async () => (await snapshot(page)).revision).toBe(1);
  const game = await snapshot(page);
  expect(game.board[6][6]).not.toBeNull();
  await context.close();
});
test('release coordinates supersede the last move even before another drag paint', async ({
  page,
  context
}) => {
  await boot(page, fixture(9));
  const grip = await pickup(page);
  const previous = await targetFor(page, SHAPE_CATALOGUE[9], {
    row: 2,
    col: 2
  }, grip);
  const released = await targetFor(page, SHAPE_CATALOGUE[9], {
    row: 5,
    col: 5
  }, grip);
  await page.mouse.move(previous.x, previous.y);
  await expect(page.locator('[data-row="2"][data-col="2"]')).toHaveClass(/preview-valid/);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    buttons: 0,
    clickCount: 1,
    x: released.x,
    y: released.y
  });
  await expect.poll(async () => (await snapshot(page)).revision).toBe(1);
  const game = await snapshot(page);
  for (const [dr, dc] of SHAPE_CATALOGUE[9].cells) expect(game.board[5 + dr][5 + dc]).not.toBeNull();
  expect(game.board[2][2]).toBeNull();
  expect(game.score).toBe(40);
});
test('a CSS-scaled fractional board uses actual gaps and preserves the visible grip', async ({
  page
}) => {
  await boot(page, fixture(9));
  await page.locator('.board-stage').evaluate(node => {
    node.style.transform = 'scale(.9)';
    node.style.transformOrigin = 'center top';
  });
  const grip = await pickup(page),
    target = await targetFor(page, SHAPE_CATALOGUE[9], {
      row: 6,
      col: 6
    }, grip);
  await page.mouse.move(target.x, target.y, {
    steps: 10
  });
  await expect(page.locator('.preview-valid')).toHaveCount(4);
  await expect(page.locator('[data-row="6"][data-col="6"]')).toHaveClass(/preview-valid/);
  const overlay = await page.locator('.drag-overlay').boundingBox();
  const cell = await page.locator('[data-row="6"][data-col="6"]').boundingBox();
  expect(Math.abs(overlay.x - cell.x)).toBeLessThan(1);
  expect(Math.abs(overlay.y - cell.y)).toBeLessThan(1);
  await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).revision).toBe(1);
  expect((await snapshot(page)).board[7][7]).not.toBeNull();
});
test('crossing lines burst once per unique cell and persist the final board immediately', async ({
  page
}) => {
  const game = fixture(0);
  for (let n = 1; n < 8; n++) {
    game.board[0][n] = 0;
    game.board[n][0] = 2;
  }
  await boot(page, game, {
    ...DEFAULT_PROFILE,
    bestScore: 200,
    tutorialDismissed: true
  });
  const grip = await pickup(page),
    target = await targetFor(page, SHAPE_CATALOGUE[0], {
      row: 0,
      col: 0
    }, grip);
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
  await expect(page.locator('.clear-particle')).toHaveCount(15);
  const ids = await page.locator('.clear-particle').evaluateAll(nodes => nodes.map(node => node.dataset.clearedCell));
  expect(new Set(ids).size).toBe(15);
  const saved = await snapshot(page);
  expect(saved.score).toBe(310);
  expect(saved.board.flat().every(cell => cell === null)).toBe(true);
  await expect(page.locator('.resolution-effects')).toHaveCount(0);
  expect(await page.locator('.clear-particle').count()).toBe(0);
});

test('Flow selection, replacement confirmation, exact refresh and mode-specific replay', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Joy', { exact: true })).toBeChecked();
  await expect(page.getByText('Clear 12 lines to win a round. Helpful pieces, room for big ideas, and free New Pieces whenever you get stuck.')).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  expect((await snapshot(page)).mode).toBe('joy');
  const before = await snapshot(page);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByLabel('Classic', { exact: true }).check();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: 'Continue game', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Continue game', exact: true }).click();
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await page.getByRole('button', { name: 'Start new game', exact: true }).click();
  expect((await snapshot(page)).mode).toBe('classic');
});
test('select/place reaches game over and replay keeps Flow after Home mode changes', async ({ page }) => {
  const game = createNewGame(42, 'finished-flow', 200, 'flow');
  game.board = game.board.map((row, r) => row.map((_, c) => (r + c) % 2 ? 0 : null));
  game.tray = game.tray.map((p, i) => ({ ...p, shapeId: i === 0 ? 0 : 10 }));
  await boot(page, game, { ...DEFAULT_PROFILE, selectedMode: 'classic', motionMode: 'reduced', tutorialDismissed: true });
  await page.getByRole('button', { name: /^Piece 1:/ }).click();
  await page.getByRole('gridcell', { name: /^Row 1, column 1,/ }).click();
  await page.getByRole('button', { name: /^Place/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('No remaining pieces fit.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).status).toBe('gameOver');
  await page.getByRole('button', { name: 'Play Joy', exact: true }).click();
  const replay = await snapshot(page);
  expect(replay.mode).toBe('joy'); expect(replay.score).toBe(0);
  expect(replay.board.flat()).toHaveLength(64);
  expect(replay.board.flat().every(c => c === null)).toBe(true);
});
