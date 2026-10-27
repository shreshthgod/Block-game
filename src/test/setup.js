import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => {
  cleanup();
  localStorage.clear();
});
export const activeObservers = new Set();
class ResizeObserverMock {
  observe() {
    activeObservers.add(this);
  }
  disconnect() {
    activeObservers.delete(this);
  }
  unobserve() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
window.scrollTo = vi.fn();
window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));
Element.prototype.setPointerCapture = function () {};
Element.prototype.hasPointerCapture = function () {
  return false;
};
Element.prototype.releasePointerCapture = function () {};
