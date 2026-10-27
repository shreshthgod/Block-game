import { it, expect } from 'vitest';
import { THEMES, CORE_THEMES } from './themes.js';
const luminance = hex => hex.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
it('all six base themes keep text, focus and occupied tiles distinct from surfaces', () => {
  expect(CORE_THEMES).toHaveLength(6);
  for (const t of THEMES) {
    expect(contrast(t.text, t.panel), t.name).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, t.panel), t.name).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.accent, t.panel), t.name).toBeGreaterThanOrEqual(3);
    expect(contrast(t.accent, t.page), `${t.name} primary button`).toBeGreaterThanOrEqual(4.5);
    for (const tile of t.palette) expect(contrast(tile, t.empty), `${t.name} occupied/empty`).toBeGreaterThanOrEqual(3);
  }
});
