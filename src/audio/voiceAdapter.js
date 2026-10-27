// No voice assets are bundled. Supply licensed local URLs here when available.
export const VOICE_CLIPS = Object.freeze({});
export function createVoiceAdapter(environment = globalThis, clips = VOICE_CLIPS) {
  const speech = environment.speechSynthesis;
  let voices = [], active = null, disposed = false;
  const loadVoices = () => { try { voices = speech?.getVoices?.() || []; } catch { voices = []; } };
  loadVoices();
  speech?.addEventListener?.('voiceschanged', loadVoices);
  function cancel() {
    const prior = active; active = null;
    if (prior?.audio) { prior.audio.onended = null; prior.audio.onerror = null; prior.audio.pause(); prior.audio.removeAttribute?.('src'); prior.audio.load?.(); }
    if (prior?.utterance) { prior.utterance.onend = null; prior.utterance.onerror = null; try { speech?.cancel(); } catch { /* Optional system speech can be denied. */ } }
    prior?.onEnd?.();
  }
  function speak(event, { volume = .8, onEnd = () => {} } = {}) {
    cancel();
    if (disposed || !event) return false;
    const value = Math.max(0, Math.min(1, volume));
    const finish = item => { if (active === item) { active = null; item.onEnd(); } };
    if (clips[event.kind] && environment.Audio) {
      try {
        const audio = new environment.Audio(clips[event.kind]), item = { audio, onEnd };
        active = item; audio.volume = value;
        audio.onended = () => finish(item); audio.onerror = () => finish(item);
        Promise.resolve(audio.play()).catch(() => finish(item)); return true;
      } catch { cancel(); return false; }
    }
    if (!speech?.speak || !environment.SpeechSynthesisUtterance) return false;
    try {
      loadVoices();
      const utterance = new environment.SpeechSynthesisUtterance(event.phrase), item = { utterance, onEnd };
      utterance.lang = 'en-US'; utterance.voice = voices.find(v => /^en[-_]/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
      utterance.rate = 1.07; utterance.pitch = 1.05; utterance.volume = value;
      utterance.onend = () => finish(item); utterance.onerror = () => finish(item);
      active = item; speech.speak(utterance); return true;
    } catch { cancel(); return false; }
  }
  return { speak, cancel, dispose() { cancel(); disposed = true; speech?.removeEventListener?.('voiceschanged', loadVoices); } };
}
