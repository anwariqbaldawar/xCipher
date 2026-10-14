// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  MERMAID_BASE_FONT_PX,
  MERMAID_LINE_HEIGHT,
  MERMAID_FLOWCHART,
  buildMermaidConfig,
  mermaidLabelCss,
} from '@/lib/mermaid-config';
import {
  mermaidFontsStillLoading,
  onMermaidFontsSettled,
  prepareMermaidMeasurement,
  waitForNextLayoutFrame,
} from '@/lib/mermaid-fonts';

/* ─────────────────────────────────────────────────────────────────────────────
 * The diagram configuration is a contract, not a preference list.
 *
 * Mermaid 12 renders flowcharts with `look: "neo"` by default, and that renderer
 * ignores `flowchart.padding` completely (verified against the installed copy:
 * the same node measured 153.55x43.5 at padding 20 and at padding 60 under neo,
 * versus 201x59 -> 361x139 under classic). Every assertion below therefore pins
 * something that the mobile overflow bug depended on.
 * ───────────────────────────────────────────────────────────────────────────── */

describe('Mermaid diagram configuration', () => {
  const light = buildMermaidConfig(false);
  const dark = buildMermaidConfig(true);

  it('enables HTML labels through the non-deprecated root key', () => {
    expect(light.htmlLabels).toBe(true);
    // `flowchart.htmlLabels` logs FLOWCHART_HTML_LABELS_DEPRECATED on every
    // render in v12; the root key is the supported switch.
    expect((light.flowchart as Record<string, unknown>).htmlLabels).toBeUndefined();
  });

  it('pins the classic look, the only one where node padding expands a box', () => {
    expect(light.look).toBe('classic');
    expect(light.flowchart.look).toBe('classic');
  });

  it('expands node boxes and wraps long labels by default', () => {
    expect(MERMAID_FLOWCHART.padding).toBeGreaterThanOrEqual(18);
    expect(MERMAID_FLOWCHART.wrappingWidth).toBeGreaterThanOrEqual(180);
    expect(MERMAID_FLOWCHART.wrappingWidth).toBeLessThanOrEqual(200);
    expect(MERMAID_FLOWCHART.nodeSpacing).toBeGreaterThan(50);
    expect(MERMAID_FLOWCHART.rankSpacing).toBeGreaterThan(50);
    expect(MERMAID_FLOWCHART.useMaxWidth).toBe(true);
    expect(MERMAID_FLOWCHART.diagramPadding).toBeGreaterThanOrEqual(8);
  });

  it('gives the SVG base font size and the text measurement one value', () => {
    // `themeVariables.fontSize` becomes `#<svgId>{font-size: …}`; the root
    // `fontSize` feeds the text helpers. Different values = measuring one size
    // and painting another.
    expect(light.fontSize).toBe(MERMAID_BASE_FONT_PX);
    expect(light.themeVariables.fontSize).toBe(`${MERMAID_BASE_FONT_PX}px`);
    expect(typeof light.fontSize).toBe('number');
  });

  it('locks label metrics to what Mermaid measures with', () => {
    const css = mermaidLabelCss();
    expect(css).toMatch(/line-height:\s*1\.5\s*!important/);
    expect(MERMAID_LINE_HEIGHT).toBe(1.5);
    // Multi-line wrapping instead of a single overflowing line.
    expect(css).toMatch(/white-space:\s*normal\s*!important/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere\s*!important/);
    expect(css).toMatch(/word-break:\s*break-word\s*!important/);
    // Android/iOS text autosizing must not resize labels after measurement.
    expect(css).toContain('text-size-adjust: 100%');
    // Centred text, and a block box so a long label wraps inside its own width.
    expect(css).toMatch(/text-align:\s*center\s*!important/);
    expect(css).toMatch(/display:\s*block\s*!important/);
  });

  it('replaces the shrink-to-fit label box with one every engine clamps', () => {
    // Mermaid's own box is `display: table-cell` + `max-width`, flipped to
    // `display: table` + `width: <n>px` by an exact float comparison. A block box
    // with `width: max-content` under the same inline `max-width` is clamped
    // identically everywhere, which is what makes a long label wrap instead of
    // spilling past the polygon on Android WebView.
    const css = mermaidLabelCss();
    expect(css).toMatch(/foreignObject[\s\S]{0,200}display:\s*block\s*!important/);
    expect(css).toMatch(/foreignObject[\s\S]{0,200}width:\s*max-content\s*!important/);
  });

  it('never overrides the max-width Mermaid derives from wrappingWidth', () => {
    // Mermaid sets `max-width: <wrappingWidth>px` inline on the label element;
    // that constraint is what makes a long label wrap. A `max-width` of our own
    // (100% of the foreignObject, say) would remove it and the text would run the
    // full width of the 10x-wide foreignObject again.
    const css = mermaidLabelCss();
    // Comments are stripped first: the prose above the rules explains why
    // `max-width` must be left alone, and that explanation is not a declaration.
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const labelBlocks = stripped.split('}').filter(block => /nodeLabel|edgeLabel|foreignObject/.test(block));
    expect(labelBlocks.length).toBeGreaterThan(0);
    for (const block of labelBlocks) {
      expect(block).not.toMatch(/max-width\s*:/);
      // Only the node-label rule may pin a *minimum* width, and only to
      // `minNodeWidth`: Mermaid widens short node labels by writing that number
      // inline, which the `width: max-content` rule above would otherwise drop.
      const minWidth = /min-width\s*:\s*([\d.]+)px\s*!important/.exec(block);
      if (minWidth) {
        expect(block).toMatch(/:has\(/);
        expect(Number(minWidth[1])).toBe(MERMAID_FLOWCHART.minNodeWidth);
      }
      // Negative lookbehind for `line-`: line-height is the point of the lock.
      expect(block).not.toMatch(/(?<!line-)height\s*:/);
      expect(block).not.toMatch(/display:\s*flex/);
      // A literal width would fight the measured one for a one-line label.
      expect(block).not.toMatch(/(^|[\s;{])width\s*:\s*\d/);
    }
  });

  it('keeps the light and dark palettes plus the transparent edge-label boxes', () => {
    expect(dark.theme).toBe('dark');
    expect(light.theme).toBe('base');
    expect(light.themeVariables.primaryColor).not.toBe(dark.themeVariables.primaryColor);
    expect(light.themeCSS).toContain('background: transparent !important');
    expect(light.themeCSS).toMatch(/\.edgePath path[\s\S]*stroke:/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Font + layout readiness
 * ───────────────────────────────────────────────────────────────────────────── */

describe('Mermaid measurement readiness', () => {
  const originalRaf = globalThis.requestAnimationFrame;

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, 'fonts');
    globalThis.requestAnimationFrame = originalRaf;
  });

  it('waits for the label glyphs, then for the layout that uses them', async () => {
    const order: string[] = [];
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        load: vi.fn(async () => { order.push('fonts'); }),
        ready: Promise.resolve().then(() => { order.push('fonts.ready'); }),
        status: 'loaded',
      },
    });
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      order.push('frame');
      return setTimeout(() => cb(0), 0) as unknown as number;
    }) as typeof requestAnimationFrame;

    await prepareMermaidMeasurement('flowchart TD; A-->B');

    // Fonts first, and the layout frames strictly after the font wait: a single
    // wait is not enough, because `fonts.ready` resolves before the browser has
    // re-laid-out the text it just swapped in.
    expect(order.filter(entry => entry === 'fonts')).toHaveLength(3); // 400/700/italic
    expect(order).toContain('fonts.ready');
    const firstFrame = order.indexOf('frame');
    expect(firstFrame).toBeGreaterThan(order.indexOf('fonts.ready'));
    // Two frames: the second is what actually guarantees the post-swap layout.
    expect(order.slice(firstFrame)).toEqual(['frame', 'frame']);
  });

  it('still resolves when the Font Loading API is missing', async () => {
    await expect(prepareMermaidMeasurement('Label')).resolves.toBeUndefined();
    await expect(waitForNextLayoutFrame()).resolves.toBeUndefined();
    expect(mermaidFontsStillLoading()).toBe(false);
    expect(() => onMermaidFontsSettled(() => {})()).not.toThrow();
  });

  it('reports pending font work and can unsubscribe', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load: vi.fn(), ready: Promise.resolve(), status: 'loading', addEventListener, removeEventListener },
    });

    expect(mermaidFontsStillLoading()).toBe(true);
    const unsubscribe = onMermaidFontsSettled(() => {});
    expect(addEventListener).toHaveBeenCalledWith('loadingdone', expect.any(Function));
    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith('loadingdone', expect.any(Function));
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * The shared render path
 * ───────────────────────────────────────────────────────────────────────────── */

const initializeCalls: unknown[] = [];
const renderCalls: string[] = [];
const renderIds: string[] = [];
let renderImpl: () => Promise<{ svg: string }> = async () => ({ svg: '<svg id="fake"></svg>' });

vi.mock('mermaid', () => ({
  default: {
    initialize: (config: unknown) => { initializeCalls.push(config); },
    render: async (id: string, code: string) => {
      renderCalls.push(code);
      renderIds.push(id);
      return renderImpl();
    },
  },
}));

describe('renderMermaidDiagram', () => {
  beforeEach(() => {
    initializeCalls.length = 0;
    renderCalls.length = 0;
    renderIds.length = 0;
    renderImpl = async () => ({ svg: '<svg id="fake"></svg>' });
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load: vi.fn(async () => {}), ready: Promise.resolve(), status: 'loaded' },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'fonts');
  });

  it('initialises with the shared config before rendering', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaid-render');
    const result = await renderMermaidDiagram('flowchart TD\n A-->B', { isDark: false });

    expect(result).toEqual({ svg: '<svg id="fake"></svg>' });
    expect(renderCalls).toEqual(['flowchart TD\n A-->B']);
    expect(initializeCalls).toHaveLength(1);
    expect(initializeCalls[0]).toMatchObject({
      startOnLoad: false,
      htmlLabels: true,
      look: 'classic',
      fontSize: MERMAID_BASE_FONT_PX,
      flowchart: { look: 'classic', wrappingWidth: MERMAID_FLOWCHART.wrappingWidth },
    });
  });

  it('passes the theme through so a dark toggle re-measures', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaid-render');
    await renderMermaidDiagram('flowchart TD\n A-->B', { isDark: true });
    expect(initializeCalls[0]).toMatchObject({ theme: 'dark' });
  });

  it('gives every render its own namespaced SVG id', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaid-render');
    // The id is what Mermaid namespaces its generated <style> and the themeCSS
    // with, so two diagrams on one page must never share one.
    await renderMermaidDiagram('graph TD\n A-->B', { isDark: false, idPrefix: 'mermaid-editor' });
    await renderMermaidDiagram('graph TD\n A-->B', { isDark: false, idPrefix: 'mermaid-editor' });

    expect(renderIds).toHaveLength(2);
    for (const id of renderIds) expect(id.startsWith('mermaid-editor-')).toBe(true);
    expect(new Set(renderIds).size).toBe(2);
  });

  it('discards a result the caller cancelled while it was rendering', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaid-render');
    let cancelled = true;
    const result = await renderMermaidDiagram('graph TD\n A-->B', {
      isDark: false,
      isCancelled: () => cancelled,
    });
    expect(result).toEqual({ svg: '' });
    expect(initializeCalls).toHaveLength(0);
    cancelled = false;
  });

  it('resolves an empty source without touching the DOM', async () => {
    const { renderMermaidDiagram } = await import('@/lib/mermaid-render');
    await expect(renderMermaidDiagram('   ', { isDark: false })).resolves.toEqual({ svg: '' });
    expect(initializeCalls).toHaveLength(0);
  });

  it('returns a message instead of throwing on invalid syntax', async () => {
    renderImpl = async () => { throw new Error('Parse error on line 2'); };
    const { renderMermaidDiagram } = await import('@/lib/mermaid-render');
    await expect(renderMermaidDiagram('not a diagram', { isDark: false }))
      .resolves.toEqual({ svg: '', error: 'Parse error on line 2' });
  });

  it('reports a non-Error throw as an error message too', async () => {
    renderImpl = async () => { throw 'boom'; };
    const { renderMermaidDiagram } = await import('@/lib/mermaid-render');
    await expect(renderMermaidDiagram('graph TD; A-->B', { isDark: false }))
      .resolves.toEqual({ svg: '', error: 'boom' });
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Stylesheet + integration contracts
 * ───────────────────────────────────────────────────────────────────────────── */

describe('Mermaid stylesheet isolation', () => {
  const root = process.cwd();
  const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  // Comments are stripped so a structural regex cannot be satisfied (or blocked)
  // by prose: the header of this section explains the fix in words.
  const mermaidCss = css
    .slice(css.indexOf('MERMAID DIAGRAMS — isolation'))
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('is present at all', () => {
    expect(mermaidCss.length).toBeGreaterThan(1000);
  });

  it('stops Android/iOS text inflation and prose scaling inside diagrams', () => {
    expect(mermaidCss).toMatch(/\.mermaid-wrapper,[\s\S]*?text-size-adjust:\s*100%/);
    expect(mermaidCss).toMatch(/\.mermaid-wrapper svg,[\s\S]*?font-size:\s*14px/);
    expect(mermaidCss).toMatch(/not-prose\.mermaid-wrapper[\s\S]*?line-height:\s*1\.5\s*!important/);
  });

  it('lets labels wrap and never clips them at the shape or SVG edge', () => {
    const labelRule = mermaidCss.slice(mermaidCss.indexOf('.mermaid-wrapper .nodeLabel'));
    expect(labelRule).toMatch(/white-space:\s*normal\s*!important/);
    expect(labelRule).toMatch(/overflow-wrap:\s*anywhere\s*!important/);
    expect(labelRule).toMatch(/word-break:\s*break-word\s*!important/);
    expect(labelRule).toMatch(/line-height:\s*1\.5\s*!important/);
    expect(mermaidCss).toMatch(/foreignObject[\s\S]{0,120}overflow:\s*visible\s*!important/);
    expect(mermaidCss).toMatch(/\.mermaid-svg-container svg\s*\{[\s\S]{0,220}overflow:\s*visible\s*!important/);
  });

  it('never re-imposes the width/height that caused the overflow', () => {
    // The previous stylesheet forced the label element to `display: flex` with
    // `width: 100%` / `height: 100%` — 100% of a foreignObject that Mermaid sizes
    // to ten times the measured label width. The text was then centred inside a
    // box ten times too wide and painted outside the polygon.
    const labelRules = mermaidCss
      .split('}')
      .filter(block => /\.nodeLabel|foreignObject|\.edgeLabel\s*\{|\.edgeLabel,/.test(block));
    expect(labelRules.length).toBeGreaterThan(0);
    for (const block of labelRules) {
      expect(block).not.toMatch(/width:\s*100%\s*!important/);
      expect(block).not.toMatch(/height:\s*100%\s*!important/);
      expect(block).not.toMatch(/display:\s*flex/);
    }
  });

  it('keeps the same metric values as the in-SVG themeCSS', () => {
    // The SVG carries its own copy (it has to: Mermaid measures before the SVG
    // is inside our wrapper, so only the themeCSS is in force during
    // measurement). Drift between the two is how this bug comes back.
    const labelCss = mermaidLabelCss();
    for (const declaration of ['line-height: 1.5', 'white-space: normal', 'overflow-wrap: anywhere', 'word-break: break-word']) {
      expect(labelCss.replace(/\s+/g, ' ')).toContain(declaration);
      expect(mermaidCss.replace(/\s+/g, ' ')).toContain(declaration);
    }
  });
});

describe('both renderers share one path', () => {
  const root = process.cwd();
  const files = [
    'components/article/FrontendMermaidViewer.tsx',
    'components/editorial/extensions/MermaidNodeView.tsx',
  ];

  it.each(files)('%s renders through lib/mermaid-render', file => {
    const source = readFileSync(path.join(root, file), 'utf8');
    expect(source).toContain("from '@/lib/mermaid-render'");
    // No local config: a second `initialize` call is exactly how the editor and
    // the article page drifted apart on font size and padding.
    expect(source).not.toContain('mermaid.initialize(');
    expect(source).not.toContain("await import('mermaid')");
  });

  it.each(files)('%s re-renders when the container resizes or a font lands late', file => {
    const source = readFileSync(path.join(root, file), 'utf8');
    expect(source).toContain('useMermaidRenderTrigger');
  });
});
