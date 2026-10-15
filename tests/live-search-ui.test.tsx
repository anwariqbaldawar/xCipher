// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SearchProvider, SearchButton } from "@/components/search/SearchOverlay";
import InstantSearchInput from "@/components/search/InstantSearchInput";
import type { LiveSearchResult } from "@/lib/search-types";

// ─────────────────────────────────────────────────────────────────────────────
// Live search interaction model
//
// These are the behaviours the old search flow could not do: results while the
// reader is still typing, arrow-key navigation, Enter to open the highlighted
// story, and a real empty state. The network is mocked at `fetch`, so the
// assertions cover the debounce, the abort/ordering guard and the keyboard
// model rather than the SQL.
// ─────────────────────────────────────────────────────────────────────────────

const push = vi.fn();
const prefetch = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// eslint-disable-next-line @next/next/no-img-element -- next/image adds a loader
// indirection that has nothing to do with what these tests assert.
vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    <img src={typeof src === "string" ? src : ""} alt={alt} {...rest} />
  ),
}));

const result = (overrides: Partial<LiveSearchResult> = {}): LiveSearchResult => ({
  id: "a1",
  slug: "graph-neural-networks",
  title: "Graph neural networks explained",
  url: "/article/graph-neural-networks",
  excerpt: "How message passing actually works.",
  image: "https://media.xsypher.com/cdn-cgi/image/width=300/hero.webp",
  imageKey: "2026/02/hero.webp",
  publishedAt: new Date("2026-02-01T09:00:00Z").toISOString(),
  readingTime: 7,
  categoryName: "AI",
  categorySlug: "ai",
  authorName: "Anwar Iqbal Dawar",
  authorSlug: "anwar-iqbal-dawar",
  authorAvatar: null,
  matchField: "title",
  matchLabel: "Title match",
  matchedTags: [],
  score: 80,
  ...overrides,
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let container: HTMLDivElement;
let root: Root;
let fetchMock: Mock;

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom does not implement scrollIntoView; the component guards for that, but
  // stubbing it here also exercises the scroll-into-view path.
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  fetchMock = vi.fn().mockResolvedValue(jsonResponse({ query: "graph", results: [result()], count: 1, took: 4 }));
  vi.stubGlobal("fetch", fetchMock);
  push.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount(element: React.ReactElement) {
  await act(() => root.render(element));
}

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function settle(ms = 300) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    // Let the mocked promise chain resolve inside the act() window.
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("⌘K search overlay", () => {
  it("opens from the header button and searches as the reader types", async () => {
    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);

    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(document.activeElement).toBe(input);

    await type(input, "gr");
    expect(fetchMock).not.toHaveBeenCalled(); // debounce has not elapsed yet

    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/search?q=gr&limit=8");

    const row = container.querySelector('[role="option"]')!;
    expect(row.textContent).toContain("Graph neural networks explained");
    expect(row.textContent).toContain("AI");
    expect(row.textContent).toContain("Anwar Iqbal Dawar");
    // No match-type badge: the "why it matched" chip was removed, so the row
    // shows the section pill only.
    expect(row.textContent).not.toContain("Title match");
    expect(container.querySelector(".search-row-match")).toBeNull();
    // The thumbnail 是 the server-resolved R2 transform, not the raw original.
    expect(container.querySelector<HTMLImageElement>(".search-row-thumb")?.getAttribute("src"))
      .toContain("/cdn-cgi/image/");
  });

  it("coalesces a burst of keystrokes into one request per debounce window", async () => {
    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    await type(input, "g");
    await type(input, "gr");
    await settle(100);
    await type(input, "gra");
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("q=gra");
  });

  it("navigates with arrows, opens with Enter and closes with Escape", async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      query: "graph",
      results: [
        result(),
        result({ id: "a2", slug: "second-story", title: "Second story", url: "/article/second-story" }),
      ],
      count: 2,
    }));

    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    await type(input, "graph");
    await settle();

    expect(input.getAttribute("aria-activedescendant")).toBe("site-search-option-0");

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(input.getAttribute("aria-activedescendant")).toBe("site-search-option-1");

    // Wrapping: down from the last row returns to the first.
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(input.getAttribute("aria-activedescendant")).toBe("site-search-option-0");

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    expect(input.getAttribute("aria-activedescendant")).toBe("site-search-option-1");

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(push).toHaveBeenCalledWith("/article/second-story");

    // Escape closes without navigating.
    push.mockReset();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector(".search-overlay")!.className).not.toContain("is-open");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows no keyboard shortcut hints in the input or a footer legend", async () => {
    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);

    expect(container.querySelector(".search-kbd")).toBeNull();
    expect(container.querySelector(".search-kbd-sm")).toBeNull();
    expect(container.querySelector(".search-panel-foot")).toBeNull();
    expect(container.textContent).not.toContain("⌘K");
  });

  it("highlights the matched characters in the author name, in red text only", async () => {
    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    await type(input, "anwar");
    await settle();

    const authorMark = container.querySelector(".search-row-meta .search-mark");
    expect(authorMark).not.toBeNull();
    expect(authorMark!.textContent?.toLowerCase()).toBe("anwar");
  });

  it("closes the modal when 'See all results' is clicked and navigates to /search", async () => {
    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    await type(input, "graph");
    await settle();

    const seeAll = container.querySelector<HTMLAnchorElement>(".search-footer-link")!;
    expect(seeAll).not.toBeNull();
    expect(seeAll.textContent).toContain("See all results");

    await act(async () => { seeAll.click(); });

    expect(push).toHaveBeenCalledWith("/search?q=graph");
    expect(container.querySelector(".search-overlay")!.className).not.toContain("is-open");
  });

  it("offers a labelled Clear action only while text is typed, distinct from Close", async () => {
    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    // Nothing typed: no clear affordance. The close control is always there.
    expect(container.querySelector(".search-input-clear")).toBeNull();
    expect(container.querySelector(".search-close")).not.toBeNull();

    await type(input, "graph");
    await settle();

    const clearButton = container.querySelector<HTMLButtonElement>(".search-input-clear")!;
    expect(clearButton).not.toBeNull();
    expect(clearButton.textContent).toContain("Clear");
    expect(clearButton.getAttribute("aria-label")).toBe("Clear search");
    expect(clearButton).not.toBe(container.querySelector(".search-close"));

    await act(async () => { clearButton.click(); });
    expect(input.value).toBe("");
    expect(container.querySelector(".search-input-clear")).toBeNull();
  });

  it("shows the empty state, and Enter with no highlight runs the full search", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ query: "zzzz", results: [], count: 0 }));

    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    await type(input, "zzzz");
    await settle();

    expect(container.textContent).toContain("No results for");
    expect(container.querySelector('[role="option"]')).toBeNull();

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(push).toHaveBeenCalledWith("/search?q=zzzz");
  });

  it("renders skeleton rows while a request is in flight", async () => {
    let release: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation(() => new Promise<Response>(resolve => { release = resolve; }));

    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    await type(input, "graph");
    await settle();

    expect(container.querySelectorAll(".search-row-skeleton").length).toBeGreaterThan(0);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();

    await act(async () => {
      release?.(jsonResponse({ query: "graph", results: [result()], count: 1 }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelectorAll(".search-row-skeleton")).toHaveLength(0);
    expect(container.querySelector('[role="option"]')).not.toBeNull();
  });

  it("surfaces a rate-limit response as a message rather than a crash", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ query: "graph", results: [], error: "rate_limited" }, 429));

    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    await type(input, "graph");
    await settle();

    expect(container.textContent).toContain("Too many searches just now");
  });
});

describe("inline instant search on /search", () => {
  it("seeds from the URL, opens a dropdown on focus and keeps the form as a fallback", async () => {
    await mount(<InstantSearchInput initialQuery="graph" />);
    await settle();

    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input.value).toBe("graph");
    expect(container.querySelector(".search-dropdown-glass")).toBeNull();

    // focus() rather than a synthetic FocusEvent: React 19 delegates onFocus
    // through focusin, which jsdom only emits for a real focus change.
    await act(async () => {
      input.focus();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector(".search-dropdown-glass")).not.toBeNull();
    expect(container.querySelector('[role="option"]')).not.toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Mobile dismissal + the history trap
 *
 * A phone has no Esc key, and on mobile the sheet is the whole viewport, so
 * the desktop affordances (Escape, click the backdrop off the glass, ⌘K) are
 * all out of reach: it needs a visible close control, a tap-outside gesture, and a
 * system Back that closes the sheet instead of leaving the story.
 * ───────────────────────────────────────────────────────────────────────────── */

describe("mobile dismissal", () => {
  let back: MockInstance<() => void>;

  beforeEach(() => {
    back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  });

  afterEach(() => {
    // jsdom keeps one window (and its history stack) for the whole file.
    window.history.replaceState(null, "");
    vi.restoreAllMocks();
  });

  const overlay = () => container.querySelector(".search-overlay")!;
  const isOpen = () => overlay().className.includes("is-open");

  async function openPanel() {
    await mount(<SearchProvider><SearchButton /></SearchProvider>);
    await act(async () => { container.querySelector("button")!.click(); });
    await settle(60);
  }

  it("shows a labelled close control that closes the panel", async () => {
    await openPanel();
    expect(isOpen()).toBe(true);

    const closeButton = container.querySelector<HTMLButtonElement>(".search-close")!;
    expect(closeButton).not.toBeNull();
    expect(closeButton.getAttribute("aria-label")).toBe("Close search");
    expect(closeButton.querySelector("svg")).not.toBeNull();

    await act(async () => { closeButton.click(); });
    expect(isOpen()).toBe(false);
  });

  it("pushes a disposable history entry on open and spends it on close", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    await openPanel();

    // One entry, tagged so the popstate listener knows it is ours, carrying
    // Next's own history state so the router can still resolve the entry.
    expect(pushState).toHaveBeenCalledTimes(1);
    expect((window.history.state as { searchOpen?: boolean }).searchOpen).toBe(true);

    await act(async () => { container.querySelector<HTMLButtonElement>(".search-close")!.click(); });
    expect(back).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(false);
  });

  it("closes on a system Back / back-swipe without leaving the story", async () => {
    await openPanel();
    expect(isOpen()).toBe(true);
    // The reader's own Back, not our unwind: the entry is still owned.
    expect(back).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(isOpen()).toBe(false);
    // Closing it again must not fire a second traversal, or Back would need two
    // presses to leave the page.
    await act(async () => { container.querySelector<HTMLButtonElement>(".search-close")!.click(); });
    expect(back).not.toHaveBeenCalled();
  });

  it("collapses the entry in place when a close is followed by navigation", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    await openPanel();

    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await type(input, "graph");
    await settle();

    await act(async () => { container.querySelector<HTMLElement>('[role="option"]')!.click(); });

    // Popping would race router.push, so the entry is rewritten without the tag
    // and Next's own keys.
    expect(push).toHaveBeenCalledWith("/article/graph-neural-networks");
    expect(back).not.toHaveBeenCalled();
    const rewritten = replaceState.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(rewritten.searchOpen).toBeUndefined();
  });

  it("dismisses when the empty area under the results is tapped", async () => {
    await openPanel();
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await type(input, "graph");
    await settle();
    expect(container.querySelector('[role="option"]')).not.toBeNull();

    const list = container.querySelector<HTMLElement>(".search-results")!;
    await act(async () => { list.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(isOpen()).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("still opens the story when a result row is tapped", async () => {
    await openPanel();
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await type(input, "graph");
    await settle();

    await act(async () => { container.querySelector<HTMLElement>('[role="option"]')!.click(); });

    // A row click bubbles through the list container; only a hit on the
    // container itself counts as "tapped outside".
    expect(push).toHaveBeenCalledWith("/article/graph-neural-networks");
    expect(isOpen()).toBe(false);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Stylesheet contract
 *
 * The glassmorphism surface lives in app/globals.css, so a renamed class in a
 * component would silently render an unstyled row (or an always-visible panel)
 * without failing any behavioural test. These read the stylesheet the way the
 * browser will.
 * ───────────────────────────────────────────────────────────────────────────── */

describe("live search stylesheet", () => {
  // jsdom rewrites import.meta.url to an http URL, so resolve from the repo root.
  const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");
  const css = read("app/globals.css");

  it("styles every search-* class the components render", () => {
    const files = [
      "components/search/SearchOverlay.tsx",
      "components/search/SearchResultList.tsx",
      "components/search/InstantSearchInput.tsx",
      "app/(public)/search/page.tsx",
    ];

    const used = new Set<string>();
    for (const file of files) {
      const source = read(file);
      for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        for (const chunk of [match[1], match[2]]) {
          for (const token of (chunk || "").split(/\s+/)) {
            if (token.includes("search-") || token === "is-open" || token === "is-closing") {
              used.add(token);
            }
          }
        }
      }
    }

    // Guards against the assertion below passing because nothing was extracted.
    expect(used.size).toBeGreaterThan(20);

    const unstyled = [...used].filter(token => !css.includes(`.${token}`));
    expect(unstyled).toEqual([]);
  });

  it("keeps the closed panel out of the tab order and honours reduced motion", () => {
    // Mounted-but-closed: opacity 0 alone would leave every link focusable.
    expect(css).toMatch(/\.search-overlay\s*\{[^}]*visibility:\s*hidden/);
    expect(css).toMatch(/\.search-overlay\.is-open\s*\{[^}]*visibility:\s*visible/);
    expect(css).toMatch(/\.search-overlay\.is-closing\s*\{[^}]*pointer-events:\s*none/);

    // Backdrop blur is what makes the surface glass rather than a grey box.
    expect(css).toMatch(/\.search-panel-glass,\s*\.search-dropdown-glass\s*\{[^}]*backdrop-filter:\s*blur\(/);
    expect(css).toMatch(/\.search-panel-glass,\s*\.search-dropdown-glass\s*\{[^}]*var\(--glass-border\)/);
    const searchBlock = css.slice(css.indexOf("LIVE INSTANT SEARCH"));
    const reducedMotion = searchBlock.slice(searchBlock.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(searchBlock).toContain("@media (prefers-reduced-motion: reduce)");
    expect(reducedMotion).toContain(".search-overlay");
    expect(reducedMotion).toContain(".search-panel-glass");
    expect(reducedMotion).toContain(".search-close");
  });

  it("renders matched characters as red text with no highlight background", () => {
    const mark = /\.search-mark\s*\{([^}]*)\}/.exec(css)![1];
    expect(mark).toMatch(/background:\s*transparent/);
    expect(mark).toMatch(/color:\s*var\(--accent\)/);
    expect(mark).not.toMatch(/background:\s*var\(--accent/);

    // The removed chrome stays removed: no match badges, no kbd hints, no
    // keyboard legend bar.
    expect(css).not.toContain(".search-row-match");
    expect(css).not.toContain(".search-panel-foot");
    expect(css).not.toContain(".search-kbd");
  });

  it("gives the close control a real tap target and the list the empty space to dismiss on", () => {
    const close = /\.search-close\s*\{([^}]*)\}/.exec(css)![1];
    expect(close).toMatch(/width:\s*44px/);
    expect(close).toMatch(/height:\s*44px/);
    expect(close).toMatch(/flex:\s*none/);

    // On a phone the sheet is the viewport, so the list has to grow into the
    // panel's leftovers for a tap under the last row to land on it at all.
    const results = /\.search-results\s*\{([^}]*)\}/.exec(css)![1];
    expect(results).toMatch(/flex:\s*1 1 auto/);
  });
});
