/**
 * The one Mermaid configuration used by every renderer in this project.
 *
 * Why this file exists
 * --------------------
 * The editor preview and the public article page each had their own inline
 * `mermaid.initialize({...})` call, and the two disagreed on font size, node
 * padding and wrapping width. A diagram therefore looked different in the
 * editor than on the published page, and neither could be reasoned about
 * without reading both components.
 *
 * Every number below is pinned against how Mermaid 12 actually measures and
 * paints HTML labels, which was inspected in `node_modules/mermaid/dist` rather
 * than assumed:
 *
 *  1. `src/rendering-util/createText.ts` -> `addHtmlSpan()` builds a node label as
 *       <foreignObject><div style="display: table-cell; white-space: nowrap;
 *         line-height: 1.5; max-width: <wrappingWidth>px; text-align: center">
 *         <span class="nodeLabel">…</span></div></foreignObject>
 *     and then takes the node's bounding box from `div.getBoundingClientRect()`.
 *     So the box a shape is sized around is measured with **`line-height: 1.5`
 *     and `white-space: nowrap`**. If the page then paints those labels with a
 *     different line-height or lets them stay `nowrap` while the webfont renders
 *     wider than the fallback used at measurement time, the text spills out of
 *     the shape — that is the mobile clipping bug.
 *
 *  2. `MermaidConfig` defaults (dist/chunks/…/chunk-O7XYJQB3.mjs) give
 *     **flowchart `look: "neo"`** (the root default is `classic`), and the neo
 *     renderer ignores `flowchart.padding` completely — it hard-codes 16/12
 *     (`labelPaddingX/Y = node.look === "neo" ? 16 : nodePadding`). Measured in a
 *     jsdom probe, one node rendered 153.55×43.5 at `padding: 20` and
 *     153.55×43.5 at `padding: 60` under neo, versus 201×59 → 361×139 under
 *     classic. So `look: "classic"` is pinned here: it is the only look in which
 *     node padding expands the box, which is the whole point of the defaults
 *     below.
 *
 *  3. `flowchart.htmlLabels` is deprecated in v12 and logs
 *     `FLOWCHART_HTML_LABELS_DEPRECATED` on every render; the root-level
 *     `htmlLabels` is the supported switch (`getEffectiveHtmlLabels()` reads
 *     `config.htmlLabels ?? config.flowchart?.htmlLabels ?? true`). Only the root
 *     key is set here, on purpose.
 *
 *  4. `themeCSS` is compiled with every selector prefixed by the diagram's own
 *     id (`compileCSS(svgId, …)`), so rules written here are scoped to that one
 *     SVG and — importantly — are already in effect while Mermaid measures,
 *     because measurement happens inside the same temporary `<svg id>`. That is
 *     what keeps "measured" and "painted" the same layout instead of two
 *     different ones.
 *
 *  5. `themeVariables.fontSize` is what ends up in the generated
 *     `#<svgId>{font-size: …}` rule; the root `fontSize` is what the text
 *     helpers use. Both are set from the same constant so they cannot drift.
 */

/** The publication's UI stack, resolved from the theme tokens. */
export const MERMAID_FONT_STACK =
  'var(--f-ui), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Base label font size in px.
 *
 * Fixed in px, not in `rem`/`em`, so the article's A−/A+ text scaler
 * (`lib/fontSize.ts` writes `--prose-fs` on `<html>`) and Android's text
 * autosizing cannot change the size of text inside an SVG that was already
 * measured and drawn at a different size.
 */
export const MERMAID_BASE_FONT_PX = 14;

/**
 * Line height Mermaid measures HTML labels with (`addHtmlSpan` hard-codes 1.5).
 * The stylesheet and `themeCSS` below must use this exact value — a "nicer"
 * 1.2/1.3 makes every measured box the wrong height.
 */
export const MERMAID_LINE_HEIGHT = 1.5;

/** Whitespace Mermaid leaves around the graph inside its own SVG viewport. */
export const MERMAID_DIAGRAM_PADDING = 14;

/**
 * Flowchart defaults. Applied to every diagram the author draws, so nothing has
 * to be typed by hand:
 *
 *  - `padding: 20` — the box around a label. Because classic look is pinned,
 *    this genuinely expands both axes (see note 2 above).
 *  - `wrappingWidth: 190` — the width past which a label wraps onto the next
 *    line. Mermaid's default is 120, which turned ordinary sentences into a
 *    tall stack of two-word lines; 190 keeps a 14px label readable while still
 *    wrapping before the box reaches the edges of a phone viewport.
 *  - `nodeSpacing` / `rankSpacing` — breathing room between sibling nodes and
 *    between ranks. Raised from the 50/50 default so expanded boxes never touch.
 *  - `useMaxWidth: true` — the SVG keeps its aspect ratio and scales down to the
 *    article column instead of overflowing it.
 *  - `minNodeWidth: 120` — Mermaid's own default; labels narrower than this are
 *    widened so a short "Start" node is not a speck next to a long one.
 */
export const MERMAID_FLOWCHART = {
  look: "classic",
  useMaxWidth: true,
  padding: 20,
  wrappingWidth: 190,
  nodeSpacing: 60,
  rankSpacing: 70,
  minNodeWidth: 120,
  diagramPadding: MERMAID_DIAGRAM_PADDING,
} as const;

/**
 * Label CSS that travels inside the SVG (see note 4 — scoped to the diagram by
 * Mermaid, and in force during measurement as well as paint).
 *
 * The wrapping declarations are deliberately `!important`: Mermaid's inline
 * `white-space: nowrap` must lose. When the fonts and the measurement are
 * correct this changes nothing — a label that fits stays on one line — but when
 * a font renders wider than anything measured (late webfont, Android text
 * autosizing, a user font override) the label wraps inside its box instead of
 * running out past the edge of the polygon.
 *
 * `line-height: 1.5` matches what Mermaid measured with, so the painted block
 * occupies exactly the height the shape was sized for.
 *
 * `width`/`max-width` (see the `foreignObject > div` rule): Mermaid's own
 * `max-width: <wrappingWidth>px` is kept — it is the constraint that makes
 * wrapping happen at all — while the *box* model is replaced with one that
 * clamps to that constraint identically in every engine.
 */
export function mermaidLabelCss(): string {
  return `
    .nodeLabel, .edgeLabel,
    .nodeLabel span, .edgeLabel span,
    .nodeLabel p, .edgeLabel p {
      font-family: ${MERMAID_FONT_STACK} !important;
      font-size: ${MERMAID_BASE_FONT_PX}px !important;
      line-height: ${MERMAID_LINE_HEIGHT} !important;
      letter-spacing: normal !important;
      white-space: normal !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      text-wrap: wrap !important;
      text-align: center !important;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    /* Mermaid paints each label as a shrink-to-fit table-cell box, inline
       "white-space: nowrap" plus "max-width: <wrappingWidth>px", and flips it to
       a table with "white-space: break-spaces" and a literal width only when the
       measured box landed exactly on that cap.

       Two things go wrong with that on a phone:
        (a) a shrink-to-fit table box is not clamped by max-width the same way in
            every engine, and the Android WebView measures the label in whatever
            font is available at that instant, so the box a shape is sized around
            can end up narrower than the text finally painted inside it;
        (b) "break-spaces" only breaks at spaces, so one long token — a hostname,
            AES-256-GCM, a URL — runs straight past the polygon.

       A block box with "width: max-content" under the same max-width behaves
       identically in every engine: natural width for a short label, wrapped and
       word-broken text inside <wrappingWidth>px for a long one. Because this CSS
       is scoped to the diagram and already in force while Mermaid measures
       (note 4), the measured box and the painted box are the same box. */
    foreignObject > div {
      display: block !important;
      width: max-content !important;
      margin: 0 !important;
      text-align: center !important;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    /* The flowchart "minNodeWidth" setting is applied by Mermaid writing
       "width: <min>px" inline, which the rule above deliberately outranks; the
       intent is kept declaratively instead, and only for node labels so an edge
       label does not grow a 120px background bar behind the word "yes". */
    foreignObject > div:has(> span.nodeLabel) {
      min-width: ${MERMAID_FLOWCHART.minNodeWidth}px !important;
    }

    .nodeLabel p, .edgeLabel p {
      margin: 0 !important;
    }
  `;
}

/**
 * Theme-dependent colours plus the geometry-neutralising rules that were
 * already in place (the neo look's drop shadows, and the transparent edge-label
 * boxes that the article typography would otherwise fight).
 */
export function mermaidThemeCss(isDark: boolean): string {
  const text = isDark ? "#ffffff" : "#111111";
  const line = isDark ? "#e0e0e0" : "#333333";

  return `
    .node rect, .node circle, .node ellipse, .node polygon, .node path, .cluster rect {
      filter: none !important;
      box-shadow: none !important;
    }

    ${mermaidLabelCss()}

    /* Edge labels sit on the connector: no box, no background, no border. */
    .edgeLabel,
    .edgeLabel *,
    .edgeLabel span,
    .edgeLabel p,
    .edgeLabel div,
    .edgeLabel rect,
    .label rect,
    .labelBkg,
    rect.label-container {
      background: transparent !important;
      background-color: transparent !important;
      fill: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }

    .edgeLabel,
    .edgeLabel *,
    .edgeLabel span,
    .edgeLabel p,
    .edgeLabel div,
    .edgeLabel text,
    .edgeLabel tspan {
      color: ${text} !important;
      fill: ${text} !important;
      font-weight: 500 !important;
    }

    .edgePath path, .flowchart-link {
      stroke: ${line} !important;
    }
  `;
}

/**
 * Theme tokens for the box and connector colours. Kept separate from the
 * structural config so both diagrams' palettes stay in one place.
 *
 * `fontSize` is a string here because that is what lands verbatim in the
 * generated `#<svgId>{font-size: …}` rule; there is no `lineHeight` theme
 * variable in Mermaid 12 (the base Theme class exposes only `fontFamily` and
 * `fontSize`), so the line-height lock lives in `themeCSS`/the stylesheet where
 * it actually has an effect.
 */
export function mermaidThemeVariables(isDark: boolean) {
  return {
    fontFamily: MERMAID_FONT_STACK,
    fontSize: `${MERMAID_BASE_FONT_PX}px`,
    primaryColor: isDark ? "#1a1a1a" : "#f2f2f2",
    primaryBorderColor: isDark ? "#2d2d2d" : "#e6e6e6",
    primaryTextColor: isDark ? "#ffffff" : "#111111",
    lineColor: isDark ? "#e0e0e0" : "#333333",
    edgeLabelBackground: "transparent",
    labelBackground: "transparent",
    tertiaryColor: "transparent",
  };
}

/**
 * The complete `mermaid.initialize()` argument.
 *
 * Both call sites (editor preview and article page) use this and nothing else,
 * which is what makes the two render identically.
 */
export function buildMermaidConfig(isDark: boolean) {
  return {
    startOnLoad: false,
    // Root key only: `flowchart.htmlLabels` is deprecated in v12 and warns on
    // every render (see note 3 in the file header).
    htmlLabels: true,
    look: "classic",
    theme: isDark ? ("dark" as const) : ("base" as const),
    fontSize: MERMAID_BASE_FONT_PX,
    fontFamily: MERMAID_FONT_STACK,
    themeVariables: mermaidThemeVariables(isDark),
    themeCSS: mermaidThemeCss(isDark),
    flowchart: { ...MERMAID_FLOWCHART },
  };
}
