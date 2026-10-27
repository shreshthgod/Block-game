import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { deriveCelebration } from '../audio/celebrations.js';
import { createVoiceAdapter } from '../audio/voiceAdapter.js';
import { useAnnouncer } from './useAnnouncer.jsx';
import { DEFAULT_PROFILE } from '../game/constants.js';
const result = (lines, revision = 1, extra = {}) => ({ token: `game:${revision}`, completedLines: { rows: Array.from({ length: lines }, (_, i) => i), columns: [] }, ...extra });
afterEach(() => vi.unstubAllGlobals());
function speechMock() {
  const listeners = new Set();
  const speech = { getVoices: vi.fn(() => []), speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn((_, cb) => listeners.add(cb)), removeEventListener: vi.fn((_, cb) => listeners.delete(cb)) };
  const Utterance = class { constructor(text) { this.text = text; } };
  vi.stubGlobal('speechSynthesis', speech); vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  return { speech, Utterance, listeners };
}
describe('committed celebration priority', () => {
  it.each([[1, 'Burst!'], [2, 'Double Burst!'], [3, 'Triple Burst!'], [4, 'Mega Burst!'], [8, 'Mega Burst!']])('%i simultaneous lines speak %s', (lines, phrase) => expect(deriveCelebration(result(lines)).phrase).toBe(phrase));
  it('never calls three separate single-line moves a Triple Burst', () => {
    expect([1, 2, 3].map(n => deriveCelebration(result(1, n, { clearStreak: n })).phrase)).toEqual(['Burst!', 'Burst!', 'Amazing!']);
    expect(deriveCelebration(result(2, 1, { record: true, gameOver: true })).phrase).toBe('Double Burst!');
    expect(deriveCelebration(result(1, 1, { record: true })).phrase).toBe('New Best!');
    expect(deriveCelebration(result(0, 1, { gameOver: true })).phrase).toBe('Nice game!');
  });
});
describe('voice adapter and lifecycle', () => {
  it('selects asynchronously loaded English voices, replaces speech, ignores obsolete ends and removes listeners', () => {
    const { speech, Utterance, listeners } = speechMock();
    const adapter = createVoiceAdapter({ speechSynthesis: speech, SpeechSynthesisUtterance: Utterance });
    speech.getVoices.mockReturnValue([{ lang: 'fr-FR' }, { lang: 'en-GB', name: 'English' }]);
    for (const cb of listeners) cb();
    const ended = vi.fn(); adapter.speak(deriveCelebration(result(1)), { onEnd: ended, volume: .4 });
    const first = speech.speak.mock.calls[0][0]; const obsoleteEnd = first.onend;
    expect(first.voice.name).toBe('English'); expect(first.volume).toBe(.4);
    adapter.speak(deriveCelebration(result(2, 2)));
    expect(speech.cancel).toHaveBeenCalledOnce(); obsoleteEnd(); expect(ended).toHaveBeenCalledOnce();
    adapter.dispose(); expect(listeners.size).toBe(0);
  });
  it('requires a gesture, deduplicates StrictMode events, cancels on pause/restart/mute and never replays a save', () => {
    const { speech, listeners } = speechMock();
    const base = { profile: DEFAULT_PROFILE, paused: false, gameId: 'game', result: null };
    const h = renderHook(p => useAnnouncer(p.profile, p.paused, p.gameId, p.result), { initialProps: base, wrapper: StrictMode });
    expect(speech.speak).not.toHaveBeenCalled(); expect(listeners.size).toBe(1);
    act(() => h.result.current.activate());
    h.rerender({ ...base, result: result(1) });
    h.rerender({ ...base, result: result(1) }); expect(speech.speak).toHaveBeenCalledOnce();
    h.rerender({ ...base, result: result(2, 2) }); expect(speech.speak).toHaveBeenCalledTimes(2);
    h.rerender({ ...base, result: result(1, 3) }); expect(speech.speak).toHaveBeenCalledTimes(2); // Lower-priority speech is discarded, not queued.
    h.rerender({ ...base, profile: { ...DEFAULT_PROFILE, voiceVolume: 0 }, result: result(1, 3) }); expect(h.result.current.speaking).toBe(false);
    act(() => h.result.current.preview()); expect(h.result.current.notice).toMatch(/Raise voice volume/);
    h.rerender({ ...base, result: result(2, 2), paused: true }); expect(h.result.current.speaking).toBe(false);
    h.rerender({ ...base, gameId: 'restart' }); expect(speech.speak).toHaveBeenCalledTimes(2);
    h.rerender({ ...base, profile: { ...DEFAULT_PROFILE, soundEnabled: false }, result: result(3, 3) });
    expect(speech.speak).toHaveBeenCalledTimes(2); h.unmount(); expect(listeners.size).toBe(0);
  });
  it('keeps missing/failed speech optional and supports preview without a game event', () => {
    vi.stubGlobal('speechSynthesis', undefined); vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const h = renderHook(() => useAnnouncer(DEFAULT_PROFILE, true, 'game', null));
    act(() => h.result.current.preview()); expect(h.result.current.notice).toMatch(/unavailable/); expect(h.result.current.speaking).toBe(false);
    h.unmount();
    expect(createVoiceAdapter({ speechSynthesis: { getVoices() { throw Error('denied'); }, speak() { throw Error('failed'); } }, SpeechSynthesisUtterance: class {} }).speak({ phrase: 'Burst!' })).toBe(false);
  });
});
it('All Clear takes priority and a still-relevant round win follows once, with cancellation on Continue', () => {
  const { speech } = speechMock();
  const base = { profile: DEFAULT_PROFILE, paused: false, gameId: 'game', result: null, won: false };
  const h = renderHook(p => useAnnouncer(p.profile, p.paused, p.gameId, p.result, p.won), { initialProps: base, wrapper: StrictMode });
  act(() => h.result.current.activate());
  h.rerender({ ...base, result: result(2, 1, { allClear: true, roundWon: true }), won: true });
  expect(speech.speak.mock.calls.at(-1)[0].text).toBe('All Clear!');
  act(() => speech.speak.mock.calls.at(-1)[0].onend());
  expect(speech.speak.mock.calls.at(-1)[0].text).toBe('You did it!'); expect(speech.speak).toHaveBeenCalledTimes(2);
  h.rerender({ ...base, result: result(2, 1, { allClear: true, roundWon: true }), won: true }); expect(speech.speak).toHaveBeenCalledTimes(2);
  act(() => h.result.current.cancel()); h.rerender(base); h.unmount();
});
