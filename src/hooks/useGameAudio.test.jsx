import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGameAudio } from './useGameAudio.jsx';
describe('optional sound lifecycle', () => {
  it('activates only on command, deduplicates tokens, and stops scheduled sound when paused', () => {
    const contexts = [];
    class AudioContextMock {
      constructor() {
        this.state = 'suspended';
        this.currentTime = 1;
        this.destination = {};
        this.oscillators = [];
        contexts.push(this);
      }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
      suspend() {
        this.state = 'suspended';
        return Promise.resolve();
      }
      close() {
        this.state = 'closed';
        return Promise.resolve();
      }
      createOscillator() {
        const node = {
          frequency: {
            value: 0
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        };
        this.oscillators.push(node);
        return node;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
          },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }
    }
    vi.stubGlobal('AudioContext', AudioContextMock);
    const resolution = {
      token: 'audio:1',
      completedLines: { rows: [], columns: [] }, cleared: []
    };
    const props = {
      enabled: true,
      paused: false,
      resolution: null,
      status: 'active'
    };
    const h = renderHook(p => useGameAudio(p.enabled, p.paused, p.resolution, p.status), {
      initialProps: props,
      wrapper: StrictMode
    });
    expect(contexts).toHaveLength(0);
    act(() => h.result.current.activate());
    expect(contexts).toHaveLength(1);
    h.rerender({
      ...props,
      resolution
    });
    expect(contexts[0].oscillators).toHaveLength(2);
    h.rerender({
      ...props,
      resolution: {
        ...resolution
      }
    });
    expect(contexts[0].oscillators).toHaveLength(2);
    h.rerender({
      ...props,
      paused: true,
      resolution
    });
    expect(contexts[0].state).toBe('suspended');
    for (const node of contexts[0].oscillators) {
      expect(node.stop).toHaveBeenCalledTimes(2);
      expect(node.disconnect).toHaveBeenCalledTimes(1);
    }
    act(() => h.result.current.play('clear'));
    expect(contexts[0].oscillators).toHaveLength(2);
    h.unmount();
    expect(contexts[0].state).toBe('closed');
    vi.unstubAllGlobals();
  });
  it('silently handles unavailable Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const h = renderHook(() => useGameAudio(true, false, null, 'active'));
    expect(() => {
      h.result.current.activate();
      h.result.current.play('place');
      h.result.current.suspend();
      h.unmount();
    }).not.toThrow();
    vi.unstubAllGlobals();
  });
});
it('does not hide programming errors as optional audio failures', () => {
  const h = renderHook(() => useGameAudio(true, false, null, 'active'));
  expect(() => h.result.current.play('not-a-sound')).toThrow(RangeError);
  h.unmount();
});
it('handles expected browser audio permission failures at the boundary', () => {
  vi.stubGlobal('AudioContext', class {
    constructor() {
      throw new DOMException('denied', 'NotAllowedError');
    }
  });
  const h = renderHook(() => useGameAudio(true, false, null, 'active'));
  expect(() => h.result.current.activate()).not.toThrow();
  h.unmount();
  vi.unstubAllGlobals();
});
