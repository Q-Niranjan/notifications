import { describe, expect, it } from "vitest";
import { errorMessage } from "@/shared/utils/errorMessage";

describe("errorMessage", () => {
  it("uses an Error message", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("uses a message on a plain object", () => {
    expect(errorMessage({ message: "denied" }, "fallback")).toBe("denied");
  });

  it("returns the fallback otherwise", () => {
    expect(errorMessage("offline", "fallback")).toBe("fallback");
    expect(errorMessage({ message: 12 }, "fallback")).toBe("fallback");
    expect(errorMessage(null, "fallback")).toBe("fallback");
  });
});
