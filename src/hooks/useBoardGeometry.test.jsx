import { useLayoutEffect } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readGridGeometry, useBoardGeometry } from './useBoardGeometry.jsx';
const OriginalObserver = globalThis.ResizeObserver;
afterEach(() => {
  vi.restoreAllMocks();
  globalThis.ResizeObserver = OriginalObserver;
});
describe('geometry invalidation', () => {
  it('does not cancel a gesture on an observer notification with unchanged geometry', () => {
    let notify, api;
    let left = 10;
    globalThis.ResizeObserver = class {
      constructor(callback) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      left,
      top: 100,
      width: 300,
      height: 300
    }));
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      width: '300px',
      height: '300px',
      columnGap: '3px',
      rowGap: '3px'
    });
    const changed = vi.fn();
    function Harness() {
      const {
        gridRef,
        geometryRef
      } = useBoardGeometry(changed);
      useLayoutEffect(() => {
        api = geometryRef;
      });
      return <div ref={gridRef} />;
    }
    const view = render(<Harness />);
    act(() => notify());
    expect(changed).not.toHaveBeenCalled();
    left = 20;
    act(() => notify());
    expect(changed).toHaveBeenCalledTimes(1);
    expect(api.current.left).toBe(20);
    view.unmount();
  });
  it('scales gaps with a CSS-scaled grid rather than mixing coordinate spaces', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      width: '300px',
      height: '300px',
      columnGap: '3px',
      rowGap: '3px'
    });
    const grid = {
      getBoundingClientRect: () => ({
        left: 10,
        top: 100,
        width: 600,
        height: 600
      })
    };
    const geometry = readGridGeometry(grid);
    expect(geometry.gapX).toBe(6);
    expect(geometry.cellWidth).toBeCloseTo((600 - 42) / 8);
  });
});
