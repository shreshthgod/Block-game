import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceAdapter } from '../audio/voiceAdapter.js';
import { deriveCelebration } from '../audio/celebrations.js';
export function useAnnouncer(profile, paused, gameId, result, roundWon = false) {
  const activePriority = useRef(0), followUp = useRef(null), lifecycle = useRef({ gameId, roundWon });
  useEffect(() => { lifecycle.current = { gameId, roundWon }; }, [gameId, roundWon]);
  const adapter = useRef(null), unlocked = useRef(false), seen = useRef(new Set()), settings = useRef(profile);
  const [speaking, setSpeaking] = useState(false), [notice, setNotice] = useState('');
  useEffect(() => { settings.current = profile; }, [profile]);
  const cancel = useCallback(() => { followUp.current = null; adapter.current?.cancel(); activePriority.current = 0; setSpeaking(false); }, []);
  useEffect(() => {
    adapter.current = createVoiceAdapter(window);
    return () => { adapter.current?.dispose(); adapter.current = null; };
  }, []);
  useEffect(() => {
    if (paused || !profile.soundEnabled || !profile.voiceEnabled) cancel();
    return () => cancel();
  }, [paused, gameId, profile.soundEnabled, profile.voiceEnabled, profile.voiceVolume, cancel]);
  const activate = useCallback(() => { unlocked.current = true; }, []);
  const say = useCallback(event => {
    const p = settings.current;
    if (!unlocked.current || !p.soundEnabled || !p.voiceEnabled || p.voiceVolume === 0) return false;
    const priority = event.priority ?? 100;
    if (activePriority.current > priority) return false; // Discard, never queue a lower-priority phrase.
    const started = adapter.current?.speak(event, { volume: p.voiceVolume, onEnd: () => {
      activePriority.current = 0; setSpeaking(false);
      const next = followUp.current; followUp.current = null;
      const prefs = settings.current;
      if (next && lifecycle.current.roundWon && lifecycle.current.gameId === next.gameId && prefs.soundEnabled && prefs.voiceEnabled && prefs.voiceVolume > 0 && !seen.current.has(next.key)) {
        seen.current.add(next.key);
        if (seen.current.size > 64) seen.current.delete(seen.current.values().next().value);
        const playing = adapter.current?.speak(next, { volume: prefs.voiceVolume, onEnd: () => { activePriority.current = 0; setSpeaking(false); } });
        activePriority.current = playing ? 80 : 0; setSpeaking(!!playing);
      }
    } }) ?? false;
    activePriority.current = started ? priority : 0;
    setSpeaking(started);
    return started;
  }, []);
  useEffect(() => {
    const event = deriveCelebration(result);
    if (!event || seen.current.has(event.key)) return;
    seen.current.add(event.key);
    if (seen.current.size > 64) seen.current.delete(seen.current.values().next().value);
    if (!paused) {
      const started = say(event);
      if (started && result.roundWon && event.kind !== 'win') followUp.current = { gameId, key: `${result.token}:win`, kind: 'win', phrase: 'You did it!', priority: 80 };
    }
  }, [result, paused, say, gameId]);
  const preview = useCallback(() => {
    activate();
    const started = say({ kind: 'double', phrase: 'Double Burst!' });
    setNotice(started ? 'Voice preview requested. System voices vary by device.' : !settings.current.soundEnabled || !settings.current.voiceEnabled ? 'Enable master sound and announcer voice to preview.' : settings.current.voiceVolume === 0 ? 'Raise voice volume to preview.' : 'Speech is unavailable here. Celebration text remains available.');
  }, [activate, say]);
  return { activate, cancel, preview, speaking, notice };
}
