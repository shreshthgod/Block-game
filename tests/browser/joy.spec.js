import { test, expect } from '@playwright/test';
import { createNewGame } from '../../src/game/engine.js';
import { DEFAULT_PROFILE } from '../../src/game/constants.js';
async function seed(page, game) {
  await page.addInitScript(({ game, profile }) => {
    if (!sessionStorage.getItem('joy-fixture')) {
      localStorage.setItem('prismNine.game.v3', JSON.stringify(game)); localStorage.setItem('prismNine.profile.v3', JSON.stringify(profile)); sessionStorage.setItem('joy-fixture', 'yes');
    }
  }, { game, profile: { ...DEFAULT_PROFILE, motionMode: 'reduced', soundEnabled: false } });
  await page.goto('/'); await page.getByRole('button', { name: 'Continue game', exact: true }).click();
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('prismNine.game.v3')));
test('Joy recovery replaces remaining pieces explicitly and keeps the board, score and consumed slot', async ({ page }) => {
  const game = createNewGame(1, 'browser-recovery', 0, 'joy');
  game.board = game.board.map((r,y) => r.map((_,x) => (x+y)%2 ? 0 : null)); game.tray = [null, { ...game.tray[1], shapeId: 10 }, { ...game.tray[2], shapeId: 10 }];
  game.moveCount = game.revision = 1; game.status = 'recovery'; game.score = 40;
  await seed(page, game);
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Let’s make some room.');
  const before = await saved(page);
  await page.getByRole('button', { name: 'New Pieces', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = await saved(page); expect(after.board).toEqual(before.board); expect(after.score).toBe(40); expect(after.tray[0]).toBeNull(); expect(after.statistics.recoveries).toBe(1); expect(after.status).toBe('active');
  await page.reload(); await page.getByRole('button', { name: 'Continue game', exact: true }).click(); expect(await saved(page)).toEqual(after);
});
test('twelve-line round win and All Clear persist once, Continue keeps the canvas and starts the next goal', async ({ page }) => {
  const game = createNewGame(42, 'browser-round', 0, 'joy');
  game.tray = [{ ...game.tray[0], shapeId: 0 }, null, null]; game.moveCount = game.revision = 2; game.statistics.linesCleared = 10;
  for (let n=1;n<8;n++) { game.board[0][n]=0; game.board[n][0]=2; }
  await seed(page, game);
  await page.getByRole('button', { name: /^Piece 1:/ }).click(); await page.getByRole('gridcell').first().click();
  await expect(page.locator('.cell-line-preview')).toHaveCount(15);
  await page.getByRole('button', { name: /^Place/ }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('A round full of colour.');
  const won = await saved(page); expect(won.score).toBe(310); expect(won.status).toBe('roundWon'); expect(won.statistics.roundsWon).toBe(1);
  await page.reload(); await page.getByRole('button', { name: 'Continue game', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('A round full of colour.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prismNine.profile.v3')).stats.roundsWon)).toBe(1);
  await page.getByRole('button', { name: 'Continue Playing', exact: true }).click();
  const continued = await saved(page); expect(continued.board).toEqual(won.board); expect(continued.tray).toEqual(won.tray); expect(continued.rngState).toBe(won.rngState); expect(continued.score).toBe(310); expect(continued.round.baselineLines).toBe(12);
  await expect(page.getByRole('progressbar', { name: 'Round lines cleared' })).toHaveAttribute('value', '0');
  await page.getByRole('button', { name: 'Home', exact: true }).click(); await page.getByRole('button', { name: 'My collection', exact: true }).first().click();
  await expect(page.locator('.milestone.earned')).toHaveCount(2); // First win and earned All Clear.
});
for (const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[844,390]]) {
  test(`new Joy canvas is exactly 8 × 8 and large tray pieces remain readable at ${width} × ${height}`, async ({page}, info) => {
    await page.setViewportSize({width,height}); await page.goto('/'); await expect(page.getByLabel('Joy',{exact:true})).toBeChecked(); await page.getByRole('button',{name:'New Game',exact:true}).click();
    await expect(page.getByRole('gridcell')).toHaveCount(64); await expect(page.getByRole('grid')).toHaveAttribute('aria-rowcount','8');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const board=await page.locator('.board-frame').boundingBox(); expect(Math.abs(board.width-board.height)).toBeLessThan(1);
    for(const slot of await page.locator('.tray-slot').all()) { const outer=await slot.boundingBox(), shape=await slot.locator('.piece-shape').boundingBox(); expect(shape.width).toBeLessThan(outer.width); expect(shape.height).toBeLessThan(outer.height); }
    if(width>=700 && height<500){const tray=await page.locator('.tray').boundingBox();expect(tray.y+tray.height).toBeLessThanOrEqual(height);}
    await page.screenshot({path:info.outputPath(`joy-${width}x${height}.png`),fullPage:true});
  });
}
