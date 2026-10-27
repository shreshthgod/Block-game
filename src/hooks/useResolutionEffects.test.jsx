import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useResolutionEffects, RESOLUTION_MS, REDUCED_RESOLUTION_MS } from './useResolutionEffects.jsx';
afterEach(() => vi.useRealTimers());
describe('token-scoped resolution lifetime', () => {
  it('StrictMode setup/cleanup completes a resolution once, in under 550 ms', () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    const result = {
      token: 'game:1'
    };
    const h = renderHook(() => useResolutionEffects(result, false, dispatch), {
      wrapper: StrictMode
    });
    expect(RESOLUTION_MS).toBeLessThan(550);
    act(() => vi.advanceTimersByTime(RESOLUTION_MS));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'COMPLETE_RESOLUTION',
      token: result.token
    });
    h.unmount();
  });
  it('restart/navigation cancellation removes old callbacks and releases no future token', () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    const h = renderHook(p => useResolutionEffects(p, false, dispatch), {
      initialProps: {
        token: 'old:1'
      },
      wrapper: StrictMode
    });
    h.rerender(null);
    act(() => vi.advanceTimersByTime(500));
    expect(dispatch).not.toHaveBeenCalled();
    h.rerender({
      token: 'new:1'
    });
    act(() => vi.advanceTimersByTime(RESOLUTION_MS));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'COMPLETE_RESOLUTION',
      token: 'new:1'
    });
  });
  it('reduced motion completes independently of CSS or animation events', () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderHook(() => useResolutionEffects({
      token: 'reduced:1'
    }, true, dispatch));
    act(() => vi.advanceTimersByTime(REDUCED_RESOLUTION_MS));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'COMPLETE_RESOLUTION',
      token: 'reduced:1'
    });
  });
});
