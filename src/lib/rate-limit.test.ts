import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    try {
      const key = `test-${Math.random()}`;
      expect(rateLimit(key, 1, 1000)).toBe(true);
      expect(rateLimit(key, 1, 1000)).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(rateLimit(key, 1, 1000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    expect(rateLimit(keyA, 1, 60_000)).toBe(true);
    expect(rateLimit(keyB, 1, 60_000)).toBe(true);
    expect(rateLimit(keyA, 1, 60_000)).toBe(false);
    expect(rateLimit(keyB, 1, 60_000)).toBe(false);
  });
});
