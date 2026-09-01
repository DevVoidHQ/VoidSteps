import { describe, it, expect, beforeEach, vi } from 'vitest';

const setWebviewZoom = vi.fn(async (_factor: number) => {});
const isDesktop = vi.fn(() => false);
vi.mock('@/lib/platform', () => ({
  setWebviewZoom: (f: number) => setWebviewZoom(f),
  isDesktop: () => isDesktop(),
}));

const {
  getZoom, setZoom, stepZoom, resetZoom, applyZoom, formatZoom, zoomSupported,
  ZOOM_LEVELS, DEFAULT_ZOOM,
} = await import('./zoom');

beforeEach(() => {
  localStorage.clear();
  setWebviewZoom.mockClear();
  isDesktop.mockReturnValue(false);
});

describe('zoom', () => {
  it('defaults to 100% with nothing stored', () => {
    expect(getZoom()).toBe(DEFAULT_ZOOM);
    expect(DEFAULT_ZOOM).toBe(1);
  });

  it('round-trips every level', () => {
    for (const level of ZOOM_LEVELS) {
      setZoom(level);
      expect(getZoom()).toBe(level);
    }
  });

  it('snaps a junk or off-ladder stored value to the nearest level', () => {
    localStorage.setItem('voidsteps-zoom', 'enormous');
    expect(getZoom()).toBe(DEFAULT_ZOOM);
    localStorage.setItem('voidsteps-zoom', '1.3');
    expect(getZoom()).toBe(1.25);
  });

  it('steps up and down the ladder', () => {
    setZoom(1);
    expect(stepZoom(1)).toBe(1.1);
    expect(stepZoom(1)).toBe(1.25);
    expect(stepZoom(-1)).toBe(1.1);
  });

  it('clamps at both ends instead of wrapping', () => {
    setZoom(ZOOM_LEVELS[0]);
    expect(stepZoom(-1)).toBe(ZOOM_LEVELS[0]);
    setZoom(ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
    expect(stepZoom(1)).toBe(ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
  });

  it('resets to the default', () => {
    setZoom(2);
    expect(resetZoom()).toBe(DEFAULT_ZOOM);
    expect(getZoom()).toBe(DEFAULT_ZOOM);
  });

  it('pushes the stored value at the webview', () => {
    localStorage.setItem('voidsteps-zoom', '1.5');
    applyZoom();
    expect(setWebviewZoom).toHaveBeenCalledWith(1.5);
  });

  it('survives a webview that rejects', async () => {
    setWebviewZoom.mockRejectedValueOnce(new Error('no zoom here'));
    expect(() => setZoom(1.5)).not.toThrow();
    await Promise.resolve();
    expect(getZoom()).toBe(1.5);
  });

  it('levels increase monotonically and include 100%', () => {
    expect(ZOOM_LEVELS).toEqual([...ZOOM_LEVELS].sort((a, b) => a - b));
    expect(new Set(ZOOM_LEVELS).size).toBe(ZOOM_LEVELS.length);
    expect(ZOOM_LEVELS).toContain(DEFAULT_ZOOM);
  });

  it('formats as a rounded percentage', () => {
    expect(formatZoom(1)).toBe('100%');
    expect(formatZoom(0.67)).toBe('67%');
    expect(formatZoom(1.25)).toBe('125%');
  });

  it('is only supported on the desktop shell', () => {
    expect(zoomSupported()).toBe(false);
    isDesktop.mockReturnValue(true);
    expect(zoomSupported()).toBe(true);
  });

  it('notifies listeners on change', () => {
    const seen = vi.fn();
    window.addEventListener('voidsteps-zoom-changed', seen);
    setZoom(1.5);
    expect(seen).toHaveBeenCalled();
    window.removeEventListener('voidsteps-zoom-changed', seen);
  });
});
