// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildMermaidConfig } from '@/lib/mermaid-config';

/* ─────────────────────────────────────────────────────────────────────────────
 * "The label CSS is in force while Mermaid measures" is the load-bearing
 * assumption of the mobile diagram fix, and it is a behavioural claim about
 * Mermaid, not about our own code — so it is tested against the installed
 * Mermaid release instead of being asserted in a comment.
 *
 * Mermaid builds its stylesheet from `themeCSS` and injects it into the diagram
 * (namespaced with the diagram's id) *before* the graph is drawn, and it takes
 * every node size from `div.getBoundingClientRect()` on a label it has already
 * appended to that same document. If either half of that stopped being true —
 * a Mermaid upgrade moving the stylesheet, or the rules losing their
 * `!important` and therefore losing to the inline `white-space: nowrap` — the
 * shapes would be measured with the broken box model while being painted with
 * the fixed one, which is the bug this whole change is about.
 *
 * jsdom has no layout engine, so `getBoundingClientRect`/`getBBox` are stubbed.
 * The assertions are about *ordering and cascade presence*, never about measured
 * pixel sizes, which jsdom cannot produce.
 * ───────────────────────────────────────────────────────────────────────────── */

describe('Mermaid measures labels with our own CSS already applied', () => {
  it('has the wrapping rules in the document when a label box is measured', async () => {
    const mermaid = (await import('mermaid')).default;

    const observed: { connected: boolean; sawWrappingRules: boolean }[] = [];

    const stylesheetMentionsWrapping = () => {
      const styles = Array.from(document.querySelectorAll('style, svg style'));
      return styles.some((style) => {
        const css = style.textContent ?? '';
        return css.includes('foreignObject') && css.includes('max-content');
      });
    };

    const previousRect = Element.prototype.getBoundingClientRect;
    const svgProto = SVGElement.prototype as unknown as { getBBox?: (this: SVGElement) => DOMRect };
    const previousBBox = svgProto.getBBox;

    // A deterministic fake of "a browser measured this box": wide enough that the
    // numbers mermaid derives do not matter, they are not asserted.
    const fakeRect = (element: Element) => {
      const text = (element.textContent ?? '').trim();
      const width = Math.max(1, text.length * 7.3);
      const inline = element.getAttribute('style') ?? '';
      if (/display:\s*table-cell/.test(inline)) {
        observed.push({ connected: element.isConnected, sawWrappingRules: stylesheetMentionsWrapping() });
      }
      return {
        x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0,
        width, height: 21,
        toJSON: () => ({}),
      } as DOMRect;
    };

    Element.prototype.getBoundingClientRect = function () {
      return fakeRect(this);
    };
    svgProto.getBBox = function (this: SVGElement) {
      return fakeRect(this);
    };

    try {
      mermaid.initialize(buildMermaidConfig(false) as never);
      await mermaid.render(
        `measure-css-${Math.random().toString(36).slice(2)}`,
        'flowchart TD\n  A[Client starts the TLS handshake with the gateway] --> B{Session keys valid?}',
      );
    } finally {
      Element.prototype.getBoundingClientRect = previousRect;
      if (previousBBox) {
        svgProto.getBBox = previousBBox;
      } else {
        Reflect.deleteProperty(svgProto, 'getBBox');
      }
    }

    expect(observed.length).toBeGreaterThan(0);
    for (const measurement of observed) {
      // Measured while attached to the document...
      expect(measurement.connected).toBe(true);
      // ...and while the stylesheet that makes a long label wrap inside its own
      // box — rather than overflow past the polygon — was already in the DOM.
      expect(measurement.sawWrappingRules).toBe(true);
    }
  }, 30_000);
});
