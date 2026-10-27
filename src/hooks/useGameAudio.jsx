import { useCallback, useEffect, useRef } from 'react';
const NOTES = {
  pickup: [420],
  place: [330, 480],
  clear: [520, 660, 790],
  multiClear: [520, 660, 790, 990],
  record: [660, 830, 990],
  reject: [140],
  gameOver: [330, 260, 200]
};
// Only expected browser/device failures are optional; coding errors must surface.
function ignoreExpectedAudioFailure(error) {
  if (error instanceof DOMException && ['InvalidStateError', 'NotAllowedError', 'NotSupportedError', 'AbortError', 'NotFoundError', 'NotReadableError', 'OperationError', 'SecurityError', 'UnknownError'].includes(error.name)) return;
  throw error;
}
export function useGameAudio(enabled, paused, resolution, status, options = {}) {
  const volume = options.volume ?? 1, ducked = options.ducked ?? false;
  const master = useRef(null);
  const context = useRef(null),
    nodes = useRef(new Map()),
    history = useRef(new Set());
  const settings = useRef({
    enabled,
    paused, volume, ducked
  });
  useEffect(() => {
    settings.current = {
      enabled,
      paused, volume, ducked
    };
    if (master.current && context.current) master.current.gain.setValueAtTime(volume * (ducked ? .28 : 1), context.current.currentTime);
  }, [enabled, paused, volume, ducked, settings]);
  const suspend = useCallback(() => {
    for (const [node, gain] of nodes.current) {
      try {
        node.stop();
      } catch (error) {
        ignoreExpectedAudioFailure(error);
      }
      node.disconnect();
      gain?.disconnect();
    }
    nodes.current.clear();
    context.current?.suspend().catch(ignoreExpectedAudioFailure);
  }, []);
  const activate = useCallback(() => {
    if (!settings.current.enabled) return;
    try {
      if (!context.current || context.current.state === 'closed') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          context.current = new AudioContext();
          master.current = context.current.createGain();
          master.current.connect(context.current.destination);
          master.current.gain.setValueAtTime(settings.current.volume * (settings.current.ducked ? .28 : 1), context.current.currentTime);
        }
      }
      context.current?.resume().catch(ignoreExpectedAudioFailure);
    } catch (error) {
      ignoreExpectedAudioFailure(error);
    }
  }, [settings]);
  const play = useCallback(name => {
    if (!Object.hasOwn(NOTES, name)) throw new RangeError(`Unknown sound: ${name}`);
    const ctx = context.current;
    if (!settings.current.enabled || settings.current.paused || ctx?.state !== 'running') return;
    if (nodes.current.size + NOTES[name].length > 16) return;
    try {
      NOTES[name].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.045;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.035, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
        oscillator.connect(gain);
        gain.connect(master.current);
        nodes.current.set(oscillator, gain);
        oscillator.onended = () => {
          if (!nodes.current.has(oscillator)) return;
          nodes.current.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.11);
      });
    } catch (error) {
      ignoreExpectedAudioFailure(error);
    }
  }, [settings]);
  useEffect(() => {
    if (!enabled || paused) suspend();
  }, [enabled, paused, suspend]);
  useEffect(() => {
    if (!resolution || history.current.has(resolution.token)) return;
    history.current.add(resolution.token);
    if (history.current.size > 48) history.current.delete(history.current.values().next().value);
    play(resolution.completedLines.rows.length + resolution.completedLines.columns.length > 1 ? 'multiClear' : resolution.cleared.length ? 'clear' : resolution.record ? 'record' : status === 'gameOver' ? 'gameOver' : 'place');
  }, [resolution, status, play]);
  useEffect(() => () => {
    suspend();
    const ctx = context.current;
    context.current = null;
    master.current?.disconnect(); master.current = null;
    ctx?.close().catch(ignoreExpectedAudioFailure);
  }, [suspend]);
  return {
    activate,
    play,
    suspend
  };
}
