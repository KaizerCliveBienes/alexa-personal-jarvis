import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import FallbackStrategy from "../../../strategies/fallback-strategy.js";

describe("FallbackStrategy", () => {
  let fallbackStrategy;

  beforeEach(() => {
    fallbackStrategy = new FallbackStrategy();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("should return a formatted response", async () => {
      const result = await fallbackStrategy.execute();
      expect(result).toEqual({
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: "Jarvis responded: Sorry, I didn't understand that.",
          },
          shouldEndSession: false,
        },
      });
    });
  });
});
