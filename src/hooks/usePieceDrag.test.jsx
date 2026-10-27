import { Profiler, StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { usePieceDrag, calculateDrag } from './usePieceDrag.jsx';
const piece = {
  instanceId: 'p-1',
  shapeId: 9,
  colourId: 0
};
let frames, callbacks, nextFrame;
beforeEach(() => {
  frames = new Map();
  callbacks = [];
  nextFrame = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    const id = nextFrame++;
    frames.set(id, callback);
    callbacks.push(callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function paint() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(16));
  });
}
function setup({
  reduced = true,
  isValidCandidate = () => true
} = {}) {
  const captured = new Set();
  const target = {
    focus: vi.fn(),
    setPointerCapture: id => captured.add(id),
    hasPointerCapture: id => captured.has(id),
    releasePointerCapture: id => captured.delete(id),
    querySelector: () => ({
      getBoundingClientRect: () => ({
        left: 10,
        top: 400,
        width: 40,
        height: 40
      })
    })
  };
  const geometryRef = {
    current: {
      left: 10,
      top: 100,
      width: 294,
      height: 294,
      cellWidth: 30,
      cellHeight: 30,
      pitchX: 33,
      pitchY: 33,
      gapX: 3,
      gapY: 3
    }
  };
  const options = {
    geometryRef,
    measure: vi.fn(() => geometryRef.current),
    disabled: false,
    reduced,
    isValidCandidate,
    onSelect: vi.fn(),
    onDrop: vi.fn(),
    onPickup: vi.fn(),
    onCancel: vi.fn()
  };
  const commits = vi.fn();
  const wrapper = ({
    children
  }) => <StrictMode><Profiler id="drag" onRender={commits}>{children}</Profiler></StrictMode>;
  const hook = renderHook(props => usePieceDrag(props), {
    initialProps: options,
    wrapper
  });
  const event = (overrides = {}) => ({
    pointerId: 1,
    isPrimary: true,
    button: 0,
    pointerType: 'mouse',
    clientX: 30,
    clientY: 420,
    currentTarget: target,
    ...overrides
  });
  const send = (method, overrides) => act(() => hook.result.current.handlers(piece)[method](event(overrides)));
  return {
    ...hook,
    options,
    captured,
    event,
    send,
    commits
  };
}
describe('pointer interaction lifecycle with focused measurements', () => {
  it('selects below six pixels, keeps keyboard activation, and suppresses synthetic pointer clicks', () => {
    const h = setup();
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 33,
      clientY: 422
    });
    expect(h.result.current.drag).toBeNull();
    expect(frames.size).toBe(0);
    h.send('onPointerUp');
    expect(h.options.onSelect).toHaveBeenCalledExactlyOnceWith(piece);
    h.send('onClick', {
      detail: 1
    });
    expect(h.options.onSelect).toHaveBeenCalledTimes(1);
    h.send('onClick', {
      detail: 0
    });
    expect(h.options.onSelect).toHaveBeenCalledTimes(2);
    expect(h.captured.size).toBe(0);
  });
  it('uses release coordinates synchronously rather than the last painted candidate', () => {
    const h = setup();
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 74.5,
      clientY: 230.5
    });
    paint();
    expect(h.result.current.drag.candidate).toEqual({
      row: 3,
      col: 1
    });
    h.send('onPointerUp', {
      clientX: 140.5,
      clientY: 197.5
    });
    expect(h.options.onDrop).toHaveBeenCalledExactlyOnceWith(piece, {
      row: 2,
      col: 3
    });
    expect(h.options.measure).toHaveBeenCalledTimes(2);
    h.send('onPointerUp', {
      clientX: 140.5,
      clientY: 197.5
    });
    h.send('onLostPointerCapture');
    expect(h.options.onDrop).toHaveBeenCalledTimes(1);
    expect(h.options.onCancel).not.toHaveBeenCalled();
  });
  it('commits the latest candidate even when released before the first frame or without a move event', () => {
    const h = setup();
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 74.5,
      clientY: 230.5
    });
    const stale = callbacks[0];
    expect(frames.size).toBe(1);
    h.send('onPointerUp', {
      clientX: 140.5,
      clientY: 197.5
    });
    expect(h.options.onDrop).toHaveBeenCalledExactlyOnceWith(piece, {
      row: 2,
      col: 3
    });
    expect(frames.size).toBe(0);
    act(() => stale(16));
    expect(h.result.current.drag).toBeNull();
    h.send('onPointerDown');
    h.send('onPointerUp', {
      clientX: 140.5,
      clientY: 197.5
    });
    expect(h.options.onDrop).toHaveBeenCalledTimes(2);
  });
  it('uses one frame for an event burst and does not commit React updates within the same anchor', () => {
    const h = setup();
    h.send('onPointerDown');
    for (let i = 0; i < 40; i++) h.send('onPointerMove', {
      clientX: 74.5 + i / 100,
      clientY: 230.5
    });
    expect(frames.size).toBe(1);
    paint();
    const node = document.createElement('div');
    act(() => h.result.current.overlayRef(node));
    h.commits.mockClear();
    const reads = h.options.measure.mock.calls.length;
    for (let i = 0; i < 40; i++) {
      h.send('onPointerMove', {
        clientX: 75 + i / 100,
        clientY: 230.5
      });
      paint();
    }
    expect(h.commits).not.toHaveBeenCalled();
    expect(h.options.measure).toHaveBeenCalledTimes(reads);
    expect(node.style.transform).toContain('translate3d(43.89px, 199px, 0)');
    expect(node.style.willChange).toBe('transform');
    act(() => h.result.current.cancelDrag());
    expect(node.style.willChange).toBe('');
  });
  it('updates preview validity when crossing an occupied candidate and ignores secondary pointers', () => {
    const h = setup({
      isValidCandidate: (_piece, candidate) => candidate.col !== 1
    });
    h.send('onPointerDown');
    h.send('onPointerMove', {
      pointerId: 2,
      clientX: 100,
      clientY: 200
    });
    expect(frames.size).toBe(0);
    h.send('onPointerMove', {
      clientX: 74.5,
      clientY: 230.5
    });
    paint();
    expect(h.result.current.drag.valid).toBe(false);
    h.send('onPointerMove', {
      clientX: 140.5,
      clientY: 197.5
    });
    paint();
    expect(h.result.current.drag.valid).toBe(true);
    expect(h.options.onDrop).not.toHaveBeenCalled();
  });
  it.each(['onPointerCancel', 'onLostPointerCapture'])('%s cancels capture and pending frames without dropping', method => {
    const h = setup();
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 100,
      clientY: 200
    });
    const stale = callbacks[0];
    h.send(method);
    expect(h.result.current.drag).toBeNull();
    expect(frames.size).toBe(0);
    expect(h.captured.size).toBe(0);
    act(() => stale(16));
    expect(h.result.current.drag).toBeNull();
    expect(h.options.onDrop).not.toHaveBeenCalled();
    expect(h.options.onCancel).toHaveBeenCalledTimes(1);
  });
  it('a stale callback cannot revive a cancelled preview during a new pickup', () => {
    const h = setup();
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 100,
      clientY: 200
    });
    const old = callbacks[0];
    act(() => h.result.current.cancelDrag());
    h.send('onPointerDown');
    act(() => old(16));
    expect(h.result.current.drag).toBeNull();
    h.send('onPointerUp');
    expect(h.options.onDrop).not.toHaveBeenCalled();
  });
  it('modal gating and unmount release capture, cancel frames, and ignore late drops', () => {
    const h = setup();
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 100,
      clientY: 200
    });
    h.rerender({
      ...h.options,
      disabled: true
    });
    expect(h.result.current.drag).toBeNull();
    expect(frames.size).toBe(0);
    h.send('onPointerUp');
    expect(h.options.onDrop).not.toHaveBeenCalled();
    expect(h.captured.size).toBe(0);
    h.rerender(h.options);
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 100,
      clientY: 200
    });
    h.unmount();
    expect(h.captured.size).toBe(0);
    expect(frames.size).toBe(0);
  });
  it('cancels a release if current geometry changed before ResizeObserver delivery', () => {
    const h = setup();
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 100,
      clientY: 200
    });
    h.options.geometryRef.current = {
      ...h.options.geometryRef.current,
      left: 20
    };
    h.send('onPointerUp', {
      clientX: 100,
      clientY: 200
    });
    expect(h.options.onDrop).not.toHaveBeenCalled();
    expect(h.options.onCancel).toHaveBeenCalledTimes(1);
  });
  it('invalid returns animate only after release and cannot survive a cancellation', () => {
    vi.useFakeTimers();
    const h = setup({
      reduced: false,
      isValidCandidate: () => false
    });
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 100,
      clientY: 200
    });
    paint();
    const cancel = vi.fn();
    const node = document.createElement('div');
    node.animate = vi.fn(() => ({
      cancel
    }));
    act(() => h.result.current.overlayRef(node));
    expect(node.animate).not.toHaveBeenCalled();
    h.send('onPointerUp', {
      clientX: 100,
      clientY: 200
    });
    expect(node.animate).toHaveBeenCalledTimes(1);
    expect(h.result.current.drag.phase).toBe('returning');
    act(() => h.result.current.cancelDrag());
    act(() => vi.advanceTimersByTime(200));
    expect(h.result.current.drag).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('reduced motion returns immediately, with no queued frame or animation', () => {
    const h = setup({
      isValidCandidate: () => false
    });
    h.send('onPointerDown');
    h.send('onPointerMove', {
      clientX: 100,
      clientY: 200
    });
    h.send('onPointerUp', {
      clientX: 100,
      clientY: 200
    });
    expect(h.result.current.drag).toBeNull();
    expect(frames.size).toBe(0);
  });
  it('touch release uses the same lifted, fractional-grip calculation as preview', () => {
    const h = setup();
    h.send('onPointerDown', {
      pointerType: 'touch'
    });
    h.send('onPointerMove', {
      clientX: 140.5,
      clientY: 245.5
    });
    paint();
    expect(h.result.current.drag.candidate).toEqual({
      row: 2,
      col: 3
    });
    h.send('onPointerUp', {
      clientX: 140.5,
      clientY: 245.5
    });
    expect(h.options.onDrop).toHaveBeenCalledExactlyOnceWith(piece, {
      row: 2,
      col: 3
    });
    expect(calculateDrag(140.5, 245.5, {
      x: .5,
      y: .5
    }, {
      rows: 2,
      cols: 2
    }, h.options.geometryRef.current, true).candidate).toEqual({
      row: 2,
      col: 3
    });
  });
});
it('a cancelled callback cannot clear the pending-frame handle of a newer gesture', () => {
  const h = setup();
  h.send('onPointerDown');
  h.send('onPointerMove', {
    clientX: 100,
    clientY: 200
  });
  const old = callbacks[0];
  act(() => h.result.current.cancelDrag());
  h.send('onPointerDown');
  h.send('onPointerMove', {
    clientX: 140.5,
    clientY: 197.5
  });
  expect(frames.size).toBe(1);
  act(() => old(16));
  h.send('onPointerMove', {
    clientX: 141,
    clientY: 197.5
  });
  expect(frames.size).toBe(1);
  paint();
  expect(h.result.current.drag.candidate).toEqual({
    row: 2,
    col: 3
  });
});
it('switching to reduced motion cancels an in-progress invalid return', () => {
  vi.useFakeTimers();
  const h = setup({
    reduced: false,
    isValidCandidate: () => false
  });
  h.send('onPointerDown');
  h.send('onPointerMove', {
    clientX: 100,
    clientY: 200
  });
  paint();
  h.send('onPointerUp', {
    clientX: 100,
    clientY: 200
  });
  expect(h.result.current.drag.phase).toBe('returning');
  h.rerender({
    ...h.options,
    reduced: true
  });
  expect(h.result.current.drag).toBeNull();
  act(() => vi.advanceTimersByTime(200));
  expect(h.result.current.drag).toBeNull();
});
