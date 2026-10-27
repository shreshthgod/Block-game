import { SIZE } from '../game/constants.js';
import { useCallback, useLayoutEffect, useRef } from 'react';
export function readGridGeometry(grid) {
  const rect = grid.getBoundingClientRect();
  const styles = getComputedStyle(grid);
  // Computed gaps use local CSS units; rects include element zoom/transforms.
  const scaleX = rect.width / (parseFloat(styles.width) || rect.width);
  const scaleY = rect.height / (parseFloat(styles.height) || rect.height);
  const gapX = (parseFloat(styles.columnGap) || 0) * scaleX;
  const gapY = (parseFloat(styles.rowGap) || 0) * scaleY;
  const cellWidth = (rect.width - (SIZE - 1) * gapX) / SIZE;
  const cellHeight = (rect.height - (SIZE - 1) * gapY) / SIZE;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    gapX,
    gapY,
    cellWidth,
    cellHeight,
    pitchX: cellWidth + gapX,
    pitchY: cellHeight + gapY
  };
}
export function sameGeometry(a, b) {
  if (!a || !b) return false;
  return ['left', 'top', 'width', 'height', 'gapX', 'gapY', 'cellWidth', 'cellHeight', 'pitchX', 'pitchY'].every(key => a[key] === b[key] || Math.abs(a[key] - b[key]) < 0.01);
}
export function useBoardGeometry(onChange) {
  const gridRef = useRef(null);
  const geometryRef = useRef(null);
  const measure = useCallback(() => {
    if (gridRef.current) geometryRef.current = readGridGeometry(gridRef.current);
    return geometryRef.current;
  }, []);
  useLayoutEffect(() => {
    measure();
    const update = () => {
      const previous = geometryRef.current;
      const current = measure();
      // ResizeObserver sends an initial notification, even without a resize.
      if (!sameGeometry(previous, current)) onChange();
    };
    const observer = new ResizeObserver(update);
    observer.observe(gridRef.current);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [measure, onChange]);
  return {
    gridRef,
    geometryRef,
    measure
  };
}
