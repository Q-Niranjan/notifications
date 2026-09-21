import { describe, expect, it } from "vitest";
import { visibleControls } from "@/shared/utils/visibleControls";

function button(options?: {
  ariaHidden?: boolean;
  width?: number;
  height?: number;
  rects?: number;
}) {
  const el = document.createElement("button");
  if (options?.ariaHidden) el.setAttribute("aria-hidden", "true");
  Object.defineProperty(el, "offsetWidth", {
    get: () => options?.width ?? 0,
  });
  Object.defineProperty(el, "offsetHeight", {
    get: () => options?.height ?? 0,
  });
  el.getClientRects = () =>
    ({
      length: options?.rects ?? 0,
    }) as DOMRectList;
  return el;
}

describe("visibleControls", () => {
  it("keeps visible controls and drops hidden or empty ones", () => {
    const dialog = document.createElement("div");
    const byWidth = button({ width: 10 });
    const byHeight = button({ width: 0, height: 8 });
    const byRects = button({ width: 0, height: 0, rects: 1 });
    const hidden = button({ width: 10, ariaHidden: true });
    const empty = button({ width: 0, height: 0, rects: 0 });
    const disabled = document.createElement("button");
    disabled.disabled = true;
    Object.defineProperty(disabled, "offsetWidth", { get: () => 10 });

    dialog.append(byWidth, byHeight, byRects, hidden, empty, disabled);

    expect(visibleControls(dialog)).toEqual([byWidth, byHeight, byRects]);
  });
});
