import { afterEach, describe, expect, it, vi } from "vitest";
import { followRedirect } from "@/shared/utils/followRedirect";

describe("followRedirect", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing without a url", () => {
    const open = vi.spyOn(window, "open");
    followRedirect();
    followRedirect({ url: "" });
    expect(open).not.toHaveBeenCalled();
  });

  it("opens a blank target", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    followRedirect({ url: "https://example.com", target: "_blank" });
    expect(open).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("assigns the top window", () => {
    const assign = vi.fn();
    vi.spyOn(window, "top", "get").mockReturnValue({
      location: { assign },
    } as unknown as Window);
    followRedirect({ url: "https://example.com", target: "_top" });
    expect(assign).toHaveBeenCalledWith("https://example.com");
  });

  it("assigns the parent window", () => {
    const assign = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({
      location: { assign },
    } as unknown as Window);
    followRedirect({ url: "https://example.com", target: "_parent" });
    expect(assign).toHaveBeenCalledWith("https://example.com");
  });

  it("assigns the current window by default", () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      assign,
    } as unknown as Location);
    followRedirect({ url: "https://example.com" });
    expect(assign).toHaveBeenCalledWith("https://example.com");
  });
});
