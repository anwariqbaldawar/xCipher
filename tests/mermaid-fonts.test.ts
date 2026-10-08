// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForMermaidFonts } from '@/lib/mermaid-fonts';

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('--f-ui');
  Reflect.deleteProperty(document, 'fonts');
});

describe('Mermaid font measurement', () => {
  it('waits for label glyphs and final font layout before measuring', async () => {
    document.documentElement.style.setProperty('--f-ui', '"Plus Jakarta Sans", sans-serif');
    let finishLoad!: () => void;
    let finishLayout!: () => void;
    const load = vi.fn(() => new Promise<void>(resolve => { finishLoad = resolve; }));
    const ready = new Promise<void>(resolve => { finishLayout = resolve; });
    // All requested weights share a download in a variable font.
    const download = load();
    load.mockReturnValue(download);
    load.mockClear();
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load, ready } });

    let measured = false;
    const render = waitForMermaidFonts('or another ML-KEM hybrid').then(() => { measured = true; });
    expect(load.mock.calls).toEqual([
      ['400 16px "Plus Jakarta Sans", sans-serif', 'or another ML-KEM hybrid'],
      ['700 16px "Plus Jakarta Sans", sans-serif', 'or another ML-KEM hybrid'],
      ['italic 400 16px "Plus Jakarta Sans", sans-serif', 'or another ML-KEM hybrid'],
    ]);
    expect(measured).toBe(false);
    finishLoad();
    await Promise.resolve();
    expect(measured).toBe(false);
    finishLayout();
    await render;
    expect(measured).toBe(true);
  });

  it('allows settled fallback fonts when a web font download fails', async () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load: vi.fn().mockRejectedValue(new Error('offline')), ready: Promise.resolve() },
    });
    await expect(waitForMermaidFonts('Label')).resolves.toBeUndefined();
  });

  it('supports environments without the Font Loading API', async () => {
    await expect(waitForMermaidFonts('Label')).resolves.toBeUndefined();
  });
});
