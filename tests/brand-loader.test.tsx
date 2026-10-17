// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import BrandLoader from "@/components/common/BrandLoader";

(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;

describe("BrandLoader", () => {
  it("renders the 4-boxes mark with the crimson X quadrant and telemetry", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<BrandLoader status="INITIALIZING EDITORIAL CONSOLE..." />);
    });

    // Four quadrants: three neutral + the crimson X cell.
    const cells = container.querySelectorAll(".brand-loader-cell");
    expect(cells).toHaveLength(4);
    expect(container.querySelector(".brand-loader-cell-x")).toBeTruthy();
    expect(container.querySelector(".brand-loader-cell-x svg")).toBeTruthy();

    // The overlay is pinned to the viewport with the telemetry line.
    expect(container.querySelector(".brand-loader-overlay")).toBeTruthy();
    expect(container.textContent).toContain("INITIALIZING EDITORIAL CONSOLE");
    expect(container.querySelector(".brand-loader-cursor")).toBeTruthy();
    expect(container.querySelector(".brand-loader")!.getAttribute("aria-label")).toBe(
      "INITIALIZING EDITORIAL CONSOLE...",
    );

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders inline without the viewport overlay", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<BrandLoader status="LOADING..." mode="inline" />);
    });

    expect(container.querySelector(".brand-loader-overlay")).toBeNull();
    expect(container.querySelector(".brand-loader")).toBeTruthy();
    expect(container.textContent).toContain("LOADING");

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
