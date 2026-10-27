import { useEffect } from 'react';
export const RESOLUTION_MS = 480;
export const REDUCED_RESOLUTION_MS = 200;
export function useResolutionEffects(resolution, reduced, dispatch) {
  useEffect(() => {
    if (!resolution) return;
    const timer = window.setTimeout(() => dispatch({
      type: 'COMPLETE_RESOLUTION',
      token: resolution.token
    }), reduced ? REDUCED_RESOLUTION_MS : RESOLUTION_MS);
    return () => window.clearTimeout(timer);
  }, [resolution, reduced, dispatch]);
}
