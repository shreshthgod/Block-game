import { useEffect } from 'react';
export function useVisibilityPause(dispatch, suspend) {
  useEffect(() => {
    const background = () => {
      if (document.hidden) {
        suspend();
        dispatch({
          type: 'BACKGROUND'
        });
      }
    };
    const pagehide = () => {
      suspend();
      dispatch({
        type: 'BACKGROUND'
      });
    };
    document.addEventListener('visibilitychange', background);
    window.addEventListener('pagehide', pagehide);
    return () => {
      document.removeEventListener('visibilitychange', background);
      window.removeEventListener('pagehide', pagehide);
    };
  }, [dispatch, suspend]);
}
