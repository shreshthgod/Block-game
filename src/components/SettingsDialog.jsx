import { ThemeGallery } from './ThemeGallery.jsx';
import { AudioSettings } from './AudioSettings.jsx';
import { useGameCommands, useGameState } from '../context/GameProvider.jsx';
import { Icon } from './Icon.jsx';
export function SettingsDialog() {
  const { profile } = useGameState(), c = useGameCommands();
  return <><span className="eyebrow">MAKE IT YOURS</span><h2 id="dialog-title">Settings</h2><p id="dialog-description">Sound, motion and a fresh look.</p><AudioSettings /><fieldset className="motion-field"><legend>Motion</legend><p>Auto follows your device’s reduced-motion preference.</p><div className="segmented">{[['auto', 'Auto'], ['reduced', 'Reduced']].map(([mode, label]) => <label key={mode}><input type="radio" name="motion" value={mode} checked={profile.motionMode === mode} onChange={() => c.dispatch({ type: 'SET_MOTION', mode })} /><span>{label}</span></label>)}</div></fieldset><ThemeGallery /><button className="button primary" onClick={c.closeModal}>Done <Icon name="check" /></button></>;
}
