import { useEffect, useRef, useState } from 'react';
import { writeSnapshot } from '../game/storage.js';
export function useGamePersistence(profile, game, storage, unavailable) {
  const [failed, setFailed] = useState(unavailable);
  const latest = useRef({
    profile,
    game
  });
  useEffect(() => {
    latest.current = {
      profile,
      game
    };
    if (!writeSnapshot(storage, profile, game)) setFailed(true);
  }, [profile, game, storage]);
  useEffect(() => {
    const flush = () => {
      const value = latest.current;
      if (!writeSnapshot(storage, value.profile, value.game)) setFailed(true);
    };
    const visibility = () => {
      if (document.hidden) flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [storage]);
  return failed;
}
