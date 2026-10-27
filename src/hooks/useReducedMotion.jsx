import { useEffect, useState } from 'react';
export function useReducedMotion(mode) {
  const [osReduced, setOsReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOsReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mode === 'reduced' || osReduced;
}
