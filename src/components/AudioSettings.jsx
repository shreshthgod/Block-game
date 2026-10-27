import { useGameCommands, useGameState } from '../context/GameProvider.jsx';
export function AudioSettings() {
  const { profile, voiceNotice } = useGameState(), c = useGameCommands();
  const option = (key, value) => c.dispatch({ type: 'SET_AUDIO_OPTION', key, value });
  return <fieldset className="audio-settings"><legend>Audio</legend>
    <div className="setting-row"><div><strong>Master sound</strong><span>Mute effects and spoken celebrations</span></div><button className="toggle" role="switch" aria-label="Sound" aria-checked={profile.soundEnabled} onClick={() => { c.activateAudio(); c.dispatch({ type: 'SET_SOUND', enabled: !profile.soundEnabled }); }}>{profile.soundEnabled ? 'On' : 'Off'}</button></div>
    {[['effectsEnabled', 'Effects'], ['voiceEnabled', 'Announcer voice']].map(([key, label]) => <div className="setting-row" key={key}><strong>{label}</strong><button className="toggle" role="switch" aria-label={label} aria-checked={profile[key]} onClick={() => { c.activateAudio(); option(key, !profile[key]); }}>{profile[key] ? 'On' : 'Off'}</button></div>)}
    {[['effectsVolume', 'Effects volume'], ['voiceVolume', 'Voice volume']].map(([key, label]) => <label className="volume-setting" key={key}><span>{label} <output>{Math.round(profile[key] * 100)}%</output></span><input type="range" aria-label={label} min="0" max="100" step="5" value={Math.round(profile[key] * 100)} onChange={e => option(key, Number(e.target.value) / 100)} /></label>)}
    <button className="button secondary small" onClick={c.previewVoice}>Preview voice</button>
    <p className="audio-explanation">Spoken celebrations use your browser’s voice. Availability and sound vary by device. All feedback also appears as text.</p>
    <p className="audio-status" role="status">{voiceNotice}</p>
  </fieldset>;
}
