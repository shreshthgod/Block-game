import { SIZE } from '../game/constants.js';
import { useGameState, useGameCommands } from '../context/GameProvider.jsx';
import { CORE_THEMES, LEGACY_THEMES, themeStyle } from '../themes.js';
export function ThemeGallery() {
  const { profile } = useGameState(), { dispatch } = useGameCommands();
  const gallery = themes => <div className="theme-gallery">{themes.map(theme => <button key={theme.id} className="theme-option" style={{ ...themeStyle(theme.id), '--board-size': SIZE }} aria-pressed={profile.theme === theme.id} onClick={() => dispatch({ type: 'SET_THEME', theme: theme.id })}><span className="theme-mini" aria-hidden="true">{Array.from({ length: SIZE * SIZE }, (_, i) => <i key={i} style={{ background: i % 11 < 4 ? theme.palette[i % 7] : theme.empty }} />)}</span><span>{theme.name}</span></button>)}</div>;
  return <fieldset className="theme-field"><legend>Pick your colours</legend>{gallery(CORE_THEMES)}<details className="previous-looks" open={LEGACY_THEMES.some(t => t.id === profile.theme)}><summary>Previous looks</summary>{gallery(LEGACY_THEMES)}</details><label className="rotation-setting"><input type="checkbox" checked={profile.rotateTheme} onChange={e => dispatch({ type: 'SET_THEME_ROTATION', enabled: e.target.checked })} /> New look each game</label><p>Every theme is free. Colours are decorative.</p></fieldset>;
}
