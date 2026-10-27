import { useLayoutEffect } from 'react';
import { themeStyle, THEMES } from './themes.js';
import { useGameState } from './context/GameProvider.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { GameScreen } from './screens/GameScreen.jsx';
import { ModalHost } from './components/ModalHost.jsx';
import { StorageNotice } from './components/StorageNotice.jsx';
export default function App() {
  const {
    screen,
    game,
    reduced, profile
  } = useGameState();
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [screen, game?.gameId]);
  return <div style={themeStyle(profile.theme)} data-theme={profile.theme} data-burst={THEMES.find(t => t.id === profile.theme)?.burst} className="app" data-motion={reduced ? 'reduced' : 'auto'}>
    <main id="main" className="shell">{screen === 'home' ? <HomeScreen /> : <GameScreen key={game.gameId} />}</main>
    <StorageNotice /><ModalHost />
    <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
  </div>;
}
