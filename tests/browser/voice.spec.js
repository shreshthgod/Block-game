import { test, expect } from '@playwright/test';
import { createNewGame } from '../../src/game/engine.js';
import { DEFAULT_PROFILE } from '../../src/game/constants.js';
async function mockVoice(page) {
  await page.addInitScript(() => {
    window.__voiceLog = []; window.__voiceCancel = 0;
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [{ lang: 'en-US', name: 'Test voice' }], addEventListener() {}, removeEventListener() {}, cancel() { window.__voiceCancel++; }, speak(u) { window.__voiceLog.push({ text: u.text, volume: u.volume }); } } });
  });
}
test('voice preview, volume, mute, pause and refresh have no stale speech queue', async ({ page }) => {
  await mockVoice(page);
  const game = createNewGame(42, 'browser-speech', 1000, 'flow');
  game.tray = game.tray.map(p => ({ ...p, shapeId: 0 }));
  for (let n = 1; n < 8; n++) { game.board[0][n] = 0; game.board[n][0] = 2; }
  await page.addInitScript(({ game, profile }) => {
    if (!sessionStorage.getItem('voice-boot')) { localStorage.setItem('prismNine.game.v3', JSON.stringify(game)); localStorage.setItem('prismNine.profile.v3', JSON.stringify(profile)); sessionStorage.setItem('voice-boot', 'true'); }
  }, { game, profile: { ...DEFAULT_PROFILE, tutorialDismissed: true, motionMode: 'reduced' } });
  await page.goto('/'); await page.getByRole('button', { name: 'Continue game', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const volume = page.getByRole('slider', { name: 'Voice volume' });
  await volume.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Preview voice', exact: true }).click();
  expect(await page.evaluate(() => window.__voiceLog)).toEqual([{ text: 'Double Burst!', volume: .05 }]);
  await page.getByRole('switch', { name: 'Sound', exact: true }).click();
  await page.getByRole('button', { name: 'Preview voice', exact: true }).click();
  expect(await page.evaluate(() => window.__voiceLog.length)).toBe(1);
  await page.getByRole('switch', { name: 'Sound', exact: true }).click();
  await page.getByRole('button', { name: /Done/ }).click();
  await page.getByRole('button', { name: /^Piece 1:/ }).click();
  await page.getByRole('gridcell').first().click(); await page.getByRole('button', { name: /^Place/ }).click();
  await expect.poll(() => page.evaluate(() => window.__voiceLog.length)).toBe(2);
  expect(await page.evaluate(() => window.__voiceLog.at(-1).text)).toBe('All Clear!');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(await page.evaluate(() => window.__voiceCancel)).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect(await page.evaluate(() => window.__voiceLog.length)).toBe(2);
  await page.reload(); await page.getByRole('button', { name: 'Continue game', exact: true }).click();
  expect(await page.evaluate(() => window.__voiceLog)).toEqual([]);
});
test('missing speech support retains readable feedback and usable controls', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); });
  await page.goto('/'); await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Preview voice', exact: true }).click();
  await expect(page.getByText('Speech is unavailable here. Celebration text remains available.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Done/ }).click(); await expect(page.getByRole('gridcell')).toHaveCount(64);
});
