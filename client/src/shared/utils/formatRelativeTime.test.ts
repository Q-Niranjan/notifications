import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "@/shared/utils/formatRelativeTime";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-08T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty for an invalid date", () => {
    expect(formatRelativeTime("not-a-date", "Just now")).toBe("");
  });

  it("returns justNow under a minute", () => {
    expect(formatRelativeTime("2026-01-08T11:59:30.000Z", "Just now")).toBe(
      "Just now"
    );
  });

  it("returns minutes, hours, and days", () => {
    expect(formatRelativeTime("2026-01-08T11:50:00.000Z", "Just now")).toBe("10m");
    expect(formatRelativeTime("2026-01-08T08:00:00.000Z", "Just now")).toBe("4h");
    expect(formatRelativeTime("2026-01-05T12:00:00.000Z", "Just now")).toBe("3d");
  });

  it("returns a locale date after a week", () => {
    expect(formatRelativeTime("2025-12-01T12:00:00.000Z", "Just now")).toBe(
      new Date("2025-12-01T12:00:00.000Z").toLocaleDateString()
    );
  });
});
